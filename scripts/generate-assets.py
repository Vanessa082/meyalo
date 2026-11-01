"""Brand PNGs from the SVG masters (BRAND.md).

Requires Python with cairosvg and Pillow (pip install cairosvg pillow; cairosvg
uses the system Cairo library). Paths are relative to the repo. Run:
    python3 scripts/generate-assets.py
"""
import io
import os
import re

import cairosvg
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INK = "#111312"
CANVAS = "#FFFFFF"
BRAND = "#075EEB"
# The brand gradient on filled surfaces and the app icon (theme/colors.ts
# brandLight to brandDeep), top to bottom.
GRADIENT = ("#0866FF", "#0055D4")
# The brand lightened to stand out on ink (theme/colors.ts brandBright).
BRIGHT = "#5B9BFF"


def path(*parts):
    return os.path.join(ROOT, *parts)


def render(svg, width, height=None):
    """An SVG (file path or markup) as an RGBA Pillow image."""
    source = {"url": svg} if os.path.exists(svg) else {"bytestring": svg.encode()}
    png = cairosvg.svg2png(
        **source, output_width=width, output_height=height or width
    )
    return Image.open(io.BytesIO(png)).convert("RGBA")


def save(image, *dest):
    target = path(*dest)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    image.save(target)


def mark_svg(mark_d, colour, canvas, inset, background=None):
    """The mark centred on a square canvas, `inset` px from each edge."""
    scale = (canvas - 2 * inset) / 512
    if background == "gradient":
        top, bottom = GRADIENT
        rect = (
            f'<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bottom}"/>'
            f"</linearGradient></defs>"
            f'<rect width="{canvas}" height="{canvas}" fill="url(#g)"/>'
        )
    elif background:
        rect = f'<rect width="{canvas}" height="{canvas}" fill="{background}"/>'
    else:
        rect = ""
    return (
        f'<svg width="{canvas}" height="{canvas}" viewBox="0 0 {canvas} {canvas}" '
        f'xmlns="http://www.w3.org/2000/svg">{rect}'
        f'<g transform="translate({inset}, {inset}) scale({scale})">'
        f'<path d="{mark_d}" fill="{colour}" fill-rule="evenodd"/></g></svg>'
    )


def main():
    mark_brand = path("assets/brand/mark/meyalo-mark-brand.svg")
    mark_brand_bright = path("assets/brand/mark/meyalo-mark-brand-bright.svg")
    with open(mark_brand) as f:
        mark_d = re.search(r'd="([^"]+)"', f.read()).group(1)

    # 1. Mark PNGs, transparent: brand for light, brand bright for dark.
    for size in [16, 20, 24, 32, 40, 48, 64, 72, 96, 128, 144, 192, 256, 384, 512, 1024]:
        save(render(mark_brand, size), f"assets/brand/mark/meyalo-mark-brand-{size}.png")
        save(render(mark_brand_bright, size), f"assets/brand/mark/meyalo-mark-brand-bright-{size}.png")

    # 2. App icon: white mark on the brand blue (owner's choice, 2026-10-20),
    #    no transparency. Same in light and dark mode.
    icon = mark_svg(mark_d, "#FFFFFF", 512, 76, "gradient")
    for size in [16, 20, 29, 32, 40, 48, 58, 60, 72, 76, 80, 87, 96, 120, 128, 144, 152, 167, 180, 192, 256, 512, 1024]:
        save(render(icon, size).convert("RGB"), f"assets/brand/app-icon/app-icon-{size}.png")
    save(render(icon, 1024).convert("RGB"), "assets/brand/app-icon/ios-icon-1024.png")

    # 3. Android adaptive foreground (mark within the 66% safe zone) and the
    #    monochrome themed icon.
    # The background is the brand blue, set in app.config.ts.
    save(render(mark_svg(mark_d, "#FFFFFF", 432, 72), 432), "assets/brand/app-icon/adaptive-icon-foreground.png")
    # Android draws the adaptive background separately: the same gradient.
    save(render(mark_svg("", "none", 432, 72, "gradient"), 432).convert("RGB"), "assets/brand/app-icon/adaptive-icon-background.png")
    save(render(mark_svg(mark_d, "#000000", 432, 72), 432), "assets/brand/app-icon/monochrome-icon.png")

    # 4. Favicons: brand mark; Apple touch icon like the app icon.
    fav = {size: render(mark_brand, size) for size in [16, 32, 48, 64]}
    for size, image in fav.items():
        save(image, f"assets/brand/favicon/favicon-{size}x{size}.png")
    fav[48].save(path("assets/brand/favicon/favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    save(render(icon, 180).convert("RGB"), "assets/brand/favicon/apple-touch-icon.png")
    save(render(mark_brand, 192), "assets/brand/favicon/icon-192.png")
    save(render(mark_brand, 512), "assets/brand/favicon/icon-512.png")

    # 5. Social avatars, like the app icon.
    for size in [400, 512, 1024]:
        save(render(icon, size).convert("RGB"), f"assets/brand/social/avatar-{size}.png")

    # 6. Splash screens: centred 200 px white mark on the brand blue, the same
    #    in light and dark mode, like the app icon.
    mark_white = path("assets/brand/mark/meyalo-mark-white.svg")
    for name in ["light", "dark"]:
        base = Image.new("RGBA", (1242, 2436), BRAND)
        logo = render(mark_white, 200)
        base.alpha_composite(logo, ((1242 - 200) // 2, (2436 - 200) // 2))
        save(base.convert("RGB"), f"assets/brand/splash/splash-{name}.png")

    # 7. Logo PNGs.
    for svg, dest, ratio in [
        ("assets/brand/master/meyalo-horizontal.svg", "assets/brand/logo/horizontal/meyalo-horizontal-brand-ink.png", None),
        ("assets/brand/logo/stacked/meyalo-stacked-light.svg", "assets/brand/logo/stacked/meyalo-stacked-light.png", None),
        ("assets/brand/logo/stacked/meyalo-stacked-dark.svg", "assets/brand/logo/stacked/meyalo-stacked-dark.png", None),
    ]:
        with open(path(svg)) as f:
            view = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', f.read())
        width, height = (float(view.group(1)), float(view.group(2))) if view else (1, 1)
        save(render(path(svg), 1024, round(1024 * height / width)), dest)

    print("Brand assets generated.")


if __name__ == "__main__":
    main()
