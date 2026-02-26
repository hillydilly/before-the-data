#!/usr/bin/env python3
"""
Composite album art INTO each B-shape intro frame — BLACK / NEW MUSIC variant.

Same as composite-frames.py but:
  - Background = BLACK instead of red
  - Art photo converted to GRAYSCALE (B&W)
  - Output → public/frames/composite-black/
"""
import sys, os
from PIL import Image, ImageOps
from collections import deque

BLACK = (0, 0, 0, 255)
ALPHA_THRESHOLD = 15
BRIGHTNESS_THRESHOLD = 120


def flood_fill_exterior(alpha_data, w, h):
    exterior = bytearray(w * h)
    queue = deque()
    for x in range(w):
        for y in [0, h - 1]:
            idx = y * w + x
            if alpha_data[idx] < ALPHA_THRESHOLD and not exterior[idx]:
                exterior[idx] = 1
                queue.append((x, y))
    for y in range(h):
        for x in [0, w - 1]:
            idx = y * w + x
            if alpha_data[idx] < ALPHA_THRESHOLD and not exterior[idx]:
                exterior[idx] = 1
                queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                nidx = ny * w + nx
                if not exterior[nidx] and alpha_data[nidx] < ALPHA_THRESHOLD:
                    exterior[nidx] = 1
                    queue.append((nx, ny))
    return exterior


def composite_frame(frame_path, art_img, output_path):
    frame = Image.open(frame_path).convert('RGBA')
    w, h = frame.size
    art_resized = art_img.resize((w, h), Image.LANCZOS)

    alpha_data = list(frame.split()[3].getdata())
    exterior = flood_fill_exterior(alpha_data, w, h)

    frame_pixels = list(frame.getdata())
    art_pixels = list(art_resized.getdata())
    result_pixels = []

    for i in range(w * h):
        r, g, b, a = frame_pixels[i]
        brightness = r + g + b

        if a >= ALPHA_THRESHOLD and brightness >= BRIGHTNESS_THRESHOLD:
            result_pixels.append(frame_pixels[i])
        elif a < ALPHA_THRESHOLD and exterior[i]:
            result_pixels.append(BLACK)
        else:
            result_pixels.append(art_pixels[i])

    result = Image.new('RGBA', (w, h))
    result.putdata(result_pixels)
    result.save(output_path)


def main():
    art_url_or_path = sys.argv[1] if len(sys.argv) > 1 else None
    if not art_url_or_path:
        print("Usage: python3 composite-frames-black.py <art_image_path_or_url>")
        sys.exit(1)

    if art_url_or_path.startswith('http'):
        import urllib.request
        tmp_art = '/tmp/btd-art-bw.jpg'
        urllib.request.urlretrieve(art_url_or_path, tmp_art)
        art_img = Image.open(tmp_art)
    else:
        art_img = Image.open(art_url_or_path)

    # Convert to grayscale then back to RGBA
    art_img = ImageOps.grayscale(art_img).convert('RGBA')
    print(f"Art loaded (grayscale): {art_img.size}")

    frames_dir = os.path.join(os.path.dirname(__file__), '..', 'public', 'frames', 'intro')
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'public', 'frames', 'composite-black')
    frames_parent = os.path.join(os.path.dirname(__file__), '..', 'public', 'frames')
    os.makedirs(output_dir, exist_ok=True)

    total = 170
    for i in range(1, total + 1):
        fname = f'{i:04d}.png'
        src = os.path.join(frames_dir, fname)
        dst = os.path.join(output_dir, fname)
        if os.path.exists(src):
            composite_frame(src, art_img, dst)
            if i % 10 == 0 or i == total:
                print(f'  [{int(i/total*100):3d}%] Frame {i}/{total}', flush=True)

    last_src = os.path.join(frames_parent, 'last-frame.png')
    last_dst = os.path.join(output_dir, 'last-frame.png')
    if os.path.exists(last_src):
        composite_frame(last_src, art_img, last_dst)
        print(f'  [100%] last-frame.png')

    print(f'\n✅ Done! {total + 1} composite frames saved to composite-black/')

if __name__ == '__main__':
    main()
