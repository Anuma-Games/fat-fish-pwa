-- Laboratorio de pruebas de la PWA – 03: consultas de verificación
-- Ejecutar ANTES y DESPUÉS de usar la PWA para comparar.

-- 1. Cuántos registros hay
select count(*) as jugadores from jugador;
select count(*) as partidas from partida;
select count(*) as retroalimentaciones from retroalimentacion;
select count(*) as encuestas from encuesta;

-- 2. Historial del jugador 1 (lo mismo que muestra la PWA)
select id, resultado, ronda_alcanzada, puntaje, dinero_invertido, dinero_perdido, creada_en
from partida
where jugador_id = 1
order by terminada_en desc;

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

-- 6. Creación (LAB-02): el mensaje de prueba enviado desde la PWA
--    Antes de enviarlo sale vacío; después sale una sola fila.
select id, categoria, componente, mensaje, creada_en, clave_idempotencia
from retroalimentacion
where mensaje like 'Prueba FF-163%'
order by id;

-- 7. Consulta (LAB-01): datos del expediente del jugador 1 para compararlos con la PWA
--    La PWA muestra: Partidas, Ganaste, Total perdido, De ... invertidos, Racha de derrotas,
--    Tiempo en la mesa (tiempo_jugado_seg en horas y minutos) e Historial (14 partidas).
select j.id,
       j.alias,
       e.partidas_totales,
       e.partidas_ganadas,
       e.dinero_perdido,
       e.dinero_invertido,
       e.racha_derrotas_max,
       e.tiempo_jugado_seg / 3600 as horas,
       (e.tiempo_jugado_seg % 3600) / 60 as minutos,
       (select count(*) from partida p where p.jugador_id = j.id) as partidas_en_historial
from jugador j
join estadistica_jugador e on e.jugador_id = j.id
where j.id = 1;

-- 8. Importación: migraciones de Flyway aplicadas por la API, en orden
select installed_rank, version, description, script, success
from flyway_schema_history
order by installed_rank;