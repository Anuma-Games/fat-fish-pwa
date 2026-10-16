/**
 * Landing page: the place to edit every text, link and badge of the promotion site.
 * The page only renders these lists, so a change here is enough to update the page.
 */

/** Destinations of the call-to-action buttons. They stay in '#' until the pages exist. */
export const CTA = {
  demo: '#',
  steam: '#',
  /** Internal routes that already work. */
  expediente: '/perfil',
  opinion: '/opinion/retroalimentacion',
};

export interface Icono {
  icono: string;
  titulo: string;
  texto: string;
}

/** Hero. */
export const HERO = {
  eyebrow: 'Anuma Games presenta',
  titulo: 'Fat Fish',
  claim: 'Nueve rondas. Una mesa. El casino siempre sabe de ti.',
  texto:
    'Un juego de ruleta donde el azar solo decide el número: los puntos dependen de tus jugadas, ' +
    'tu combo y tus comodines. Y mientras juegas, el casino toma nota de cada decisión.',
  badges: ['PC · Windows', 'Demo en itch.io', 'Venta única', 'Sin microtransacciones'],
  aviso: 'No es un juego de apuestas. Todo el dinero es ficticio y no se puede retirar.',
};

/** The hook: the dossier the casino builds about the player. */
export const EXPEDIENTE = {
  titulo: 'Lo que el casino sabe de ti',
  texto:
    'El expediente no es un logro: es el perfil que el casino construyó de ti. Registra cuántas ' +
    'veces volviste, cuánto dinero del juego perdiste, cada vez que arriesgaste todo, tu momento ' +
    'de mayor desesperación y qué empeñaste o pediste prestado para seguir jugando.',
  cta: 'Ver mi expediente',
  muestra: [
    { etiqueta: 'Partidas jugadas', valor: '12' },
    { etiqueta: 'Total perdido', valor: '$8,800', perdida: true },
    { etiqueta: 'Racha de derrotas', valor: '3' },
    { etiqueta: 'Todo o nada', valor: '1 vez' },
  ],
};

/** Four pillars from the design skill (fat-fish-diseno, section 1). */
export const PILARES = [
  {
    icono: 'ruleta',
    titulo: 'La estrategia vence al azar',
    texto: 'El número lo decide la bola, pero los puntos los decides tú.',
  },
  {
    icono: 'alerta',
    titulo: 'Riesgo visible',
    texto: 'Conoces la condición de la ronda antes del primer giro.',
  },
  {
    icono: 'flecha',
    titulo: 'Partidas cortas, decisiones densas',
    texto: 'Nueve rondas de dos minutos. Cada una exige más que la anterior.',
  },
  {
    icono: 'expediente',
    titulo: 'Consecuencia con propósito',
    texto: 'Al final no hay un premio: hay un mensaje sobre la ludopatía.',
  },
];

/** Mechanics in scope for the MVP (fat-fish-diseno, sections 3, 5 and 6). */
export const MECANICAS = [
  {
    icono: 'ruleta',
    titulo: 'Nueve rondas con meta',
    texto:
      'De 500 puntos en 6 giros a 8,500 en 4. La ronda termina en cuanto alcanzas la meta; si se ' +
      'acaban los giros, la partida termina en derrota.',
  },
  {
    icono: 'comodin',
    titulo: 'Cuatro comodines y tienda',
    texto:
      'Multiplicador de puntos, bola adicional, bonificación económica y cambio de color. Suben ' +
      'de nivel con las copias y se compran con dinero del juego.',
  },
  {
    icono: 'alerta',
    titulo: 'Condiciones, no jefes',
    texto:
      'Las rondas 3, 6 y 9 imponen una regla que te limita: Ruina financiera, Aislamiento y ' +
      'Pérdida familiar. Se anuncian antes de empezar y duran una sola ronda.',
  },
  {
    icono: 'moneda',
    titulo: 'Todo o nada, empeños y préstamos',
    texto:
      'Sin dinero, puedes jugarlo todo en un giro, empeñar un bien o pedir un préstamo. Todo queda ' +
      'anotado en el expediente.',
  },
];

/** Available platforms and commercial model (fat-fish-negocio). */
export const PLATAFORMAS = [
  { titulo: 'PC con Windows', texto: 'Solo mouse, cámara fija y una escena de juego.' },
  { titulo: 'Demo en itch.io', texto: 'Versión jugable gratuita durante el desarrollo.' },
  { titulo: 'Venta única', texto: 'Sin microtransacciones y sin monedas compradas.' },
  { titulo: 'PWA instalable', texto: 'Tu expediente, disponible en el teléfono y sin conexión.' },
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
