-- Laboratorio de pruebas de la PWA · 03: consultas de verificación
-- Ejecutar ANTES y DESPUÉS de usar la PWA para comparar.

-- 1. Cuántos registros hay
select count(*) as jugadores from jugador;
select count(*) as partidas from partida;
select count(*) as retroalimentaciones from retroalimentacion;

-- 2. Historial del jugador 1 (lo mismo que muestra la PWA)
select id, resultado, ronda_alcanzada, puntaje, dinero_invertido, dinero_perdido, creada_en
from partida
where jugador_id = 1
order by creada_en desc;

-- 3. Estadísticas del jugador 1 (las 4 tarjetas del perfil)
select partidas_totales, partidas_ganadas, dinero_invertido, dinero_perdido, racha_derrotas_max, tiempo_jugado_seg
from estadistica_jugador
where jugador_id = 1;

-- 4. Retroalimentación (la que se envía desde la PWA aparece al final)
select id, categoria, componente, mensaje, creada_en, clave_idempotencia
from retroalimentacion
order by id;

-- 5. Integridad: claves repetidas (debe salir vacío)
select clave_idempotencia, count(*)
from retroalimentacion
group by clave_idempotencia
having count(*) > 1;
