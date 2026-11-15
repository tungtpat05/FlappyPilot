"""
Icon generator for FlappyBird Autopilot Extension.
Reconstructs pixel-perfect dark Flappy Bird icons (16x16, 48x48, 128x128).
"""

from PIL import Image, ImageDraw
import numpy as np

# Canonical 17x12 dark flappy bird sprite matrix (extracted from reference image)
# Palette:
_ = [0, 0, 0, 0]             # Transparent
K = [0, 0, 0, 255]           # Black outline / pupil
E = [255, 255, 255, 255]     # Eye white
W = [250, 251, 234, 255]     # Wing cream / white
S = [183, 183, 183, 255]     # Wing shadow
H = [130, 131, 133, 255]     # Head / top body highlight
M = [70, 71, 73, 255]        # Mid body gray
D = [33, 33, 34, 255]        # Dark belly gray
O = [226, 117, 79, 255]      # Beak orange

SPRITE_17x12 = [
    [_, _, _, _, _, _, K, K, K, K, K, K, _, _, _, _, _],
    [_, _, _, _, K, K, H, H, H, K, E, E, K, _, _, _, _],
    [_, _, _, K, H, H, M, M, K, E, E, E, E, K, _, _, _],
    [_, K, K, K, K, M, M, M, K, E, E, E, K, E, K, _, _],
    [K, W, W, W, W, K, M, M, K, E, E, E, K, E, K, _, _],
    [K, W, W, W, W, W, K, M, M, K, E, E, E, E, K, _, _],
    [K, S, W, W, W, S, K, M, M, M, K, K, K, K, K, K, _],
    [_, K, S, S, S, K, M, M, M, K, O, O, O, O, O, O, K],
    [_, _, K, K, K, D, D, D, K, O, K, K, K, K, K, K, _],
    [_, _, K, D, D, D, D, D, D, K, O, O, O, O, O, K, _],
    [_, _, _, K, K, D, D, D, D, D, K, K, K, K, K, _, _],
    [_, _, _, _, _, K, K, K, K, K, _, _, _, _, _, _, _]
]

def build_sprite():
    arr = np.array(SPRITE_17x12, dtype=np.uint8)
    return Image.fromarray(arr, 'RGBA')

def make_icon16(style='trans'):
    # 16x16 crisp pixel art (5px beak variant to fit exactly within 16-pixel width)
    arr = np.zeros((16, 16, 4), dtype=np.uint8)
    sp = np.array(SPRITE_17x12, dtype=np.uint8)
    for r in range(12):
        for c in range(10):
            arr[r + 2, c] = sp[r, c]
        if r == 7:
            arr[r + 2, 10:15] = O
            arr[r + 2, 15] = K
        elif r == 8:
            arr[r + 2, 10:16] = K
        elif r == 9:
            arr[r + 2, 10:15] = O
            arr[r + 2, 15] = K
        else:
            for c in range(10, 16):
                arr[r + 2, c] = sp[r, c]
    im = Image.fromarray(arr, 'RGBA')
    if style == 'round':
        bg = Image.new('RGBA', (16, 16), (45, 46, 53, 255))
        mask = Image.new('L', (16, 16), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, 15, 15], radius=3, fill=255)
        bg.paste(im, (0, 0), im)
        out = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
        out.paste(bg, (0, 0), mask)
        return out
    return im

def make_icon(size, scale, pos, style='trans', radius=0):
    sp = build_sprite()
    scaled = sp.resize((17 * scale, 12 * scale), Image.Resampling.NEAREST)
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    im.paste(scaled, pos, scaled)
    if style == 'round':
        bg = Image.new('RGBA', (size, size), (45, 46, 53, 255))
        mask = Image.new('L', (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
        bg.paste(im, (0, 0), im)
        out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        out.paste(bg, (0, 0), mask)
        return out
    return im

def generate_all(style='trans'):
    if style == 'trans':
        i16 = make_icon16(style='trans')
        i48 = make_icon(48, 2, (7, 12), style='trans')
        i128 = make_icon(128, 6, (13, 28), style='trans')
    else:
        i16 = make_icon16(style='round')
        i48 = make_icon(48, 2, (7, 12), style='round', radius=10)
        i128 = make_icon(128, 6, (13, 28), style='round', radius=28)

    i16.save('icon16.png')
    i48.save('icon48.png')
    i128.save('icon128.png')
    print(f'Generated icons with style={style}')

if __name__ == '__main__':
    generate_all('trans')
