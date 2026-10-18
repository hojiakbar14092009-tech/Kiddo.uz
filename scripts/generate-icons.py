"""Renders Kiddo's app icons (PWA, Apple touch icon) from one SVG with headless Chromium.

Usage: python3 scripts/generate-icons.py   (needs `pip install playwright`)
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent.parent / 'public' / 'icons'

# The robot head on Kiddo's cream background. `pad` keeps the head inside the
# maskable safe zone (the inner 80 %) when the OS crops the icon to a circle.
def icon_svg(size: int, pad: float, rounded: bool) -> str:
    radius = size * 0.22 if rounded else 0
    inner = size * (1 - 2 * pad)
    offset = size * pad
    scale = inner / 64
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
  <rect width="{size}" height="{size}" rx="{radius}" fill="#FFF8EC"/>
  <g transform="translate({offset} {offset}) scale({scale})">
    <ellipse cx="7" cy="33" rx="5.5" ry="10" fill="#13917E"/>
    <ellipse cx="57" cy="33" rx="5.5" ry="10" fill="#13917E"/>
    <rect x="31" y="2" width="2.5" height="9" rx="1.2" fill="#CFC8DD"/>
    <circle cx="32.2" cy="3" r="3.4" fill="#13917E"/>
    <rect x="7" y="9" width="50" height="46" rx="22" fill="#FFFFFF" stroke="#D9D3E4" stroke-width="1.5"/>
    <rect x="13" y="17" width="38" height="30" rx="13" fill="#2B2240"/>
    <rect x="21" y="25" width="6" height="9" rx="3" fill="#7FF0FF"/>
    <rect x="37" y="25" width="6" height="9" rx="3" fill="#7FF0FF"/>
    <path d="M26 39 Q32 43.5 38 39" stroke="#7FF0FF" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  </g>
</svg>'''

ICONS = [
    ('icon-192.png', 192, 0.12, True),
    ('icon-512.png', 512, 0.12, True),
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
