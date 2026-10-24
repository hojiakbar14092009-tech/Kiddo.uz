"""
Prop characters: Scribble (a pencil) and Story (an open book).

The prop itself is the body and it stays rigid (wood and covers do not bend like rubber): the
pencil leans as a whole on its Head bone, the book bows on its Head bone and opens with its two
cover bones. Arms hang from the prop; legs from the hips.
"""

import math

from mathutils import Vector

import organic
from kit import (
    Face,
    PlaneSurface,
    capsule,
    cylinder,
    lathe,
    rigid,
    rounded_box,
    sphere,
    torus,
    transform,
    tube,
    joint_blend,
)


def thin_limbs(ch, s, side, shoulder, elbow, wrist, limb_mat, glove_mat, cuff_mats, radius=0.04):
    sh, el, wr = Vector(shoulder), Vector(elbow), Vector(wrist)
    ch.add(tube([sh, el, wr], radius, 12), limb_mat, joint_blend(f"UpperArm_{side}", f"Forearm_{side}", el, wr - sh, 0.04))
    ch.add(torus(0.07, 0.025, 20, 8), cuff_mats[0], rigid(f"Hand_{side}"), transform(wr + Vector((0, 0, -0.01))))
    if len(cuff_mats) > 1:
        ch.add(torus(0.072, 0.01, 20, 6), cuff_mats[1], rigid(f"Hand_{side}"), transform(wr + Vector((0, 0, 0.015))))
    hand = wr + (wr - el).normalized() * 0.09
    ch.add(sphere(1.0, 18, 12), glove_mat, rigid(f"Hand_{side}"), transform(hand, scale=(0.09, 0.075, 0.095)))
    ch.add(capsule(0.035, 0.05, 10, 4), glove_mat, rigid(f"Hand_{side}"), transform(hand + Vector((-0.06 * s, -0.05, 0.03)), (0, 35 * s, 0)))


def sneaker(ch, s, side, x, main, sole, accent=None):
    ch.add(sphere(1.0, 24, 14), main, rigid(f"Foot_{side}"), transform((x * s, -0.06, 0.11), scale=(0.14, 0.23, 0.1)))
    ch.add(cylinder(1.0, 1.0, 1.0, 28), sole, rigid(f"Foot_{side}"), transform((x * s, -0.06, 0.035), scale=(0.15, 0.24, 0.055)))
    ch.add(sphere(1.0, 16, 10), sole, rigid(f"Foot_{side}"), transform((x * s, -0.2, 0.1), scale=(0.1, 0.09, 0.07)))
    if accent is not None:
        ch.add(torus(0.07, 0.016, 18, 6), accent, rigid(f"Foot_{side}"), transform((x * s, 0.0, 0.19)))


def legs(ch, s, side, x, top, mat, radius=0.04):
    ch.add(tube([(x * s, 0, top), ((x + 0.005) * s, -0.01, 0.4), ((x + 0.01) * s, 0, 0.16)], radius, 12), mat, joint_blend(f"UpperLeg_{side}", f"LowerLeg_{side}", ((x + 0.005) * s, 0, 0.4), (0, 0, -1), 0.04))


# ---------------------------------------------------------------------------------------------
# Scribble


def build_scribble(ch):
    ch.bone("Root", (0, 0, 0))
    ch.bone("Hips", (0, 0, 0.62), "Root")
    ch.bone("Spine", (0, 0, 0.7), "Hips")
    ch.bone("Chest", (0, 0, 0.9), "Spine")
    ch.bone("Neck", (0, 0, 0.98), "Chest")
    ch.bone("Head", (0, 0, 1.0), "Neck")  # the whole pencil leans on this pivot
    for s, side in ((1, "L"), (-1, "R")):
        ch.bone(f"Shoulder_{side}", (0.36 * s, 0, 1.56), "Head")
        ch.bone(f"UpperArm_{side}", (0.42 * s, 0, 1.55), f"Shoulder_{side}")
        ch.bone(f"Forearm_{side}", (0.52 * s, -0.03, 1.36), f"UpperArm_{side}")
        ch.bone(f"Hand_{side}", (0.6 * s, -0.05, 1.17), f"Forearm_{side}")
        ch.bone(f"UpperLeg_{side}", (0.14 * s, 0, 0.62), "Hips")
        ch.bone(f"LowerLeg_{side}", (0.145 * s, 0, 0.4), f"UpperLeg_{side}")
        ch.bone(f"Foot_{side}", (0.155 * s, 0, 0.16), f"LowerLeg_{side}")

    yellow = ch.mat("pencil", "#FFC928", rough=0.4, coat=0.4)
    stripe = ch.mat("pencil_edge", "#F2A818", rough=0.45)
    wood = ch.mat("wood", "#EBC89B", rough=0.7)
    lead = ch.mat("lead", "#3A3A40", rough=0.4)
    metal = ch.mat("ferrule", "#C9CED8", rough=0.2, metal=0.9)
    eraser = ch.mat("eraser", "#FF6FA8", rough=0.6)
    black = ch.mat("limbs", "#26262E", rough=0.5)
    white = ch.mat("glove", "#FAFAFA", rough=0.45)
    blue = ch.mat("blue", "#1F6FE8", rough=0.35, coat=0.3)

    body = rigid("Head")
    r = 0.42
    # hexagonal yellow body (flat shaded facets), sharpened wood and lead tip
    ch.add(lathe([(0, 1.0), (r, 1.0), (r, 2.1), (0, 2.1)], 6), yellow, body, smooth=False)
    for k in range(6):
        a = math.radians(60 * k)
        ch.add(cylinder(0.012, 0.012, 1.1, 6), stripe, body, transform((r * math.cos(a), r * math.sin(a), 1.55)))
    ch.add(lathe([(0.11, 0.62), (r, 1.0)], 6, close_top=False), wood, body, smooth=False)
    ch.add(lathe([(0, 0.48), (0.11, 0.62)], 18, close_top=False), lead, body)
    # ferrule rings and a rounded eraser
    ch.add(cylinder(r + 0.01, r + 0.01, 0.26, 36), metal, body, transform((0, 0, 2.23)))
    for z in (2.13, 2.23, 2.33):
        ch.add(torus(r + 0.012, 0.018, 36, 8), metal, body, transform((0, 0, z)))
    ch.add(lathe([(0, 2.35), (r - 0.01, 2.35), (r - 0.01, 2.5), (0.39, 2.58), (0.33, 2.64), (0.2, 2.68), (0, 2.69)], 36), eraser, body)

    for s, side in ((1, "L"), (-1, "R")):
        sh = (0.4 * s, 0, 1.55)
        ch.add(sphere(0.06, 12, 8), yellow, rigid(f"UpperArm_{side}"), transform(sh))
        thin_limbs(ch, s, side, sh, (0.52 * s, -0.03, 1.36), (0.6 * s, -0.05, 1.17), yellow, white, (blue,), 0.045)
        legs(ch, s, side, 0.14, 0.7, black)
        sneaker(ch, s, side, 0.16, white, blue, blue)

    mats = organic.face_materials(ch, "#6B3E1C", lid_color="#3A2614", mouth_color="#7A2A2A")
    y0 = -r * math.cos(math.radians(30)) - 0.002
    surf = PlaneSurface(y0, 1.68)
    face = Face(surf)
    for s in (1, -1):
        organic.eye(face, 0.105 * s, 0.05, 0.08, 0.11, mats, s)
        organic.brow(face, 0.11 * s, 0.21, 0.07, 0.022, ch.mat("brow", "#3A2614", rough=0.6), s)
    organic.mouth(face, -0.15, 0.1, mats)
    ch.face = face


# ---------------------------------------------------------------------------------------------
# Story


def build_story(ch):
    open_deg = 18.0
    ch.bone("Root", (0, 0, 0))
    ch.bone("Hips", (0, 0, 0.5), "Root")
    ch.bone("Spine", (0, 0, 0.52), "Hips")
    ch.bone("Chest", (0, 0, 0.54), "Spine")
    ch.bone("Neck", (0, 0, 0.56), "Chest")
    ch.bone("Head", (0, 0.05, 0.58), "Neck")  # the book bows on this pivot
    ch.bone("Cover_L", (0, 0.1, 1.05), "Head")
    ch.bone("Cover_R", (0, 0.1, 1.05), "Head")
    ch.bone("Page_1", (0, 0.06, 1.52), "Head")
    ch.bone("Page_2", (0, 0.06, 1.52), "Head")
    ch.bone("Bookmark", (-0.25, 0.05, 1.56), "Head")
    for s, side in ((1, "L"), (-1, "R")):
        ch.bone(f"Shoulder_{side}", (0.66 * s, 0.24, 1.02), f"Cover_{side}")
        ch.bone(f"UpperArm_{side}", (0.72 * s, 0.22, 1.0), f"Shoulder_{side}")
        ch.bone(f"Forearm_{side}", (0.84 * s, 0.14, 0.84), f"UpperArm_{side}")
        ch.bone(f"Hand_{side}", (0.9 * s, 0.08, 0.68), f"Forearm_{side}")
        ch.bone(f"UpperLeg_{side}", (0.18 * s, 0.05, 0.55), "Hips")
        ch.bone(f"LowerLeg_{side}", (0.185 * s, 0.05, 0.4), f"UpperLeg_{side}")
        ch.bone(f"Foot_{side}", (0.195 * s, 0.0, 0.16), f"LowerLeg_{side}")

    cover = ch.mat("cover", "#2457D8", rough=0.45, coat=0.3)
    paper = ch.mat("paper", "#FBF4E2", rough=0.8)
    edge = ch.mat("page_edge", "#EADDBF", rough=0.8)
    gold = ch.mat("gold", "#E9B744", rough=0.3, metal=0.6)
    red = ch.mat("ribbon_red", "#E23B3B", rough=0.6)
    ribbon = ch.mat("ribbon_blue", "#2D6BE6", rough=0.6)
    dark = ch.mat("limbs", "#252A3A", rough=0.5)
    white = ch.mat("glove", "#FAFAFA", rough=0.45)

    for s, side in ((1, "L"), (-1, "R")):
        hinge = transform((0, 0.1, 0), (0, 0, open_deg * s)) @ transform((0, -0.1, 0))
        w = rigid(f"Cover_{side}")
        ch.add(rounded_box(0.76, 0.05, 1.02, 0.025), cover, w, hinge @ transform((0.38 * s, 0.13, 1.05)))
        ch.add(rounded_box(0.68, 0.11, 0.94, 0.02), paper, w, hinge @ transform((0.36 * s, 0.05, 1.05)))
        for dz in (-0.03, 0.03):
            ch.add(rounded_box(0.012, 0.1, 0.9, 0.004), edge, w, hinge @ transform((0.7 * s, 0.05 + dz * 0.3, 1.05)))
        for cz in (1.52, 0.58):
            ch.add(rounded_box(0.12, 0.07, 0.12, 0.03), gold, w, hinge @ transform((0.72 * s, 0.13, cz)))
        # a page tip curling at the top (flutters)
        ch.add(rounded_box(0.5, 0.012, 0.06, 0.006), paper, rigid("Page_1" if s > 0 else "Page_2"), hinge @ transform((0.32 * s, 0.0, 1.53), (14, 0, 0)))
    ch.add(cylinder(0.05, 0.05, 1.0, 16), cover, rigid("Head"), transform((0, 0.14, 1.05)))
    ch.add(rounded_box(0.07, 0.015, 0.34, 0.006), red, rigid("Bookmark"), transform((-0.26, 0.04, 1.66), (0, -8, 0)))
    ch.add(tube([(0.25, 0.05, 0.58), (0.27, 0.0, 0.45), (0.26, -0.04, 0.34)], 0.02, 8, radii=[0.03, 0.028, 0.026]), ribbon, rigid("Head"))

    for s, side in ((1, "L"), (-1, "R")):
        ch.add(sphere(0.05, 12, 8), dark, rigid(f"UpperArm_{side}"), transform((0.7 * s, 0.22, 1.0)))
        thin_limbs(ch, s, side, (0.7 * s, 0.22, 1.0), (0.84 * s, 0.14, 0.84), (0.9 * s, 0.08, 0.68), dark, white, (cover, gold), 0.04)
        legs(ch, s, side, 0.18, 0.58, dark, 0.045)
        sneaker(ch, s, side, 0.2, white, cover, gold)

    mats = organic.face_materials(ch, "#1F5FD6", lid_color="#1A2340", mouth_color="#7A2232", blush="#FFB3B8")
    k = math.tan(math.radians(open_deg))
    surf = PlaneSurface(-0.012, 1.08, k=k)
    face = Face(surf)
    for s in (1, -1):
        organic.eye(face, 0.25 * s, 0.12, 0.13, 0.16, mats, s)
        organic.brow(face, 0.26 * s, 0.38, 0.1, 0.03, ch.mat("brow", "#1A2340", rough=0.6), s)
    organic.cheeks(face, (0.42, -0.42), -0.08, 0.07, 0.045, mats["blush"])
    organic.mouth(face, -0.16, 0.15, mats)
    ch.face = face
    ch.face_bone = lambda co: {"Cover_L": 1.0} if co.x >= 0 else {"Cover_R": 1.0}
