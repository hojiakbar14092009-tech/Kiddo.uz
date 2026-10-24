"""
Robot biped family: KidoBot, Astro, Melo, Pixel (one chassis, four identities).

Robots are mechanical: every part is weighted 100 % to one bone (rigid segments with dark joint
balls between them), so nothing bends like rubber. The face is a glowing screen: eyes and mouth
are emissive bands on the dark visor with morph targets (kit.FACE_KEYS).

KidoBot keeps the head size of the app's earlier 3D robot (radius 0.62 scaled 1.18 / 1 / 0.95,
centre 1.96 high) so the shop's outfits sit on it (sockets: Socket_Head, Socket_Neck, Socket_Face).
"""

import math

from mathutils import Vector

import kit
from kit import (
    Face,
    Surface,
    band_arc,
    band_ellipse,
    band_mouth,
    capsule,
    circle_outline,
    cylinder,
    extrude_outline,
    lathe,
    offset_band,
    rigid,
    rounded_box,
    sphere,
    star_outline,
    torus,
    transform,
    tube,
)

HEAD_C = Vector((0, 0, 1.96))
HEAD_R = Vector((0.62 * 1.18, 0.62 * 0.95, 0.62))  # x, y (depth), z


def robot_skeleton(ch):
    ch.bone("Root", (0, 0, 0))
    ch.bone("Hips", (0, 0, 0.66), "Root")
    ch.bone("Spine", (0, 0, 0.8), "Hips")
    ch.bone("Chest", (0, 0, 1.05), "Spine")
    ch.bone("Neck", (0, 0, 1.3), "Chest")
    ch.bone("Head", (0, 0, 1.4), "Neck")
    for s, side in ((1, "L"), (-1, "R")):
        ch.bone(f"Shoulder_{side}", (0.34 * s, 0, 1.18), "Chest")
        ch.bone(f"UpperArm_{side}", (0.48 * s, 0, 1.15), f"Shoulder_{side}")
        ch.bone(f"Forearm_{side}", (0.56 * s, 0, 0.85), f"UpperArm_{side}")
        ch.bone(f"Hand_{side}", (0.6 * s, 0, 0.57), f"Forearm_{side}")
        ch.bone(f"UpperLeg_{side}", (0.19 * s, 0, 0.62), "Hips")
        ch.bone(f"LowerLeg_{side}", (0.2 * s, 0, 0.44), f"UpperLeg_{side}")
        ch.bone(f"Foot_{side}", (0.21 * s, 0, 0.2), f"LowerLeg_{side}")
    ch.bone("Antenna", (0, 0, 2.55), "Head")
    ch.bone("Socket_Head", tuple(HEAD_C), "Head")
    ch.bone("Socket_Face", (0, -0.655, 1.94), "Head")
    ch.bone("Socket_Neck", (0, 0, 1.34), "Neck")


def robot_face(ch, glow, cfg):
    """Screen eyes and mouth (one glow material), optional cheeks."""
    surf = Surface((0, -0.15, 1.93), (0.6, 0.52, 0.47))
    face = Face(surf)
    eye_x, eye_z = 0.2, 0.05
    for s in (1, -1):
        cx = eye_x * s
        if cfg.get("sparkle_eyes"):
            neutral = sparkle(cx, eye_z, 0.1, 0.12)
            wide = sparkle(cx, eye_z, 0.13, 0.15)
        else:
            neutral = band_ellipse(cx, eye_z, 0.072, 0.098)
            wide = band_ellipse(cx, eye_z + 0.01, 0.095, 0.125)
        tilt = -0.35 * s
        states = {
            "neutral": neutral,
            "blink": band_arc(cx, eye_z - 0.02, 0.085, 0.0, 0.022),
            "eyes_happy": band_arc(cx, eye_z - 0.01, 0.09, 0.075, 0.04),
            "eyes_wide": wide,
            "eyes_sleepy": band_mouth(cx, eye_z, 0.085, 0.06, top_curve=-0.004),
            "eyes_sad": band_ellipse(cx, eye_z - 0.01, 0.07, 0.07, tilt=tilt),
            "look_left": offset_band(neutral, 0.045, 0.0),
            "look_right": offset_band(neutral, -0.045, 0.0),
            "look_up": offset_band(neutral, 0.0, 0.035),
            "look_down": offset_band(neutral, 0.0, -0.035),
        }
        face.add(states, glow, 0.006)
    mz = -0.15
    mouth = {
        "neutral": band_arc(0, mz, 0.075, -0.035, 0.024),
        "mouth_smile": band_mouth(0, mz + 0.03, 0.11, 0.085),
        "mouth_open": band_ellipse(0, mz, 0.055, 0.05),
        "mouth_o": band_ellipse(0, mz, 0.03, 0.038),
        "mouth_sad": band_arc(0, mz - 0.01, 0.06, 0.022, 0.022),
        "mouth_flat": band_arc(0, mz, 0.05, 0.0, 0.022),
    }
    face.add(mouth, glow, 0.006)
    if cfg.get("cheeks"):
        for s in (1, -1):
            face.add({"neutral": band_ellipse(0.32 * s, -0.08, 0.06, 0.035)}, ch.mat("cheek", cfg["cheeks"], rough=0.6, emit=cfg["cheeks"], strength=1.2), 0.004)
    ch.face = face


def sparkle(cx, cz, w, h, n=15):
    """A four-point twinkle as a band (Astro's eyes)."""
    top, bottom = [], []
    for i in range(n):
        s = -1 + 2 * i / (n - 1)
        z = h * (1 - abs(s) ** (2 / 3)) ** 1.5
        z = max(z, 0.004)
        top.append((cx + s * w, cz + z))
        bottom.append((cx + s * w, cz - z))
    return top, bottom


def k_outline():
    pts = [(-0.34, -0.5), (-0.12, -0.5), (-0.12, -0.13), (0.16, -0.5), (0.43, -0.5), (0.06, -0.02), (0.4, 0.5), (0.14, 0.5), (-0.12, 0.12), (-0.12, 0.5), (-0.34, 0.5)]
    return pts


def gear_outline(teeth=8, r_out=0.5, r_in=0.39):
    pts = []
    for i in range(teeth):
        a = 2 * math.pi * i / teeth
        step = 2 * math.pi / teeth
        for frac, r in ((0.0, r_in), (0.12, r_out), (0.38, r_out), (0.5, r_in)):
            b = a + step * frac
            pts.append((r * math.cos(b), r * math.sin(b)))
    return pts


def emblem_disc(ch, center_z, front_y, radius, disc_mat, ring_mat=None):
    """A round badge on the chest, facing forwards."""
    ch.add(cylinder(radius, radius, 0.05, 32), disc_mat, rigid("Chest"), transform((0, front_y + 0.01, center_z), (90, 0, 0)))
    if ring_mat is not None:
        ch.add(torus(radius, 0.022, 32, 10), ring_mat, rigid("Chest"), transform((0, front_y - 0.01, center_z), (90, 0, 0)))


def build_robot(ch, cfg):
    robot_skeleton(ch)
    shell = ch.mat("shell", cfg.get("shell", "#F7F8FB"), rough=0.28, coat=0.6)
    joint = ch.mat("joint", "#3B3F4E", rough=0.45)
    accent = ch.mat("accent", cfg["accent"], rough=0.3, coat=0.5)
    accent2 = ch.mat("accent2", cfg.get("accent2", cfg["accent"]), rough=0.3, coat=0.5)
    visor = ch.mat("visor", "#151A2E", rough=0.12, coat=1.0)
    glow = ch.mat("glow", cfg["glow"], rough=0.4, emit=cfg["glow"], strength=1.0)
    light = ch.mat("light", cfg.get("light", cfg["glow"]), rough=0.4, emit=cfg.get("light", cfg["glow"]), strength=1.6)
    torso_mat = ch.mat("torso", cfg["torso"], rough=0.28, coat=0.6) if cfg.get("torso") else shell
    arm_mat = ch.mat("arm", cfg["arm"], rough=0.28, coat=0.6) if cfg.get("arm") else shell

    # head: shell, visor, ear modules, top stripe, antenna
    ch.add(sphere(1.0, 40, 24), shell, rigid("Head"), transform(HEAD_C, scale=HEAD_R))
    ch.add(sphere(1.0, 40, 24), visor, rigid("Head"), transform((0, -0.15, 1.93), scale=(0.6, 0.52, 0.47)))
    # a thin rim around the screen
    ch.add(torus(1.0, 0.02, 48, 8), accent, rigid("Head"), transform((0, -0.5, 1.93), (90, 0, 0), (0.57, 0.445, 1.0)))
    for s in (1, -1):
        ear_x = HEAD_R.x + 0.02
        ch.add(cylinder(0.19, 0.19, 0.12, 32), accent, rigid("Head"), transform((ear_x * s, 0, 1.94), (0, 90, 0)))
        ch.add(cylinder(0.12, 0.12, 0.02, 28), light, rigid("Head"), transform(((ear_x + 0.062) * s, 0, 1.94), (0, 90, 0)))
        ch.add(torus(0.12, 0.018, 28, 8), shell, rigid("Head"), transform(((ear_x + 0.064) * s, 0, 1.94), (0, 90, 0)))
    if cfg.get("head_panels"):
        panel = ch.mat("panel", cfg["head_panels"], rough=0.3, coat=0.5)
        ch.add(sphere(1.0, 40, 16), panel, rigid("Head"), transform((0, 0.05, HEAD_C.z + 0.12), scale=(HEAD_R.x * 1.005, HEAD_R.y * 1.0, HEAD_R.z * 0.98)))
    if cfg.get("back_panel"):
        ch.add(rounded_box(0.3, 0.08, 0.3, 0.04), accent, rigid("Chest"), transform((0, 0.34, 1.0)))
        ch.add(rounded_box(0.18, 0.04, 0.16, 0.03), light, rigid("Chest"), transform((0, 0.38, 1.0)))
    if cfg.get("stripe", True):
        ch.add(rounded_box(0.32, 0.5, 0.06, 0.03), accent, rigid("Head"), transform((0, -0.08, 2.555), (8, 0, 0)))

    antenna = cfg.get("antenna", "ball")
    if antenna in ("ball", "saturn"):
        ch.add(tube([(0, 0, 2.52), (0, 0.01, 2.68), (0, 0.03, 2.8)], 0.022, 10), joint, rigid("Antenna"))
        ch.add(cylinder(0.07, 0.05, 0.06, 20), accent, rigid("Head"), transform((0, 0, 2.56)))
        ch.add(sphere(0.085, 20, 12), ch.mat("antenna", cfg.get("antenna_color", cfg["accent"]), rough=0.3, coat=0.5), rigid("Antenna"), transform((0, 0.03, 2.86)))
        if antenna == "saturn":
            ch.add(torus(0.2, 0.028, 36, 10), light, rigid("Antenna"), transform((0, 0.03, 2.86), (70, 18, 0)))
    if antenna == "headphones":
        # band over the head and big cups with a glowing music note
        band = [(math.cos(a) * 0.82, 0.0, 1.94 + math.sin(a) * 0.74) for a in [math.pi * i / 16 for i in range(17)]]
        ch.add(tube(band, 0.07, 14), accent, rigid("Head"))
        ch.add(rounded_box(0.36, 0.16, 0.07, 0.03), accent2, rigid("Head"), transform((0, 0, 2.7)))
        ch.add(rounded_box(0.16, 0.1, 0.04, 0.02), light, rigid("Head"), transform((0, -0.06, 2.72)))
        for s in (1, -1):
            ch.add(cylinder(0.27, 0.27, 0.18, 36), accent, rigid("Head"), transform((0.82 * s, 0, 1.94), (0, 90, 0)))
            ch.add(torus(0.26, 0.035, 36, 10), accent2, rigid("Head"), transform((0.92 * s, 0, 1.94), (0, 90, 0)))
            ch.add(cylinder(0.16, 0.16, 0.02, 28), light, rigid("Head"), transform((0.92 * s, 0, 1.94), (0, 90, 0)))

    # neck and collar
    ch.add(cylinder(0.12, 0.14, 0.16, 20), joint, rigid("Neck"), transform((0, 0, 1.36)))
    ch.add(torus(0.21, 0.04, 28, 10), accent, rigid("Chest"), transform((0, 0, 1.29), scale=(1, 0.9, 1)))

    # torso: an egg, a little flattened front-to-back
    prof = [(0, 0.58), (0.27, 0.6), (0.38, 0.69), (0.43, 0.84), (0.42, 1.0), (0.37, 1.14), (0.28, 1.25), (0.19, 1.3), (0, 1.31)]
    ch.add(lathe(prof, 36), torso_mat, rigid("Chest"), transform(scale=(1, 0.86, 1)))
    if cfg.get("belly"):
        ch.add(sphere(1.0, 28, 16), shell, rigid("Spine"), transform((0, -0.18, 0.8), scale=(0.24, 0.14, 0.15)))
    # hips connector
    ch.add(sphere(1.0, 24, 12), joint, rigid("Hips"), transform((0, 0, 0.62), scale=(0.3, 0.24, 0.1)))

    # chest emblem
    front_y = -0.42 * 0.86 - 0.005
    emblem = cfg["emblem"]
    disc_mat = ch.mat("badge", cfg.get("badge", "#FFFFFF"), rough=0.3, coat=0.4)
    emblem_disc(ch, 1.0, front_y, 0.15, disc_mat, accent)
    if emblem == "K":
        ch.add(extrude_outline([(x * 0.19, z * 0.19) for x, z in k_outline()], 0.03, 0.0), accent, rigid("Chest"), transform((0, front_y - 0.03, 1.0)))
    elif emblem == "star":
        ch.add(extrude_outline(star_outline(0.1, 0.045), 0.03), ch.mat("star", "#FFC93C", rough=0.3, emit="#FFB800", strength=0.6), rigid("Chest"), transform((0, front_y - 0.03, 1.0)))
    elif emblem == "note":
        note = ch.mat("note", cfg["glow2"], rough=0.3, emit=cfg["glow2"], strength=1.8)
        ch.add(sphere(1.0, 16, 10), note, rigid("Chest"), transform((-0.035, front_y - 0.035, 0.95), (0, 25, 0), (0.05, 0.02, 0.038)))
        ch.add(rounded_box(0.02, 0.02, 0.15, 0.008), note, rigid("Chest"), transform((0.01, front_y - 0.035, 1.02)))
        ch.add(extrude_outline([(0, 0), (0.07, -0.03), (0.08, -0.07), (0.05, -0.09), (0.06, -0.05), (0, -0.035)], 0.02), note, rigid("Chest"), transform((0.01, front_y - 0.035, 1.095)))
    elif emblem == "gear":
        ch.add(extrude_outline([(x * 0.22, z * 0.22) for x, z in gear_outline()], 0.03), ch.mat("gear", "#2F6FE4", rough=0.3, coat=0.4), rigid("Chest"), transform((0, front_y - 0.03, 1.0)))
        ch.add(cylinder(0.035, 0.035, 0.04, 20), disc_mat, rigid("Chest"), transform((0, front_y - 0.045, 1.0), (90, 0, 0)))
    for i, (x, z) in enumerate(cfg.get("chest_lights", ())):
        ch.add(capsule(0.018, 0.03, 10, 4), light, rigid("Chest"), transform((x, front_y + 0.02, z)))

    # backpack
    pack = cfg.get("backpack")
    if pack:
        pack_mat = ch.mat("pack", pack["color"], rough=0.3, coat=0.5)
        ch.add(rounded_box(0.42, 0.2, 0.42, 0.08), pack_mat, rigid("Chest"), transform((0, 0.36, 1.0)))
        if pack.get("ring"):
            ch.add(torus(0.1, 0.03, 28, 10), accent, rigid("Chest"), transform((0, 0.47, 1.02), (90, 0, 0)))
            ch.add(cylinder(0.08, 0.08, 0.02, 24), light, rigid("Chest"), transform((0, 0.47, 1.02), (90, 0, 0)))
        if pack.get("tools"):
            metal = ch.mat("metal", "#A9B2C0", rough=0.25, metal=0.8)
            ch.add(rounded_box(0.06, 0.06, 0.3, 0.02), ch.mat("tool_blue", "#2F6FE4", rough=0.35), rigid("Chest"), transform((0.25, 0.4, 1.02)))
            ch.add(cylinder(0.02, 0.02, 0.22, 10), metal, rigid("Chest"), transform((0.25, 0.4, 1.25)))
            ch.add(extrude_outline([(x * 0.18, z * 0.18) for x, z in gear_outline(8)], 0.03), metal, rigid("Chest"), transform((-0.22, 0.5, 0.92), (0, 0, 0)))

    # arms: shoulder joint, upper arm, elbow, forearm, cuff, mitten hand
    for s, side in ((1, "L"), (-1, "R")):
        ch.add(sphere(0.12, 18, 12), joint, rigid(f"UpperArm_{side}"), transform((0.48 * s, 0, 1.15)))
        if cfg.get("shoulder_pads"):
            ch.add(sphere(1.0, 24, 12), accent, rigid(f"UpperArm_{side}"), transform((0.5 * s, 0, 1.15), (0, -18 * s, 0), (0.17, 0.17, 0.12)))
        ch.add(capsule(0.11, 0.14, 18, 5), arm_mat, rigid(f"UpperArm_{side}"), transform((0.53 * s, 0, 0.99), (0, -8 * s, 0)))
        ch.add(sphere(0.095, 16, 10), joint, rigid(f"Forearm_{side}"), transform((0.56 * s, 0, 0.85)))
        ch.add(capsule(0.1, 0.11, 18, 5), shell, rigid(f"Forearm_{side}"), transform((0.58 * s, 0, 0.72), (0, -5 * s, 0)))
        ch.add(torus(0.1, 0.03, 24, 8), accent, rigid(f"Forearm_{side}"), transform((0.595 * s, 0, 0.6)))
        ch.add(sphere(1.0, 20, 14), shell, rigid(f"Hand_{side}"), transform((0.6 * s, -0.01, 0.48), scale=(0.11, 0.095, 0.12)))
        ch.add(capsule(0.042, 0.06, 10, 4), shell, rigid(f"Hand_{side}"), transform((0.53 * s, -0.07, 0.52), (0, 30 * s, 0)))
        # legs: hip joint, thigh, knee, shin, boot with a coloured sole
        ch.add(capsule(0.12, 0.08, 18, 5), shell, rigid(f"UpperLeg_{side}"), transform((0.19 * s, 0, 0.53)))
        ch.add(sphere(0.1, 16, 10), joint, rigid(f"LowerLeg_{side}"), transform((0.2 * s, 0, 0.43)))
        ch.add(capsule(0.115, 0.08, 18, 5), shell, rigid(f"LowerLeg_{side}"), transform((0.205 * s, 0, 0.31)))
        boot = ch.mat("boot", cfg.get("boot", "#F7F8FB"), rough=0.28, coat=0.6)
        ch.add(sphere(1.0, 28, 16), boot, rigid(f"Foot_{side}"), transform((0.22 * s, -0.06, 0.14), scale=(0.2, 0.29, 0.14)))
        ch.add(cylinder(1.0, 1.0, 1.0, 32), accent, rigid(f"Foot_{side}"), transform((0.22 * s, -0.06, 0.04), scale=(0.21, 0.3, 0.06)))
        ch.add(cylinder(0.055, 0.055, 0.02, 20), accent2 if cfg.get("accent2") else accent, rigid(f"Foot_{side}"), transform((0.415 * s, -0.04, 0.15), (0, 90, 0)))

    # tool in the right hand
    if cfg.get("wrench"):
        metal = ch.mat("metal", "#A9B2C0", rough=0.25, metal=0.8)
        grip = ch.mat("grip", "#2B2F3A", rough=0.6)
        ch.bone("Tool", (-0.6, -0.02, 0.48), "Hand_R")
        ch.add(rounded_box(0.05, 0.035, 0.42, 0.015), metal, rigid("Tool"), transform((-0.62, -0.1, 0.62), (0, 0, 0)))
        ch.add(rounded_box(0.06, 0.045, 0.12, 0.02), grip, rigid("Tool"), transform((-0.62, -0.1, 0.47)))
        ch.add(extrude_outline(wrench_head(), 0.04), metal, rigid("Tool"), transform((-0.62, -0.12, 0.86)))

    robot_face(ch, glow, cfg)


def wrench_head():
    """Open-end wrench jaw as an outline (a C shape)."""
    pts = []
    for i in range(13):
        a = math.radians(-60 + 300 * i / 12)
        pts.append((0.1 * math.cos(a), 0.1 * math.sin(a)))
    for i in range(13):
        a = math.radians(240 - 300 * i / 12)
        pts.append((0.045 * math.cos(a), 0.045 * math.sin(a) + 0.02))
    return pts


ROBOTS = {
    "kidobot": dict(accent="#1E7BF0", glow="#3CC8FF", light="#8FD6FF", emblem="K", antenna="ball", chest_lights=(), back_panel=True),
    "astro": dict(accent="#1F86F2", glow="#3CC4FF", light="#5FC2FF", emblem="star", antenna="saturn", sparkle_eyes=True, shoulder_pads=True, backpack={"color": "#F7F8FB", "ring": True}, chest_lights=((-0.2, 1.1), (-0.2, 1.04))),
    "melo": dict(accent="#7B3FE4", accent2="#FF4FB8", glow="#3CE8FF", glow2="#FF5FCB", light="#FF7AD0", emblem="note", antenna="headphones", stripe=False, cheeks="#FF8FD3", boot="#F7F8FB"),
    "pixel": dict(accent="#1F6FE8", accent2="#FF8A1F", glow="#3CC8FF", head_panels="#FF8A1F", light="#7FD0FF", emblem="gear", antenna="ball", torso="#FF8A1F", arm="#FF8A1F", shoulder_pads=True, backpack={"color": "#FF8A1F", "tools": True}, wrench=True, badge="#F7F8FB", antenna_color="#FF8A1F"),
}
