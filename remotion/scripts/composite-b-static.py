#!/usr/bin/env python3
"""
Generate b_static_frame.png — pre-composited B-logo with artist photo.

Layers (bottom to top):
  1. Red background (#C00000)
  2. Artist photo clipped through b_filled_mask_1080.png (white = show photo)
  3. b_outline_1080.png overlaid with screen blend (adds white strokes + BEFORE THE DATA)

Output: public/frames/b_static_frame.png (1080×1080 RGB)

Usage:
  python3 scripts/composite-b-static.py <artist_photo_url_or_path>
"""
import sys
import os
import urllib.request
import io
from PIL import Image, ImageChops

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REMOTION_DIR = os.path.dirname(SCRIPT_DIR)
FRAMES_DIR = os.path.join(REMOTION_DIR, 'public', 'frames')

MASK_PATH    = os.path.join(FRAMES_DIR, 'b_filled_mask_1080.png')
OUTLINE_PATH = os.path.join(FRAMES_DIR, 'b_outline_1080.png')
OUTPUT_PATH  = os.path.join(FRAMES_DIR, 'b_static_frame.png')

BG_COLOR = (192, 0, 0)   # #C00000 — composite red
SIZE = (1080, 1080)

def load_image(path_or_url: str) -> Image.Image:
    if path_or_url.startswith('http://') or path_or_url.startswith('https://'):
        req = urllib.request.Request(
            path_or_url,
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
        return Image.open(io.BytesIO(data))
    else:
        return Image.open(path_or_url)

def screen_blend(base: Image.Image, overlay: Image.Image) -> Image.Image:
    """Screen blend: result = 1 - (1-base)*(1-overlay)"""
    base_f = base.convert('RGB')
    ov_f   = overlay.convert('RGB')
    # PIL ImageChops.screen equivalent
    inv_base = ImageChops.invert(base_f)
    inv_ov   = ImageChops.invert(ov_f)
    # Multiply inverted
    mult = ImageChops.multiply(inv_base, inv_ov)
    return ImageChops.invert(mult)

def main():
    photo_src = sys.argv[1] if len(sys.argv) > 1 else None
    if not photo_src:
        print("Usage: python3 composite-b-static.py <photo_url_or_path>")
        sys.exit(1)

    print(f"Loading mask: {MASK_PATH}")
    mask = Image.open(MASK_PATH).convert('L').resize(SIZE, Image.LANCZOS)

    print(f"Loading outline: {OUTLINE_PATH}")
    outline = Image.open(OUTLINE_PATH).convert('RGBA').resize(SIZE, Image.LANCZOS)

    print(f"Loading artist photo: {photo_src}")
    photo = load_image(photo_src).convert('RGB').resize(SIZE, Image.LANCZOS)

    # 1. Red background
    bg = Image.new('RGB', SIZE, BG_COLOR)

    # 2. Paste photo through mask (white in mask = show photo, black = show bg)
    # Use mask as alpha: white (255) = photo pixels, black (0) = bg pixels
    composite = bg.copy()
    composite.paste(photo, (0, 0), mask)  # mask is L-mode, used as alpha

    # 3. Screen blend the outline PNG on top
    # outline has RGBA — use its alpha to control blending
    # Split outline into RGB + alpha
    outline_rgb = outline.convert('RGB')
    outline_alpha = outline.split()[3]  # alpha channel of outline

    # Screen blend outline RGB over composite
    screened = screen_blend(composite, outline_rgb)

    # Composite using outline alpha: where outline is opaque, show screened result
    # where outline is transparent, show composite (photo+bg) as-is
    # This preserves the white strokes and BEFORE THE DATA text
    result = Image.composite(screened, composite, outline_alpha)

    result.save(OUTPUT_PATH, 'PNG')
    print(f"Saved: {OUTPUT_PATH}")

    # Quick pixel check
    arr = result.load()
    print(f"Center pixel (540,540): {arr[540,540]}")
    print(f"Pill area (750,500): {arr[750,500]}")
    print(f"Background area (50,50): {arr[50,50]}")

if __name__ == '__main__':
    main()
