"""
Organic faces (Dinoo, Leafy, Lumi, Ziyo, Scribble, Story): layered eyes (white, iris, pupil,
highlights, lid), brows, a mouth with a tongue, and blush, all as bands with morph targets.

Closing an eye collapses the white, iris and pupil to the lid line and grows the lid (lashes)
band there, so a blink, a happy ^^ squint or a sleepy half-closed eye are blends of one mesh
(no texture swaps, no extra models).
"""

from kit import band_arc, band_ellipse, band_mouth, offset_band


def _line(cx, cz, half_w, height=0.0):
    """A zero-thickness arc: an invisible shape a layer collapses to."""
    return band_arc(cx, cz, half_w, height, 0.0)


def eye(face, cx, cz, rx, rz, mats, side, surface=None, base_lift=0.004, iris=(0.66, 0.76), pupil=(0.36, 0.44)):
    """
    One organic eye. mats: dict white, iris, pupil, shine, lid (material indices).
    side: +1 for the eye at u > 0 (the character's left), -1 for the other.
    """
    closed_z = cz - 0.18 * rz
    happy_z = cz - 0.12 * rz
    sleepy_top = cz + 0.08 * rz
    look = {"look_left": (0.3 * rx, 0), "look_right": (-0.3 * rx, 0), "look_up": (0, 0.22 * rz), "look_down": (0, -0.22 * rz)}

    def layer(neutral, wide, sleepy, sad, follows_look):
        states = {
            "neutral": neutral,
            "blink": _line(cx, closed_z, rx * 0.9, -0.12 * rz),
            "eyes_happy": _line(cx, happy_z, rx * 0.9, 0.42 * rz),
            "eyes_wide": wide,
            "eyes_sleepy": sleepy,
            "eyes_sad": sad,
        }
        if follows_look:
            for key, (du, dv) in look.items():
                states[key] = offset_band(neutral, du, dv)
        return states

    white = layer(
        band_ellipse(cx, cz, rx, rz),
        band_ellipse(cx, cz + 0.04 * rz, rx * 1.08, rz * 1.12),
        band_mouth(cx, sleepy_top, rx * 0.98, rz * 0.9),
        band_ellipse(cx, cz - 0.04 * rz, rx * 0.98, rz * 0.9, tilt=-0.25 * side),
        False,
    )
    ix, iz = rx * iris[0], rz * iris[1]
    iris_states = layer(
        band_ellipse(cx, cz - 0.08 * rz, ix, iz),
        band_ellipse(cx, cz - 0.02 * rz, ix * 0.92, iz * 0.92),
        band_mouth(cx, sleepy_top - 0.02 * rz, ix * 0.95, iz * 0.82),
        band_ellipse(cx, cz - 0.14 * rz, ix, iz * 0.92),
        True,
    )
    px, pz = rx * pupil[0], rz * pupil[1]
    pupil_states = layer(
        band_ellipse(cx, cz - 0.1 * rz, px, pz),
        band_ellipse(cx, cz - 0.04 * rz, px * 0.75, pz * 0.75),
        band_mouth(cx, sleepy_top - 0.04 * rz, px * 0.9, pz * 0.7),
        band_ellipse(cx, cz - 0.16 * rz, px, pz * 0.92),
        True,
    )
    hx, hz = cx + 0.24 * rx, cz + 0.24 * rz
    shine = layer(
        band_ellipse(hx, hz, rx * 0.2, rx * 0.2, n=10),
        band_ellipse(hx, hz + 0.04 * rz, rx * 0.22, rx * 0.22, n=10),
        band_ellipse(hx, sleepy_top - 0.12 * rz, rx * 0.12, rx * 0.08, n=10),
        band_ellipse(hx, hz - 0.06 * rz, rx * 0.18, rx * 0.18, n=10),
        True,
    )
    # the small second highlight
    hx2, hz2 = cx - 0.2 * rx, cz - 0.3 * rz
    shine2 = layer(
        band_ellipse(hx2, hz2, rx * 0.09, rx * 0.09, n=8),
        band_ellipse(hx2, hz2, rx * 0.1, rx * 0.1, n=8),
        _line(hx2, sleepy_top - 0.2 * rz, rx * 0.05),
        band_ellipse(hx2, hz2 - 0.04 * rz, rx * 0.08, rx * 0.08, n=8),
        True,
    )
    # lid / lashes: hidden at the top of the eye unless the eye closes
    lid = {
        "neutral": _line(cx, cz + rz * 0.98, rx * 0.5),
        "blink": band_arc(cx, closed_z, rx * 0.95, -0.12 * rz, 0.16 * rz),
        "eyes_happy": band_arc(cx, happy_z, rx * 0.95, 0.42 * rz, 0.17 * rz),
        "eyes_sleepy": band_arc(cx, sleepy_top, rx * 1.0, 0.04 * rz, 0.11 * rz),
    }
    face.add(white, mats["white"], base_lift, surface)
    face.add(iris_states, mats["iris"], base_lift + 0.003, surface)
    face.add(pupil_states, mats["pupil"], base_lift + 0.006, surface)
    face.add(shine, mats["shine"], base_lift + 0.009, surface)
    face.add(shine2, mats["shine"], base_lift + 0.009, surface)
    face.add(lid, mats["lid"], base_lift + 0.012, surface)


def brow(face, cx, cz, half_w, thick, mat, side, surface=None, lift=0.004):
    """An eyebrow above an eye (side +1 at u > 0). Inner end is toward the centre (u = 0)."""
    inner_tilt = -0.25 * side  # z falls toward the outer side when worried
    face.add(
        {
            "neutral": band_arc(cx, cz, half_w, half_w * 0.18, thick),
            "brows_up": band_arc(cx, cz + thick * 1.6, half_w * 1.04, half_w * 0.26, thick),
            "brows_worried": band_arc(cx, cz + thick * 0.4, half_w * 0.95, half_w * 0.06, thick, tilt=inner_tilt),
            "brow_think": band_arc(cx, cz + (thick * 1.8 if side > 0 else -thick * 0.5), half_w, half_w * (0.3 if side > 0 else 0.0), thick),
        },
        mat,
        lift,
        surface,
    )


def mouth(face, cz, w, mats, surface=None, lift=0.004, cx=0.0):
    """A soft smile with a tongue. w: half width of the open smile."""
    t = 0.12 * w  # line thickness
    face.add(
        {
            "neutral": band_arc(cx, cz, w * 0.55, -0.22 * w, t),
            "mouth_smile": band_mouth(cx, cz + 0.12 * w, w, 0.85 * w),
            "mouth_open": band_ellipse(cx, cz - 0.1 * w, 0.45 * w, 0.48 * w),
            "mouth_o": band_ellipse(cx, cz - 0.05 * w, 0.24 * w, 0.3 * w),
            "mouth_sad": band_arc(cx, cz - 0.05 * w, 0.42 * w, 0.14 * w, t),
            "mouth_flat": band_arc(cx, cz, 0.4 * w, 0.0, t),
        },
        mats["mouth"],
        lift,
        surface,
    )
    hidden = _line(cx, cz - 0.4 * w, 0.2 * w)
    face.add(
        {
            "neutral": hidden,
            "mouth_smile": band_ellipse(cx, cz - 0.52 * w, 0.42 * w, 0.2 * w),
            "mouth_open": band_ellipse(cx, cz - 0.38 * w, 0.28 * w, 0.14 * w),
        },
        mats["tongue"],
        lift + 0.003,
        surface,
    )


def cheeks(face, offsets, cz, rx, rz, mat, surface=None):
    for cx in offsets:
        face.add({"neutral": band_ellipse(cx, cz, rx, rz)}, mat, 0.002, surface)


def face_materials(ch, iris_color, lid_color="#2A1A1A", mouth_color="#6E2230", tongue="#FF8C9A", blush="#FF9DAA", white="#FFFFFF"):
    return {
        "white": ch.mat("eye_white", white, rough=0.3),
        "iris": ch.mat("iris", iris_color, rough=0.25),
        "pupil": ch.mat("pupil", "#16110F", rough=0.25),
        "shine": ch.mat("shine", "#FFFFFF", rough=0.2, emit="#FFFFFF", strength=0.6),
        "lid": ch.mat("lid", lid_color, rough=0.5),
        "mouth": ch.mat("mouth", mouth_color, rough=0.6),
        "tongue": ch.mat("tongue", tongue, rough=0.6),
        "blush": ch.mat("blush", blush, rough=0.8),
    }
