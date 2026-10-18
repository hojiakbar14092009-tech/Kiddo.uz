"""Renders Kiddo's app icons (PWA, Apple touch icon) from one SVG with headless Chromium.

Usage: python3 scripts/generate-icons.py   (needs `pip install playwright`)
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent.parent / 'public' / 'icons'

# The app mark: the robot mascot's head on Kiddo's teal tile (same drawing as
# KiddoMark and favicon.svg). `pad` shrinks the head into the maskable safe
# zone (the inner 80 %) when the OS crops the icon to a circle.
HEAD_DEFS = '<defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22C3A6"/><stop offset="1" stop-color="#0B6F62"/></linearGradient><radialGradient id="s" cx="38%" cy="26%" r="80%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#F3F0F8"/><stop offset="1" stop-color="#D3CCE2"/></radialGradient><linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4C3F66"/><stop offset="1" stop-color="#1C162D"/></linearGradient></defs>'
HEAD = '<g transform="translate(0 40)"><rect x="246" y="62" width="20" height="74" rx="10" fill="#E3F7F2"/><circle cx="256" cy="56" r="28" fill="#FFC93C" stroke="#FFFFFF" stroke-width="9"/><ellipse cx="108" cy="250" rx="40" ry="70" fill="#9BE8D6" stroke="#FFFFFF" stroke-width="10"/><ellipse cx="404" cy="250" rx="40" ry="70" fill="#9BE8D6" stroke="#FFFFFF" stroke-width="10"/><rect x="122" y="118" width="268" height="246" rx="116" fill="url(#s)"/><ellipse cx="200" cy="148" rx="46" ry="12" fill="#FFFFFF" opacity="0.95"/><rect x="154" y="166" width="204" height="164" rx="70" fill="url(#v)"/><path d="M186 190 Q256 172 326 190" stroke="#FFFFFF" stroke-opacity="0.22" stroke-width="10" fill="none" stroke-linecap="round"/><rect x="196" y="208" width="32" height="50" rx="16" fill="#7FF0FF"/><rect x="284" y="208" width="32" height="50" rx="16" fill="#7FF0FF"/><circle cx="219" cy="220" r="6" fill="#FFFFFF"/><circle cx="307" cy="220" r="6" fill="#FFFFFF"/><path d="M220 284 Q256 312 292 284" stroke="#7FF0FF" stroke-width="12" fill="none" stroke-linecap="round"/></g>'


def icon_svg(size: int, pad: float, rounded: bool) -> str:
    radius = size * 0.25 if rounded else 0
    scale = size / 512 * (1 - 2 * pad) / 0.76
    offset = size / 2 - 256 * scale
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
  {HEAD_DEFS}
  <rect width="{size}" height="{size}" rx="{radius}" fill="url(#t)"/>
  <g transform="translate({offset} {offset}) scale({scale})">{HEAD}</g>
</svg>'''


ICONS = [
    ('icon-192.png', 192, 0.12, False),
    ('icon-512.png', 512, 0.12, False),
    ('maskable-512.png', 512, 0.2, False),
    ('apple-touch-icon.png', 180, 0.12, False),
]

def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        for name, size, pad, rounded in ICONS:
            page.set_viewport_size({'width': size, 'height': size})
            page.set_content(f'<html><body style="margin:0;background:transparent">{icon_svg(size, pad, rounded)}</body></html>')
            page.locator('svg').screenshot(path=str(OUT / name), omit_background=True)
            print('wrote', name)
        browser.close()

if __name__ == '__main__':
    main()
