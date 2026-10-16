/**
 * Landing page: the place to edit every text, link and number of the promotion site.
 * The page only renders these lists, so a change here is enough to update the page.
 * Everything is static: the landing page never calls the API or reads stored data.
 */

/** Destinations of the call-to-action buttons. They stay in '#' until the pages exist. */
export const CTA = {
  demo: '#',
  /** Internal routes of the PWA, used as plain links. */
  expediente: '/perfil',
  opinion: '/opinion/retroalimentacion',
};

/** Hero. */
export const HERO = {
  eyebrow: 'Anuma Games presenta',
  titulo: 'Fat Fish',
  claim: 'Una mesa. Cada ronda pide más. El casino siempre sabe de ti.',
  texto:
    'Un juego de ruleta donde el azar solo decide el número: los puntos dependen de tus jugadas, ' +
    'tu combo y tus comodines.',
};

export interface Paso {
  titulo: string;
  texto: string;
  /** Optional worked example shown under the text. */
  ejemplo?: string;
}

/**
 * "Cómo se juega": the loop of one round. It never states how many rounds a run has; the page
 * only shows that the goal keeps rising (fat-fish-diseno, sections 3 and 4).
 */
export const PASOS: Paso[] = [
  {
    titulo: 'Coloca tus fichas',
    texto: 'Reparte tu dinero en la mesa: hasta cinco jugadas por giro.',
  },
  {
    titulo: 'Gira la ruleta',
    texto: 'La bola decide el número. Nada más.',
  },
  {
    titulo: 'Suma puntos',
    texto: 'Lo que invertiste por el pago, por tu combo y por tus comodines.',
    ejemplo: '150 × 1.5 × 1.25 = 281',
  },
  {
    titulo: 'Alcanza la meta',
    texto: 'Tus giros están contados. Si se acaban antes de llegar, la partida termina.',
  },
  {
    titulo: 'Pasa por la tienda',
    texto: 'Compra comodines con el dinero que te queda y vuelve a la mesa.',
  },
];

/** Closing line of the loop: back to the table, with a higher goal. */
export const VUELTA = 'Vuelves a la mesa. La siguiente meta es más alta.';

/** Four pillars from the design skill (fat-fish-diseno, section 1). */
export const PILARES = [
  {
    icono: 'ruleta',
    titulo: 'La estrategia vence al azar',
    texto: 'El número lo decide la bola; los puntos, tú.',
  },
  {
    icono: 'alerta',
    titulo: 'Riesgo visible',
    texto: 'Sabes a qué te enfrentas antes del primer giro.',
  },
  {
    icono: 'flecha',
    titulo: 'Cada ronda pide más',
    texto: 'La meta sube con cada ronda que superas.',
  },
  {
    icono: 'moneda',
    titulo: 'Todo o nada',
    texto: 'Sin dinero, puedes empeñar un bien o pedir un préstamo.',
  },
];

/** The four wildcards of the MVP (fat-fish-diseno, section 6). */
export const COMODINES = [
  {
    categoria: 'Puntuación',
    titulo: 'Multiplicador de puntos',
    texto: 'Aporta al multiplicador de comodines y crece con las copias.',
    glifo: '×',
  },
  {
    categoria: 'Ruleta',
    titulo: 'Bola adicional',
    texto: 'Una bola más en el giro: más aciertos, menos puntos.',
    glifo: '+1',
  },
  {
    categoria: 'Economía',
    titulo: 'Bonificación económica',
    texto: 'Dinero adicional, con un límite por ronda.',
    glifo: '$',
  },
  {
    categoria: 'Mesa',
    titulo: 'Cambio de color',
    texto: 'Cambia qué casillas cubren las jugadas por color.',
    glifo: 'R/N',
  },
];

export interface DatoExpediente {
  etiqueta: string;
  /** Numbers count up when the dossier appears; text is shown as is. */
  valor: number | string;
  prefijo?: string;
  perdida?: boolean;
}

/** The hook: the dossier the casino builds about the player. The sample is fictitious. */
export const EXPEDIENTE = {
  titulo: 'Lo que el casino sabe de ti',
  texto:
    'El expediente no es un logro: es el perfil que el casino construyó de ti. Registra cuántas ' +
    'veces volviste, cuánto dinero del juego perdiste, cada vez que arriesgaste todo, tu momento ' +
    'de mayor desesperación y qué empeñaste o pediste prestado para seguir jugando.',
  cta: 'Ver un expediente',
  alias: 'pezgordo',
  id: '1042',
  muestra: [
    { etiqueta: 'Veces que volviste', valor: 12 },
    { etiqueta: 'Total perdido', valor: 8800, prefijo: '$', perdida: true },
    { etiqueta: 'Todo o nada', valor: '1 vez' },
    { etiqueta: 'Empeños', valor: 'Automóvil' },
    { etiqueta: 'Préstamos', valor: 500, prefijo: '$' },
    { etiqueta: 'Mayor desesperación', valor: 'Ronda 3, giro 4' },
  ] as DatoExpediente[],
};

/** "Why we make it": the page drops the casino look here. */
export const MENSAJE = {
  titulo: 'Fat Fish usa la mecánica de un casino para mostrar cómo funciona la ludopatía.',
  texto:
    'La recompensa inmediata, la escalada de lo invertido y un casino que siempre gana a largo ' +
    'plazo. El juego no simula apuestas reales ni las celebra.',
  // Confirm the number and its schedule before every release.
  ayuda: 'Si el juego de azar te afecta a ti o a alguien cercano, llama a la Línea de la Vida:',
  telefono: '800 911 2000',
};

/** Available platforms and commercial model (fat-fish-negocio). */
export const PLATAFORMAS = [
  'PC · Windows',
  'Demo en itch.io',
  'Venta única',
  'Sin microtransacciones',
  'PWA instalable',
];

export const EQUIPO = [
  'Luis Ángel Gaxiola Gamboa',
  'Emmanuel González Hernández',
  'Jesús Antonio Jiménez Mendoza',
  'Ángel Gael Jurado Rodríguez',
  'Andrik Rivera Esquer',
];

export interface Pregunta {
  titulo: string;
  respuesta: string;
}

export const PREGUNTAS: Pregunta[] = [
  {
    titulo: '¿Es un juego de apuestas?',
    respuesta:
      'No. El juego usa dinero ficticio que no tiene valor real ni se puede retirar, y nunca se ' +
      'apuesta. Dentro del juego se dice invertir, no apostar.',
  },
  {
    titulo: '¿De qué va el expediente?',
    respuesta:
      'Es el registro que el juego hace de tu paso por la mesa: veces que volviste, dinero perdido, ' +
      'Todo o nada, empeños y préstamos. Se calcula con el historial local, así que funciona sin internet.',
  },
  {
    titulo: '¿Esta página guarda lo que hago?',
    respuesta:
      'No. El expediente de tu visita se calcula en tu navegador mientras la página está abierta y ' +
      'se borra al recargarla. No se envía a ningún lado.',
  },
  {
    titulo: '¿Cuánto cuesta?',
    respuesta:
      'Por ahora hay una demo jugable y la PWA de consulta. La versión completa se compra una sola vez y no tiene microtransacciones.',
  },
  {
    titulo: '¿Puedo jugar sin conexión?',
    respuesta:
      'El juego guarda cada partida en tu equipo y la sincroniza cuando hay red. El expediente se ' +
      'calcula con el historial local, así que nunca se bloquea por falta de internet.',
  },
  {
    titulo: '¿Por qué un juego sobre juego de azar?',
    respuesta:
      'Para mostrar, sin glorificarlo, cómo funciona la lógica de la ludopatía: la recompensa ' +
      'inmediata, la escalada de lo invertido y cómo el casino siempre gana a largo plazo.',
  },
];
