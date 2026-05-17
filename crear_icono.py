from PIL import Image, ImageDraw
import math, os

def crear_icono():
    sizes = [256, 128, 64, 48, 32, 16]
    frames = []

    for size in sizes:
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        d   = ImageDraw.Draw(img)
        m   = size * 0.07
        r   = (size - 2 * m) / 2
        cx  = cy = size / 2

        # Fondo círculo verde
        d.ellipse([m, m, size - m, size - m], fill='#16a34a')

        # Círculo reloj (borde blanco interior)
        rb = r * 0.78
        bw = max(1, int(size * 0.025))
        d.ellipse([cx - rb, cy - rb, cx + rb, cy + rb], outline='white', width=bw)

        # Manecilla hora (12 → centro, longitud 40%)
        lh = rb * 0.42
        d.line([cx, cy, cx, cy - lh], fill='white', width=max(1, int(size * 0.04)))

        # Manecilla minutos (centro → 4 en punto, longitud 58%)
        angle = math.radians(120)  # 4 en punto = 120°
        lm = rb * 0.58
        d.line([cx, cy, cx + lm * math.sin(angle), cy - lm * math.cos(angle)],
               fill='white', width=max(1, int(size * 0.03)))

        # Sonrisa / hoja (arco inferior)
        sw = rb * 0.55
        sh = rb * 0.28
        sy = cy + rb * 0.22
        bw2 = max(1, int(size * 0.03))
        d.arc([cx - sw, sy - sh, cx + sw, sy + sh], start=10, end=170,
              fill='white', width=bw2)

        frames.append(img)

    out = os.path.join(os.path.dirname(__file__), 'icono_nutri.ico')
    frames[0].save(out, format='ICO', sizes=[(s, s) for s in sizes],
                   append_images=frames[1:])
    print(f'Icono generado: {out}')

crear_icono()
