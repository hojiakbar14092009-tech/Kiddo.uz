"""
Story animals (Phase 78): the heroes of "My story" as real rigged 3D characters.

Quyoncha (rabbit), Mushukcha (cat), Kuchukcha (puppy) and Tulkicha (fox) are chibi quadrupeds
that sit upright at rest, as on the owner's sheets: the front legs use the arm bones
(UpperArm / Forearm / Hand) and hang to the ground in front of the chest, the hind legs use the
leg bones. So the shared clip library still works (a wave lifts a front paw, a celebration sits
up with both paws high) and the walk is their own: the body tips forward onto four legs and
trots with diagonal pairs (`trot`). Ayiqcha (bear) and Pingvincha (penguin) are bipeds.

Same bone names, same face morph targets as the mascots, so the app drives them with the same
controller. Built at the mascots' scale (about 2.3 units tall) and placed small on the stage.
"""

import math

from mathutils import Vector

import clips as c
import organic
from creatures import creature_skeleton, stubby_arm, stubby_leg
from kit import (
    Face,
    Surface,
    blend,
    chain,
    cylinder,
    extrude_outline,
    lathe,
    leaf,
    rigid,
    rounded_box,
    sphere,
    star_outline,
    torus,
    transform,
    tube,
)

# ---------------------------------------------------------------------------------------------
# the seated chibi quadruped

HIPS, CHEST, NECK_Z = 0.45, 0.82, 1.12
SHOULDER = (0.2, -0.34, 0.8)
ARM_DIR = (0.02, -0.04, -0.35)
LEG_X = 0.31
HEAD_C, HEAD_R = (0, -0.06, 1.58), (0.62, 0.53, 0.55)


def body_radius(z):
    for (r0, z0), (r1, z1) in zip(_BODY, _BODY[1:]):
        if z0 <= z <= z1:
            return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
    return 0.2


def body_front_y(z):
    """Front of the body lathe at height z (for chest decorations)."""
    return 0.04 - body_radius(z) * 0.92


_BODY = [(0, 0.04), (0.36, 0.06), (0.48, 0.2), (0.5, 0.4), (0.46, 0.62), (0.38, 0.84), (0.29, 1.0), (0.2, 1.1), (0, 1.17)]


def quad_skeleton(ch):
    creature_skeleton(ch, hips=HIPS, chest=CHEST, head=NECK_Z + 0.1, shoulder=SHOULDER, arm_dir=ARM_DIR, leg_x=LEG_X)


def quad_body(ch, fur, cream, paw_pad=None, belly=True, paw=None, hind_paw=None):
    """Pear body leaning a little back, belly patch, front legs to the ground, round haunches."""
    paw = paw if paw is not None else fur
    hind_paw = hind_paw if hind_paw is not None else paw
    body_w = blend("Hips", "Chest", (0, 0, 0.35), (0, 0, 1.0))
    # the body sits slightly behind the front legs
    ch.add(lathe(_BODY, 36), fur, body_w, transform((0, 0.04, 0), scale=(1, 0.92, 1)))
    if belly:
        ch.add(sphere(1.0, 28, 16), cream, body_w, transform((0, -0.33, 0.6), scale=(0.3, 0.15, 0.36)))
    for s, side in ((1, "L"), (-1, "R")):
        sx, sy, sz = SHOULDER
        top = Vector((sx * s, sy + 0.04, sz + 0.06))
        mid = Vector(((sx + ARM_DIR[0]) * s, sy + ARM_DIR[1], sz + ARM_DIR[2]))
        low = Vector(((sx + 2 * ARM_DIR[0]) * s, sy + 2 * ARM_DIR[1], 0.1))
        ch.add(tube([top, mid, low], 0.09, 16, radii=[0.11, 0.088, 0.08]), fur, blend(f"UpperArm_{side}", f"Forearm_{side}", top, low))
        ch.add(sphere(1.0, 20, 12), paw, rigid(f"Hand_{side}"), transform(low + Vector((0, -0.04, -0.03)), scale=(0.1, 0.12, 0.075)))
        # haunch and hind foot
        ch.add(sphere(1.0, 24, 14), fur, blend("Hips", f"UpperLeg_{side}", (0.1 * s, 0.05, 0.42), (LEG_X * s, 0.05, 0.25)), transform((LEG_X * s, 0.04, 0.26), scale=(0.2, 0.3, 0.25)))
        ch.add(sphere(1.0, 20, 12), hind_paw, rigid(f"Foot_{side}"), transform(((LEG_X + 0.03) * s, -0.24, 0.065), scale=(0.11, 0.17, 0.07)))
        if paw_pad is not None:
            ch.add(sphere(1.0, 14, 8), paw_pad, rigid(f"Foot_{side}"), transform(((LEG_X + 0.03) * s, -0.405, 0.075), scale=(0.06, 0.015, 0.035)))
    return body_w


def head(ch, fur, muzzle_mat, nose_mat, muzzle=(0.25, 0.15, 0.16), muzzle_z=-0.12, cheeks=None):
    ch.add(sphere(1.0, 40, 24), fur, rigid("Head"), transform(HEAD_C, scale=HEAD_R))
    mc = (0, HEAD_C[1] - HEAD_R[1] + muzzle[1] * 0.45, HEAD_C[2] + muzzle_z)
    ch.add(sphere(1.0, 30, 18), muzzle_mat, rigid("Head"), transform(mc, scale=muzzle))
    if cheeks is not None:
        for s in (1, -1):
            ch.add(sphere(1.0, 20, 12), cheeks, rigid("Head"), transform((0.3 * s, HEAD_C[1] - 0.26, HEAD_C[2] - 0.2), scale=(0.17, 0.14, 0.12)))
    nose_p = (0, mc[1] - muzzle[1] * 0.92, mc[2] + muzzle[2] * 0.45)
    ch.add(sphere(1.0, 16, 10), nose_mat, rigid("Head"), transform(nose_p, scale=(0.055, 0.035, 0.038)))
    return Surface(mc, muzzle)


def face(ch, iris, lid, muzzle_surface, brow_color, eye_x=0.2, eye_z=0.06, eye_rx=0.125, eye_rz=0.15, blush="#FF9DAA", mouth_z=-0.06, mouth_w=0.11):
    mats = organic.face_materials(ch, iris, lid_color=lid, mouth_color="#6E2230", blush=blush)
    f = Face(Surface(HEAD_C, HEAD_R))
    for s in (1, -1):
        organic.eye(f, eye_x * s, eye_z, eye_rx, eye_rz, mats, s)
        organic.brow(f, (eye_x + 0.01) * s, eye_z + eye_rz + 0.08, 0.075, 0.02, ch.mat("brow", brow_color, rough=0.6), s)
    organic.cheeks(f, (0.33, -0.33), eye_z - 0.17, 0.065, 0.038, mats["blush"])
    organic.mouth(f, mouth_z, mouth_w, mats, muzzle_surface)
    ch.face = f


def ear_bones(ch, x, z, chain_len=0.0):
    for s, side in ((1, "L"), (-1, "R")):
        ch.bone(f"Ear_{side}", (x * s, HEAD_C[1] + 0.05, z), "Head")


def bandana(ch, mat, z=0.98, width=0.27, drop=0.25):
    """A triangle scarf on the chest, its knot hidden by the head."""
    y = body_front_y(z) - 0.005
    w = blend("Chest", "Neck", (0, 0, 0.8), (0, 0, 1.1))
    ch.add(extrude_outline([(-width, 0.05), (width, 0.05), (0.0, -drop)], 0.06), mat, w, transform((0, y, z), (-14, 0, 0)))
    ch.add(torus(body_radius(z + 0.05) + 0.02, 0.045, 28, 8), mat, w, transform((0, 0.04, z + 0.05), scale=(1, 0.92, 1)))
    return y, w


def collar(ch, mat, tag_mat, z=1.04, tag=True):
    w = blend("Chest", "Neck", (0, 0, 0.8), (0, 0, 1.1))
    ch.add(torus(body_radius(z) + 0.02, 0.038, 30, 8), mat, w, transform((0, 0.04, z), scale=(1, 0.92, 1)))
    if tag:
        y = body_front_y(z - 0.09) - 0.02
        ch.add(cylinder(0.075, 0.075, 0.025, 20), tag_mat, w, transform((0, y, z - 0.09), (90, 0, 0)))
    return w


def paw_print(ch, mat, at, weights, scale=1.0):
    x, y, z = at
    ch.add(sphere(1.0, 12, 8), mat, weights, transform((x, y - 0.012, z - 0.012 * scale), scale=(0.03 * scale, 0.012, 0.026 * scale)))
    for dx, dz in ((-0.032, 0.022), (-0.011, 0.038), (0.011, 0.038), (0.032, 0.022)):
        ch.add(sphere(1.0, 8, 6), mat, weights, transform((x + dx * scale, y - 0.012, z + dz * scale), scale=(0.011 * scale, 0.01, 0.012 * scale)))


# ---------------------------------------------------------------------------------------------
# Quyoncha: white rabbit, long pink ears, purple bandana with a star, puff tail


def build_rabbit(ch):
    quad_skeleton(ch)
    ear_bones(ch, 0.2, 1.98)
    ch.bone("Tail_1", (0, 0.4, 0.22), "Hips")
    fur = ch.mat("fur", "#F4F0F2", rough=0.7)
    pink = ch.mat("ear_pink", "#F7A8BE", rough=0.6)
    nose = ch.mat("nose", "#F27D9B", rough=0.4)
    purple = ch.mat("bandana", "#9B6BDA", rough=0.55)
    star = ch.mat("star", "#FFC52E", rough=0.4)
    teeth = ch.mat("teeth", "#FFFFFF", rough=0.3)
    quad_body(ch, fur, fur, paw_pad=pink, belly=False)
    surf = head(ch, fur, fur, nose, muzzle=(0.23, 0.14, 0.14))
    for s, side in ((1, "L"), (-1, "R")):
        ew = lambda co, side=side: {f"Ear_{side}": 1.0} if co.z > 2.02 else {f"Ear_{side}": 0.6, "Head": 0.4}
        m = transform((0.2 * s, HEAD_C[1] + 0.06, 1.94), (-6, 13 * s, 0))
        ch.add(leaf(0.86, 0.17, 0.07, curl=0.05, tip=0.55), fur, ew, m)
        ch.add(leaf(0.7, 0.1, 0.03, curl=0.05, tip=0.55), pink, ew, m @ transform((0, -0.05, 0.08)))
    ch.add(sphere(1.0, 20, 12), fur, rigid("Tail_1"), transform((0, 0.44, 0.24), scale=(0.15, 0.13, 0.14)))
    y, w = bandana(ch, purple)
    ch.add(extrude_outline(star_outline(0.075, 0.032), 0.025), star, w, transform((0, y - 0.03, 0.92), (-14, 0, 0)))
    # two front teeth under the nose
    mc = surf.c
    for s in (1, -1):
        ch.add(sphere(1.0, 10, 6), teeth, rigid("Head"), transform((0.022 * s, mc.y - 0.13, mc.z - 0.1), scale=(0.02, 0.008, 0.026)))
    face(ch, "#5A3420", "#3A2418", surf, "#C9B8BE", mouth_z=-0.02, mouth_w=0.1)


# ---------------------------------------------------------------------------------------------
# Mushukcha: orange tabby kitten, purple collar with a paw tag, long curled tail


def build_cat(ch):
    quad_skeleton(ch)
    ear_bones(ch, 0.3, 1.92)
    tail = [(0, 0.38, 0.16), (0.2, 0.62, 0.14), (0.38, 0.72, 0.34), (0.42, 0.66, 0.62), (0.36, 0.56, 0.78)]
    for i, (p, parent) in enumerate(((tail[0], "Hips"), (tail[1], "Tail_1"), (tail[2], "Tail_2"))):
        ch.bone(f"Tail_{i + 1}", p, parent)
    fur = ch.mat("fur", "#F5A33C", rough=0.65)
    stripe = ch.mat("stripes", "#D9761E", rough=0.65)
    cream = ch.mat("cream", "#FBE8CF", rough=0.7)
    pink = ch.mat("ear_pink", "#F7A3A8", rough=0.6)
    nose = ch.mat("nose", "#F28A98", rough=0.4)
    purple = ch.mat("collar", "#8B5CD6", rough=0.5)
    gold = ch.mat("tag", "#FFC845", rough=0.3, metal=0.3)
    body_w = quad_body(ch, fur, cream, paw_pad=pink, paw=cream)
    surf = head(ch, fur, cream, nose, muzzle=(0.22, 0.13, 0.13))
    # tabby stripes on the forehead and back
    for k, x in enumerate((-0.11, 0.0, 0.11)):
        ch.add(sphere(1.0, 12, 8), stripe, rigid("Head"), transform((x, HEAD_C[1] - 0.4, HEAD_C[2] + 0.36 - 0.02 * abs(k - 1)), (-40, 0, 0), scale=(0.025, 0.014, 0.09)))
    for z in (0.45, 0.65, 0.85):
        ch.add(torus(body_radius(z) + 0.005, 0.024, 26, 6, arc=math.pi * 0.9), stripe, body_w, transform((0, 0.04, z), (0, 0, 9), scale=(1, 0.92, 1)))
    for s, side in ((1, "L"), (-1, "R")):
        ew = lambda co, side=side: {f"Ear_{side}": 1.0} if co.z > 1.98 else {f"Ear_{side}": 0.6, "Head": 0.4}
        m = transform((0.3 * s, HEAD_C[1] + 0.02, 1.88), (-4, 30 * s, 0))
        ch.add(leaf(0.4, 0.21, 0.06, tip=0.35), fur, ew, m)
        ch.add(leaf(0.3, 0.13, 0.03, tip=0.35), pink, ew, m @ transform((0, -0.04, 0.04)))
    tw = chain(["Tail_1", "Tail_2", "Tail_3", "Tail_3"], tail)
    ch.add(tube(tail, 0.07, 14, radii=[0.08, 0.075, 0.072, 0.068, 0.05]), fur, tw)
    ch.add(sphere(1.0, 14, 10), cream, rigid("Tail_3"), transform(tail[-1], scale=(0.06, 0.06, 0.07)))
    w = collar(ch, purple, gold)
    paw_print(ch, purple, (0, body_front_y(0.95) - 0.035, 0.95), w, 0.8)
    face(ch, "#6A3F1E", "#3A2418", surf, "#D9761E", mouth_z=-0.06)
    # whiskers
    white = ch.mat("whiskers", "#FFFFFF", rough=0.4)
    for s in (1, -1):
        for dz, ang in ((0.0, 6), (-0.035, -6)):
            a = Vector((0.13 * s, surf.c.y - 0.06, surf.c.z + dz))
            b = a + Vector((0.2 * s, 0.05, math.sin(math.radians(ang)) * 0.2))
            ch.add(tube([a, b], 0.006, 5), white, rigid("Head"))


# ---------------------------------------------------------------------------------------------
# Kuchukcha: cream puppy with brown floppy ears and patches, red collar with a gold tag


def build_dog(ch):
    quad_skeleton(ch)
    ear_bones(ch, 0.54, 1.9)
    tail = [(0, 0.38, 0.3), (0, 0.55, 0.42), (0, 0.6, 0.62)]
    ch.bone("Tail_1", tail[0], "Hips")
    ch.bone("Tail_2", tail[1], "Tail_1")
    fur = ch.mat("fur", "#FBF1E2", rough=0.7)
    brown = ch.mat("patch", "#C77A3A", rough=0.65)
    nose = ch.mat("nose", "#4A2C20", rough=0.35)
    red = ch.mat("collar", "#E5302E", rough=0.5)
    gold = ch.mat("tag", "#FFC233", rough=0.3, metal=0.35)
    pink = ch.mat("pads", "#E9A08E", rough=0.6)
    body_w = quad_body(ch, fur, fur, paw_pad=pink, belly=False)
    surf = head(ch, fur, fur, nose, muzzle=(0.25, 0.16, 0.15))
    # brown cap over the top of the head and around one eye, patches on the back
    ch.add(sphere(1.0, 32, 18), brown, rigid("Head"), transform((0, HEAD_C[1] + 0.06, HEAD_C[2] + 0.1), scale=(0.6, 0.5, 0.48)))
    for p, r in (((0.28, 0.22, 0.6), 0.13), ((-0.3, 0.12, 0.4), 0.1), ((0.0, 0.36, 0.5), 0.12)):
        ch.add(sphere(1.0, 14, 10), brown, body_w, transform(p, scale=(r, r, r * 0.8)))
    for s, side in ((1, "L"), (-1, "R")):
        ew = lambda co, side=side: {f"Ear_{side}": 1.0} if abs(co.x) > 0.6 else {f"Ear_{side}": 0.6, "Head": 0.4}
        ch.add(leaf(0.62, 0.22, 0.08, curl=-0.05, tip=1.3), brown, ew, transform((0.52 * s, HEAD_C[1] - 0.02, 1.98), (0, 152 * s, 0)))
    tw = chain(["Tail_1", "Tail_2", "Tail_2"], tail)
    ch.add(tube(tail, 0.06, 12, radii=[0.08, 0.065, 0.035]), brown, tw)
    w = collar(ch, red, gold)
    paw_print(ch, red, (0, body_front_y(0.95) - 0.035, 0.95), w, 0.8)
    face(ch, "#4A2A18", "#3A2418", surf, "#B87035", mouth_z=-0.07, mouth_w=0.1)


# ---------------------------------------------------------------------------------------------
# Tulkicha: orange fox, cream chest and muzzle, dark socks and ear tips, red bandana, bushy tail


def build_fox(ch):
    quad_skeleton(ch)
    ear_bones(ch, 0.29, 1.95)
    tail = [(0.05, 0.36, 0.14), (0.3, 0.58, 0.16), (0.5, 0.56, 0.3), (0.58, 0.36, 0.42)]
    for i, (p, parent) in enumerate(((tail[0], "Hips"), (tail[1], "Tail_1"), (tail[2], "Tail_2"))):
        ch.bone(f"Tail_{i + 1}", p, parent)
    fur = ch.mat("fur", "#F07A1E", rough=0.65)
    cream = ch.mat("cream", "#FFF1E0", rough=0.7)
    dark = ch.mat("socks", "#6B3A22", rough=0.6)
    nose = ch.mat("nose", "#3A2018", rough=0.35)
    red = ch.mat("bandana", "#E5302E", rough=0.5)
    gold = ch.mat("paw", "#FFC52E", rough=0.4)
    quad_body(ch, fur, cream, paw=dark, hind_paw=dark)
    surf = head(ch, fur, cream, nose, muzzle=(0.22, 0.17, 0.13), muzzle_z=-0.14, cheeks=cream)
    for s, side in ((1, "L"), (-1, "R")):
        ew = lambda co, side=side: {f"Ear_{side}": 1.0} if co.z > 2.0 else {f"Ear_{side}": 0.6, "Head": 0.4}
        m = transform((0.29 * s, HEAD_C[1] + 0.03, 1.88), (-5, 24 * s, 0))
        ch.add(leaf(0.56, 0.24, 0.06, tip=0.4), fur, ew, m)
        ch.add(leaf(0.42, 0.14, 0.03, tip=0.4), cream, ew, m @ transform((0, -0.045, 0.05)))
        ch.add(leaf(0.18, 0.1, 0.07, tip=0.4), dark, ew, m @ transform((0, 0.004, 0.4)))
    tw = chain(["Tail_1", "Tail_2", "Tail_3", "Tail_3"], tail)
    ch.add(tube(tail, 0.15, 18, radii=[0.08, 0.17, 0.17, 0.1]), fur, tw)
    ch.add(sphere(1.0, 18, 12), cream, rigid("Tail_3"), transform((0.6, 0.3, 0.46), (30, 0, 0), scale=(0.11, 0.11, 0.15)))
    y, w = bandana(ch, red)
    paw_print(ch, gold, (0, y - 0.03, 0.9), w, 1.0)
    face(ch, "#5A3218", "#3A2418", surf, "#B85A18", mouth_z=-0.06)


# ---------------------------------------------------------------------------------------------
# Ayiqcha: brown bear cub, yellow cap and scarf with a paw, teal backpack (biped)


def build_bear(ch):
    creature_skeleton(ch, hips=0.5, chest=1.0, head=1.3, shoulder=(0.33, -0.04, 1.0), arm_dir=(0.06, -0.06, -0.13), leg_x=0.22)
    ch.bone("Ear_L", (0.4, 0.0, 2.08), "Head")
    ch.bone("Ear_R", (-0.4, 0.0, 2.08), "Head")
    fur = ch.mat("fur", "#A8612E", rough=0.7)
    tan = ch.mat("tan", "#E9C9A0", rough=0.7)
    nose = ch.mat("nose", "#3A2018", rough=0.35)
    yellow = ch.mat("cap", "#FFC72C", rough=0.5)
    orange = ch.mat("paw", "#F08A24", rough=0.5)
    teal = ch.mat("backpack", "#2EA5B8", rough=0.5)
    teal_dark = ch.mat("straps", "#1F7F90", rough=0.5)
    body_w = blend("Hips", "Chest", (0, 0, 0.45), (0, 0, 1.15))
    prof = [(0, 0.28), (0.3, 0.3), (0.45, 0.42), (0.49, 0.62), (0.46, 0.85), (0.38, 1.05), (0.24, 1.2), (0, 1.25)]
    ch.add(lathe(prof, 36), fur, body_w, transform(scale=(1, 0.9, 1)))
    ch.add(sphere(1.0, 28, 16), tan, body_w, transform((0, -0.3, 0.7), scale=(0.3, 0.15, 0.33)))
    hc, hr = (0, -0.02, 1.72), (0.6, 0.5, 0.52)
    ch.add(sphere(1.0, 40, 24), fur, rigid("Head"), transform(hc, scale=hr))
    mc, mr = (0, -0.44, 1.56), (0.24, 0.16, 0.16)
    ch.add(sphere(1.0, 28, 16), tan, rigid("Head"), transform(mc, scale=mr))
    ch.add(sphere(1.0, 16, 10), nose, rigid("Head"), transform((0, -0.6, 1.62), scale=(0.07, 0.04, 0.05)))
    for s, side in ((1, "L"), (-1, "R")):
        ch.add(sphere(1.0, 18, 12), fur, rigid(f"Ear_{side}"), transform((0.42 * s, 0.02, 2.1), scale=(0.15, 0.08, 0.14)))
        ch.add(sphere(1.0, 14, 10), tan, rigid(f"Ear_{side}"), transform((0.42 * s, -0.04, 2.09), scale=(0.09, 0.04, 0.085)))
        stubby_arm(ch, fur, fur, s, side, (0.33, -0.04, 1.0), (0.45, -0.16, 0.74), 0.11, 0.12)
        stubby_leg(ch, fur, fur, s, side, 0.22, 0.5, foot_scale=(0.16, 0.22, 0.1), thigh=0.2)
        ch.add(sphere(1.0, 16, 10), tan, rigid(f"Foot_{side}"), transform((0.25 * s, -0.3, 0.1), (90, 0, 0), scale=(0.09, 0.08, 0.02)))
        # backpack straps over the shoulders
        ch.add(tube([(0.2 * s, 0.3, 1.1), (0.24 * s, 0.0, 1.22), (0.26 * s, -0.36, 1.05), (0.22 * s, -0.42, 0.8)], 0.035, 8), teal_dark, body_w)
    # cap: a dome on the head and a brim to the front, a paw on the front
    ch.add(sphere(1.0, 36, 18), yellow, rigid("Head"), transform((0, -0.0, 2.03), scale=(0.53, 0.47, 0.34)))
    ch.add(cylinder(0.33, 0.31, 0.04, 28), yellow, rigid("Head"), transform((0, -0.42, 2.03), (8, 0, 0), scale=(1, 0.75, 1)))
    paw_print(ch, orange, (0, -0.44, 2.17), rigid("Head"), 1.2)
    # scarf
    w = blend("Chest", "Neck", (0, 0, 0.9), (0, 0, 1.2))
    ch.add(torus(0.27, 0.06, 28, 8), yellow, w, transform((0, -0.02, 1.2), scale=(1, 0.9, 1)))
    ch.add(extrude_outline([(-0.26, 0.05), (0.26, 0.05), (0.0, -0.26)], 0.06), yellow, w, transform((0, -0.36, 1.12), (-20, 0, 0)))
    paw_print(ch, orange, (0, -0.39, 1.05), w, 0.9)
    # backpack
    ch.add(rounded_box(0.56, 0.24, 0.52, radius=0.1), teal, body_w, transform((0, 0.5, 0.82)))
    ch.add(rounded_box(0.38, 0.1, 0.24, radius=0.06), teal_dark, body_w, transform((0, 0.66, 0.74)))
    # face
    mats = organic.face_materials(ch, "#5A3218", lid_color="#2A1810")
    f = Face(Surface(hc, hr))
    for s in (1, -1):
        organic.eye(f, 0.22 * s, 0.07, 0.125, 0.15, mats, s)
        organic.brow(f, 0.23 * s, 0.3, 0.075, 0.02, ch.mat("brow", "#6E3A18", rough=0.6), s)
    organic.cheeks(f, (0.36, -0.36), -0.1, 0.06, 0.035, mats["blush"])
    organic.mouth(f, -0.06, 0.1, mats, Surface(mc, mr))
    ch.face = f


# ---------------------------------------------------------------------------------------------
# Pingvincha: penguin chick, blue knitted beanie with goggles, yellow scarf with a snowflake


def build_penguin(ch):
    creature_skeleton(ch, hips=0.42, chest=0.95, head=1.2, shoulder=(0.4, -0.02, 1.0), arm_dir=(0.06, 0.0, -0.15), leg_x=0.17)
    ch.bone("Tail_1", (0, 0.42, 0.3), "Hips")
    navy = ch.mat("feathers", "#26304A", rough=0.55)
    white = ch.mat("belly", "#FBFBF8", rough=0.65)
    orange = ch.mat("beak", "#FF9A1F", rough=0.4)
    blue = ch.mat("beanie", "#4E7FD0", rough=0.75)
    blue_light = ch.mat("beanie_rim", "#6E98DE", rough=0.75)
    gold = ch.mat("goggles", "#F2B53A", rough=0.3, metal=0.4)
    lens = ch.mat("lens", "#7FC4F0", rough=0.1, coat=0.6)
    yellow = ch.mat("scarf", "#FFC72C", rough=0.6)
    snow = ch.mat("snowflake", "#9BD0F5", rough=0.4)
    body_w = blend("Hips", "Chest", (0, 0, 0.4), (0, 0, 1.15))
    prof = [(0, 0.1), (0.3, 0.12), (0.46, 0.3), (0.52, 0.55), (0.5, 0.8), (0.44, 1.0), (0.32, 1.15), (0, 1.22)]
    ch.add(lathe(prof, 36), navy, body_w, transform(scale=(1, 0.92, 1)))
    ch.add(sphere(1.0, 32, 18), white, body_w, transform((0, -0.16, 0.6), scale=(0.42, 0.34, 0.47)))
    hc, hr = (0, -0.02, 1.64), (0.56, 0.5, 0.5)
    ch.add(sphere(1.0, 40, 24), navy, rigid("Head"), transform(hc, scale=hr))
    # white face mask (two lobes) on the front of the head
    mask_c, mask_r = (0, -0.18, 1.56), (0.44, 0.38, 0.36)
    ch.add(sphere(1.0, 32, 18), white, rigid("Head"), transform(mask_c, scale=mask_r))
    mc, mr = (0, -0.57, 1.5), (0.11, 0.08, 0.06)
    ch.add(sphere(1.0, 18, 10), orange, rigid("Head"), transform(mc, scale=mr))
    for s, side in ((1, "L"), (-1, "R")):
        # flippers on the arm bones
        fw = blend(f"UpperArm_{side}", f"Forearm_{side}", (0.4 * s, 0, 1.0), (0.55 * s, 0, 0.62))
        ch.add(leaf(0.5, 0.15, 0.06, tip=0.7), navy, fw, transform((0.42 * s, 0.0, 1.02), (0, 180 - 18 * s, 0)))
        # feet
        ch.add(sphere(1.0, 18, 10), orange, rigid(f"Foot_{side}"), transform((0.19 * s, -0.16, 0.06), scale=(0.15, 0.22, 0.06)))
        ch.add(sphere(1.0, 14, 10), navy, blend("Hips", f"UpperLeg_{side}", (0.1 * s, 0, 0.4), (0.17 * s, 0, 0.2)), transform((0.17 * s, 0.0, 0.2), scale=(0.15, 0.15, 0.16)))
    ch.add(leaf(0.22, 0.14, 0.04, tip=0.7), navy, rigid("Tail_1"), transform((0, 0.42, 0.24), (-120, 0, 0)))
    # beanie with a fold, a pompom and goggles on its front
    ch.add(sphere(1.0, 36, 18), blue, rigid("Head"), transform((0, 0.0, 1.86), scale=(0.55, 0.5, 0.42)))
    ch.add(torus(0.53, 0.07, 36, 10), blue_light, rigid("Head"), transform((0, -0.01, 1.84), (6, 0, 0), scale=(1, 0.93, 1)))
    ch.add(sphere(0.15, 18, 12), blue_light, rigid("Head"), transform((0, 0.02, 2.31)))
    for s in (1, -1):
        ch.add(torus(0.12, 0.03, 24, 8), gold, rigid("Head"), transform((0.16 * s, -0.42, 2.02), (70, 0, 0)))
        ch.add(cylinder(0.1, 0.1, 0.015, 22), lens, rigid("Head"), transform((0.16 * s, -0.42, 2.02), (70, 0, 0)))
    # scarf with a hanging end and a snowflake
    w = blend("Chest", "Neck", (0, 0, 0.9), (0, 0, 1.2))
    ch.add(torus(0.36, 0.07, 30, 8), yellow, w, transform((0, -0.02, 1.15), scale=(1, 0.9, 1)))
    end = [(0.18, -0.36, 1.12), (0.22, -0.42, 0.95), (0.24, -0.43, 0.78)]
    ch.add(tube(end, 0.06, 10, radii=[0.07, 0.07, 0.065]), yellow, w)
    for k in range(3):
        a = math.radians(60 * k)
        p0 = Vector((0.24 - 0.04 * math.cos(a), -0.5, 0.8 - 0.04 * math.sin(a)))
        p1 = Vector((0.24 + 0.04 * math.cos(a), -0.5, 0.8 + 0.04 * math.sin(a)))
        ch.add(tube([p0, p1], 0.009, 6), snow, w)
    mats = organic.face_materials(ch, "#3A2A20", lid_color="#1A1A24")
    f = Face(Surface(mask_c, mask_r))
    for s in (1, -1):
        organic.eye(f, 0.17 * s, 0.06, 0.105, 0.13, mats, s)
        organic.brow(f, 0.18 * s, 0.24, 0.06, 0.018, ch.mat("brow", "#1A1F30", rough=0.6), s)
    organic.cheeks(f, (0.29, -0.29), -0.09, 0.055, 0.032, mats["blush"])
    organic.mouth(f, -0.05, 0.08, mats, Surface(mc, mr))
    ch.face = f


# ---------------------------------------------------------------------------------------------
# their own clips


def trot(style, run=False):
    """Quadrupeds: tip forward onto four legs and trot with diagonal pairs (loops, in place)."""
    # style["gait"]: a heavy elephant or a slow turtle steps slower and less high
    gait = style.get("gait", {})
    period = (0.5 if run else 0.8) * gait.get("slow", 1.0)
    n = 2
    seconds = period * n
    lean, lift, reach = (46, 0.1, 44) if run else (40, 0.06, 40)
    swing = (30 if run else 20) * gait.get("stride", 1.0)
    clip = c.Clip(seconds, True)
    steps = 16
    ts = [seconds * i / steps for i in range(steps + 1)]
    ph = lambda t: 2 * math.pi * t / period
    clip.r("Hips", [(t, (lean + 2 * math.sin(2 * ph(t)), 0, 2 * math.sin(ph(t)))) for t in ts])
    clip.l("Hips", [(t, (0, 0, lift + (0.05 if run else 0.025) * abs(math.sin(ph(t))))) for t in ts])
    clip.r("Neck", [(t, (-lean * 0.45, 0, 0)) for t in ts])
    clip.r("Head", [(t, (-lean * 0.45 + 3 * math.sin(2 * ph(t) + 0.6), 0, 0)) for t in ts])
    for s, side, off in ((1, "L", 0.0), (-1, "R", math.pi)):
        # front leg of this side and the hind leg of the other side move together
        f = lambda t, off=off: math.sin(ph(t) + off)
        clip.r(f"UpperArm_{side}", [(t, (-lean - reach + swing * f(t), 0, 0)) for t in ts])
        clip.r(f"Forearm_{side}", [(t, (max(0.0, -f(t)) * (40 if run else 28), 0, 0)) for t in ts])
        g = lambda t, off=off: math.sin(ph(t) + off + math.pi)
        clip.r(f"UpperLeg_{side}", [(t, (-lean - swing * g(t), 0, 0)) for t in ts])
        clip.r(f"LowerLeg_{side}", [(t, (max(0.0, g(t)) * (35 if run else 25), 0, 0)) for t in ts])
    for i, bone in enumerate(style.get("tail", ())):
        clip.r(bone, [(t, (-10 - 5 * i, 0, (10 + 6 * i) * math.sin(ph(t) + 0.5 * i))) for t in ts])
    for bone in style.get("ears", ()):
        clip.r(bone, [(t, (6 * math.sin(2 * ph(t)), 0, 0)) for t in ts])
    return clip


def trot_run(style):
    return trot(style, run=True)


def bunny_hop(style):
    """Rabbit: crouch, push off with the hind legs, land on the front paws (loops)."""
    seconds = 0.9
    clip = c.Clip(seconds, True)
    ts = [0, 0.15, 0.32, 0.5, 0.68, 0.9]
    hips = [(0, 20, 0.02), (0.15, 26, 0.0), (0.32, 6, 0.32), (0.5, 22, 0.36), (0.68, 30, 0.08), (0.9, 20, 0.02)]
    clip.r("Hips", [(t, (a, 0, 0)) for t, a, _ in hips])
    clip.l("Hips", [(t, (0, 0, h)) for t, _, h in hips])
    clip.r("Head", [(t, (-a * 0.8, 0, 0)) for t, a, _ in hips])
    for side in ("L", "R"):
        clip.r(f"UpperArm_{side}", [(0, (-20, 0, 0)), (0.15, (-26, 0, 0)), (0.32, (-60, 0, 0)), (0.5, (-55, 0, 0)), (0.68, (-30, 0, 0)), (0.9, (-20, 0, 0))])
        clip.r(f"UpperLeg_{side}", [(0, (-20, 0, 0)), (0.15, (-40, 0, 0)), (0.32, (30, 0, 0)), (0.5, (10, 0, 0)), (0.68, (-30, 0, 0)), (0.9, (-20, 0, 0))])
    for bone in style.get("ears", ()):
        clip.r(bone, [(0, (0, 0, 0)), (0.32, (22, 0, 0)), (0.5, (-10, 0, 0)), (0.75, (8, 0, 0)), (0.9, (0, 0, 0))])
    return clip


def cat_stretch(style):
    """Cat: front paws forward, head low, tail up, then sit back (once)."""
    clip = c.Clip(2.6, False)
    clip.r("Hips", [(0, (0, 0, 0)), (0.6, (30, 0, 0)), (1.8, (30, 0, 0)), (2.6, (0, 0, 0))])
    clip.r("Chest", [(0, (0, 0, 0)), (0.6, (25, 0, 0)), (1.8, (25, 0, 0)), (2.6, (0, 0, 0))])
    clip.r("Head", [(0, (0, 0, 0)), (0.6, (-40, 0, 0)), (1.2, (-46, 0, 8)), (1.8, (-40, 0, 0)), (2.6, (0, 0, 0))])
    for side in ("L", "R"):
        clip.r(f"UpperArm_{side}", [(0, (0, 0, 0)), (0.6, (-80, 0, 0)), (1.8, (-80, 0, 0)), (2.6, (0, 0, 0))])
        clip.r(f"UpperLeg_{side}", [(0, (0, 0, 0)), (0.6, (-30, 0, 0)), (1.8, (-30, 0, 0)), (2.6, (0, 0, 0))])
    for i, bone in enumerate(style.get("tail", ())):
        clip.r(bone, [(0, (0, 0, 0)), (0.6, (-20, 0, 0)), (1.8, (-20, 0, 6)), (2.6, (0, 0, 0))])
    return clip


def biped_walk(style):
    """Bear: an upright walk with a sway (loops, in place)."""
    period = 1.0
    clip = c.Clip(period * 2, True)
    ts = [period * 2 * i / 16 for i in range(17)]
    ph = lambda t: 2 * math.pi * t / period
    clip.r("Hips", [(t, (4, 0, 4 * math.sin(ph(t)))) for t in ts])
    clip.l("Hips", [(t, (0, 0, 0.025 * abs(math.sin(ph(t))))) for t in ts])
    clip.r("Spine", [(t, (0, 3 * math.sin(ph(t)), -3 * math.sin(ph(t)))) for t in ts])
    for s, side, off in ((1, "L", 0.0), (-1, "R", math.pi)):
        clip.r(f"UpperLeg_{side}", [(t, (-26 * math.sin(ph(t) + off), 0, 0)) for t in ts])
        clip.r(f"LowerLeg_{side}", [(t, (max(0.0, math.sin(ph(t) + off + 1.2)) * 30, 0, 0)) for t in ts])
        c.arm(clip, s, [(t, 6, 22 * math.sin(ph(t) + off + math.pi), 14, 0) for t in ts])
    return clip


def waddle(style):
    """Penguin: short steps rocking side to side, flippers out (loops)."""
    period = 0.7
    clip = c.Clip(period * 2, True)
    ts = [period * 2 * i / 16 for i in range(17)]
    ph = lambda t: 2 * math.pi * t / period
    clip.r("Hips", [(t, (0, 9 * math.sin(ph(t)), 4 * math.sin(ph(t)))) for t in ts])
    clip.l("Hips", [(t, (0, 0, 0.03 * abs(math.sin(ph(t))))) for t in ts])
    clip.r("Head", [(t, (0, -6 * math.sin(ph(t)), 0)) for t in ts])
    for s, side, off in ((1, "L", 0.0), (-1, "R", math.pi)):
        clip.r(f"UpperLeg_{side}", [(t, (-14 * math.sin(ph(t) + off), 0, 0)) for t in ts])
        c.arm(clip, s, [(t, 24 + 8 * math.sin(2 * ph(t)), 0, 0, 0) for t in ts])
    return clip


def flipper_flap(style):
    """Penguin: flap both flippers with little hops (once)."""
    clip = c.Clip(1.6, False)
    keys = [(0, 0), (0.2, 60), (0.4, 15), (0.6, 60), (0.8, 15), (1.0, 60), (1.2, 15), (1.6, 0)]
    for s in (1, -1):
        c.arm(clip, s, [(t, out, 0, 0, 0) for t, out in keys])
    clip.l("Hips", [(0, (0, 0, 0)), (0.2, (0, 0, 0.1)), (0.4, (0, 0, 0)), (0.6, (0, 0, 0.1)), (0.8, (0, 0, 0)), (1.0, (0, 0, 0.1)), (1.2, (0, 0, 0)), (1.6, (0, 0, 0))])
    return clip


def belly_slide(style):
    """Penguin: drop onto the belly and slide (in place; the stage moves it), flippers back."""
    clip = c.Clip(2.4, False)
    clip.r("Hips", [(0, (0, 0, 0)), (0.4, (80, 0, 0)), (2.0, (80, 0, 0)), (2.4, (0, 0, 0))])
    clip.l("Hips", [(0, (0, 0, 0)), (0.4, (0, 0, -0.1)), (2.0, (0, 0, -0.1)), (2.4, (0, 0, 0))])
    clip.r("Head", [(0, (0, 0, 0)), (0.4, (-60, 0, 0)), (2.0, (-60, 0, 0)), (2.4, (0, 0, 0))])
    for s in (1, -1):
        c.arm(clip, s, [(0, 0, 0, 0, 0), (0.4, 20, -40, 0, 0), (2.0, 20, -40, 0, 0), (2.4, 0, 0, 0, 0)])
    for side in ("L", "R"):
        clip.r(f"UpperLeg_{side}", [(0, (0, 0, 0)), (0.4, (-10, 0, 0)), (2.0, (-10, 0, 0)), (2.4, (0, 0, 0))])
    return clip


def settle(style):
    """Seated animals already sit: 'sit' is a small settle and a contented breath."""
    clip = c.Clip(1.6, False)
    clip.l("Hips", [(0, (0, 0, 0)), (0.4, (0, 0, -0.03)), (1.6, (0, 0, 0))])
    clip.r("Head", [(0, (0, 0, 0)), (0.5, (6, 0, 4)), (1.6, (0, 0, 0))])
    return clip


QUAD_STYLE = {"energy": 1.0, "arm_rest_out": 0, "hop": 0.2, "secondary": 1.0, "sit_drop": 0.0}

ANIMALS = {
    "rabbit": {
        "build": build_rabbit,
        "style": {**QUAD_STYLE, "energy": 1.1, "ears": ("Ear_L", "Ear_R"), "tail": ("Tail_1",), "specials": {"walk": bunny_hop, "run": bunny_hop, "hop": bunny_hop, "sniff": c.sniff, "happy_hop": c.happy_hop, "sit": settle}},
        "face_target": (0, -0.3, 1.6),
    },
    "cat": {
        "build": build_cat,
        "style": {**QUAD_STYLE, "ears": ("Ear_L", "Ear_R"), "tail": ("Tail_1", "Tail_2", "Tail_3"), "specials": {"walk": trot, "run": trot_run, "stretch": cat_stretch, "tail_wag": c.tail_wag, "sniff": c.sniff, "sit": settle}},
        "face_target": (0, -0.3, 1.6),
    },
    "dog": {
        "build": build_dog,
        "style": {**QUAD_STYLE, "energy": 1.15, "ears": ("Ear_L", "Ear_R"), "tail": ("Tail_1", "Tail_2"), "specials": {"walk": trot, "run": trot_run, "tail_wag": c.tail_wag, "sniff": c.sniff, "happy_hop": c.happy_hop, "sit": settle}},
        "face_target": (0, -0.3, 1.6),
    },
    "fox": {
        "build": build_fox,
        "style": {**QUAD_STYLE, "ears": ("Ear_L", "Ear_R"), "tail": ("Tail_1", "Tail_2", "Tail_3"), "specials": {"walk": trot, "run": trot_run, "tail_wag": c.tail_wag, "sniff": c.sniff, "sit": settle}},
        "face_target": (0, -0.3, 1.6),
    },
    "bear": {
        "build": build_bear,
        "style": {"energy": 0.9, "arm_rest_out": 6, "hop": 0.16, "secondary": 0.8, "ears": ("Ear_L", "Ear_R"), "specials": {"walk": biped_walk, "run": biped_walk, "hug": c.hug, "sniff": c.sniff}},
        "face_target": (0, -0.3, 1.75),
    },
    "penguin": {
        "build": build_penguin,
        "style": {"energy": 1.05, "arm_rest_out": 14, "hop": 0.18, "secondary": 0.8, "tail": ("Tail_1",), "specials": {"walk": waddle, "run": waddle, "flap": flipper_flap, "slide": belly_slide}},
        "face_target": (0, -0.3, 1.7),
    },
}

# Phase 79: the other six (elephant, lion, turtle, owl, unicorn, dinosaur)
from animals_more import MORE  # noqa: E402

ANIMALS.update(MORE)
