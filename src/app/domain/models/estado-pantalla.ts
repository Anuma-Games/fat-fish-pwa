/**
 * Estados de una pantalla de consulta (docs/diagramas/estados.mmd).
 * La UI decide qué pintar según este valor; las fachadas nunca lanzan errores a la UI.
 *
 * - INICIAL: todavía no se ha pedido nada.
 * - CARGANDO: hay una petición en curso.
 * - CON_DATOS: llegaron datos de la red.
 * - DESDE_CACHE: no hay conexión y se muestran los últimos datos guardados por el Service Worker.
 * - VACIO: la consulta funcionó pero no hay registros.
 * - SIN_RED: no hay conexión y no hay nada guardado.
 * - ERROR: falló el servidor.
 */
export type EstadoPantalla =
  'INICIAL' | 'CARGANDO' | 'CON_DATOS' | 'DESDE_CACHE' | 'VACIO' | 'SIN_RED' | 'ERROR';