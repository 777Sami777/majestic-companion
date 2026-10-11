"""Tnie mapy 8192x8192 na kafelki 256px (zoom 0-5) w formacie WebP."""
import os
import sys
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES = {
    "satellite": "GTAV-HD-MAP-satellite.jpg",
    "atlas": "GTAV_ATLUS_8192x8192.png",
    "road": "GTAV-HD-MAP-roadmap.jpg",
}
TILE = 256
MAX_ZOOM = 5  # 256 * 2^5 = 8192


def main():
    for style, fname in SOURCES.items():
        src = Image.open(os.path.join(ROOT, "raw", fname)).convert("RGB")
        for z in range(MAX_ZOOM, -1, -1):
            size = TILE * 2 ** z
            img = src if size == src.width else src.resize((size, size), Image.LANCZOS)
            n = 2 ** z
            for x in range(n):
                d = os.path.join(ROOT, "web", "tiles", style, str(z), str(x))
                os.makedirs(d, exist_ok=True)
                for y in range(n):
                    tile = img.crop((x * TILE, y * TILE, (x + 1) * TILE, (y + 1) * TILE))
                    tile.save(os.path.join(d, f"{y}.webp"), "WEBP", quality=82, method=4)
            print(style, "zoom", z, "ok", flush=True)
    print("done")


if __name__ == "__main__":
    sys.exit(main())
