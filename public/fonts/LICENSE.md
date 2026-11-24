# Fuentes

Son las fuentes del juego (`fat-fish-game`, `Assets/Art/Fonts` y `Assets/Art/Jersey_10`), convertidas a WOFF2 y
reducidas a los caracteres latinos con `fontTools` (`pyftsubset --unicodes=U+0000-00FF,U+2000-206F,U+2190-2193,…
--flavor=woff2`). Jersey 10 viene de Fontsource (`@fontsource/jersey-10`, 5.3.0).

| Archivo | Fuente | Uso | Autores | Licencia |
|---|---|---|---|---|
| `jersey-10-latin-400-normal.woff2` | Jersey 10 | Títulos, botones y cifras | Sarah Cadigan-Fried (The Soft Type Project Authors) | SIL OFL 1.1 ([`OFL-Jersey.txt`](OFL-Jersey.txt)) |
| `jersey-15-latin-400-normal.woff2` | Jersey 15 | Lectura | Sarah Cadigan-Fried (The Soft Type Project Authors) | SIL OFL 1.1 ([`OFL-Jersey.txt`](OFL-Jersey.txt)) |
| `fat-fish-pixel-latin-400-normal.woff2` | Fat Fish Pixel (derivada de Press Start 2P) | Etiquetas y sellos | CodeMan38 y The Press Start 2P Project Authors; adaptación de Anuma Games | SIL OFL 1.1 ([`OFL-FatFishPixel.txt`](OFL-FatFishPixel.txt)) |
| `courier-prime-latin-*-normal.woff2` | Courier Prime | Documentos (expediente) | Alan Dague-Greene (The Courier Prime Project Authors) | SIL OFL 1.1 ([`OFL-CourierPrime.txt`](OFL-CourierPrime.txt)) |
| `fat-fish-flechas.woff2` | Fat Fish Flechas | Flechas ← ↑ → ↓ que le faltan a Jersey 15 | Anuma Games (creada desde cero) | Propia |

Fat Fish Pixel lleva otro nombre porque "Press Start 2P" es un nombre reservado de su licencia.
