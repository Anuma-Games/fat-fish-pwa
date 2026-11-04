"""
Generates the pixel-art sprites of the landing hero (public/img/landing/hero/): the bowl, the
turning head, its numbers and the center cap of the wheel, the ball, and the Crupier (suit and paper bag apart,
so the bag can nod). They use the materials of the game (fat-fish-game: Assets/Roullete mats and
Assets/models) so the hero looks like the table of the game, in chunky pixels like the swirl
behind it.

Each sprite is drawn S times larger, reduced by area and posterized to a short palette; the
numbers of the wheel and the face on the bag are reduced to 1-bit so they stay crisp.

Usage (needs Pillow and numpy):
    python -I scripts/sprites-hero.py <path to fat-fish-game>
"""

import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

# Pixels of the 260-unit wheel (viewBox -130..130): the badge (92 units) shows at its native 94 px
N = 266
# Width of the Crupier (viewBox 200 x 170)
ANCHO_CRUPIER = 64
S = 4

# European wheel order, from the 0 clockwise (same as hero.section.ts)
ORDEN = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20,
    14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
]
ROJOS = {1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36}
PASO = 2 * math.pi / len(ORDEN)

# _BaseColor of the materials of the game (Assets/Roullete mats)
ORO = np.array([176, 138, 50])
DIVISOR = np.array([138, 106, 47])
ROJO = np.array([139, 30, 30])
NEGRO = np.array([17, 17, 17])
VERDE = np.array([18, 107, 54])
CUERPO = np.array([18, 60, 44])
BOLA = np.array([232, 232, 232])
CREMA = np.array([242, 232, 204])
# Average of the textures of the Crupier (Assets/models)
TRAJE = np.array([54, 53, 59])
SOLAPA = np.array([27, 26, 30])
CAMISA = np.array([191, 185, 170])
TINTA = np.array([20, 15, 7])


def textura(ruta: str, lado: int) -> np.ndarray:
    return np.asarray(Image.open(ruta).convert('RGB').resize((lado, lado), Image.BOX), float)


def polar(m: int):
    """Radius (units) and angle (clockwise from the top) of every pixel of an m x m wheel canvas."""
    u = (np.arange(m) + 0.5) / m * 260 - 130
    x, y = np.meshgrid(u, u)
    return np.hypot(x, y), np.mod(np.arctan2(x, -y), 2 * math.pi)


def anillo(r, r0, r1):
    return (r >= r0) & (r < r1)


def reducir(rgb: np.ndarray, alfa: np.ndarray, lado: tuple[int, int], colores: int) -> Image.Image:
    """Area reduction of a supersampled sprite, posterized to `colores`, with a 1-bit alpha."""
    a = np.clip(alfa, 0, 1)[..., None]
    capa = np.concatenate([rgb * a, a * 255], axis=2).clip(0, 255).astype(np.uint8)
    im = Image.fromarray(capa, 'RGBA').resize(lado, Image.BOX)
    px = np.asarray(im, float)
    cob = px[..., 3:] / 255
    color = np.where(cob > 0, px[..., :3] / np.maximum(cob, 1e-6), 0).clip(0, 255)
    plano = Image.fromarray(color.astype(np.uint8), 'RGB').quantize(
        colors=colores, dither=Image.Dither.NONE
    )
    salida = np.asarray(plano.convert('RGB'))
    alfa1 = np.where(cob[..., 0] >= 0.5, 255, 0).astype(np.uint8)
    return Image.fromarray(np.dstack([salida, alfa1]), 'RGBA')


def poner(im: Image.Image, mascara: np.ndarray, color) -> Image.Image:
    """Paints a 1-bit mask on a sprite (numbers, face): crisp pixels on top of the posterized ones."""
    px = np.array(im)
    px[mascara] = [*color, 255]
    return Image.fromarray(px, 'RGBA')


def cuenco(juego: str) -> Image.Image:
    """Bowl and ball track: lacquered cherry wood, gold rims and diamonds. It does not turn."""
    m = N * S
    r, a = polar(m)
    madera = textura(os.path.join(juego, 'Assets/Roullete mats/lacquered_cherry_wood_diff_4k.jpg'), 512)
    # The grain runs around the bowl
    tx = (a / (2 * math.pi) * 512 * 3).astype(int) % 512
    ty = (r * 6).astype(int) % 512
    veta = madera[ty, tx]
    rgb = veta * 1.0
    rgb[anillo(r, 125, 127.5)] *= 1.6  # lacquer highlight on the rim
    rgb[anillo(r, 122.2, 125)] *= 1.2
    pista = anillo(r, 104.6, 119.8)
    escalon = np.where(r < 110, 0.35, np.where(r < 115, 0.6, 0.4))
    rgb[pista] = (veta * escalon[..., None])[pista]
    for r0, r1 in ((119.8, 122.2), (103.4, 104.6)):
        rgb[anillo(r, r0, r1)] = ORO
    for g in range(8):
        centro = math.radians(g * 45 + 22.5)
        d = np.abs(np.mod(a - centro + math.pi, 2 * math.pi) - math.pi) * r
        rombo = (np.abs(r - 111.5) / 5.5 + d / 3.2) <= 1
        rgb[rombo] = ORO * 1.25
    alfa = anillo(r, 103.4, 129).astype(float)
    return reducir(rgb, alfa, (N, N), 40)


def cabeza(juego: str) -> Image.Image:
    """Turning head: pockets and number bands in the colors of the game, gold frets and the cone."""
    m = N * S
    r, a = polar(m)
    madera = textura(os.path.join(juego, 'Assets/Roullete mats/lacquered_cherry_wood_diff_4k.jpg'), 512)
    lino = textura(os.path.join(juego, 'Assets/Roullete mats/book_pattern_col1_4k.png'), 256)
    tx = (a / (2 * math.pi) * 512 * 3).astype(int) % 512
    ty = (r * 6).astype(int) % 512
    rgb = madera[ty, tx] * 0.7

    i = np.round(a / PASO).astype(int) % len(ORDEN)
    numeros = np.array(ORDEN)[i]
    base = np.where(
        (numeros == 0)[..., None],
        VERDE,
        np.where(np.isin(numeros, list(ROJOS))[..., None], ROJO, NEGRO),
    ).astype(float)
    # Position across each pocket: 0 at its counterclockwise fret, 1 at the clockwise one
    t = np.mod(a + PASO / 2, PASO) / PASO
    ancho_bolsa = PASO * r
    bolsa = anillo(r, 60, 84)
    # Sunken pockets: darker toward the cone, in the shade of the number band above them and of
    # the fret on their left; the wall on their right catches the light
    hondo = np.where(r < 66, 0.55, np.where(r < 75, 0.72, 0.85))
    hondo = np.where(r >= 80.5, 0.42, np.where(r < 62.5, 0.45, hondo))
    hondo = np.where(t * ancho_bolsa < 2.4, hondo * 0.6, hondo)
    hondo = np.where((1 - t) * ancho_bolsa < 1.4, hondo * 1.3, hondo)
    rgb[bolsa] = (base * hondo[..., None])[bolsa]
    # Number band: one block of color per number, without frets
    banda = anillo(r, 85.2, 101.3)
    rgb[banda] = (base * 1.25 + 8)[banda]

    # Raised gold frets on the edges of the pockets, lit on one side
    borde = np.minimum(t, 1 - t) * ancho_bolsa
    traste = (borde < 0.95) & anillo(r, 60, 84)
    rgb[traste] = np.where((t > 0.5)[..., None], ORO * 1.3, ORO * 0.72)[traste]
    rgb[anillo(r, 101.3, 102.7)] = ORO
    # Lip between the pockets and the number band
    rgb[anillo(r, 83.6, 85.2)] = ORO * 1.15
    rgb[anillo(r, 83.6, 84.2)] = ORO * 0.7

    # Cone: the green cloth of the game, lighter toward the top, with eight gold spokes
    cono = r < 60
    tono = lino[(r * 9).astype(int) % 256, (a * 300).astype(int) % 256]
    tono = tono / tono.mean(axis=(0, 1)) * CUERPO
    paso_cono = np.where(r < 52, 1.5, 1.15)
    rgb[cono] = (tono * paso_cono[..., None])[cono]
    for g in range(8):
        d = np.abs(np.mod(a - math.radians(g * 45) + math.pi, 2 * math.pi) - math.pi) * r
        rgb[(d < 0.6) & anillo(r, 48, 60)] = ORO
    rgb[anillo(r, 58.8, 60.8)] = ORO

    return reducir(rgb, (r < 104).astype(float), (N, N), 48)


def numeros() -> Image.Image:
    """Numbers of the band, upright toward the rim, on a layer of twice the resolution of the head
    that turns with it: the bold 5 x 7 digits keep their pixels at any angle."""
    lado = N * 2
    m = lado * S
    capa = Image.new('L', (m, m), 0)
    for k, numero in enumerate(ORDEN):
        pieza = cifras(str(numero), 2 * S)
        pieza = pieza.rotate(-math.degrees(k * PASO), resample=Image.NEAREST, expand=True)
        cx = (130 + 93.2 * math.sin(k * PASO)) * m / 260
        cy = (130 - 93.2 * math.cos(k * PASO)) * m / 260
        capa.paste(255, (round(cx - pieza.width / 2), round(cy - pieza.height / 2)), pieza)
    mascara = np.asarray(capa.resize((lado, lado), Image.BOX)) >= 128
    px = np.zeros((lado, lado, 4), np.uint8)
    px[mascara] = [*CREMA, 255]
    return Image.fromarray(px, 'RGBA')


# Bold digits of 5 x 7 pixels, strokes two pixels wide, for the number band
CIFRAS = {
    '0': ['.###.', '##.##', '##.##', '##.##', '##.##', '##.##', '.###.'],
    '1': ['..##.', '.###.', '..##.', '..##.', '..##.', '..##.', '.####'],
    '2': ['.###.', '##.##', '...##', '..##.', '.##..', '##...', '#####'],
    '3': ['####.', '...##', '...##', '.###.', '...##', '...##', '####.'],
    '4': ['##.##', '##.##', '##.##', '#####', '...##', '...##', '...##'],
    '5': ['#####', '##...', '####.', '...##', '...##', '##.##', '.###.'],
    '6': ['.###.', '##...', '##...', '####.', '##.##', '##.##', '.###.'],
    '7': ['#####', '...##', '...##', '..##.', '.##..', '.##..', '.##..'],
    '8': ['.###.', '##.##', '##.##', '.###.', '##.##', '##.##', '.###.'],
    '9': ['.###.', '##.##', '##.##', '.####', '...##', '...##', '.###.'],
}


def cifras(texto: str, bloque: int) -> Image.Image:
    """A number in the 5 x 7 digits, one pixel apart, each pixel a block of `bloque` px."""
    ancho = len(texto) * 6 - 1
    im = Image.new('L', ((ancho + 2) * bloque, 9 * bloque), 0)
    dib = ImageDraw.Draw(im)
    for n, c in enumerate(texto):
        for y, fila in enumerate(CIFRAS[c]):
            for x, p in enumerate(fila):
                if p == '#':
                    x0 = (1 + n * 6 + x) * bloque
                    y0 = (1 + y) * bloque
                    dib.rectangle([x0, y0, x0 + bloque - 1, y0 + bloque - 1], fill=255)
    return im


def tapa(insignia: str) -> Image.Image:
    """Center cap: dark disc with a gold rim and the badge at its native size. It does not turn."""
    m = N * S
    r, _ = polar(m)
    rgb = np.zeros((m, m, 3))
    rgb[:] = [11, 20, 22]
    rgb[anillo(r, 47.6, 50.4)] = ORO
    rgb[anillo(r, 50.4, 51.2)] = ORO * 0.55
    im = reducir(rgb, (r < 51.2).astype(float), (N, N), 8)
    sello = Image.open(insignia).convert('RGBA').resize((94, 94), Image.NEAREST)
    im.alpha_composite(sello, (N // 2 - 47, N // 2 - 47))
    return im


def bola() -> Image.Image:
    """The ball, lit from the top left in three steps."""
    lado = 9
    m = lado * S
    u = (np.arange(m) + 0.5) / m * 2 - 1
    x, y = np.meshgrid(u, u)
    r = np.hypot(x, y)
    luz = np.hypot(x + 0.35, y + 0.4)
    paso = np.where(luz < 0.35, 1.08, np.where(luz < 0.95, 0.88, 0.55))
    rgb = BOLA * paso[..., None]
    return reducir(rgb, (r <= 1).astype(float), (lado, lado), 4)


def cubica(p0, p1, p2, p3, n=12):
    return [
        tuple(
            (1 - t) ** 3 * p0[j] + 3 * (1 - t) ** 2 * t * p1[j] + 3 * (1 - t) * t**2 * p2[j] + t**3 * p3[j]
            for j in range(2)
        )
        for t in np.linspace(0, 1, n)
    ]


def crupier(juego: str) -> tuple[Image.Image, Image.Image]:
    """The Crupier of the game: charcoal pinstripe suit, white shirt, black tie and the kraft paper
    bag with the X eyes and the smile. Returns the suit and the bag as two sprites of the same size."""
    ancho = ANCHO_CRUPIER
    alto = round(ancho * 170 / 200)
    e = ancho * S / 200  # supersampled px per unit of the viewBox

    def capa(*poligonos, grosor=0, lineas=()):
        im = Image.new('L', (ancho * S, alto * S), 0)
        dib = ImageDraw.Draw(im)
        for p in poligonos:
            dib.polygon([(x * e, y * e) for x, y in p], fill=255)
        for p in lineas:
            dib.line([(x * e, y * e) for x, y in p], fill=255, width=max(1, round(grosor * e)))
        return np.asarray(im, float) / 255

    traje = capa(
        [(38, 170), (42, 112)]
        + cubica((42, 112), (46, 98), (58, 94), (70, 92))
        + [(88, 88), (100, 96), (112, 88), (130, 92)]
        + cubica((130, 92), (142, 94), (154, 98), (158, 112))
        + [(162, 170)]
    )
    costuras = capa(grosor=2.5, lineas=[[(60, 114), (60, 170)], [(140, 114), (140, 170)]])
    solapas = capa(
        [(88, 88), (82, 100), (96, 123), (100, 128)], [(112, 88), (118, 100), (104, 123), (100, 128)]
    )
    camisa = capa([(88, 88), (100, 128), (112, 88), (100, 93)])
    corbata = capa([(96, 92), (104, 92), (102, 97), (98, 97)], [(98, 97), (102, 97), (105, 134), (100, 140), (95, 134)])
    panuelo = capa([(120, 112), (130, 109), (131, 113), (121, 116)])

    yy = np.arange(alto * S)[:, None] / e + np.zeros((1, ancho * S))
    xx = np.arange(ancho * S)[None, :] / e + np.zeros((alto * S, 1))
    # Lamp from above: lighter shoulders, the suit fading into the dark toward the table
    luz = np.where(yy < 100, 1.35, np.where(yy < 125, 1.0, np.where(yy < 150, 0.72, 0.5)))
    rgb = TRAJE * luz[..., None]
    rgb[costuras > 0.5] *= 0.45
    rgb[solapas > 0.5] = (SOLAPA * luz[..., None])[solapas > 0.5]
    rgb[camisa > 0.5] = (CAMISA * np.where(yy < 100, 1.05, 0.8)[..., None])[camisa > 0.5]
    rgb[corbata > 0.5] = [12, 12, 14]
    rgb[panuelo > 0.5] = CAMISA
    cuerpo = reducir(rgb, traje, (ancho, alto), 14)
    # Pinstripes of suit_charcoal, one pixel every three, only on the cloth of the suit
    px = np.array(cuerpo)
    tela = reducir_mascara(traje - np.maximum(solapas, np.maximum(camisa, np.maximum(corbata, panuelo))), ancho, alto)
    rayas = tela & (np.arange(ancho)[None, :] % 3 == 1)
    px[rayas, :3] = np.clip(px[rayas, :3].astype(int) + 16, 0, 255)
    cuerpo = Image.fromarray(px, 'RGBA')

    # Paper bag with a zigzag hem over the collar
    dientes = [(138, 80)]
    x = 138
    abajo = True
    while x > 66:
        x -= 6
        dientes.append((x, 88 if abajo else 80))
        abajo = not abajo
    bolsa = capa([(64, 14), (136, 14), (138, 80)] + dientes + [(62, 84)])
    lado = capa([(136, 14), (140, 8), (141, 76), (138, 80)])
    boca = capa([(68, 8), (140, 8), (136, 14), (64, 14)])
    kraft = textura(os.path.join(juego, 'Assets/models/kraft_paper.png'), 128)
    tono = kraft[(yy * 1.4).astype(int) % 128, (xx * 1.4).astype(int) % 128]
    tono = tono / tono.mean(axis=(0, 1)) * [163, 128, 85]
    luz = np.where(yy < 30, 1.12, np.where(yy < 60, 0.95, 0.78))
    rgb = tono * luz[..., None]
    rgb[lado > 0.5] *= 0.55
    rgb[boca > 0.5] = [42, 26, 12]
    cabeza_im = reducir(rgb, np.maximum(bolsa, np.maximum(lado, boca)), (ancho, alto), 10)

    # Face of the game (kraft_paper_face): X eyes and a smile, drawn in ink
    cara = capa(
        grosor=4.2,
        lineas=[
            [(79, 31), (89, 51)],
            [(89, 31), (79, 51)],
            [(111, 31), (121, 51)],
            [(121, 31), (111, 51)],
            cubica((75, 60), (86, 74), (114, 74), (125, 60)),
        ],
    )
    cabeza_im = poner(cabeza_im, reducir_mascara(cara, ancho, alto), TINTA)
    return cuerpo, cabeza_im


def reducir_mascara(m: np.ndarray, ancho: int, alto: int) -> np.ndarray:
    im = Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8), 'L').resize((ancho, alto), Image.BOX)
    return np.asarray(im) >= 110


def main(juego: str) -> None:
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    destino = os.path.join(raiz, 'public/img/landing/hero')
    os.makedirs(destino, exist_ok=True)
    cuenco(juego).save(os.path.join(destino, 'ruleta-cuenco.png'), optimize=True)
    cabeza(juego).save(os.path.join(destino, 'ruleta-cabeza.png'), optimize=True)
    numeros().save(os.path.join(destino, 'ruleta-numeros.png'), optimize=True)
    tapa(os.path.join(raiz, 'public/img/landing/insignia-ruleta.png')).save(
        os.path.join(destino, 'ruleta-tapa.png'), optimize=True
    )
    bola().save(os.path.join(destino, 'bola.png'), optimize=True)
    cuerpo, bolsa = crupier(juego)
    cuerpo.save(os.path.join(destino, 'crupier-traje.png'), optimize=True)
    bolsa.save(os.path.join(destino, 'crupier-bolsa.png'), optimize=True)
    print('ok', destino)


if __name__ == '__main__':
    main(sys.argv[1])
