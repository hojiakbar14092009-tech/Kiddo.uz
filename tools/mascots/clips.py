"""
The mascot animation library: named clips as keyframes on the shared bone names.

All bones rest with their axes on the world axes (kit.Character.build), so a rotation means the
same thing on every character. In Blender's frame (Z up, the character looks at -Y, its left is
+X), for a pose rotation in degrees:

- X: + leans / nods forward (a hanging limb swings backwards; forward is -X)
- Y: + tilts toward the character's left (a hanging left arm goes inwards; raise it with -Y)
- Z: + turns toward the character's left

Clips are in place: no clip moves the character across the ground (only the Hips go up and down
for hops and breathing). Moving a character is the app's job (one movement authority).

`clip_library(style)` returns {clip name: Clip}; the builder keeps only the tracks of bones that a
character really has, so the same clip drives every rig family (shared semantics, retargeted by
bone name). `style` tunes amplitude and adds the character's own bones (tail, ears, leaves).
"""

import math

FPS = 30


class Clip:
    def __init__(self, seconds, loop):
        self.frames = max(2, round(seconds * FPS))
        self.loop = loop
        self.rot = {}  # bone -> [(frame, (x, y, z) degrees)]
        self.loc = {}  # bone -> [(frame, (x, y, z))]
        # background layer (breathing): used only for bones the clip does not animate itself
        self.base_rot = {}
        self.base_loc = {}

    def r(self, bone, keys, base=False):
        """keys: [(seconds, (x, y, z))]"""
        (self.base_rot if base else self.rot).setdefault(bone, []).extend((round(t * FPS) + 1, tuple(v)) for t, v in keys)
        return self

    def l(self, bone, keys, base=False):
        (self.base_loc if base else self.loc).setdefault(bone, []).extend((round(t * FPS) + 1, tuple(v)) for t, v in keys)
        return self

    def tracks(self):
        rot = {**self.base_rot, **self.rot}
        loc = {**self.base_loc, **self.loc}
        return rot, loc


def _wave(n, period, amp, phase=0.0, offset=(0, 0, 0), axis=0, steps=None):
    """Keys of a sine on one axis over n seconds (loops when n is a whole number of periods)."""
    steps = steps or max(4, int(n / period * 8))
    keys = []
    for i in range(steps + 1):
        t = n * i / steps
        v = list(offset)
        v[axis] += amp * math.sin(2 * math.pi * t / period + phase)
        keys.append((t, v))
    return keys


def _side(s):
    return "L" if s > 0 else "R"


def arm(clip, s, keys):
    """keys: [(t, out, fwd, elbow, twist)] for the arm on side s (+1 left, -1 right).
    out: raise sideways (deg), fwd: raise forwards, elbow: bend forwards, twist: forearm roll."""
    side = _side(s)
    clip.r(f"UpperArm_{side}", [(t, (-fwd, -s * out, 0)) for t, out, fwd, _, _ in keys])
    clip.r(f"Forearm_{side}", [(t, (-elbow, -s * tw, 0)) for t, _, _, elbow, tw in keys])


def secondary(clip, style, seconds, amount=1.0):
    """Gentle follow-through on the character's own parts (ears, tail, leaves, antenna)."""
    e = amount * style.get("secondary", 1.0)
    period = 2.2 if seconds < 2.2 else seconds / max(1, round(seconds / 2.2))
    for i, bone in enumerate(style.get("ears", ())):
        s = 1 if bone.endswith("_L") else -1
        clip.r(bone, _wave(seconds, period, 6 * e, i * 0.8, axis=1, offset=(0, 0, 0)) if s > 0 else _wave(seconds, period, -6 * e, i * 0.8, axis=1))
    for i, bone in enumerate(style.get("tail", ())):
        clip.r(bone, _wave(seconds, period * 1.3, 7 * e * (1 + 0.4 * i), 0.6 * i, axis=2))
    for i, bone in enumerate(style.get("sprouts", ())):
        clip.r(bone, _wave(seconds, period * 0.9, 5 * e, 1.1 * i, axis=1))
    for bone in style.get("antenna", ()):
        clip.r(bone, _wave(seconds, period * 0.8, 4 * e, 0.3, axis=1))


def breathe(clip, seconds, e=1.0, hips_bob=0.012):
    period = seconds / max(1, round(seconds / 3.4))
    clip.r("Chest", _wave(seconds, period, 1.5 * e, axis=0), base=True)
    clip.l("Hips", [(t, (0, 0, v[0])) for t, v in _wave(seconds, period, hips_bob * e, axis=0)], base=True)
    clip.r("Head", _wave(seconds, seconds / max(1, round(seconds / 4.3)), 1.5 * e, 0.6, axis=0), base=True)


def clip_library(style):
    e = style.get("energy", 1.0)
    rest_out = style.get("arm_rest_out", 0.0)
    clips = {}

    # idle: breathing and a slow weight shift; low amplitude (it plays most of the time)
    c = Clip(6.8, True)
    breathe(c, 6.8, e)
    c.r("Hips", _wave(6.8, 6.8, 1.6 * e, axis=1))
    c.r("Spine", _wave(6.8, 6.8, -1.2 * e, axis=1))
    for s in (1, -1):
        arm(c, s, [(t, rest_out + 3 * math.sin(2 * math.pi * t / 3.4 + (0 if s > 0 else 0.5)), 0, 6, 0) for t in (0, 0.85, 1.7, 2.55, 3.4, 4.25, 5.1, 5.95, 6.8)])
    secondary(c, style, 6.8, 0.7)
    clips["idle"] = c

    # idle_alt: a look to the side and back
    c = Clip(4.0, False)
    breathe(c, 4.0, e)
    c.r("Head", [(0, (0, 0, 0)), (0.8, (-4, 4, 22)), (2.2, (-4, 4, 22)), (3.2, (2, -2, -6)), (4.0, (0, 0, 0))])
    c.r("Chest", [(0, (0, 0, 0)), (0.9, (0, 0, 6)), (2.2, (0, 0, 6)), (4.0, (0, 0, 0))])
    secondary(c, style, 4.0)
    clips["idle_alt"] = c

    # wave: anticipation, three waves, settle
    c = Clip(2.4, False)
    breathe(c, 2.4, e)
    arm(c, -1, [(0, rest_out, 0, 6, 0), (0.25, rest_out + 10, 0, 10, 0), (0.55, 140, 10, 30, 0), (0.8, 140, 10, 30, 22), (1.05, 140, 10, 30, -22), (1.3, 140, 10, 30, 22), (1.55, 140, 10, 30, -18), (1.9, 120, 6, 24, 0), (2.4, rest_out, 0, 6, 0)])
    c.r("Head", [(0, (0, 0, 0)), (0.5, (0, -6, -8)), (1.9, (0, -6, -8)), (2.4, (0, 0, 0))])
    c.r("Chest", [(0, (0, 0, 0)), (0.55, (0, 4, -4)), (1.9, (0, 4, -4)), (2.4, (0, 0, 0))])
    secondary(c, style, 2.4, 1.3)
    clips["wave"] = c

    # point: the right arm points forward and a little up (at a destination / a planet)
    c = Clip(2.2, False)
    breathe(c, 2.2, e)
    arm(c, -1, [(0, rest_out, 0, 6, 0), (0.35, 30, 75, 0, 0), (1.7, 30, 75, 0, 0), (2.2, rest_out, 0, 6, 0)])
    c.r("Head", [(0, (0, 0, 0)), (0.35, (-6, 0, -14)), (1.7, (-6, 0, -14)), (2.2, (0, 0, 0))])
    c.r("Chest", [(0, (0, 0, 0)), (0.35, (0, 0, -10)), (1.7, (0, 0, -10)), (2.2, (0, 0, 0))])
    clips["point"] = c

    # point_up: at the sky (Astro, planets)
    c = Clip(2.4, False)
    breathe(c, 2.4, e)
    arm(c, -1, [(0, rest_out, 0, 6, 0), (0.4, 40, 150, 0, 0), (1.9, 40, 150, 0, 0), (2.4, rest_out, 0, 6, 0)])
    c.r("Head", [(0, (0, 0, 0)), (0.4, (-22, 0, -8)), (1.9, (-22, 0, -8)), (2.4, (0, 0, 0))])
    clips["point_up"] = c

    # nod (yes) and shake_head (gentle no / "not yet")
    c = Clip(1.2, False)
    c.r("Head", [(0, (0, 0, 0)), (0.2, (14, 0, 0)), (0.4, (-3, 0, 0)), (0.6, (12, 0, 0)), (0.85, (-2, 0, 0)), (1.2, (0, 0, 0))])
    c.r("Chest", [(0, (0, 0, 0)), (0.2, (3, 0, 0)), (0.6, (3, 0, 0)), (1.2, (0, 0, 0))])
    clips["nod"] = c
    c = Clip(1.3, False)
    c.r("Head", [(0, (0, 0, 0)), (0.2, (0, 0, 16)), (0.45, (0, 0, -16)), (0.7, (0, 0, 12)), (0.95, (0, 0, -6)), (1.3, (0, 0, 0))])
    clips["shake_head"] = c

    # celebrate: anticipation squat, jump with both arms up, land, settle
    c = Clip(2.0, False)
    h = style.get("hop", 0.22) * e
    c.l("Hips", [(0, (0, 0, 0)), (0.2, (0, 0, -0.07)), (0.45, (0, 0, h)), (0.7, (0, 0, -0.05)), (0.95, (0, 0, h * 0.6)), (1.2, (0, 0, -0.03)), (1.5, (0, 0, 0)), (2.0, (0, 0, 0))])
    for s in (1, -1):
        arm(c, s, [(0, rest_out, 0, 6, 0), (0.2, 20, 0, 30, 0), (0.45, 150, 20, 20, 0), (0.7, 120, 10, 30, 0), (0.95, 155, 20, 20, 0), (1.5, 120, 10, 30, 0), (2.0, rest_out, 0, 6, 0)])
        side = _side(s)
        c.r(f"UpperLeg_{side}", [(0, (0, 0, 0)), (0.2, (-25, 0, 0)), (0.45, (10, 0, 0)), (0.7, (-18, 0, 0)), (0.95, (8, 0, 0)), (1.2, (-8, 0, 0)), (1.5, (0, 0, 0))])
        c.r(f"LowerLeg_{side}", [(0, (0, 0, 0)), (0.2, (40, 0, 0)), (0.45, (0, 0, 0)), (0.7, (30, 0, 0)), (0.95, (0, 0, 0)), (1.2, (12, 0, 0)), (1.5, (0, 0, 0))])
    c.r("Head", [(0, (0, 0, 0)), (0.2, (8, 0, 0)), (0.45, (-12, 0, 0)), (0.95, (-10, 0, 0)), (1.5, (0, 0, 0))])
    c.r("Spine", [(0, (0, 0, 0)), (0.2, (8, 0, 0)), (0.45, (-6, 0, 0)), (1.5, (0, 0, 0))])
    secondary(c, style, 2.0, 1.8)
    clips["celebrate"] = c

    # jump: one happy hop
    c = Clip(1.0, False)
    c.l("Hips", [(0, (0, 0, 0)), (0.15, (0, 0, -0.06)), (0.4, (0, 0, h * 0.8)), (0.65, (0, 0, -0.03)), (1.0, (0, 0, 0))])
    for s in (1, -1):
        arm(c, s, [(0, rest_out, 0, 6, 0), (0.15, rest_out, -10, 20, 0), (0.4, 70, 10, 20, 0), (0.65, 30, 0, 20, 0), (1.0, rest_out, 0, 6, 0)])
        side = _side(s)
        c.r(f"UpperLeg_{side}", [(0, (0, 0, 0)), (0.15, (-20, 0, 0)), (0.4, (6, 0, 0)), (0.65, (-12, 0, 0)), (1.0, (0, 0, 0))])
        c.r(f"LowerLeg_{side}", [(0, (0, 0, 0)), (0.15, (32, 0, 0)), (0.4, (0, 0, 0)), (0.65, (20, 0, 0)), (1.0, (0, 0, 0))])
    secondary(c, style, 1.0, 1.4)
    clips["jump"] = c

    # think: hand to the chin, head tilted, a look up
    c = Clip(3.0, False)
    breathe(c, 3.0, e)
    arm(c, -1, [(0, rest_out, 0, 6, 0), (0.45, 15, 40, 120, 0), (2.5, 15, 40, 120, 0), (3.0, rest_out, 0, 6, 0)])
    arm(c, 1, [(0, rest_out, 0, 6, 0), (0.45, rest_out, 25, 70, 0), (2.5, rest_out, 25, 70, 0), (3.0, rest_out, 0, 6, 0)])
    c.r("Head", [(0, (0, 0, 0)), (0.5, (-10, 10, 8)), (1.6, (-12, 12, 12)), (2.5, (-10, 10, 8)), (3.0, (0, 0, 0))])
    clips["think"] = c

    # surprised: a small jolt back, hands up, settle
    c = Clip(1.4, False)
    c.l("Hips", [(0, (0, 0, 0)), (0.12, (0, 0, 0.05)), (0.35, (0, 0, 0)), (1.4, (0, 0, 0))])
    c.r("Spine", [(0, (0, 0, 0)), (0.12, (-8, 0, 0)), (0.5, (-3, 0, 0)), (1.4, (0, 0, 0))])
    c.r("Head", [(0, (0, 0, 0)), (0.12, (-10, 0, 0)), (0.6, (-4, 0, 0)), (1.4, (0, 0, 0))])
    for s in (1, -1):
        arm(c, s, [(0, rest_out, 0, 6, 0), (0.15, 35, 45, 80, 0), (0.9, 30, 40, 75, 0), (1.4, rest_out, 0, 6, 0)])
    secondary(c, style, 1.4, 1.5)
    clips["surprised"] = c

    # encourage: a fist pump / thumbs-up gesture and a nod
    c = Clip(1.6, False)
    breathe(c, 1.6, e)
    arm(c, -1, [(0, rest_out, 0, 6, 0), (0.3, 20, 50, 100, 0), (0.5, 22, 60, 110, 0), (1.2, 22, 60, 110, 0), (1.6, rest_out, 0, 6, 0)])
    c.r("Head", [(0, (0, 0, 0)), (0.35, (8, 0, -4)), (0.6, (-2, 0, -4)), (1.2, (0, 0, -4)), (1.6, (0, 0, 0))])
    clips["encourage"] = c

    # listen: lean in, head tilt, hand cupped
    c = Clip(2.4, True)
    breathe(c, 2.4, e * 0.6)
    c.r("Spine", [(0, (5, 0, 0)), (2.4, (5, 0, 0))])
    c.r("Head", [(0, (4, 10, 0)), (1.2, (6, 12, 0)), (2.4, (4, 10, 0))])
    arm(c, 1, [(0, 25, 20, 95, 0), (2.4, 25, 20, 95, 0)])
    clips["listen"] = c

    # talk: small hand gestures and head bobs (loops while speech plays)
    c = Clip(2.4, True)
    breathe(c, 2.4, e)
    c.r("Head", _wave(2.4, 0.8, 4 * e, axis=0) )
    arm(c, -1, [(t, rest_out + 8 + 6 * math.sin(t * 2.6), 20 + 10 * math.sin(t * 2.6 + 1), 40, 0) for t in (0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4)])
    arm(c, 1, [(t, rest_out + 4 + 4 * math.sin(t * 2.6 + 2), 10 + 6 * math.sin(t * 2.6 + 2.5), 25, 0) for t in (0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4)])
    clips["talk"] = c

    # walk / run (in place)
    for name, seconds, swing, bob in (("walk", 1.0, 26, 0.03), ("run", 0.6, 40, 0.06)):
        c = Clip(seconds, True)
        steps = 8
        for i in range(steps + 1):
            t = seconds * i / steps
            p = 2 * math.pi * t / seconds
            c.l("Hips", [(t, (0, 0, bob * e * abs(math.sin(p))))])
            c.r("UpperLeg_L", [(t, (-swing * math.sin(p), 0, 0))])
            c.r("UpperLeg_R", [(t, (swing * math.sin(p), 0, 0))])
            c.r("LowerLeg_L", [(t, (max(0, 30 * math.sin(p + 1.2)), 0, 0))])
            c.r("LowerLeg_R", [(t, (max(0, -30 * math.sin(p + 1.2)), 0, 0))])
            c.r("UpperArm_L", [(t, (swing * 0.8 * math.sin(p), -rest_out, 0))])
            c.r("UpperArm_R", [(t, (-swing * 0.8 * math.sin(p), rest_out, 0))])
            c.r("Forearm_L", [(t, (-20, 0, 0))])
            c.r("Forearm_R", [(t, (-20, 0, 0))])
            c.r("Hips", [(t, (0, 0, 5 * math.sin(p)))])
            c.r("Chest", [(t, (4 if name == "run" else 2, 0, -6 * math.sin(p)))])
        secondary(c, style, seconds, 1.2)
        clips[name] = c

    # turn: a full turn in place
    c = Clip(1.6, False)
    c.r("Root", [(0, (0, 0, 0)), (0.4, (0, 0, 90)), (0.8, (0, 0, 180)), (1.2, (0, 0, 270)), (1.6, (0, 0, 360))])
    c.l("Hips", [(0, (0, 0, 0)), (0.4, (0, 0, 0.03)), (0.8, (0, 0, 0)), (1.2, (0, 0, 0.03)), (1.6, (0, 0, 0))])
    clips["turn"] = c

    # sit (holds) and sleep (loops: slow breathing, head down)
    c = Clip(1.2, False)
    drop = style.get("sit_drop", 0.25)
    c.l("Hips", [(0, (0, 0, 0)), (0.6, (0, 0, -drop)), (1.2, (0, 0, -drop))])
    for side in ("L", "R"):
        c.r(f"UpperLeg_{side}", [(0, (0, 0, 0)), (0.6, (-80, 0, 0)), (1.2, (-80, 0, 0))])
        c.r(f"LowerLeg_{side}", [(0, (0, 0, 0)), (0.6, (70, 0, 0)), (1.2, (70, 0, 0))])
    clips["sit"] = c
    c = Clip(4.0, True)
    c.r("Head", [(0, (18, 8, 0)), (2.0, (22, 8, 0)), (4.0, (18, 8, 0))])
    c.r("Spine", [(0, (6, 0, 0)), (2.0, (8, 0, 0)), (4.0, (6, 0, 0))])
    c.l("Hips", [(0, (0, 0, -0.02)), (2.0, (0, 0, -0.035)), (4.0, (0, 0, -0.02))])
    for s in (1, -1):
        arm(c, s, [(0, rest_out * 0.5, 0, 10, 0), (4.0, rest_out * 0.5, 0, 10, 0)])
    clips["sleep"] = c

    # look_around
    c = Clip(4.4, False)
    breathe(c, 4.4, e)
    c.r("Head", [(0, (0, 0, 0)), (0.7, (-4, 0, 30)), (1.6, (-4, 0, 30)), (2.4, (-8, 0, -30)), (3.4, (-8, 0, -30)), (4.4, (0, 0, 0))])
    c.r("Chest", [(0, (0, 0, 0)), (0.8, (0, 0, 8)), (2.5, (0, 0, -8)), (4.4, (0, 0, 0))])
    secondary(c, style, 4.4)
    clips["look_around"] = c

    # quiet versions for reduced motion: a pose, no jumping or spinning
    c = Clip(1.2, False)
    for s in (1, -1):
        arm(c, s, [(0, rest_out, 0, 6, 0), (0.4, 60, 10, 30, 0), (0.9, 60, 10, 30, 0), (1.2, rest_out, 0, 6, 0)])
    clips["celebrate_calm"] = c

    for name, build in style.get("specials", {}).items():
        clips[name] = build(style)
    return clips


# ---------------------------------------------------------------------------------------------
# character-specific clips (the builder of each mascot lists the ones it has)


def float_zero_g(style):
    """Astro: weightless bob, limbs drifting (loops)."""
    c = Clip(4.0, True)
    c.l("Hips", _keys_loc(4.0, 4.0, 0.08))
    c.r("Spine", _wave(4.0, 4.0, 4, axis=1))
    for s in (1, -1):
        arm(c, s, [(t, 35 + 8 * math.sin(t * 1.57 + s), 10, 20, 0) for t in (0, 1, 2, 3, 4)])
    c.r("UpperLeg_L", _wave(4.0, 4.0, 10, axis=0))
    c.r("UpperLeg_R", _wave(4.0, 4.0, -10, axis=0))
    secondary(c, style, 4.0)
    return c


def telescope_look(style):
    c = Clip(2.8, False)
    for s in (1, -1):
        arm(c, s, [(0, 0, 0, 6, 0), (0.4, 10, 70, 110, 0), (2.3, 10, 70, 110, 0), (2.8, 0, 0, 6, 0)])
    c.r("Head", [(0, (0, 0, 0)), (0.4, (-18, 0, 0)), (1.4, (-20, 0, 12)), (2.3, (-18, 0, -6)), (2.8, (0, 0, 0))])
    return c


def tail_wag(style):
    c = Clip(1.6, True)
    for i, bone in enumerate(style.get("tail", ())):
        c.r(bone, _wave(1.6, 0.4, 18 * (1 + 0.3 * i), 0.5 * i, axis=2))
    c.r("Hips", _wave(1.6, 0.4, -4, axis=2))
    breathe(c, 1.6)
    return c


def stomp(style):
    c = Clip(1.6, False)
    for t0, side in ((0.0, "L"), (0.8, "R")):
        c.r(f"UpperLeg_{side}", [(t0, (0, 0, 0)), (t0 + 0.25, (-40, 0, 0)), (t0 + 0.4, (0, 0, 0))])
        c.r(f"LowerLeg_{side}", [(t0, (0, 0, 0)), (t0 + 0.25, (35, 0, 0)), (t0 + 0.4, (0, 0, 0))])
    c.l("Hips", [(0, (0, 0, 0)), (0.25, (0, 0, 0.03)), (0.4, (0, 0, -0.02)), (0.6, (0, 0, 0)), (1.05, (0, 0, 0.03)), (1.2, (0, 0, -0.02)), (1.6, (0, 0, 0))])
    c.r("Head", [(0, (0, 0, 0)), (0.4, (6, 0, 0)), (0.6, (0, 0, 0)), (1.2, (6, 0, 0)), (1.6, (0, 0, 0))])
    return c


def sniff(style):
    c = Clip(2.2, False)
    c.r("Spine", [(0, (0, 0, 0)), (0.4, (12, 0, 0)), (1.8, (12, 0, 0)), (2.2, (0, 0, 0))])
    c.r("Head", [(0, (0, 0, 0)), (0.4, (14, 0, 0)), (0.7, (16, 0, 10)), (1.0, (14, 0, -10)), (1.3, (16, 0, 6)), (1.8, (14, 0, 0)), (2.2, (0, 0, 0))])
    if "Jaw" in style.get("extra_bones", ()):
        c.r("Jaw", [(0, (0, 0, 0)), (0.7, (-4, 0, 0)), (1.0, (0, 0, 0)), (1.3, (-4, 0, 0)), (2.2, (0, 0, 0))])
    return c


def happy_hop(style):
    c = Clip(1.6, False)
    h = style.get("hop", 0.22)
    for i in range(3):
        t = i * 0.5
        c.l("Hips", [(t, (0, 0, 0)), (t + 0.25, (0, 0, h * 0.6)), (t + 0.5, (0, 0, 0))])
    for i, bone in enumerate(style.get("tail", ())):
        c.r(bone, _wave(1.6, 0.4, 14, 0.4 * i, axis=2))
    for s in (1, -1):
        arm(c, s, [(0, 0, 0, 6, 0), (0.25, 40, 20, 40, 0), (1.25, 40, 20, 40, 0), (1.6, 0, 0, 6, 0)])
    return c


def welcome(style):
    """Ziyo: both arms open in welcome, then the right hand to the heart (a respectful greeting)."""
    c = Clip(3.0, False)
    arm(c, 1, [(0, 0, 0, 6, 0), (0.5, 55, 25, 25, 0), (1.4, 55, 25, 25, 0), (2.4, 55, 25, 25, 0), (3.0, 0, 0, 6, 0)])
    arm(c, -1, [(0, 0, 0, 6, 0), (0.5, 55, 25, 25, 0), (1.4, 55, 25, 25, 0), (1.9, 12, 35, 115, 0), (2.5, 12, 35, 115, 0), (3.0, 0, 0, 6, 0)])
    c.r("Head", [(0, (0, 0, 0)), (1.9, (0, 0, 0)), (2.2, (12, 0, 0)), (2.6, (0, 0, 0))])
    c.r("Spine", [(0, (0, 0, 0)), (1.9, (0, 0, 0)), (2.2, (8, 0, 0)), (2.6, (0, 0, 0))])
    return c


def present(style):
    """Ziyo / Story: an open hand presenting something to the side."""
    c = Clip(2.4, False)
    arm(c, 1, [(0, 0, 0, 6, 0), (0.45, 45, 40, 30, -20), (1.9, 45, 40, 30, -20), (2.4, 0, 0, 6, 0)])
    c.r("Head", [(0, (0, 0, 0)), (0.45, (2, 0, 14)), (1.9, (2, 0, 14)), (2.4, (0, 0, 0))])
    c.r("Chest", [(0, (0, 0, 0)), (0.45, (0, 0, 8)), (1.9, (0, 0, 8)), (2.4, (0, 0, 0))])
    return c


def hover(style):
    """Lumi: a light hover (loops)."""
    c = Clip(3.0, True)
    c.l("Hips", _keys_loc(3.0, 3.0, 0.06, base=0.08))
    for s in (1, -1):
        arm(c, s, [(t, 25 + 6 * math.sin(t * 2.1), 10, 20, 0) for t in (0, 0.75, 1.5, 2.25, 3.0)])
    c.r("UpperLeg_L", [(0, (-12, 0, 0)), (3.0, (-12, 0, 0))])
    c.r("UpperLeg_R", [(0, (-6, 0, 0)), (3.0, (-6, 0, 0))])
    c.r("LowerLeg_L", [(0, (22, 0, 0)), (3.0, (22, 0, 0))])
    c.r("LowerLeg_R", [(0, (14, 0, 0)), (3.0, (14, 0, 0))])
    secondary(c, style, 3.0, 1.3)
    return c


def illuminate(style):
    """Lumi: hands open upwards, shining (the glow pulse itself is a runtime material effect)."""
    c = Clip(2.4, False)
    for s in (1, -1):
        arm(c, s, [(0, 0, 0, 6, 0), (0.5, 50, 60, 40, 0), (1.9, 50, 60, 40, 0), (2.4, 0, 0, 6, 0)])
    c.l("Hips", [(0, (0, 0, 0)), (0.5, (0, 0, 0.06)), (1.9, (0, 0, 0.06)), (2.4, (0, 0, 0))])
    c.r("Head", [(0, (0, 0, 0)), (0.5, (-10, 0, 0)), (1.9, (-10, 0, 0)), (2.4, (0, 0, 0))])
    secondary(c, style, 2.4, 1.5)
    return c


def leaf_flutter(style):
    c = Clip(1.6, False)
    for i, bone in enumerate(style.get("ears", ()) + style.get("sprouts", ())):
        s = 1 if bone.endswith("_L") else -1
        c.r(bone, _wave(1.6, 0.27, 12 * s, 0.4 * i, axis=1))
    c.r("Head", [(0, (0, 0, 0)), (0.4, (0, 6, 0)), (0.8, (0, -6, 0)), (1.2, (0, 4, 0)), (1.6, (0, 0, 0))])
    return c


def gardening(style):
    """Leafy: kneel-ish, pat the soil twice."""
    c = Clip(2.6, False)
    c.r("Spine", [(0, (0, 0, 0)), (0.4, (22, 0, 0)), (2.2, (22, 0, 0)), (2.6, (0, 0, 0))])
    c.l("Hips", [(0, (0, 0, 0)), (0.4, (0, 0, -0.08)), (2.2, (0, 0, -0.08)), (2.6, (0, 0, 0))])
    for s in (1, -1):
        arm(c, s, [(0, 0, 0, 6, 0), (0.4, 10, 50, 30, 0), (0.8, 10, 60, 20, 0), (1.1, 10, 50, 30, 0), (1.5, 10, 60, 20, 0), (2.2, 10, 50, 30, 0), (2.6, 0, 0, 6, 0)])
    return c


def bloom_cheer(style):
    c = clip_library({**style, "specials": {}})["celebrate"]
    for i, bone in enumerate(style.get("sprouts", ())):
        c.r(bone, _wave(2.0, 0.33, 14, i, axis=1))
    return c


def dance(style):
    """Melo: side steps on the beat (loops, 120 bpm)."""
    c = Clip(2.0, True)
    for i in range(9):
        t = i * 0.25
        side = 1 if i % 2 == 0 else -1
        c.l("Hips", [(t, (0, 0, 0.04 if i % 2 else 0.0))])
        c.r("Hips", [(t, (0, side * 6, side * 12))])
        c.r("Chest", [(t, (0, -side * 8, -side * 6))])
        c.r("Head", [(t, (0, side * 8, side * 6))])
    arm(c, 1, [(t, 60 + 30 * math.sin(t * math.pi * 2), 20, 60, 0) for t in (0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0)])
    arm(c, -1, [(t, 60 - 30 * math.sin(t * math.pi * 2), 20, 60, 0) for t in (0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0)])
    return c


def rhythm_bounce(style):
    c = Clip(2.0, True)
    for i in range(9):
        t = i * 0.25
        c.l("Hips", [(t, (0, 0, 0.0 if i % 2 == 0 else -0.04))])
        c.r("Head", [(t, (8 if i % 2 else -2, 0, 0))])
    breathe(c, 2.0, 0.5)
    return c


def headphone_listen(style):
    c = Clip(2.4, True)
    for s in (1, -1):
        arm(c, s, [(0, 70, 30, 120, 0), (2.4, 70, 30, 120, 0)])
    c.r("Head", [(0, (4, 6, 0)), (0.6, (-2, -6, 0)), (1.2, (4, 6, 0)), (1.8, (-2, -6, 0)), (2.4, (4, 6, 0))])
    return c


def wrench(style):
    """Pixel: turn a bolt with the wrench in the right hand."""
    c = Clip(2.0, False)
    arm(c, -1, [(0, 0, 0, 6, 0), (0.3, 20, 70, 50, 0), (0.6, 20, 70, 50, -45), (0.9, 20, 70, 50, 10), (1.2, 20, 70, 50, -45), (1.5, 20, 70, 50, 10), (2.0, 0, 0, 6, 0)])
    c.r("Head", [(0, (0, 0, 0)), (0.3, (14, 0, -8)), (1.5, (14, 0, -8)), (2.0, (0, 0, 0))])
    c.r("Spine", [(0, (0, 0, 0)), (0.3, (8, 0, 0)), (1.5, (8, 0, 0)), (2.0, (0, 0, 0))])
    return c


def repair(style):
    c = Clip(2.4, False)
    c.l("Hips", [(0, (0, 0, 0)), (0.4, (0, 0, -0.12)), (2.0, (0, 0, -0.12)), (2.4, (0, 0, 0))])
    c.r("Spine", [(0, (0, 0, 0)), (0.4, (18, 0, 0)), (2.0, (18, 0, 0)), (2.4, (0, 0, 0))])
    for s in (1, -1):
        arm(c, s, [(0, 0, 0, 6, 0), (0.4, 15, 60, 40, 0), (0.8, 15, 65, 30, s * 20), (1.2, 15, 60, 40, 0), (1.6, 15, 65, 30, s * 20), (2.0, 15, 60, 40, 0), (2.4, 0, 0, 6, 0)])
    return c


def inspect_machine(style):
    c = Clip(2.6, False)
    c.r("Spine", [(0, (0, 0, 0)), (0.5, (10, 0, 12)), (1.4, (10, 0, -12)), (2.1, (10, 0, 0)), (2.6, (0, 0, 0))])
    c.r("Head", [(0, (0, 0, 0)), (0.5, (12, 6, 10)), (1.4, (12, -6, -10)), (2.1, (8, 0, 0)), (2.6, (0, 0, 0))])
    arm(c, 1, [(0, 0, 0, 6, 0), (0.5, 10, 40, 110, 0), (2.1, 10, 40, 110, 0), (2.6, 0, 0, 6, 0)])
    return c


def thumbs_up(style):
    c = Clip(1.6, False)
    arm(c, -1, [(0, 0, 0, 6, 0), (0.3, 25, 60, 95, -60), (1.2, 25, 60, 95, -60), (1.6, 0, 0, 6, 0)])
    c.r("Head", [(0, (0, 0, 0)), (0.3, (6, 0, -6)), (1.2, (0, 0, -6)), (1.6, (0, 0, 0))])
    return c


def draw(style):
    """Scribble: the whole pencil leans and draws a loop with its tip (body is the pencil)."""
    c = Clip(2.4, False)
    keys = []
    for i in range(13):
        t = 2.4 * i / 12
        a = 2 * math.pi * i / 12
        keys.append((t, (14 + 6 * math.sin(a), 6 * math.cos(a), 0)))
    keys[0] = (0, (0, 0, 0))
    keys[-1] = (2.4, (0, 0, 0))
    c.r("Spine", keys)
    arm(c, -1, [(0, 0, 0, 6, 0), (0.4, 20, 50, 40, 0), (2.0, 20, 50, 40, 0), (2.4, 0, 0, 6, 0)])
    return c


def write(style):
    c = Clip(2.0, False)
    keys = [(0, (0, 0, 0))]
    for i in range(1, 8):
        keys.append((i * 0.25, (12, 0, -10 + 20 * (i % 2))))
    keys.append((2.0, (0, 0, 0)))
    c.r("Spine", keys)
    return c


def erase(style):
    """Scribble: flips upside-down-ish and rubs with the eraser (a gentle wiggle on the head)."""
    c = Clip(2.0, False)
    c.r("Spine", [(0, (0, 0, 0)), (0.4, (-10, 0, 0)), (1.6, (-10, 0, 0)), (2.0, (0, 0, 0))])
    c.r("Head", [(0, (0, 0, 0)), (0.4, (0, 10, 0)), (0.6, (0, -10, 0)), (0.8, (0, 10, 0)), (1.0, (0, -10, 0)), (1.2, (0, 10, 0)), (1.6, (0, 0, 0))])
    return c


def page_flutter(style):
    c = Clip(1.4, False)
    for bone, s in (("Page_1", 1), ("Page_2", -1), ("Bookmark", 1)):
        c.r(bone, [(0, (0, 0, 0)), (0.25, (0, 0, s * 25)), (0.5, (0, 0, -s * 10)), (0.75, (0, 0, s * 18)), (1.0, (0, 0, -s * 6)), (1.4, (0, 0, 0))])
    return c


def read(style):
    c = Clip(3.0, True)
    for s in (1, -1):
        arm(c, s, [(0, 20, 50, 70, 0), (3.0, 20, 50, 70, 0)])
    c.r("Spine", [(0, (6, 0, -4)), (1.5, (6, 0, 4)), (3.0, (6, 0, -4))])
    return c


def storytell(style):
    """Story: arms open wide, covers open a little more (a 'once upon a time' pose)."""
    c = Clip(2.6, False)
    for s in (1, -1):
        arm(c, s, [(0, 0, 0, 6, 0), (0.5, 70, 30, 20, 0), (2.1, 70, 30, 20, 0), (2.6, 0, 0, 6, 0)])
    for bone, s in (("Cover_L", 1), ("Cover_R", -1)):
        c.r(bone, [(0, (0, 0, 0)), (0.5, (0, 0, s * 12)), (2.1, (0, 0, s * 12)), (2.6, (0, 0, 0))])
    c.r("Head", [(0, (0, 0, 0)), (0.5, (-6, 0, 0)), (2.1, (-6, 0, 0)), (2.6, (0, 0, 0))])
    return c


def _keys_loc(seconds, period, amp, base=0.0):
    out = []
    for i in range(9):
        t = seconds * i / 8
        out.append((t, (0, 0, base + amp * math.sin(2 * math.pi * t / period))))
    return out
