"""
Generates public/fonts/fat-fish-acentos.woff: the Spanish accented capitals (Á É Í Ó Ú Ñ Ü) of
Press Start 2P drawn at full height with the accent above, one pixel apart.

Press Start 2P squeezes those letters into its 8 x 8 grid so the accent fits, and with
text-transform: uppercase they look like lowercase letters. The page loads this font only for those
characters (unicode-range in src/styles/tokens.css); every other letter still comes from
Press Start 2P.

Source: PressStart2P-Regular.ttf (SIL Open Font License 1.1). The derived font gets its own name,
because "Press Start 2P" is a Reserved Font Name.

Usage (needs fontTools):
    python -I scripts/fuente-acentos.py <path to PressStart2P-Regular.ttf>
"""

import os
import sys

from fontTools import subset
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.pens.transformPen import TransformPen

PIXEL = 125  # One pixel of the 8 x 8 grid in font units (1000 per em)
NOMBRE = 'Fat Fish Acentos'
# Accented capital -> (base letter, accent glyph, how many pixels the accent moves up)
LETRAS = {
    'Á': ('A', 'acute', 3),
    'É': ('E', 'acute', 3),
    'Í': ('I', 'acute', 3),
    'Ó': ('O', 'acute', 3),
    'Ú': ('U', 'acute', 3),
    'Ñ': ('N', 'tilde', 3),
    'Ü': ('U', 'dieresis', 2),
}


def main(origen: str, destino: str) -> None:
    fuente = TTFont(origen)
    glyf = fuente['glyf']
    glyphs = fuente.getGlyphSet()
    cmap = fuente.getBestCmap()

    for letra, (base, acento, subir) in LETRAS.items():
        pen = TTGlyphPen(glyphs)
        glyphs[base].draw(pen)
        glyphs[acento].draw(TransformPen(pen, (1, 0, 0, 1, 0, subir * PIXEL)))
        glyf[cmap[ord(letra)]] = pen.glyph()

    # Keep only the seven letters
    opciones = subset.Options()
    opciones.layout_features = []
    opciones.name_IDs = ['*']
    opciones.notdef_outline = True
    recorte = subset.Subsetter(opciones)
    recorte.populate(unicodes=[ord(letra) for letra in LETRAS])
    recorte.subset(fuente)

    # Room above the capitals for the accents
    alto = 1000 + 4 * PIXEL
    fuente['hhea'].ascent = alto
    fuente['OS/2'].usWinAscent = alto
    fuente['OS/2'].sTypoAscender = alto
    fuente['head'].yMax = max(fuente['head'].yMax, alto)

    nombres = fuente['name']
    for registro in list(nombres.names):
        if registro.nameID in (1, 3, 4, 6, 16, 17):
            nombres.removeNames(nameID=registro.nameID)
    for id_, valor in (
        (1, NOMBRE),
        (2, 'Regular'),
        (3, f'{NOMBRE} Regular'),
        (4, f'{NOMBRE} Regular'),
        (6, NOMBRE.replace(' ', '') + '-Regular'),
    ):
        nombres.setName(valor, id_, 3, 1, 0x409)
    nombres.setName(
        'Derived from Press Start 2P (CodeMan38): Spanish accented capitals at full height.',
        10,
        3,
        1,
        0x409,
    )

    fuente.flavor = 'woff'
    fuente.save(destino)
    print(f'{destino}: {os.path.getsize(destino)} bytes')


if __name__ == '__main__':
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    main(sys.argv[1], os.path.join(raiz, 'public', 'fonts', 'fat-fish-acentos.woff'))
