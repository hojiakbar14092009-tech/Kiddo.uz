"""
Human biped: Ziyo, the Uzbekistan guide (a child in national dress).

Costume, kept faithful to the reference: a navy doppi with gold ornament, a white shirt with a
stand collar, a navy vest with gold trim and almond (bodom) motifs, an ikat-patterned belbog'
(sash, the pattern is per-vertex colour, no texture), wide blue trousers and navy boots with gold.

Sleeves and trouser legs are single tubes with soft weights at the elbow and the knee, so they
bend smoothly; the hands, boots, doppi and sash are rigid on their bones.
"""

import math

from mathutils import Matrix, Vector

import organic
from kit import (
    Face,
    Surface,
    capsule,
    cylinder,
    extrude_outline,
    joint_blend,
    lathe,
    leaf,
    rigid,
    rounded_box,
    sphere,
    torus,
    transform,
    tube,
    blend,
)

NAVY = "#1D2A72"
GOLD = "#E8B53C"
SKIN = "#F4C49E"
HAIR = "#2B1C17"


def _square(bm, power=4.0):
    """Turn a round lathe into a rounded square (a doppi's four sides)."""
    for v in bm.verts:
        r = math.hypot(v.co.x, v.co.y)
        if r < 1e-6:
            continue
        a = math.atan2(v.co.y, v.co.x) - math.pi / 4
        k = (abs(math.cos(a)) ** power + abs(math.sin(a)) ** power) ** (-1 / power)
        v.co.x *= k * 0.86
        v.co.y *= k * 0.86
    return bm


def rhombus(w, h):
    return [(0, h), (w, 0), (0, -h), (-w, 0)]


def build_ziyo(ch):
    ch.bone("Root", (0, 0, 0))
    ch.bone("Hips", (0, 0, 0.66), "Root")
    ch.bone("Spine", (0, 0, 0.85), "Hips")
    ch.bone("Chest", (0, 0, 1.1), "Spine")
    ch.bone("Neck", (0, 0, 1.32), "Chest")
    ch.bone("Head", (0, 0, 1.4), "Neck")
    for s, side in ((1, "L"), (-1, "R")):
        ch.bone(f"Shoulder_{side}", (0.22 * s, 0, 1.26), "Chest")
        ch.bone(f"UpperArm_{side}", (0.33 * s, 0, 1.24), f"Shoulder_{side}")
        ch.bone(f"Forearm_{side}", (0.38 * s, 0, 0.98), f"UpperArm_{side}")
        ch.bone(f"Hand_{side}", (0.42 * s, -0.02, 0.73), f"Forearm_{side}")
        ch.bone(f"UpperLeg_{side}", (0.15 * s, 0, 0.62), "Hips")
        ch.bone(f"LowerLeg_{side}", (0.155 * s, 0, 0.38), f"UpperLeg_{side}")
        ch.bone(f"Foot_{side}", (0.16 * s, 0, 0.14), f"LowerLeg_{side}")
    ch.bone("Sash", (0.16, -0.26, 0.7), "Hips")

    skin = ch.mat("skin", SKIN, rough=0.55)
    hair = ch.mat("hair", HAIR, rough=0.5, coat=0.3)
    white = ch.mat("shirt", "#FAFAF7", rough=0.7)
    navy = ch.mat("navy", NAVY, rough=0.7)
    gold = ch.mat("gold", GOLD, rough=0.35, metal=0.5)
    blue = ch.mat("trousers", "#2647C6", rough=0.75)
    boot = ch.mat("boots", "#1B2560", rough=0.45, coat=0.3)
    sash = ch.mat("sash", "#FFFFFF", rough=0.75)

    # head, ears, nose, hair
    head_c, head_r = Vector((0, 0, 1.82)), Vector((0.46, 0.43, 0.48))
    ch.add(sphere(1.0, 40, 24), skin, rigid("Head"), transform(head_c, scale=head_r))
    for s in (1, -1):
        ch.add(sphere(1.0, 16, 10), skin, rigid("Head"), transform((0.45 * s, 0.02, 1.8), scale=(0.07, 0.05, 0.09)))
    ch.add(sphere(1.0, 16, 10), ch.mat("nose", "#EDB28C", rough=0.55), rigid("Head"), transform((0, -0.43, 1.76), scale=(0.05, 0.035, 0.04)))
    ch.add(sphere(1.0, 40, 24), hair, rigid("Head"), transform((0, 0.1, 1.95), scale=(0.49, 0.42, 0.44)))
    for x, z, rot in ((-0.26, 2.06, 25), (-0.1, 2.1, 8), (0.07, 2.1, -8), (0.24, 2.06, -25)):
        ch.add(sphere(1.0, 16, 10), hair, rigid("Head"), transform((x, -0.33, z), (20, rot, 0), (0.13, 0.09, 0.1)))
    for s in (1, -1):
        ch.add(sphere(1.0, 16, 10), hair, rigid("Head"), transform((0.43 * s, -0.08, 1.95), (0, 0, 0), (0.07, 0.12, 0.14)))

    # doppi: a four-sided cap with a gold rim and almond motifs
    doppi_prof = [(0.4, 2.15), (0.41, 2.24), (0.39, 2.36), (0.32, 2.45), (0.2, 2.5), (0, 2.51)]
    cap = _square(lathe(doppi_prof, 48, close_bottom=False))
    tilt = Matrix.Translation((0, 0.06, 2.3)) @ Matrix.Rotation(math.radians(-10), 4, "X") @ Matrix.Translation((0, 0, -2.3))
    ch.add(cap, navy, rigid("Head"), tilt)
    ch.add(_square(torus(0.405, 0.025, 48, 8)), gold, rigid("Head"), tilt @ Matrix.Translation((0, 0, 2.16)))
    for k in range(4):
        side = Matrix.Rotation(math.radians(45 + 90 * k), 4, "Z")
        motif = tilt @ side @ Matrix.Translation((0, -0.355, 2.3)) @ Matrix.Rotation(math.radians(-14), 4, "X")
        ch.add(leaf(0.16, 0.07, 0.012, tip=0.7), gold, rigid("Head"), motif @ Matrix.Translation((0, 0, -0.08)))
        for dx in (-0.12, 0.12):
            ch.add(sphere(0.022, 10, 6), gold, rigid("Head"), motif @ Matrix.Translation((dx, -0.005, 0)))
    ch.add(extrude_outline([(0.06 * math.cos(a), 0.06 * math.sin(a)) for a in [math.pi / 2 * i for i in range(4)]], 0.01), gold, rigid("Head"), tilt @ Matrix.Translation((0, 0, 2.515)) @ Matrix.Rotation(math.radians(90), 4, "X"))

    # neck, shirt, collar
    ch.add(cylinder(0.1, 0.1, 0.16, 20), skin, rigid("Neck"), transform((0, 0, 1.36)))
    shirt = [(0, 0.62), (0.29, 0.64), (0.33, 0.76), (0.33, 1.0), (0.3, 1.2), (0.2, 1.33), (0, 1.35)]
    body_w = blend("Spine", "Chest", (0, 0, 0.8), (0, 0, 1.15))
    ch.add(lathe(shirt, 36), white, body_w, transform(scale=(1, 0.8, 1)))
    ch.add(torus(0.12, 0.035, 24, 8), white, rigid("Chest"), transform((0, 0, 1.33)))
    ch.add(torus(0.125, 0.012, 24, 6), gold, rigid("Chest"), transform((0, 0, 1.36)))
    # vest with an open front (white placket) and gold trim
    vest = [(0.31, 0.66), (0.355, 0.78), (0.355, 1.0), (0.325, 1.2), (0.22, 1.32), (0.15, 1.34)]
    ch.add(lathe(vest, 36, close_top=False, close_bottom=False), navy, body_w, transform(scale=(1, 0.82, 1)))
    front = -0.355 * 0.82
    ch.add(rounded_box(0.13, 0.04, 0.6, 0.02), white, body_w, transform((0, front - 0.0, 1.0)))
    for s in (1, -1):
        ch.add(tube([(0.07 * s, front - 0.022, 0.7), (0.07 * s, front - 0.022, 1.26), (0.13 * s, front + 0.05, 1.32)], 0.012, 6), gold, body_w)
        for z in (0.88, 1.08):
            ch.add(leaf(0.1, 0.05, 0.012, tip=0.7), gold, body_w, transform((0.19 * s, -0.256, z - 0.05), (0, 0, 35 * s)))
    ch.add(torus(0.315, 0.014, 40, 6), gold, body_w, transform((0, 0, 0.66), scale=(1, 0.82, 1)))
    ch.add(leaf(0.2, 0.1, 0.012, tip=0.7), gold, body_w, transform((0, -front + 0.012, 0.82)))

    # ikat sash: a wrapped band of indigo, blue and white bands with gold diamonds, and two
    # tails hanging from a knot (material bands, no texture)
    ikat = [ch.mat("ikat_blue", "#2A62D8", rough=0.7), sash, ch.mat("ikat_indigo", "#1B3FA8", rough=0.7), sash]
    pieces = 28
    for k in range(pieces):
        turn = Matrix.Rotation(2 * math.pi * k / pieces, 4, "Z")
        ch.add(torus(0.335, 0.055, 3, 10, arc=2 * math.pi / pieces), ikat[k % 4], rigid("Hips"), transform((0, 0, 0.72), scale=(1, 0.84, 1)) @ turn)
    for k in range(-2, 3):
        a = math.radians(-90 + k * 22)
        x, y = 0.392 * math.cos(a), 0.392 * 0.84 * math.sin(a)
        ch.add(extrude_outline(rhombus(0.03, 0.04), 0.01), gold, rigid("Hips"), transform((x, y, 0.72), (0, 0, math.degrees(a) + 90)))
    ch.add(sphere(0.065, 14, 10), ikat[0], rigid("Sash"), transform((0.16, -0.3, 0.72)))
    for rot, x in ((8, 0.14), (-6, 0.2)):
        for i, z in enumerate((0.66, 0.58, 0.5)):
            ch.add(rounded_box(0.09, 0.025, 0.08, 0.01), ikat[i % 3], rigid("Sash"), transform((x, -0.31, z), (0, rot, 0)))
        ch.add(extrude_outline(rhombus(0.025, 0.03), 0.008), gold, rigid("Sash"), transform((x, -0.327, 0.58), (0, rot, 0)))

    # trousers, boots
    ch.add(lathe([(0, 0.5), (0.27, 0.52), (0.31, 0.6), (0.3, 0.7), (0, 0.72)], 32), blue, rigid("Hips"), transform(scale=(1, 0.85, 1)))
    for s, side in ((1, "L"), (-1, "R")):
        leg = [(0.15 * s, 0, 0.62), (0.16 * s, -0.01, 0.4), (0.16 * s, 0, 0.22)]
        ch.add(tube(leg, 0.15, 18, radii=[0.15, 0.16, 0.12]), blue, joint_blend(f"UpperLeg_{side}", f"LowerLeg_{side}", (0.155 * s, 0, 0.38), (0, 0, -1), 0.06))
        ch.add(cylinder(0.105, 0.11, 0.16, 20), boot, rigid(f"Foot_{side}"), transform((0.16 * s, 0, 0.18)))
        ch.add(sphere(1.0, 22, 14), boot, rigid(f"Foot_{side}"), transform((0.16 * s, -0.07, 0.08), scale=(0.12, 0.22, 0.09)))
        ch.add(torus(0.11, 0.015, 20, 6), gold, rigid(f"Foot_{side}"), transform((0.16 * s, 0, 0.255)))
        ch.add(leaf(0.1, 0.05, 0.01, tip=0.7), gold, rigid(f"Foot_{side}"), transform((0.16 * s, -0.2, 0.12), (-60, 0, 0)))
        # sleeves bend at the elbow, gold cuffs, hands
        sh, el, wr = Vector((0.31 * s, 0, 1.24)), Vector((0.38 * s, 0, 0.98)), Vector((0.42 * s, -0.02, 0.76))
        ch.add(sphere(0.11, 18, 12), white, rigid(f"UpperArm_{side}"), transform(sh))
        ch.add(tube([sh, el, wr], 0.095, 16, radii=[0.1, 0.09, 0.085]), white, joint_blend(f"UpperArm_{side}", f"Forearm_{side}", el, wr - sh, 0.05))
        ch.add(torus(0.085, 0.022, 20, 6), navy, rigid(f"Forearm_{side}"), transform(wr + Vector((0, 0, 0.02))))
        ch.add(torus(0.086, 0.01, 20, 6), gold, rigid(f"Forearm_{side}"), transform(wr + Vector((0, 0, 0.045))))
        ch.add(sphere(1.0, 18, 12), skin, rigid(f"Hand_{side}"), transform(wr + Vector((0.01 * s, -0.01, -0.08)), scale=(0.07, 0.06, 0.085)))
        ch.add(capsule(0.025, 0.04, 10, 4), skin, rigid(f"Hand_{side}"), transform(wr + Vector((-0.04 * s, -0.05, -0.05)), (0, 30 * s, 0)))

    mats = organic.face_materials(ch, "#5A3418", lid_color="#2B1C17", blush="#F7A39A")
    face = Face(Surface(head_c, head_r))
    for s in (1, -1):
        organic.eye(face, 0.16 * s, 0.0, 0.1, 0.12, mats, s)
        organic.brow(face, 0.17 * s, 0.19, 0.085, 0.03, hair, s)
    organic.cheeks(face, (0.28, -0.28), -0.12, 0.065, 0.04, mats["blush"])
    organic.mouth(face, -0.2, 0.11, mats)
    ch.face = face
