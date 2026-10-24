"""
Creature family: Dinoo (dinosaur guide), Leafy (nature), Lumi (light).

Round bodies with soft weights: the body blends from Hips to Chest, tails and ears are bone
chains with smooth weights, so they bend instead of breaking at a joint. Faces are organic
(organic.py) with morph targets.
"""

import math

from mathutils import Matrix, Vector

import organic
from kit import (
    Face,
    Surface,
    band_ellipse,
    blend,
    capsule,
    chain,
    circle_outline,
    cylinder,
    extrude_outline,
    lathe,
    leaf,
    rigid,
    sphere,
    star_outline,
    torus,
    transform,
    tube,
)


def creature_skeleton(ch, hips=0.55, chest=1.1, head=1.4, shoulder=(0.3, -0.05, 1.05), arm_dir=(0.06, -0.08, -0.12), leg_x=0.22):
    ch.bone("Root", (0, 0, 0))
    ch.bone("Hips", (0, 0, hips), "Root")
    ch.bone("Spine", (0, 0, (hips + chest) / 2), "Hips")
    ch.bone("Chest", (0, 0, chest), "Spine")
    ch.bone("Neck", (0, 0, head - 0.08), "Chest")
    ch.bone("Head", (0, 0, head), "Neck")
    sx, sy, sz = shoulder
    dx, dy, dz = arm_dir
    for s, side in ((1, "L"), (-1, "R")):
        ch.bone(f"Shoulder_{side}", (sx * 0.8 * s, sy, sz + 0.02), "Chest")
        ch.bone(f"UpperArm_{side}", (sx * s, sy, sz), f"Shoulder_{side}")
        ch.bone(f"Forearm_{side}", ((sx + dx) * s, sy + dy, sz + dz), f"UpperArm_{side}")
        ch.bone(f"Hand_{side}", ((sx + 2 * dx) * s, sy + 2 * dy, sz + 2 * dz), f"Forearm_{side}")
        ch.bone(f"UpperLeg_{side}", (leg_x * s, 0, hips), "Hips")
        ch.bone(f"LowerLeg_{side}", ((leg_x + 0.02) * s, 0, hips * 0.55), f"UpperLeg_{side}")
        ch.bone(f"Foot_{side}", ((leg_x + 0.03) * s, 0, 0.13), f"LowerLeg_{side}")


def stubby_arm(ch, mat, paw_mat, s, side, start, end, r=0.1, paw_r=0.11):
    a, b = Vector(start), Vector(end)
    a.x *= s
    b.x *= s
    mid = (a + b) / 2
    ch.add(tube([a, mid, b], r, 16, radii=[r * 1.05, r, r * 0.92]), mat, blend(f"UpperArm_{side}", f"Forearm_{side}", a, b))
    ch.add(sphere(paw_r, 18, 12), paw_mat, rigid(f"Hand_{side}"), transform(b + (b - a).normalized() * paw_r * 0.6))
    return b + (b - a).normalized() * paw_r * 0.6


def stubby_leg(ch, mat, foot_mat, s, side, x, hips, foot_scale=(0.17, 0.24, 0.1), thigh=0.19, toe_mat=None):
    ch.add(sphere(1.0, 22, 14), mat, blend("Hips", f"UpperLeg_{side}", (x * s * 0.5, 0, hips + 0.1), (x * s, 0, hips - 0.12)), transform((x * s, 0, hips - 0.12), scale=(thigh, thigh * 1.05, thigh * 1.15)))
    ch.add(capsule(thigh * 0.7, 0.12, 18, 5), mat, rigid(f"LowerLeg_{side}"), transform(((x + 0.02) * s, 0, hips * 0.48)))
    fx, fy, fz = foot_scale
    ch.add(sphere(1.0, 24, 14), foot_mat, rigid(f"Foot_{side}"), transform(((x + 0.03) * s, -0.06, fz), scale=foot_scale))
    if toe_mat is not None:
        for i in (-1, 0, 1):
            ch.add(sphere(0.042, 12, 8), toe_mat, rigid(f"Foot_{side}"), transform(((x + 0.03) * s + i * fx * 0.5, -0.06 - fy * 0.9, fz * 0.7)))


# ---------------------------------------------------------------------------------------------
# Dinoo


def build_dinoo(ch):
    creature_skeleton(ch, hips=0.55, chest=1.1, head=1.38, shoulder=(0.34, -0.2, 1.06), arm_dir=(0.05, -0.1, -0.09), leg_x=0.24)
    for i, (p, parent) in enumerate((((0, 0.36, 0.58), "Hips"), ((0, 0.7, 0.46), "Tail_1"), ((0.09, 0.98, 0.37), "Tail_2"))):
        ch.bone(f"Tail_{i + 1}", p, parent)

    green = ch.mat("skin", "#6CC93A", rough=0.45, coat=0.25)
    dark = ch.mat("spots", "#3E9A2C", rough=0.5)
    belly = ch.mat("belly", "#F5E9BE", rough=0.5)
    plate = ch.mat("plates", "#FF6A2A", rough=0.4, coat=0.3)
    cream = ch.mat("claws", "#F5E9BE", rough=0.4)

    body_w = blend("Hips", "Chest", (0, 0, 0.5), (0, 0, 1.2))
    prof = [(0, 0.3), (0.3, 0.33), (0.45, 0.45), (0.51, 0.65), (0.5, 0.85), (0.44, 1.05), (0.34, 1.22), (0.2, 1.33), (0, 1.36)]
    ch.add(lathe(prof, 40), green, body_w, transform(scale=(1, 0.92, 1)))
    ch.add(sphere(1.0, 32, 18), belly, body_w, transform((0, -0.3, 0.78), scale=(0.34, 0.19, 0.42)))
    head_c, head_r = (0, -0.06, 1.78), (0.56, 0.5, 0.48)
    snout_c, snout_r = (0, -0.42, 1.57), (0.44, 0.34, 0.27)
    ch.add(sphere(1.0, 40, 24), green, rigid("Head"), transform(head_c, scale=head_r))
    ch.add(sphere(1.0, 40, 24), green, rigid("Head"), transform(snout_c, scale=snout_r))
    # spots
    for p, r in (((0.22, 0.1, 2.2), 0.06), ((-0.18, 0.18, 2.18), 0.05), ((0.42, 0.05, 1.95), 0.05), ((-0.44, 0.0, 1.9), 0.06), ((0.47, 0.15, 0.9), 0.06), ((-0.46, 0.2, 0.75), 0.07), ((0.4, 0.3, 1.1), 0.05), ((-0.35, 0.33, 1.15), 0.05)):
        n = (Vector(p) - Vector((0, 0, p[2] if p[2] < 1.4 else 1.78))).normalized()
        ch.add(sphere(1.0, 12, 8), dark, rigid("Head") if p[2] > 1.4 else body_w, Matrix.Translation(p) @ _align(n) @ Matrix.Diagonal((r, r, r * 0.4, 1)))
    # dorsal plates along the back: head, body, tail
    plates = [((0, -0.12, 2.24), 10, 0.24), ((0, 0.1, 2.27), -15, 0.3), ((0, 0.32, 2.14), -45, 0.28), ((0, 0.46, 1.9), -70, 0.25), ((0, 0.44, 1.42), -60, 0.26), ((0, 0.5, 1.12), -80, 0.27), ((0, 0.52, 0.82), -95, 0.24)]
    for p, tilt, size in plates:
        w = rigid("Head") if p[2] > 1.6 else body_w
        ch.add(leaf(size, size * 0.62, 0.06, tip=0.6), plate, w, transform(p, (tilt, 0, 90)))
    tail_pts = [(0, 0.33, 0.62), (0, 0.66, 0.48), (0.05, 0.94, 0.38), (0.14, 1.14, 0.36), (0.22, 1.28, 0.42)]
    tail_w = chain(["Tail_1", "Tail_2", "Tail_3", "Tail_3"], tail_pts)
    ch.add(tube(tail_pts, 0.2, 20, radii=[0.27, 0.2, 0.14, 0.09, 0.035]), green, tail_w)
    for p, tilt, size in (((0, 0.72, 0.66), -110, 0.2), ((0.05, 0.98, 0.5), -115, 0.15), ((0.15, 1.16, 0.44), -120, 0.1)):
        ch.add(leaf(size, size * 0.6, 0.04, tip=0.6), plate, tail_w, transform(p, (tilt, 0, 90)))
    for p, r in (((0.18, 0.8, 0.56), 0.04), ((-0.12, 0.62, 0.62), 0.045)):
        ch.add(sphere(1.0, 10, 6), dark, tail_w, transform(p, scale=(r, r, r)))

    for s, side in ((1, "L"), (-1, "R")):
        paw = stubby_arm(ch, green, green, s, side, (0.34, -0.2, 1.06), (0.44, -0.38, 0.88), 0.095, 0.1)
        for i in (-1, 0, 1):
            ch.add(sphere(0.03, 10, 6), cream, rigid(f"Hand_{side}"), transform(paw + Vector((i * 0.05, -0.08, -0.03))))
        stubby_leg(ch, green, green, s, side, 0.24, 0.55, foot_scale=(0.18, 0.25, 0.11), thigh=0.21, toe_mat=cream)

    # face
    mats = organic.face_materials(ch, "#2E8B3A", lid_color="#1F4A1A", mouth_color="#7A2232")
    head = Surface(head_c, head_r)
    snout = Surface(snout_c, snout_r)
    face = Face(head)
    for s in (1, -1):
        organic.eye(face, 0.2 * s, 0.12, 0.125, 0.15, mats, s)
        organic.brow(face, 0.21 * s, 0.33, 0.1, 0.03, ch.mat("brow", "#2F7A24", rough=0.6), s)
        face.add({"neutral": band_ellipse(0.09 * s, 0.14, 0.03, 0.02)}, mats["lid"], 0.003, snout)
    organic.mouth(face, -0.04, 0.2, mats, snout)
    ch.face = face


def _align(n):
    """Rotation matrix that turns +Z to the direction n (for decals lying on a surface)."""
    return Vector((0, 0, 1)).rotation_difference(Vector(n)).to_matrix().to_4x4()


# ---------------------------------------------------------------------------------------------
# Leafy


def build_leafy(ch):
    creature_skeleton(ch, hips=0.5, chest=1.0, head=1.3, shoulder=(0.33, -0.02, 1.0), arm_dir=(0.07, -0.04, -0.13), leg_x=0.2)
    ch.bone("Ear_L", (0.44, 0.0, 1.95), "Head")
    ch.bone("Ear_R", (-0.44, 0.0, 1.95), "Head")
    ch.bone("Sprout", (0, 0.02, 2.22), "Head")
    ch.bone("Tail_1", (0, 0.35, 0.55), "Hips")
    ch.bone("Tail_2", (0, 0.62, 0.7), "Tail_1")

    lime = ch.mat("skin", "#A9DB52", rough=0.5, coat=0.15)
    deep = ch.mat("leaf_dark", "#4FA93A", rough=0.45)
    cream = ch.mat("cream", "#F6F2D4", rough=0.5)
    clover = ch.mat("clover", "#5DB33A", rough=0.45)

    body_w = blend("Hips", "Chest", (0, 0, 0.45), (0, 0, 1.1))
    prof = [(0, 0.3), (0.28, 0.33), (0.39, 0.45), (0.42, 0.65), (0.39, 0.88), (0.31, 1.08), (0.2, 1.2), (0, 1.25)]
    ch.add(lathe(prof, 36), lime, body_w, transform(scale=(1, 0.9, 1)))
    ch.add(sphere(1.0, 28, 16), cream, body_w, transform((0, -0.24, 0.72), scale=(0.3, 0.16, 0.34)))
    # clover on the belly: three hearts and a stem
    belly_front = -0.24 - 0.16 - 0.005
    for rot in (0, 120, 240):
        a = math.radians(rot + 90)
        cx, cz = 0.07 * math.cos(a), 0.76 + 0.07 * math.sin(a)
        ch.add(extrude_outline(_heart(0.13), 0.02), clover, body_w, transform((cx, belly_front + 0.01, cz), (0, -(rot), 0)))
    ch.add(tube([(0, belly_front, 0.73), (0.02, belly_front, 0.66), (0.05, belly_front + 0.01, 0.61)], 0.012, 8), clover, body_w)

    head_c, head_r = (0, 0, 1.72), (0.58, 0.5, 0.52)
    mask_c, mask_r = (0, -0.2, 1.63), (0.47, 0.36, 0.42)
    ch.add(sphere(1.0, 40, 24), lime, rigid("Head"), transform(head_c, scale=head_r))
    ch.add(sphere(1.0, 40, 24), cream, rigid("Head"), transform(mask_c, scale=mask_r))
    # leaf collar
    for k in range(6):
        a = math.radians(-90 + (k - 2.5) * 32)
        p = Vector((0.27 * math.cos(a), 0.25 * math.sin(a), 1.2))
        ch.add(leaf(0.18, 0.09, 0.03), deep, body_w, transform(p, (180 - 20, 0, math.degrees(a) + 90)))
    # ears: a big light leaf with a darker inner leaf
    for s, side in ((1, "L"), (-1, "R")):
        ear_w = lambda co, s=s, side=side: {f"Ear_{side}": 1.0} if abs(co.x) > 0.5 else {f"Ear_{side}": 0.6, "Head": 0.4}
        ear_m = transform((0.42 * s, 0.02, 1.9), (10, 50 * s, 0))
        ch.add(leaf(1.0, 0.36, 0.05, curl=0.07, tip=0.9), lime, ear_w, ear_m)
        ch.add(leaf(0.78, 0.22, 0.03, curl=0.06, tip=0.9), deep, ear_w, ear_m @ transform((0, -0.025, 0.06)))
        ch.add(tube([(0, -0.05, 0.1), (0, -0.05, 0.5), (0, -0.04, 0.8)], 0.012, 6), lime, ear_w, ear_m)
    # sprout on top
    ch.add(tube([(0, 0.02, 2.18), (0, 0.02, 2.28)], 0.022, 8), deep, rigid("Sprout"))
    for rot, length in ((0, 0.3), (-55, 0.24), (55, 0.24)):
        ch.add(leaf(length, length * 0.42, 0.03, curl=0.04), deep if rot == 0 else lime, rigid("Sprout"), transform((0, 0.02, 2.26), (0, rot, 0)))
    # tail: a stem with a leaf
    tail_pts = [(0, 0.3, 0.56), (0, 0.48, 0.55), (0, 0.62, 0.66), (0, 0.66, 0.8)]
    ch.add(tube(tail_pts, 0.04, 10, radii=[0.06, 0.045, 0.035, 0.03]), lime, chain(["Tail_1", "Tail_1", "Tail_2"], tail_pts))
    ch.add(leaf(0.32, 0.15, 0.03, curl=0.05), deep, rigid("Tail_2"), transform((0, 0.66, 0.78), (-25, 0, 0)))

    for s, side in ((1, "L"), (-1, "R")):
        stubby_arm(ch, lime, deep, s, side, (0.33, -0.02, 1.0), (0.47, -0.1, 0.74), 0.085, 0.095)
        stubby_leg(ch, lime, deep, s, side, 0.2, 0.5, foot_scale=(0.14, 0.2, 0.09), thigh=0.17, toe_mat=deep)

    mats = organic.face_materials(ch, "#3FA535", lid_color="#2F5A1E")
    mask = Surface(mask_c, mask_r)
    face = Face(mask)
    for s in (1, -1):
        organic.eye(face, 0.17 * s, 0.07, 0.11, 0.13, mats, s)
        organic.brow(face, 0.18 * s, 0.26, 0.08, 0.025, ch.mat("brow", "#4FA93A", rough=0.6), s)
        for du, dv in ((0.0, 0.0), (0.05, -0.03), (-0.01, -0.06)):
            face.add({"neutral": band_ellipse((0.3 + du) * s, -0.08 + dv, 0.018, 0.018, n=8)}, ch.mat("dots", "#8CCB45", rough=0.6), 0.002)
    organic.mouth(face, -0.17, 0.11, mats)
    ch.face = face


def _heart(size):
    pts = []
    for i in range(24):
        t = 2 * math.pi * i / 24
        x = 16 * math.sin(t) ** 3
        z = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x / 32 * size, z / 32 * size))
    return pts


# ---------------------------------------------------------------------------------------------
# Lumi


def build_lumi(ch):
    creature_skeleton(ch, hips=0.52, chest=1.0, head=1.3, shoulder=(0.31, -0.02, 1.0), arm_dir=(0.07, -0.04, -0.13), leg_x=0.19)
    ch.bone("Ear_L", (0.4, 0.0, 2.0), "Head")
    ch.bone("Ear_R", (-0.4, 0.0, 2.0), "Head")
    ch.bone("Sprout", (0, 0.0, 2.22), "Head")  # the curl on the head
    ch.bone("Tail_1", (0, 0.3, 0.72), "Hips")

    cream = ch.mat("skin", "#FFF4DE", rough=0.4, coat=0.3)
    glow = ch.mat("glow", "#FFC93C", rough=0.4, emit="#FFC93C", strength=1.1)
    soft = ch.mat("glow_soft", "#FFE68A", rough=0.4, emit="#FFE27A", strength=1.4)
    gold = ch.mat("gold", "#F2B53A", rough=0.3, metal=0.3)

    body_w = blend("Hips", "Chest", (0, 0, 0.45), (0, 0, 1.1))
    prof = [(0, 0.32), (0.26, 0.35), (0.36, 0.46), (0.39, 0.65), (0.36, 0.88), (0.28, 1.06), (0.18, 1.17), (0, 1.21)]
    ch.add(lathe(prof, 36), cream, body_w, transform(scale=(1, 0.9, 1)))
    front = -0.39 * 0.9 - 0.004
    ch.add(extrude_outline(star_outline(0.12, 0.04, 4), 0.03), glow, body_w, transform((0, front + 0.01, 0.78)))
    ch.add(torus(0.19, 0.018, 28, 6), gold, body_w, transform((0, 0, 1.15), scale=(1, 0.9, 1)))

    head_c, head_r = (0, 0, 1.74), (0.55, 0.48, 0.5)
    ch.add(sphere(1.0, 40, 24), cream, rigid("Head"), transform(head_c, scale=head_r))
    # curl on the head
    curl = [(0.0, 0.0, 2.2), (0.0, -0.02, 2.33), (0.06, -0.02, 2.42), (0.13, -0.02, 2.38), (0.12, -0.02, 2.3), (0.06, -0.02, 2.31)]
    ch.add(tube(curl, 0.04, 10, radii=[0.08, 0.06, 0.045, 0.035, 0.03, 0.022]), cream, rigid("Sprout"))
    for s, side in ((1, "L"), (-1, "R")):
        ear_w = lambda co, side=side: {f"Ear_{side}": 1.0} if abs(co.x) > 0.48 else {f"Ear_{side}": 0.6, "Head": 0.4}
        ear_m = transform((0.38 * s, 0.03, 1.96), (8, 52 * s, 0))
        ch.add(leaf(1.02, 0.42, 0.05, curl=0.08, tip=0.85), glow, ear_w, ear_m)
        ch.add(leaf(0.78, 0.27, 0.03, curl=0.07, tip=0.85), soft, ear_w, ear_m @ transform((0, -0.03, 0.08)))
        # tail wings
        ch.add(leaf(0.3, 0.14, 0.03, curl=0.04), soft, rigid("Tail_1"), transform((0.06 * s, 0.33, 0.7), (-40, 50 * s, 0)))
        # arms with glowing cuffs and palms; legs with glowing soles
        paw = stubby_arm(ch, cream, cream, s, side, (0.31, -0.02, 1.0), (0.44, -0.1, 0.75), 0.08, 0.09)
        ch.add(torus(0.085, 0.022, 22, 8), gold, rigid(f"Forearm_{side}"), transform(Vector(paw) + Vector((0, 0.0, 0.1)), (0, 0, 0)))
        ch.add(sphere(0.045, 12, 8), soft, rigid(f"Hand_{side}"), transform(Vector(paw) + Vector((0, -0.07, -0.01))))
        stubby_leg(ch, cream, cream, s, side, 0.19, 0.52, foot_scale=(0.13, 0.18, 0.09), thigh=0.16)
        ch.add(cylinder(0.11, 0.11, 0.03, 24), soft, rigid(f"Foot_{side}"), transform(((0.22) * s, -0.06, 0.018), scale=(1, 1.3, 1)))
        ch.add(torus(0.12, 0.018, 24, 6), gold, rigid(f"LowerLeg_{side}"), transform((0.21 * s, 0, 0.24)))

    mats = organic.face_materials(ch, "#D9861A", lid_color="#5A3A12", blush="#FFB4A8")
    face = Face(Surface(head_c, head_r))
    for s in (1, -1):
        organic.eye(face, 0.19 * s, 0.04, 0.125, 0.145, mats, s)
        organic.brow(face, 0.2 * s, 0.26, 0.08, 0.02, ch.mat("brow", "#E0A030", rough=0.6), s)
    organic.cheeks(face, (0.33, -0.33), -0.11, 0.07, 0.04, mats["blush"])
    organic.mouth(face, -0.17, 0.11, mats)
    ch.face = face
