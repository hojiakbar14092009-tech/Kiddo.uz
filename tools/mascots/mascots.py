"""The ten Kiddo mascots: which builder and which animation style each one uses."""

import clips as c
import creatures
import human
import props
import robots

ROBOT_STYLE = {"energy": 1.0, "arm_rest_out": 6, "hop": 0.22, "antenna": ("Antenna",), "secondary": 0.6}


def _robot(cid):
    return lambda ch: robots.build_robot(ch, robots.ROBOTS[cid])


MASCOTS = {
    "kidobot": {"build": _robot("kidobot"), "style": {**ROBOT_STYLE}},
    "astro": {
        "build": _robot("astro"),
        "style": {**ROBOT_STYLE, "specials": {"float": c.float_zero_g, "telescope": c.telescope_look}},
    },
    "melo": {
        "build": _robot("melo"),
        "style": {**ROBOT_STYLE, "antenna": (), "energy": 1.15, "specials": {"dance": c.dance, "rhythm": c.rhythm_bounce, "headphone_listen": c.headphone_listen}},
    },
    "pixel": {
        "build": _robot("pixel"),
        "style": {**ROBOT_STYLE, "specials": {"wrench": c.wrench, "repair": c.repair, "inspect": c.inspect_machine, "thumbs_up": c.thumbs_up}},
    },
}

CREATURE_STYLE = {"energy": 1.0, "arm_rest_out": 4, "hop": 0.2, "secondary": 1.0}

MASCOTS.update(
    {
        "dinoo": {
            "build": creatures.build_dinoo,
            "style": {**CREATURE_STYLE, "energy": 1.15, "tail": ("Tail_1", "Tail_2", "Tail_3"), "specials": {"tail_wag": c.tail_wag, "stomp": c.stomp, "sniff": c.sniff, "happy_hop": c.happy_hop}},
            "face_target": (0, -0.2, 1.75),
        },
        "leafy": {
            "build": creatures.build_leafy,
            "style": {**CREATURE_STYLE, "energy": 0.85, "ears": ("Ear_L", "Ear_R"), "sprouts": ("Sprout",), "tail": ("Tail_1", "Tail_2"), "specials": {"leaf_flutter": c.leaf_flutter, "gardening": c.gardening, "bloom": c.bloom_cheer}},
            "face_target": (0, -0.2, 1.7),
        },
        "lumi": {
            "build": creatures.build_lumi,
            "style": {**CREATURE_STYLE, "energy": 0.8, "ears": ("Ear_L", "Ear_R"), "sprouts": ("Sprout",), "tail": ("Tail_1",), "specials": {"hover": c.hover, "illuminate": c.illuminate}},
            "face_target": (0, -0.2, 1.74),
        },
    }
)

MASCOTS.update(
    {
        "ziyo": {
            "build": human.build_ziyo,
            "style": {"energy": 0.9, "arm_rest_out": 4, "hop": 0.16, "sit_drop": 0.22, "specials": {"welcome": c.welcome, "present": c.present}},
            "face_target": (0, -0.2, 1.82),
        },
        "scribble": {
            "build": props.build_scribble,
            "style": {"energy": 1.05, "arm_rest_out": 8, "hop": 0.18, "specials": {"draw": c.draw, "write": c.write, "erase": c.erase}},
            "face_target": (0, -0.2, 1.68),
        },
        "story": {
            "build": props.build_story,
            "style": {"energy": 0.9, "arm_rest_out": 8, "hop": 0.16, "specials": {"page_flutter": c.page_flutter, "read": c.read, "storytell": c.storytell, "present": c.present}},
            "face_target": (0, -0.2, 1.1),
        },
    }
)
