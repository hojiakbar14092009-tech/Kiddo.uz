"""
Kiddo mascot modelling kit (Blender Python, runs headless: `python3 tools/mascots/build.py`).

Every mascot is built here from code, so the source of a character is a small, reviewable text
file instead of a large .blend file. The kit gives:

- shape primitives as bmesh data (sphere, lathe, capsule, rounded box, torus, tube, extruded
  outline, leaf) that are placed with a transform and merged into one skinned body mesh;
- per-vertex skin weights (rigid parts for robots, smooth blends at organic joints, chains);
- an armature whose bones all rest in the same orientation (bone axes = world axes), so one
  animation library drives every character of a rig family;
- a face built from 2D "bands" projected onto the head, with shape keys (morph targets) for the
  emotion library (`FACE_KEYS`);
- glTF export (skin, morph targets, named animation clips).

Coordinates: Blender units ~ metres, Z up, the character looks at -Y (glTF: +Z), its left side
is +X. Characters stand on z = 0 and are about 2.6 units tall.
"""

import math

import bmesh
import bpy
from mathutils import Matrix, Vector

TAU = math.tau

# Morph target names, shared by every mascot (the runtime emotion library maps onto these).
FACE_KEYS = (
    "blink",
    "eyes_happy",
    "eyes_wide",
    "eyes_sleepy",
    "eyes_sad",
    "look_left",
    "look_right",
    "look_up",
    "look_down",
    "mouth_smile",
    "mouth_open",
    "mouth_o",
    "mouth_sad",
    "mouth_flat",
    "brows_up",
    "brows_worried",
    "brow_think",
)


# --------------------------------------------------------------------------------------------
# scene and materials


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def srgb(hex_color):
    """'#RRGGBB' -> linear RGBA (Blender stores linear colour)."""
    value = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(value[i : i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


def make_material(name, color, rough=0.5, metal=0.0, emit=None, strength=1.0, coat=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = srgb(color)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if coat:
        bsdf.inputs["Coat Weight"].default_value = coat
        bsdf.inputs["Coat Roughness"].default_value = 0.15
    if emit:
        bsdf.inputs["Emission Color"].default_value = srgb(emit)
        bsdf.inputs["Emission Strength"].default_value = strength
    return mat


# --------------------------------------------------------------------------------------------
# shape primitives (bmesh, centred at the origin unless said otherwise)


def transform(loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    """Matrix from location, XYZ rotation in degrees and scale."""
    rx, ry, rz = (math.radians(a) for a in rot)
    r = Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(ry, 4, "Y") @ Matrix.Rotation(rx, 4, "X")
    s = Matrix.Diagonal((*scale, 1.0))
    return Matrix.Translation(loc) @ r @ s


def sphere(radius=1.0, seg=24, rings=14):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=radius)
    return bm


def lathe(profile, seg=32, close_top=True, close_bottom=True):
    """Revolve a profile [(radius, z), ...] (bottom to top) around Z."""
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        if r <= 1e-6:
            rings.append([bm.verts.new((0, 0, z))])
            continue
        rings.append(
            [bm.verts.new((r * math.cos(TAU * i / seg), r * math.sin(TAU * i / seg), z)) for i in range(seg)]
        )
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        if len(a) == 1:
            for i in range(seg):
                bm.faces.new((a[0], b[i], b[(i + 1) % seg]))
        elif len(b) == 1:
            for i in range(seg):
                bm.faces.new((a[(i + 1) % seg], a[i], b[0]))
        else:
            for i in range(seg):
                bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    if close_bottom and len(rings[0]) > 1:
        bm.faces.new(list(reversed(rings[0])))
    if close_top and len(rings[-1]) > 1:
        bm.faces.new(rings[-1])
    return bm


def round_profile(radius, height, bulge=1.0, steps=10, flat_bottom=False, top=1.0):
    """Profile of a soft rounded solid (pill / dome), for lathe()."""
    pts = []
    for i in range(steps + 1):
        t = i / steps
        a = -math.pi / 2 + math.pi * t
        z = math.sin(a) * height / 2
        r = math.cos(a) * radius * (1 + (bulge - 1) * math.cos(a))
        if flat_bottom and z < -height * 0.35:
            z = -height * 0.35
        pts.append((max(r, 0.0) if 0 < i < steps else 0.0, z * (top if z > 0 else 1)))
    return pts


def capsule(radius, length, seg=20, rings=6):
    """Capsule along Z, total height length + 2 * radius."""
    prof = []
    for i in range(rings + 1):
        a = -math.pi / 2 + (math.pi / 2) * i / rings
        prof.append((radius * math.cos(a), -length / 2 + radius * math.sin(a)))
    for i in range(rings + 1):
        a = (math.pi / 2) * i / rings
        prof.append((radius * math.cos(a), length / 2 + radius * math.sin(a)))
    prof[0] = (0.0, prof[0][1])
    prof[-1] = (0.0, prof[-1][1])
    return lathe(prof, seg)


def cylinder(r1, r2, depth, seg=24):
    """Cylinder / truncated cone along Z, centred."""
    return lathe([(0, -depth / 2), (r1, -depth / 2), (r2, depth / 2), (0, depth / 2)], seg)


def rounded_box(sx, sy, sz, radius=0.05, segments=3):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    bmesh.ops.bevel(
        bm,
        geom=list(bm.edges) + list(bm.verts),
        offset=min(radius, sx / 2.01, sy / 2.01, sz / 2.01),
        segments=segments,
        affect="EDGES",
        profile=0.5,
    )
    return bm


def torus(major, minor, seg=32, ring=12, arc=TAU):
    """Torus around Z (in the XY plane). A partial arc gets capped ends."""
    bm = bmesh.new()
    full = abs(arc - TAU) < 1e-6
    n = seg if full else seg + 1
    rings = []
    for i in range(n):
        a = arc * i / seg
        c = Vector((math.cos(a), math.sin(a), 0))
        rings.append(
            [
                bm.verts.new(c * (major + minor * math.cos(TAU * j / ring)) + Vector((0, 0, minor * math.sin(TAU * j / ring))))
                for j in range(ring)
            ]
        )
    for i in range(n if full else n - 1):
        a, b = rings[i], rings[(i + 1) % n]
        for j in range(ring):
            bm.faces.new((a[j], b[j], b[(j + 1) % ring], a[(j + 1) % ring]))
    if not full:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    return bm


def tube(points, radius, seg=12, radii=None):
    """A round tube along a polyline of 3D points (closed with caps)."""
    bm = bmesh.new()
    pts = [Vector(p) for p in points]
    rings = []
    for i, p in enumerate(pts):
        d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
        side = d.cross(up).normalized()
        up = side.cross(d).normalized()
        r = radii[i] if radii else radius
        rings.append([bm.verts.new(p + (side * math.cos(TAU * j / seg) + up * math.sin(TAU * j / seg)) * r) for j in range(seg)])
    for a, b in zip(rings, rings[1:]):
        for j in range(seg):
            bm.faces.new((a[j], a[(j + 1) % seg], b[(j + 1) % seg], b[j]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    return bm


def extrude_outline(points2d, depth, z_front=0.0):
    """
    A flat outline [(x, z), ...] in the XZ plane facing -Y, extruded backwards (+Y) by depth.
    Used for emblems (star, K, gear, note, clover). The outline must not self-intersect.
    """
    bm = bmesh.new()
    front = [bm.verts.new((x, z_front, z)) for x, z in points2d]
    back = [bm.verts.new((x, z_front + depth, z)) for x, z in points2d]
    n = len(points2d)
    bm.faces.new(list(reversed(front)) if _area(points2d) > 0 else front)
    bm.faces.new(back if _area(points2d) > 0 else list(reversed(back)))
    for i in range(n):
        j = (i + 1) % n
        f = (front[i], front[j], back[j], back[i])
        bm.faces.new(f if _area(points2d) > 0 else tuple(reversed(f)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def _area(points):
    return sum(x0 * z1 - x1 * z0 for (x0, z0), (x1, z1) in zip(points, points[1:] + points[:1])) / 2


def star_outline(outer, inner, points=5, rot=90.0, round_tips=0):
    out = []
    for i in range(points * 2):
        r = outer if i % 2 == 0 else inner
        a = math.radians(rot) + math.pi * i / points
        out.append((r * math.cos(a), r * math.sin(a)))
    return out


def circle_outline(r, n=24, cx=0.0, cz=0.0):
    return [(cx + r * math.cos(TAU * i / n), cz + r * math.sin(TAU * i / n)) for i in range(n)]


def leaf(length, width, thickness, curl=0.0, seg=16, rings=14, tip=0.8):
    """A pointed leaf / ear along +Z from its base at the origin, flat in the XZ plane."""
    bm = sphere(1.0, seg, rings)
    for v in bm.verts:
        t = (v.co.z + 1) / 2  # 0 base .. 1 tip
        w = math.sin(math.pi * min(max(t, 0.0), 1.0) ** 0.75) ** tip
        x = v.co.x * width * w
        y = v.co.y * thickness * max(w, 0.15)
        z = t * length
        y += curl * (t**2) * length
        v.co = Vector((x, y, z))
    return bm


def deform(bm, fn):
    for v in bm.verts:
        v.co = Vector(fn(v.co.copy()))
    return bm


def grid_band(top, bottom):
    """Quad strip between two polylines of equal length (a face 'band')."""
    bm = bmesh.new()
    t = [bm.verts.new(p) for p in top]
    b = [bm.verts.new(p) for p in bottom]
    for i in range(len(top) - 1):
        bm.faces.new((b[i], b[i + 1], t[i + 1], t[i]))
    return bm


# --------------------------------------------------------------------------------------------
# skin weights


def rigid(bone):
    return lambda co: {bone: 1.0}


def blend(bone_a, bone_b, p_a, p_b):
    """Weight goes from bone_a at point p_a to bone_b at point p_b (smoothstep along the line)."""
    pa, pb = Vector(p_a), Vector(p_b)
    axis = pb - pa
    length2 = axis.length_squared

    def fn(co):
        t = max(0.0, min(1.0, (co - pa).dot(axis) / length2))
        t = t * t * (3 - 2 * t)
        return {bone_a: 1 - t, bone_b: t}

    return fn


def joint_blend(bone_a, bone_b, joint, direction, width=0.08):
    """bone_a before a joint, bone_b after it (along direction), a soft blend of +-width at the joint."""
    j, d = Vector(joint), Vector(direction).normalized()

    def fn(co):
        t = max(0.0, min(1.0, ((co - j).dot(d) + width) / (2 * width)))
        t = t * t * (3 - 2 * t)
        return {bone_a: 1 - t, bone_b: t}

    return fn


def limb(bones, joints, width=0.07):
    """Upper / lower segment of a limb with soft joints: joints = [start, middle, end]."""
    a, m, e = (Vector(p) for p in joints)

    def fn(co):
        # which segment is closer decides; near the middle joint the two blend
        d1 = (m - a)
        t1 = (co - a).dot(d1) / d1.length_squared
        k = (co - m).dot((e - a).normalized())
        t = max(0.0, min(1.0, (k + width) / (2 * width)))
        t = t * t * (3 - 2 * t)
        return {bones[0]: 1 - t, bones[1]: t} if t1 > 0.3 else {bones[0]: 1.0}

    return fn


def chain(bones, points):
    """Smooth weights along a bone chain (tails, ears, stems): bone i owns points[i]..points[i+1]."""
    pts = [Vector(p) for p in points]

    def fn(co):
        best, best_d, best_t = 0, 1e9, 0.0
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]
            ab = b - a
            t = max(0.0, min(1.0, (co - a).dot(ab) / ab.length_squared))
            d = (a + ab * t - co).length
            if d < best_d:
                best, best_d, best_t = i, d, t
        weights = {bones[best]: 1.0}
        # soften the joint between two segments
        if best_t > 0.75 and best + 1 < len(bones):
            s = (best_t - 0.75) / 0.25 * 0.5
            weights = {bones[best]: 1 - s, bones[best + 1]: s}
        elif best_t < 0.25 and best > 0:
            s = (0.25 - best_t) / 0.25 * 0.5
            weights = {bones[best]: 1 - s, bones[best - 1]: s}
        return weights

    return fn


# --------------------------------------------------------------------------------------------
# face: bands projected on a surface, with one shape per morph target


class Surface:
    """Front of an ellipsoid (head or visor): face coords (u right-to-viewer, v up) -> 3D point."""

    def __init__(self, center, radii):
        self.c = Vector(center)
        self.r = Vector(radii)

    def point(self, u, v, lift=0.0):
        # the character's face looks at -Y; the viewer's right is +X
        x = max(-0.98, min(0.98, u / self.r.x))
        z = max(-0.98, min(0.98, v / self.r.z))
        y2 = max(0.0, 1 - x * x - z * z)
        p = Vector((self.c.x + u, self.c.y - self.r.y * math.sqrt(y2), self.c.z + v))
        n = Vector(((p.x - self.c.x) / self.r.x**2, (p.y - self.c.y) / self.r.y**2, (p.z - self.c.z) / self.r.z**2)).normalized()
        return p + n * lift


class PlaneSurface:
    """A flat (or V-shaped, k > 0) front at depth y0 (Scribble's pencil face, Story's pages)."""

    def __init__(self, y0, cz, k=0.0, cx=0.0):
        self.y0, self.cz, self.k, self.cx = y0, cz, k, cx

    def point(self, u, v, lift=0.0):
        p = Vector((self.cx + u, self.y0 + self.k * abs(u), self.cz + v))
        n = Vector((-self.k * (1 if u > 0 else -1), -1.0, 0.0)).normalized()
        return p + n * lift


def band_ellipse(cx, cz, rx, rz, n=14, tilt=0.0):
    """Filled ellipse as a band (top arc, bottom arc), left to right."""
    top, bottom = [], []
    for i in range(n):
        a = math.pi - math.pi * i / (n - 1)
        x, zt, zb = rx * math.cos(a), rz * math.sin(a), -rz * math.sin(a)
        top.append((cx + x, cz + zt + tilt * x))
        bottom.append((cx + x, cz + zb + tilt * x))
    return top, bottom


def band_arc(cx, cz, half_w, height, thick, n=14, tilt=0.0):
    """A thick arc (happy eye ^ when height > 0, frown when height < 0)."""
    top, bottom = [], []
    for i in range(n):
        s = -1 + 2 * i / (n - 1)
        x = s * half_w
        z = cz + height * (1 - s * s) + tilt * x
        taper = 0.35 + 0.65 * math.sqrt(max(0.0, 1 - s * s))
        top.append((cx + x, z + thick * taper / 2))
        bottom.append((cx + x, z - thick * taper / 2))
    return top, bottom


def band_mouth(cx, cz, half_w, open_depth, top_curve=0.0, n=14):
    """A D-shaped smile: straight-ish top lip, round bottom."""
    top, bottom = [], []
    for i in range(n):
        s = -1 + 2 * i / (n - 1)
        x = s * half_w
        top.append((cx + x, cz + top_curve * (1 - s * s) * -1 + 0.002))
        bottom.append((cx + x, cz - open_depth * math.sqrt(max(0.0, 1 - s * s))))
    return top, bottom


def _resample(points, n):
    """The same polyline with n points (shapes of one feature must match point for point)."""
    if len(points) == n:
        return points
    out = []
    for i in range(n):
        f = i * (len(points) - 1) / (n - 1)
        j = min(int(f), len(points) - 2)
        t = f - j
        (u0, v0), (u1, v1) = points[j], points[j + 1]
        out.append((u0 + (u1 - u0) * t, v0 + (v1 - v0) * t))
    return out


def offset_band(band, du=0.0, dv=0.0):
    top, bottom = band
    return [(u + du, v + dv) for u, v in top], [(u + du, v + dv) for u, v in bottom]


def mirror_band(band):
    top, bottom = band
    return [(-u, v) for u, v in reversed(top)], [(-u, v) for u, v in reversed(bottom)]


class Face:
    """
    Facial features as bands with one shape per morph target. Each feature:
    states = {"neutral": band, "<key>": band, ...}; a key that a feature does not list keeps
    the neutral shape for that feature.
    """

    def __init__(self, surface):
        self.surface = surface
        self.features = []  # (states, material index, lift)

    def add(self, states, mat, lift, surface=None):
        n = len(states["neutral"][0])
        same = {k: (_resample(t, n), _resample(b, n)) for k, (t, b) in states.items()}
        self.features.append((same, mat, lift, surface or self.surface))

    def build(self, name, materials, bone):
        verts, faces, mats = [], [], []
        key_coords = {k: [] for k in FACE_KEYS}
        rows = 5  # rows between the top and the bottom line, so a tall band follows the curve
        for states, mat, lift, surface in self.features:
            neutral = states["neutral"]
            n = len(neutral[0])
            base = len(verts)

            def project(band):
                top, bottom = band
                out = []
                for r in range(rows):
                    t = r / (rows - 1)
                    for (ut, vt), (ub, vb) in zip(top, bottom):
                        out.append(surface.point(ut + (ub - ut) * t, vt + (vb - vt) * t, lift))
                return out

            verts.extend(project(neutral))
            for k in FACE_KEYS:
                key_coords[k].extend(project(states.get(k, neutral)))
            for r in range(rows - 1):
                for i in range(n - 1):
                    a = base + r * n + i
                    b = base + (r + 1) * n + i
                    faces.append((a, a + 1, b + 1, b))
                    mats.append(mat)
        me = bpy.data.meshes.new(name)
        me.from_pydata([tuple(v) for v in verts], [], faces)
        for poly, m in zip(me.polygons, mats):
            poly.material_index = m
            poly.use_smooth = False
        for m in materials:
            me.materials.append(m)
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        # every face polygon must look forward (-Y)
        bm = bmesh.new()
        bm.from_mesh(me)
        for f in bm.faces:
            if f.normal.y > 0:
                f.normal_flip()
        bm.to_mesh(me)
        bm.free()
        ob.shape_key_add(name="Basis")
        used = set()
        for k in FACE_KEYS:
            if all((a - b).length < 1e-7 for a, b in zip(key_coords[k], verts)):
                continue
            key = ob.shape_key_add(name=k, from_mix=False)
            key.value = 0.0
            used.add(k)
            for i, co in enumerate(key_coords[k]):
                key.data[i].co = co
        # skin: one bone, or a function of the vertex position (Story's two pages)
        weights = bone if callable(bone) else (lambda co: {bone: 1.0})
        groups = {}
        for i, co in enumerate(verts):
            for name, w in weights(co).items():
                if name not in groups:
                    groups[name] = ob.vertex_groups.new(name=name)
                groups[name].add([i], w, "REPLACE")
        return ob, used


# --------------------------------------------------------------------------------------------
# the character: one skinned body mesh, one face mesh, one armature


CORE_BONES = (
    "Root",
    "Hips",
    "Spine",
    "Chest",
    "Neck",
    "Head",
    "Shoulder_L",
    "UpperArm_L",
    "Forearm_L",
    "Hand_L",
    "Shoulder_R",
    "UpperArm_R",
    "Forearm_R",
    "Hand_R",
    "UpperLeg_L",
    "LowerLeg_L",
    "Foot_L",
    "UpperLeg_R",
    "LowerLeg_R",
    "Foot_R",
)


class Character:
    def __init__(self, cid):
        self.id = cid
        self.bm = bmesh.new()
        self.deform = self.bm.verts.layers.deform.verify()
        self.materials = []
        self.mat_index = {}
        self.bones = {}  # name -> (head, parent)
        self.bone_order = []
        self.face = None
        self.face_bone = "Head"

    # materials
    def mat(self, name, color, **kw):
        if name not in self.mat_index:
            self.mat_index[name] = len(self.materials)
            self.materials.append(make_material(f"{self.id}_{name}", color, **kw))
        return self.mat_index[name]

    # skeleton
    def bone(self, name, head, parent=None):
        assert parent is None or parent in self.bones, f"{name}: unknown parent {parent}"
        self.bones[name] = (Vector(head), parent)
        self.bone_order.append(name)

    def group(self, name):
        return self.bone_order.index(name)

    # geometry
    def add(self, part, mat, weights, matrix=None, smooth=True):
        """Merge a bmesh part into the body with a material and skin weights."""
        if matrix is not None:
            bmesh.ops.transform(part, matrix=matrix, verts=part.verts)
        mapping = {}
        for v in part.verts:
            nv = self.bm.verts.new(v.co)
            for bone, w in weights(v.co).items():
                if w > 1e-4:
                    nv[self.deform][self.group(bone)] = w
            mapping[v] = nv
        for f in part.faces:
            try:
                nf = self.bm.faces.new([mapping[v] for v in f.verts])
            except ValueError:
                continue
            nf.material_index = mat
            nf.smooth = smooth
        part.free()

    def mirror_add(self, make_part, mat, weights_l, weights_r, matrix_l):
        """Add a part on the left side (+X) and its mirror on the right."""
        self.add(make_part(), mat, weights_l, matrix_l)
        mirror = Matrix.Scale(-1, 4, Vector((1, 0, 0))) @ matrix_l
        part = make_part()
        bmesh.ops.transform(part, matrix=mirror, verts=part.verts)
        bmesh.ops.reverse_faces(part, faces=part.faces)
        self.add(part, mat, weights_r, None)

    # output
    def build(self):
        arm_data = bpy.data.armatures.new(f"{self.id}_rig")
        arm = bpy.data.objects.new(f"{self.id}", arm_data)
        bpy.context.scene.collection.objects.link(arm)
        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.mode_set(mode="EDIT")
        for name in self.bone_order:
            head, parent = self.bones[name]
            b = arm_data.edit_bones.new(name)
            b.head = head
            # every bone rests with its axes on the world axes: one clip library fits all
            b.tail = head + Vector((0, 0.06, 0))
            b.roll = 0.0
            if parent:
                b.parent = arm_data.edit_bones[parent]
        bpy.ops.object.mode_set(mode="OBJECT")

        me = bpy.data.meshes.new(f"{self.id}_body")
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=1e-6)
        self.bm.normal_update()
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.materials:
            me.materials.append(m)
        body = bpy.data.objects.new(f"{self.id}_body", me)
        bpy.context.scene.collection.objects.link(body)
        for name in self.bone_order:
            body.vertex_groups.new(name=name)
        _normalize_weights(body)
        mod = body.modifiers.new("Armature", "ARMATURE")
        mod.object = arm

        face_keys = set()
        if self.face is not None:
            face_ob, face_keys = self.face.build(f"{self.id}_face", self.materials, self.face_bone)
            for name in self.bone_order:
                if name not in face_ob.vertex_groups:
                    face_ob.vertex_groups.new(name=name)
            fm = face_ob.modifiers.new("Armature", "ARMATURE")
            fm.object = arm
        return arm, body, face_keys


def _normalize_weights(ob):
    for v in ob.data.vertices:
        total = sum(g.weight for g in v.groups)
        if total > 0:
            for g in v.groups:
                g.weight /= total


def export_glb(path):
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_animation_mode="ACTIONS",
        export_morph=True,
        export_morph_normal=False,
        export_skins=True,
        export_def_bones=False,
        export_apply=False,
        export_yup=True,
        export_vertex_color="NONE",
        export_force_sampling=True,
        export_frame_step=2,
        export_optimize_animation_size=True,
        export_extras=False,
        export_materials="EXPORT",
        export_image_format="AUTO",
    )
