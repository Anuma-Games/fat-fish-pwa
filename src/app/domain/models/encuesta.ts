export type Escala = 1 | 2 | 3 | 4 | 5;

export const COMENTARIO_MAX = 500;

/** Anonymous survey: three scales from 1 to 5 and an optional comment. It carries no player data. */
export interface Encuesta {
  /** How risky the player considers gambling. */
  percepcionRiesgo: Escala;
  /** Whether the game changed that perception. */
  cambioOpinion: Escala;
  /** How clear the social responsibility message was. */
  claridadMensaje: Escala;
  comentario?: string;
}

/** What the API returns after storing a survey. */
export interface RespuestaEncuesta {
  id: string;
  enviadaEn: Date;
}

/** Returns a message in Spanish for the first problem found, or null when the survey is valid. */
export function validarEncuesta(datos: Encuesta): string | null {
  const escalas = [datos.percepcionRiesgo, datos.cambioOpinion, datos.claridadMensaje];
  if (!escalas.every((n) => Number.isInteger(n) && n >= 1 && n <= 5)) {
    return 'Responde las tres preguntas con un valor del 1 al 5.';
  }
  if ((datos.comentario ?? '').trim().length > COMENTARIO_MAX) {
    return `El comentario no puede pasar de ${COMENTARIO_MAX} caracteres.`;
  }
  return null;
}
