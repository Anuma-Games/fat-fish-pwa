/** Relative base: the PWA and the API share the same origin, so no CORS is needed. */
export const API_BASE = '/api/pwa';

/** Player loaded by the lab seed (docs/laboratorio-pruebas/sql/02_carga.sql). */
export const LAB_PLAYER_ID = '1';

/** Prefix for console traces, so they are easy to filter in DevTools. */
export const LOG_PREFIX = '[FatFish]';

/**
 * Public by design: it travels in every request from the browser, so anyone can read it. It only
 * identifies the client; writes that need protection use the player's token (README 10.1).
 */
export const API_KEY = '592b1e9539192affbc34916c574836930b1bf725c34e672d38ce847827e9a450';
