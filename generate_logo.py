import struct
import zlib

def create_png(width, height, pixels):
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    raw = b''
    for y in range(height):
        raw += b'\x00' # filter type 0
        for x in range(width):
            r, g, b, a = pixels[y][x]
            raw += bytes([r, g, b, a])

    compressed = zlib.compress(raw)
    
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')
    return png

# Let us generate a 520x140 professional badge PNG
width = 520
height = 140

# Initialize with dark navy #0A0D14
pixels = [[(10, 13, 20, 255) for _ in range(width)] for _ in range(height)]

# Draw rounded shield border and background
for y in range(height):
    for x in range(width):
        # Margin
        if x < 10 or x >= width - 10 or y < 10 or y >= height - 10:
            pixels[y][x] = (0, 0, 0, 0) # transparent corners
        elif x < 15 or x >= width - 15 or y < 15 or y >= height - 15:
            # Golden border #EAB308
            pixels[y][x] = (234, 179, 8, 255)

# Simple pixel-art / algorithmic rendering for "IB" and text representation
# To make it super crisp and clean, let us write a clean SVG-to-raster or draw clear shapes
# Actually, let's write a python script that creates a clean PNG with Pillow if available, or pure Python drawing.
# Since PIL wasn't installed, let's install PIL via python3 -m pip install Pillow if python3 -m pip works.
print("Script template ready")
