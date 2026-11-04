"""
Story animals, part 2 (Phase 79): Filcha (elephant), Sherbola (lion), Toshbaqacha (turtle),
Boyo'g'licha (owl), Yakkashox (unicorn) and Dinozavrcha (dinosaur), after the owner's sheets.

Each moves its own way: the elephant steps slowly and heavily and sprays water with its
trunk, the lion roars gently, the turtle walks slowly, hops only a little and hides in its
shell, the owl turns its head and flies with its wings, the unicorn prances and sparkles,
the dinosaur stomps, roars and wags its tail.
"""

import math

from mathutils import Matrix, Vector

import clips as c
import organic
from animals import (
    HEAD_C,
    HEAD_R,
    bandana,
    ear_bones,
    face,
    head,
    paw_print,
    quad_body,
    quad_skeleton,
    settle,
    trot,
    trot_run,
    waddle,
)
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
# Filcha: grey elephant, big pink ears, a trunk that curls up, purple bandana with a star


def build_elephant(ch):
    quad_skeleton(ch)
    ear_bones(ch, 0.56, 1.62)
    hx, hy, hz = HEAD_C
    trunk = [(0, hy - 0.44, hz - 0.06), (0, hy - 0.6, hz - 0.2), (0, hy - 0.68, hz - 0.36), (0, hy - 0.78, hz - 0.42), (0, hy - 0.86, hz - 0.34)]
    ch.bone("Trunk_1", trunk[0], "Head")
    ch.bone("Trunk_2", trunk[1], "Trunk_1")
    ch.bone("Trunk_3", trunk[2], "Trunk_2")
    ch.bone("Tail_1", (0, 0.42, 0.3), "Hips")
    grey = ch.mat("skin", "#B8BCC8", rough=0.65)
    pink = ch.mat("ear_pink", "#F4B0C0", rough=0.6)
    nails = ch.mat("nails", "#F6EEDC", rough=0.5)
    purple = ch.mat("bandana", "#8E5BD8", rough=0.55)
    star = ch.mat("star", "#FFC52E", rough=0.4)
    quad_body(ch, grey, grey, paw_pad=None, belly=False)
    for s, side in ((1, "L"), (-1, "R")):
        # toenails on the front feet
        for i in (-1, 0, 1):
            ch.add(sphere(1.0, 10, 6), nails, rigid(f"Hand_{side}"), transform((0.24 * s + i * 0.045, -0.53, 0.06), scale=(0.025, 0.012, 0.025)))
    ch.add(sphere(1.0, 40, 24), grey, rigid("Head"), transform(HEAD_C, scale=HEAD_R))
    # big round ears, pink inside, turned a little to the front
    for s, side in ((1, "L"), (-1, "R")):
        ew = lambda co, side=side: {f"Ear_{side}": 1.0} if abs(co.x) > 0.58 else {f"Ear_{side}": 0.5, "Head": 0.5}
        m = transform((0.6 * s, hy + 0.08, hz + 0.04), (0, 0, -20 * s))
        ch.add(sphere(1.0, 28, 16), grey, ew, m @ transform(scale=(0.36, 0.07, 0.4)))
        ch.add(sphere(1.0, 24, 14), pink, ew, m @ transform((0, -0.05, -0.02), scale=(0.28, 0.03, 0.31)))
    tw = chain(["Trunk_1", "Trunk_2", "Trunk_3", "Trunk_3"], trunk)
    ch.add(tube(trunk, 0.1, 18, radii=[0.19, 0.15, 0.12, 0.1, 0.09]), grey, tw)
    ch.add(torus(0.07, 0.015, 16, 6), ch.mat("trunk_tip", "#A3A8B6", rough=0.7), rigid("Trunk_3"), transform(trunk[-1], (60, 0, 0)))
    ch.add(tube([(0, 0.4, 0.3), (0, 0.52, 0.2), (0, 0.56, 0.08)], 0.025, 8), grey, rigid("Tail_1"))
    ch.add(sphere(1.0, 10, 8), ch.mat("tail_tuft", "#5A5E6A", rough=0.8), rigid("Tail_1"), transform((0, 0.57, 0.05), scale=(0.04, 0.04, 0.06)))
    y, w = bandana(ch, purple)
    ch.add(extrude_outline(star_outline(0.075, 0.032), 0.025), star, w, transform((0, y - 0.03, 0.92), (-14, 0, 0)))
    face(ch, "#4A2C1A", "#2A1A14", Surface(HEAD_C, HEAD_R), "#8A8E9A", eye_x=0.21, eye_z=0.1, mouth_z=-0.33, mouth_w=0.16)


# ---------------------------------------------------------------------------------------------
# Sherbola: golden lion cub with a big brown mane, tail with a tuft, purple bandana with a star


def build_lion(ch):
    quad_skeleton(ch)
    ear_bones(ch, 0.36, 1.98)
    tail = [(0.05, 0.38, 0.14), (0.3, 0.6, 0.12), (0.46, 0.62, 0.3), (0.5, 0.5, 0.5)]
    for i, (p, parent) in enumerate(((tail[0], "Hips"), (tail[1], "Tail_1"), (tail[2], "Tail_2"))):
        ch.bone(f"Tail_{i + 1}", p, parent)
    fur = ch.mat("fur", "#F6BC3E", rough=0.65)
    cream = ch.mat("cream", "#FFF0D2", rough=0.7)
    mane = ch.mat("mane", "#C2641F", rough=0.8)
    mane_light = ch.mat("mane_light", "#D9822E", rough=0.8)
    nose = ch.mat("nose", "#E0707A", rough=0.4)
    purple = ch.mat("bandana", "#8E5BD8", rough=0.55)
    star = ch.mat("star", "#FFD02E", rough=0.4)
    quad_body(ch, fur, cream, paw=fur)
    hx, hy, hz = HEAD_C
    # the mane: puffs in a ring round the face and over the back of the head
    for k in range(16):
        a = 2 * math.pi * k / 16
        r = 0.6 + 0.04 * (k % 2)
        p = (r * math.cos(a), hy + 0.12, hz + 0.02 + r * math.sin(a) * 0.95)
        ch.add(sphere(1.0, 14, 10), mane if k % 2 else mane_light, rigid("Head"), transform(p, scale=(0.2, 0.2, 0.2)))
    ch.add(sphere(1.0, 30, 18), mane, rigid("Head"), transform((0, hy + 0.24, hz + 0.02), scale=(0.62, 0.42, 0.6)))
    for k, x in enumerate((-0.14, 0.0, 0.14)):
        ch.add(sphere(1.0, 14, 10), mane_light, rigid("Head"), transform((x, hy - 0.2, hz + 0.5 - 0.04 * abs(k - 1)), (-30 + 25 * (k - 1), 0, 0), scale=(0.11, 0.11, 0.14)))
    surf = head(ch, fur, cream, nose, muzzle=(0.24, 0.15, 0.15), cheeks=cream)
    for s, side in ((1, "L"), (-1, "R")):
        ch.add(sphere(1.0, 16, 10), fur, rigid(f"Ear_{side}"), transform((0.36 * s, hy - 0.02, 2.0), scale=(0.13, 0.07, 0.12)))
        ch.add(sphere(1.0, 12, 8), cream, rigid(f"Ear_{side}"), transform((0.36 * s, hy - 0.07, 1.99), scale=(0.08, 0.03, 0.07)))
    tw = chain(["Tail_1", "Tail_2", "Tail_3", "Tail_3"], tail)
    ch.add(tube(tail, 0.045, 12, radii=[0.06, 0.05, 0.045, 0.04]), fur, tw)
    ch.add(sphere(1.0, 14, 10), mane, rigid("Tail_3"), transform(tail[-1], scale=(0.09, 0.09, 0.12)))
    y, w = bandana(ch, purple)
    ch.add(extrude_outline(star_outline(0.075, 0.032), 0.025), star, w, transform((0, y - 0.03, 0.92), (-14, 0, 0)))
    face(ch, "#6A3A16", "#3A2210", surf, "#B8641E", mouth_z=-0.06)


# ---------------------------------------------------------------------------------------------
# Toshbaqacha: green turtle with a brown shell, yellow cap and a yellow bandana with a paw


def build_turtle(ch):
    quad_skeleton(ch)
    green = ch.mat("skin", "#93C947", rough=0.6)
    belly = ch.mat("plastron", "#F2E3A4", rough=0.6)
    shell = ch.mat("shell", "#C8742C", rough=0.5, coat=0.3)
    shell_dark = ch.mat("shell_plates", "#A55A20", rough=0.55, coat=0.2)
    rim = ch.mat("shell_rim", "#E9A645", rough=0.5)
    yellow = ch.mat("cap", "#FFC72C", rough=0.5)
    orange = ch.mat("paw", "#F08A24", rough=0.5)
    nose = ch.mat("nose", "#5E8A2A", rough=0.5)
    body_w = quad_body(ch, green, belly, belly=False)
    ch.add(sphere(1.0, 28, 16), belly, body_w, transform((0, -0.33, 0.58), scale=(0.32, 0.15, 0.42)))
    # the shell over the back, with a rim and plates
    ch.add(sphere(1.0, 36, 20), shell, body_w, transform((0, 0.3, 0.6), (-12, 0, 0), scale=(0.6, 0.4, 0.66)))
    ch.add(torus(0.6, 0.06, 40, 8), rim, body_w, transform((0, 0.22, 0.6), (78, 0, 0), scale=(1.0, 1.1, 1)))
    for p, r in (((0, 0.66, 0.66), 0.16), ((0.28, 0.58, 0.85), 0.12), ((-0.28, 0.58, 0.85), 0.12), ((0.3, 0.6, 0.42), 0.12), ((-0.3, 0.6, 0.42), 0.12), ((0, 0.6, 1.0), 0.12), ((0, 0.62, 0.3), 0.12)):
        n = (Vector(p) - Vector((0, 0.3, 0.6))).normalized()
        rot = Vector((0, 0, 1)).rotation_difference(n).to_matrix().to_4x4()
        ch.add(sphere(1.0, 6, 4), shell_dark, body_w, Matrix.Translation(p) @ rot @ Matrix.Diagonal((r, r, r * 0.25, 1)))
    surf = head(ch, green, green, nose, muzzle=(0.22, 0.12, 0.12))
    hx, hy, hz = HEAD_C
    # cap with a brim to the front and a paw
    ch.add(sphere(1.0, 36, 18), yellow, rigid("Head"), transform((0, hy + 0.02, hz + 0.24), scale=(0.6, 0.53, 0.38)))
    ch.add(cylinder(0.36, 0.34, 0.04, 28), yellow, rigid("Head"), transform((0, hy - 0.46, hz + 0.24), (8, 0, 0), scale=(1, 0.75, 1)))
    paw_print(ch, orange, (0, hy - 0.5, hz + 0.4), rigid("Head"), 1.2)
    y, w = bandana(ch, yellow)
    paw_print(ch, orange, (0, y - 0.03, 0.88), w, 1.0)
    face(ch, "#4A2A18", "#2A3A14", surf, "#5E8A2A", eye_z=0.02, mouth_z=-0.05)


# ---------------------------------------------------------------------------------------------
# Boyo'g'licha: brown owl with round glasses, a purple graduation cap and scarf (biped)


def build_owl(ch):
    creature_skeleton(ch, hips=0.42, chest=0.95, head=1.2, shoulder=(0.42, 0.02, 1.0), arm_dir=(0.05, 0.02, -0.15), leg_x=0.17)
    ch.bone("Ear_L", (0.36, 0.0, 2.08), "Head")
    ch.bone("Ear_R", (-0.36, 0.0, 2.08), "Head")
    brown = ch.mat("feathers", "#9A5A2E", rough=0.7)
    dark = ch.mat("wing_tips", "#6B3B1C", rough=0.7)
    cream = ch.mat("belly", "#F3DDB4", rough=0.7)
    orange = ch.mat("beak", "#F2A12C", rough=0.4)
    purple = ch.mat("cap", "#6A3DC8", rough=0.5)
    purple_light = ch.mat("scarf", "#8E5BD8", rough=0.6)
    gold = ch.mat("tassel", "#F2B53A", rough=0.35, metal=0.3)
    frame = ch.mat("glasses", "#2A2A30", rough=0.3, metal=0.4)
    body_w = blend("Hips", "Chest", (0, 0, 0.4), (0, 0, 1.15))
    prof = [(0, 0.08), (0.3, 0.1), (0.46, 0.28), (0.5, 0.55), (0.47, 0.82), (0.38, 1.05), (0.24, 1.18), (0, 1.22)]
    ch.add(lathe(prof, 36), brown, body_w, transform(scale=(1, 0.92, 1)))
    ch.add(sphere(1.0, 30, 18), cream, body_w, transform((0, -0.2, 0.6), scale=(0.38, 0.3, 0.42)))
    # scallops on the belly
    for row, z in enumerate((0.75, 0.6, 0.45)):
        for k in range(3 + row % 2):
            x = (k - (2 + row % 2) / 2) * 0.13
            ch.add(sphere(1.0, 10, 6), ch.mat("scallops", "#E0BE8A", rough=0.7), body_w, transform((x, -0.49 + 0.02 * abs(x) * 4, z), scale=(0.05, 0.015, 0.03)))
    hc, hr = (0, -0.02, 1.62), (0.58, 0.5, 0.52)
    ch.add(sphere(1.0, 40, 24), brown, rigid("Head"), transform(hc, scale=hr))
    mask_c, mask_r = (0, -0.18, 1.6), (0.46, 0.38, 0.38)
    ch.add(sphere(1.0, 32, 18), cream, rigid("Head"), transform(mask_c, scale=mask_r))
    mask = Surface(mask_c, mask_r)
    ch.add(sphere(1.0, 16, 10), orange, rigid("Head"), transform((0, -0.58, 1.54), (20, 0, 0), scale=(0.07, 0.07, 0.1)))
    for s, side in ((1, "L"), (-1, "R")):
        # ear tufts
        ch.add(leaf(0.26, 0.11, 0.05, tip=0.5), brown, rigid(f"Ear_{side}"), transform((0.36 * s, -0.02, 2.0), (0, 22 * s, 0)))
        # wings on the arm bones
        fw = blend(f"UpperArm_{side}", f"Forearm_{side}", (0.42 * s, 0, 1.0), (0.52 * s, 0, 0.6))
        ch.add(leaf(0.62, 0.2, 0.07, tip=0.6), brown, fw, transform((0.44 * s, 0.04, 1.04), (0, 180 - 8 * s, 0)))
        ch.add(leaf(0.3, 0.12, 0.08, tip=0.6), dark, fw, transform((0.49 * s, 0.05, 0.72), (0, 180 - 8 * s, 0)))
        # feet
        ch.add(sphere(1.0, 14, 8), orange, rigid(f"Foot_{side}"), transform((0.18 * s, -0.14, 0.05), scale=(0.13, 0.17, 0.05)))
        ch.add(sphere(1.0, 14, 10), brown, blend("Hips", f"UpperLeg_{side}", (0.1 * s, 0, 0.4), (0.17 * s, 0, 0.2)), transform((0.17 * s, 0.0, 0.18), scale=(0.15, 0.15, 0.15)))
        # round glasses round the eyes
        centre = mask.point(0.19 * s, 0.05, 0.03)
        ch.add(torus(0.155, 0.018, 28, 8), frame, rigid("Head"), transform(centre, (90 - 8, 0, 18 * s)))
    ch.add(tube([mask.point(0.035, 0.07, 0.03), mask.point(-0.035, 0.07, 0.03)], 0.015, 6), frame, rigid("Head"))
    # graduation cap: a skull cap, the square board, a gold tassel
    ch.add(sphere(1.0, 30, 14), purple, rigid("Head"), transform((0, 0.0, 1.98), scale=(0.44, 0.4, 0.22)))
    ch.add(rounded_box(0.86, 0.86, 0.05, radius=0.02), purple, rigid("Head"), transform((0, 0.0, 2.15), (0, 0, 45)))
    ch.add(sphere(0.04, 10, 8), gold, rigid("Head"), transform((0, 0, 2.18)))
    ch.add(tube([(0, 0, 2.18), (0.3, -0.3, 2.17), (0.42, -0.42, 2.12), (0.44, -0.44, 1.92)], 0.012, 6), gold, rigid("Head"))
    ch.add(cylinder(0.035, 0.05, 0.14, 10), gold, rigid("Head"), transform((0.44, -0.44, 1.86)))
    # scarf with two ends
    w = blend("Chest", "Neck", (0, 0, 0.9), (0, 0, 1.2))
    ch.add(torus(0.4, 0.07, 30, 8), purple_light, w, transform((0, -0.02, 1.12), scale=(1, 0.9, 1)))
    for s in (1, -1):
        ch.add(tube([(0.12 * s, -0.4, 1.08), (0.16 * s, -0.47, 0.92)], 0.05, 8), purple_light, w)
    mats = organic.face_materials(ch, "#B8701E", lid_color="#5A3418")
    f = Face(mask)
    for s in (1, -1):
        organic.eye(f, 0.19 * s, 0.05, 0.12, 0.14, mats, s)
        organic.brow(f, 0.2 * s, 0.26, 0.07, 0.02, ch.mat("brow", "#6B3B1C", rough=0.6), s)
    organic.cheeks(f, (0.3, -0.3), -0.12, 0.05, 0.03, mats["blush"])
    organic.mouth(f, -0.17, 0.06, mats)
    ch.face = f


# ---------------------------------------------------------------------------------------------
# Yakkashox: white unicorn with a gold horn and hooves, a rainbow mane and tail, a star on its side


RAINBOW = ("#FF8BC8", "#A97BF0", "#5CC6F2", "#FFD54A")


def build_unicorn(ch):
    quad_skeleton(ch)
    ear_bones(ch, 0.3, 1.98)
    tail = [(0, 0.4, 0.3), (0.12, 0.6, 0.3), (0.2, 0.72, 0.14), (0.24, 0.7, 0.02)]
    for i, (p, parent) in enumerate(((tail[0], "Hips"), (tail[1], "Tail_1"), (tail[2], "Tail_2"))):
        ch.bone(f"Tail_{i + 1}", p, parent)
    ch.bone("Sprout", (0, HEAD_C[1] - 0.2, HEAD_C[2] + 0.5), "Head")  # the horn
    white = ch.mat("coat", "#FAF7FC", rough=0.55)
    gold = ch.mat("gold", "#F2B53A", rough=0.3, metal=0.45)
    pink = ch.mat("ear_pink", "#F9B4CF", rough=0.6)
    nose = ch.mat("nose", "#F49AB8", rough=0.5)
    hair = [ch.mat(f"mane_{i}", colour, rough=0.45, coat=0.2) for i, colour in enumerate(RAINBOW)]
    body_w = quad_body(ch, white, white, belly=False, paw=gold, hind_paw=gold)
    surf = head(ch, white, white, nose, muzzle=(0.27, 0.17, 0.16), muzzle_z=-0.13)
    hx, hy, hz = HEAD_C
    # horn: a gold cone with a spiral band
    ch.add(lathe([(0, -0.02), (0.085, 0.0), (0.06, 0.18), (0.035, 0.32), (0, 0.42)], 18), gold, rigid("Sprout"), transform((0, hy - 0.2, hz + 0.46), (-14, 0, 0)))
    for s, side in ((1, "L"), (-1, "R")):
        ew = lambda co, side=side: {f"Ear_{side}": 1.0} if co.z > 2.02 else {f"Ear_{side}": 0.6, "Head": 0.4}
        m = transform((0.3 * s, hy + 0.04, 1.92), (-6, 26 * s, 0))
        ch.add(leaf(0.3, 0.16, 0.05, tip=0.5), white, ew, m)
        ch.add(leaf(0.22, 0.09, 0.03, tip=0.5), pink, ew, m @ transform((0, -0.035, 0.03)))
    # rainbow mane: strands from the forehead over the head and down the neck
    for i, mat in enumerate(hair):
        x = (i - 1.5) * 0.09
        strand = [(x * 1.4 + 0.08, hy - 0.3, hz + 0.44), (x + 0.1, hy, hz + 0.56), (x + 0.12, hy + 0.34, hz + 0.36), (x + 0.14, hy + 0.44, hz - 0.04), (x + 0.16, hy + 0.3, hz - 0.4)]
        ch.add(tube(strand, 0.08, 12, radii=[0.06, 0.1, 0.11, 0.1, 0.06]), mat, lambda co: {"Head": 1.0} if co.z > 1.25 else {"Head": 0.5, "Neck": 0.5})
    ch.add(tube([(0.0, hy - 0.4, hz + 0.4), (-0.18, hy - 0.5, hz + 0.24), (-0.24, hy - 0.48, hz + 0.12)], 0.06, 10, radii=[0.07, 0.06, 0.03]), hair[0], rigid("Head"))
    # rainbow tail
    tw = chain(["Tail_1", "Tail_2", "Tail_3", "Tail_3"], tail)
    for i, mat in enumerate(hair):
        off = Vector(((i - 1.5) * 0.05, 0, (1.5 - i) * 0.03))
        ch.add(tube([Vector(p) + off for p in tail], 0.06, 10, radii=[0.05, 0.08, 0.08, 0.04]), mat, tw)
    # a gold star on the side
    for s in (1, -1):
        ch.add(extrude_outline(star_outline(0.08, 0.035), 0.03), gold, body_w, transform((0.47 * s, 0.1, 0.42), (0, 0, 90 * s)))
    face(ch, "#7B4BC0", "#3A2448", surf, "#D8C8E8", mouth_z=-0.05)


# ---------------------------------------------------------------------------------------------
# Dinozavrcha: green baby dinosaur, orange back plates, yellow cap and bandana (biped)


def build_dinosaur(ch):
    creature_skeleton(ch, hips=0.5, chest=1.0, head=1.3, shoulder=(0.34, -0.14, 1.0), arm_dir=(0.05, -0.08, -0.1), leg_x=0.24)
    tail = [(0, 0.36, 0.5), (0, 0.7, 0.36), (0.1, 0.98, 0.24), (0.22, 1.16, 0.2)]
    for i, (p, parent) in enumerate(((tail[0], "Hips"), (tail[1], "Tail_1"), (tail[2], "Tail_2"))):
        ch.bone(f"Tail_{i + 1}", p, parent)
    green = ch.mat("skin", "#7CC242", rough=0.5, coat=0.2)
    dark = ch.mat("spots", "#4E9A2C", rough=0.55)
    belly = ch.mat("belly", "#F5E6A8", rough=0.55)
    plate = ch.mat("plates", "#FF9A2A", rough=0.45)
    yellow = ch.mat("cap", "#FFC72C", rough=0.5)
    orange = ch.mat("paw", "#F08A24", rough=0.5)
    body_w = blend("Hips", "Chest", (0, 0, 0.45), (0, 0, 1.15))
    prof = [(0, 0.26), (0.32, 0.28), (0.47, 0.42), (0.5, 0.62), (0.47, 0.85), (0.38, 1.05), (0.24, 1.2), (0, 1.25)]
    ch.add(lathe(prof, 36), green, body_w, transform(scale=(1, 0.92, 1)))
    ch.add(sphere(1.0, 28, 16), belly, body_w, transform((0, -0.3, 0.7), scale=(0.3, 0.16, 0.36)))
    hc, hr = (0, -0.06, 1.72), (0.56, 0.5, 0.5)
    ch.add(sphere(1.0, 40, 24), green, rigid("Head"), transform(hc, scale=hr))
    mc, mr = (0, -0.4, 1.56), (0.38, 0.28, 0.24)
    ch.add(sphere(1.0, 32, 18), green, rigid("Head"), transform(mc, scale=mr))
    for p, r in (((0.44, 0.0, 1.85), 0.05), ((-0.46, 0.05, 1.8), 0.06), ((0.45, 0.15, 0.85), 0.06), ((-0.44, 0.2, 0.7), 0.07), ((0.38, 0.3, 1.05), 0.05), ((-0.33, 0.33, 1.1), 0.05)):
        ch.add(sphere(1.0, 10, 6), dark, rigid("Head") if p[2] > 1.4 else body_w, transform(p, scale=(r, r, r)))
    # back plates down the spine and tail
    for p, tilt, size in (((0, 0.36, 1.34), -50, 0.2), ((0, 0.47, 1.1), -70, 0.22), ((0, 0.5, 0.84), -90, 0.21), ((0, 0.5, 0.6), -105, 0.18)):
        ch.add(leaf(size, size * 0.62, 0.05, tip=0.6), plate, body_w, transform(p, (tilt, 0, 90)))
    tw = chain(["Tail_1", "Tail_2", "Tail_3", "Tail_3"], tail)
    ch.add(tube(tail, 0.18, 18, radii=[0.24, 0.17, 0.11, 0.04]), green, tw)
    for p, tilt, size in (((0, 0.68, 0.52), -115, 0.15), ((0.08, 0.96, 0.38), -120, 0.11)):
        ch.add(leaf(size, size * 0.6, 0.04, tip=0.6), plate, tw, transform(p, (tilt, 0, 90)))
    for s, side in ((1, "L"), (-1, "R")):
        stubby_arm(ch, green, green, s, side, (0.34, -0.14, 1.0), (0.44, -0.3, 0.82), 0.09, 0.1)
        stubby_leg(ch, green, green, s, side, 0.24, 0.5, foot_scale=(0.17, 0.24, 0.1), thigh=0.21, toe_mat=belly)
    # cap with a brim and a paw, a bandana with a paw
    ch.add(sphere(1.0, 36, 18), yellow, rigid("Head"), transform((0, -0.02, 2.0), scale=(0.53, 0.48, 0.34)))
    ch.add(cylinder(0.34, 0.32, 0.04, 28), yellow, rigid("Head"), transform((0, -0.44, 2.0), (8, 0, 0), scale=(1, 0.75, 1)))
    paw_print(ch, orange, (0, -0.46, 2.14), rigid("Head"), 1.2)
    w = blend("Chest", "Neck", (0, 0, 0.9), (0, 0, 1.2))
    ch.add(torus(0.3, 0.055, 28, 8), yellow, w, transform((0, -0.02, 1.2), scale=(1, 0.9, 1)))
    ch.add(extrude_outline([(-0.26, 0.05), (0.26, 0.05), (0.0, -0.26)], 0.06), yellow, w, transform((0, -0.4, 1.12), (-20, 0, 0)))
    paw_print(ch, orange, (0, -0.43, 1.05), w, 0.9)
    mats = organic.face_materials(ch, "#5A3218", lid_color="#1F4A1A", mouth_color="#7A2232")
    f = Face(Surface(hc, hr))
    for s in (1, -1):
        organic.eye(f, 0.21 * s, 0.13, 0.125, 0.15, mats, s)
        organic.brow(f, 0.22 * s, 0.33, 0.08, 0.025, ch.mat("brow", "#3E8A24", rough=0.6), s)
    organic.cheeks(f, (0.36, -0.36), -0.05, 0.06, 0.035, mats["blush"])
    organic.mouth(f, -0.04, 0.17, mats, Surface(mc, mr))
    ch.face = f


# ---------------------------------------------------------------------------------------------
# their own clips


def trunk_spray(style):
    """Elephant: the trunk swings up and sprays (the stage adds the water), then back down."""
    clip = c.Clip(2.4, False)
    clip.r("Trunk_1", [(0, (0, 0, 0)), (0.5, (-50, 0, 0)), (1.6, (-55, 0, 6)), (2.4, (0, 0, 0))])
    clip.r("Trunk_2", [(0, (0, 0, 0)), (0.5, (-40, 0, 0)), (0.9, (-60, 0, 0)), (1.2, (-45, 0, 0)), (1.6, (-50, 0, 0)), (2.4, (0, 0, 0))])
    clip.r("Trunk_3", [(0, (0, 0, 0)), (0.5, (-20, 0, 0)), (0.9, (-35, 0, 0)), (1.6, (-30, 0, 0)), (2.4, (0, 0, 0))])
    clip.r("Head", [(0, (0, 0, 0)), (0.5, (-10, 0, 0)), (1.6, (-10, 0, 0)), (2.4, (0, 0, 0))])
    for bone, s in (("Ear_L", 1), ("Ear_R", -1)):
        clip.r(bone, [(0, (0, 0, 0)), (0.5, (0, 0, 14 * s)), (0.9, (0, 0, 4 * s)), (1.2, (0, 0, 14 * s)), (2.4, (0, 0, 0))])
    return clip


def ear_flap(style):
    """Elephant: its big ears fan back and forth while it sways (loops)."""
    clip = c.Clip(3.2, True)
    for bone, s in (("Ear_L", 1), ("Ear_R", -1)):
        clip.r(bone, [(t, (0, 0, s * (6 + 10 * abs(math.sin(math.pi * t / 0.8))))) for t in [i * 0.2 for i in range(17)]])
    clip.r("Trunk_1", c._wave(3.2, 1.6, 8, axis=2))
    clip.r("Trunk_2", c._wave(3.2, 1.6, 10, 0.4, axis=2))
    c.breathe(clip, 3.2)
    return clip


def hide_in_shell(style):
    """Turtle: head and legs slip into the shell, a peek, then out again (once)."""
    clip = c.Clip(3.0, False)
    clip.l("Neck", [(0, (0, 0, 0)), (0.4, (0, 0.22, -0.35)), (2.2, (0, 0.22, -0.35)), (3.0, (0, 0, 0))])
    clip.r("Head", [(0, (0, 0, 0)), (0.4, (14, 0, 0)), (1.5, (14, 0, 0)), (1.8, (6, 0, 10)), (2.2, (14, 0, 0)), (3.0, (0, 0, 0))])
    clip.l("Hips", [(0, (0, 0, 0)), (0.4, (0, 0, -0.06)), (2.2, (0, 0, -0.06)), (3.0, (0, 0, 0))])
    for side in ("L", "R"):
        clip.r(f"UpperArm_{side}", [(0, (0, 0, 0)), (0.4, (40, 0, 0)), (2.2, (40, 0, 0)), (3.0, (0, 0, 0))])
        clip.r(f"UpperLeg_{side}", [(0, (0, 0, 0)), (0.4, (35, 0, 0)), (2.2, (35, 0, 0)), (3.0, (0, 0, 0))])
    return clip


def tiny_hop(style):
    """Turtle: a careful little hop (a turtle does not jump like a rabbit)."""
    clip = c.Clip(1.4, False)
    clip.l("Hips", [(0, (0, 0, 0)), (0.3, (0, 0, -0.03)), (0.6, (0, 0, 0.08)), (0.9, (0, 0, 0)), (1.4, (0, 0, 0))])
    clip.r("Head", [(0, (0, 0, 0)), (0.6, (-10, 0, 0)), (1.4, (0, 0, 0))])
    return clip


def wing_flap(style):
    """Owl: flap the wings and lift off a little (once)."""
    clip = c.Clip(1.8, False)
    keys = [(0, 0), (0.2, 80), (0.4, 20), (0.6, 85), (0.8, 20), (1.0, 85), (1.2, 20), (1.8, 0)]
    for s in (1, -1):
        c.arm(clip, s, [(t, out, 0, 0, 0) for t, out in keys])
    clip.l("Hips", [(0, (0, 0, 0)), (0.3, (0, 0, 0.1)), (0.7, (0, 0, 0.22)), (1.1, (0, 0, 0.24)), (1.5, (0, 0, 0.05)), (1.8, (0, 0, 0))])
    return clip


def fly(style):
    """Owl: hovering flight, wings beating, body bobbing (loops)."""
    period = 0.5
    clip = c.Clip(period * 4, True)
    ts = [period * 4 * i / 16 for i in range(17)]
    for s in (1, -1):
        c.arm(clip, s, [(t, 50 + 35 * math.sin(2 * math.pi * t / period), 0, 0, 0) for t in ts])
    clip.l("Hips", [(t, (0, 0, 0.3 + 0.05 * math.sin(2 * math.pi * t / period))) for t in ts])
    clip.r("Hips", [(t, (8, 0, 0)) for t in ts])
    for side in ("L", "R"):
        clip.r(f"UpperLeg_{side}", [(t, (20, 0, 0)) for t in ts])
    return clip


def head_turn(style):
    """Owl: turns its head far round to look behind, and back (once)."""
    clip = c.Clip(2.6, False)
    clip.r("Head", [(0, (0, 0, 0)), (0.5, (0, 0, 100)), (1.0, (0, 0, 100)), (1.6, (0, 0, -100)), (2.1, (0, 0, -100)), (2.6, (0, 0, 0))])
    return clip


def prance(style):
    """Unicorn: a light prance with high front steps and a bouncy body (loops)."""
    return trot({**style, "gait": {"slow": 0.9, "stride": 1.4}})


def magic_sparkle(style):
    """Unicorn: rears up on its hind legs, front hooves high, and nods its horn (once)."""
    clip = c.Clip(2.0, False)
    clip.r("Hips", [(0, (0, 0, 0)), (0.4, (-18, 0, 0)), (1.4, (-18, 0, 0)), (2.0, (0, 0, 0))])
    clip.l("Hips", [(0, (0, 0, 0)), (0.4, (0, 0, 0.08)), (1.4, (0, 0, 0.08)), (2.0, (0, 0, 0))])
    for side in ("L", "R"):
        clip.r(f"UpperArm_{side}", [(0, (0, 0, 0)), (0.4, (-70, 0, 0)), (0.7, (-50, 0, 0)), (1.0, (-75, 0, 0)), (1.4, (-60, 0, 0)), (2.0, (0, 0, 0))])
        clip.r(f"Forearm_{side}", [(0, (0, 0, 0)), (0.4, (60, 0, 0)), (1.4, (60, 0, 0)), (2.0, (0, 0, 0))])
    clip.r("Head", [(0, (0, 0, 0)), (0.6, (12, 0, 0)), (0.9, (-6, 0, 0)), (1.2, (12, 0, 0)), (2.0, (0, 0, 0))])
    return clip


QUAD = {"energy": 1.0, "arm_rest_out": 0, "hop": 0.2, "secondary": 1.0, "sit_drop": 0.0}

MORE = {
    "elephant": {
        "build": build_elephant,
        "style": {**QUAD, "energy": 0.8, "hop": 0.12, "ears": ("Ear_L", "Ear_R"), "tail": ("Tail_1",), "gait": {"slow": 1.5, "stride": 0.8}, "specials": {"walk": trot, "run": trot_run, "spray": trunk_spray, "ear_flap": ear_flap, "sit": settle}},
        "face_target": (0, -0.3, 1.6),
    },
    "lion": {
        "build": build_lion,
        "style": {**QUAD, "energy": 1.1, "ears": ("Ear_L", "Ear_R"), "tail": ("Tail_1", "Tail_2", "Tail_3"), "specials": {"walk": trot, "run": trot_run, "roar": c.roar, "sniff": c.sniff, "tail_wag": c.tail_wag, "sit": settle}},
        "face_target": (0, -0.3, 1.6),
    },
    "turtle": {
        "build": build_turtle,
        "style": {**QUAD, "energy": 0.7, "hop": 0.06, "gait": {"slow": 2.0, "stride": 0.6}, "specials": {"walk": trot, "run": trot, "hide": hide_in_shell, "jump": tiny_hop, "sit": settle}},
        "face_target": (0, -0.3, 1.6),
    },
    "owl": {
        "build": build_owl,
        "style": {"energy": 0.9, "arm_rest_out": 10, "hop": 0.16, "secondary": 0.8, "ears": ("Ear_L", "Ear_R"), "specials": {"walk": waddle, "run": waddle, "flap": wing_flap, "fly": fly, "head_turn": head_turn}},
        "face_target": (0, -0.3, 1.65),
    },
    "unicorn": {
        "build": build_unicorn,
        "style": {**QUAD, "energy": 1.1, "ears": ("Ear_L", "Ear_R"), "sprouts": ("Sprout",), "tail": ("Tail_1", "Tail_2", "Tail_3"), "specials": {"walk": prance, "run": trot_run, "sparkle": magic_sparkle, "sit": settle}},
        "face_target": (0, -0.3, 1.6),
    },
    "dinosaur": {
        "build": build_dinosaur,
        "style": {"energy": 1.1, "arm_rest_out": 4, "hop": 0.18, "secondary": 1.0, "tail": ("Tail_1", "Tail_2", "Tail_3"), "specials": {"walk": waddle, "run": waddle, "roar": c.roar, "stomp": c.stomp, "tail_wag": c.tail_wag, "sniff": c.sniff}},
        "face_target": (0, -0.3, 1.75),
    },
}
