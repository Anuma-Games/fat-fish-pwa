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

export interface EnlaceMenu {
  texto: string;
  icono: string;
}

/**
 * Menu shared by the whole site: the side panel of the landing page and the side menu of
 * Expediente and Opinión show the same groups, so both feel like one site.
 */
export const MENU = {
  /** Sections of the landing page (anchors of `/`). */
  mesa: {
    titulo: 'La mesa',
    enlaces: [
      { id: 'inicio', texto: 'Inicio', icono: 'ruleta' },
      { id: 'como-se-juega', texto: 'Cómo se juega', icono: 'flecha' },
      { id: 'comodines', texto: 'Comodines', icono: 'comodin' },
      // The sample dossier on the landing page; "Expediente" below is the visitor's own, at /perfil
      { id: 'expediente', texto: 'Lo que sabe el casino', icono: 'buscar' },
      { id: 'faq', texto: 'Preguntas', icono: 'alerta' },
    ] as (EnlaceMenu & { id: string })[],
  },
  /** Pages of the app that read and write data. */
  app: {
    titulo: 'Tu expediente y tu opinión',
    enlaces: [
      { ruta: '/perfil', texto: 'Expediente', icono: 'expediente' },
      { ruta: '/ranking', texto: 'Ranking', icono: 'trofeo' },
      { ruta: '/opinion/retroalimentacion', texto: 'Opinión', icono: 'opinion' },
    ] as (EnlaceMenu & { ruta: string })[],
  },
  /** Legal pages, always at the end of the menu (README 8.5). */
  legal: {
    titulo: 'Legal',
    enlaces: [
      { ruta: '/privacidad', texto: 'Aviso de privacidad', icono: 'expediente' },
    ] as (EnlaceMenu & { ruta: string })[],
  },
};

/** Hero. */
export const HERO = {
  eyebrow: 'Anuma Games presenta',
  titulo: 'Fat Fish',
  claim: 'Una mesa. Cada ronda pide más. El casino siempre sabe de ti.',
  texto:
    'Un juego de ruleta donde el azar solo decide el número: lo que ganas depende de tus jugadas, ' +
    'tu combo y tus comodines.',
};

export interface Paso {
  titulo: string;
  texto: string;
}

/**
 * "Cómo se juega": the loop of one round. The goal is money, not points (fat-fish-game README,
 * "Balance, jefes y casa de empeño"). It gives no figures and never states how many rounds a run
 * has, so the page does not go out of date when the game is rebalanced.
 */
export const PASOS: Paso[] = [
  {
    titulo: 'Coloca tus fichas',
    texto: 'Reparte tu dinero como quieras.',
  },
  {
    titulo: 'Gira la ruleta',
    texto: 'La bola decide el número. Nada más.',
  },
  {
    titulo: 'Cobra',
    texto: 'Si aciertas, cobras. Si ganas, la casa te suma un bono.',
  },
  {
    titulo: 'Alcanza la meta',
    texto: 'Termina con más dinero. Tus giros están contados.',
  },
  {
    titulo: 'Pasa por la tienda',
    texto: 'Compra comodines. Lo que gastes, recupéralo en la mesa.',
  },
];

/** Closing line of the loop: back to the table, with a higher goal. */
export const VUELTA = 'Vuelves a la mesa. La siguiente meta es más alta.';

/** Four pillars from the design skill (fat-fish-diseno, section 1). */
export const PILARES = [
  {
    icono: 'ruleta',
    titulo: 'La estrategia vence al azar',
    texto: 'El número es de la bola. La ganancia, tuya.',
  },
  {
    icono: 'alerta',
    titulo: 'Riesgo visible',
    texto: 'Cada jefe te dice su regla antes de girar.',
  },
  {
    icono: 'flecha',
    titulo: 'Cada ronda pide más',
    texto: 'Cada meta pide más dinero que la anterior.',
  },
  {
    icono: 'moneda',
    titulo: 'Todo o nada',
    texto: 'Invierte todo en un giro, o empeña lo que tienes.',
  },
];

/**
 * A sample of the game's wildcards, one per category (Ruleta, Mesa, Fichas, Economía in
 * fat-fish-game, Assets/Modifiers). Only some of them and without figures, so the page does not go
 * out of date when the shop changes; the full catalog lives in the game.
 */
export const COMODINES = [
  {
    categoria: 'Ruleta',
    titulo: 'Tridente',
    texto: 'Lanza más bolas y cuenta la que más te paga. La casa cobra por cada bola extra.',
    glifo: '+1',
  },
  {
    categoria: 'Mesa',
    titulo: 'Reloj de arena',
    texto: 'Más giros en cada ronda. El tiempo que le robas a tu familia.',
    glifo: '+G',
  },
  {
    categoria: 'Fichas',
    titulo: 'Ficha cargada',
    texto: 'Tus plenos hacen crecer el bono de la casa.',
    glifo: '×',
  },
  {
    categoria: 'Economía',
    titulo: 'Seguro de la casa',
    texto:
      'Te regresa parte de lo que pierdes en cada giro. La casa siempre gana, pero te consuela.',
    glifo: '%',
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
  'PC con Windows',
  'Demo en itch.io',
  'Venta única',
  'Sin microtransacciones',
  'App web instalable',
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
      'Por ahora hay una demo jugable y una app web para consultar tu expediente. La versión completa se compra una sola vez y no tiene microtransacciones.',
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

/**
 * Short lines of the Crupier, shown one at a time under the nav. He is impartial and brief: he
 * never celebrates a result and never invites the visitor to risk anything.
 */
export const CRUPIER = {
  bienvenida: 'Toma asiento.',
  inactivo: '¿Sigues ahí?',
  primerGiro: 'La casa anota todo.',
  giros: ['Otra vez.', 'La bola no recuerda nada. Yo sí.', 'Nadie te pidió que giraras.'],
  expediente: 'Esto es lo que guardo de cada jugador.',
  otraRonda: 'Otra vez aquí.',
};

/** The wheel of the hero can be spun by the visitor; this is the hint before the first spin. */
export const RULETA = {
  pista: 'Toca o arrastra la ruleta para girarla.',
  colores: { rojo: 'rojo', negro: 'negro', cero: 'verde' },
};

/** Police-style header of the sample dossier. */
export const FICHA = {
  numero: 'Expediente N.º 1042',
  estado: 'Estado: activo',
};
