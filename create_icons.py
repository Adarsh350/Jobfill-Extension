# JobFill — create_icons.py
# Generates solid-color PNG placeholder icons using Python 3 stdlib only.
# Color: indigo #6366F1 (r=99, g=102, b=241) — placeholder until Phase 12 polish.
# PNG spec: signature + IHDR + IDAT (zlib-compressed rows) + IEND, all with CRC32.
import struct, zlib

def make_png(size, r, g, b):
    def chunk(name, data):
        c = zlib.crc32(name + data) & 0xffffffff
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', c)

    # IHDR: width, height, bit_depth=8, color_type=2 (RGB), compression=0, filter=0, interlace=0
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    # Each row: filter byte 0x00 (None) + RGB pixels
    raw = b''.join(b'\x00' + bytes([r, g, b] * size) for _ in range(size))
    idat = zlib.compress(raw)

    return (b'\x89PNG\r\n\x1a\n' +
            chunk(b'IHDR', ihdr) +
            chunk(b'IDAT', idat) +
            chunk(b'IEND', b''))

for size in [16, 48, 128]:
    with open(f'icons/icon{size}.png', 'wb') as f:
        f.write(make_png(size, 99, 102, 241))

print('Icons created: icons/icon16.png, icons/icon48.png, icons/icon128.png')
