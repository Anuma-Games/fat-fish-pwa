-- Laboratorio de pruebas de la PWA · 02: datos de prueba
-- Ejecutar después de 01_limpieza.sql. Todo el dinero es ficticio.

-- id 1 a 5 en este orden.
-- Datos de prueba: los 5 jugadores tienen la contraseña fatfish2026 (guardada con BCrypt)
-- y el token token-lab-1 ... token-lab-5 (guardado como SHA-256).
insert into jugador(alias, contrasena_hash, token_hash, creado_en, ultima_actividad) values
('jesus', '$2a$10$DC.rDrvR3cW1LXzdTcfQJe5PHK8SDnBpqdzSlYOsYZSOAGLkxjLq6', '8e4c23b81eaf081ca92ee7793e11c1ee068939123905145db01a421bb0f3a0b4', '2026-09-20 09:00', '2026-10-13 16:00'),
('emmanuel', '$2a$10$zjMm27C19YM1kXfK4WMJ0eH2OGht1SqwGfCUBbTwMzkxUBDc74xYG', '5e6dfe244b64be332428f549f56d0e43253b71814835d0478cb958b7e8c9ee71', '2026-09-22 12:30', '2026-10-12 07:30'),
('angel', '$2a$10$ljadkaofCW63bS6/ns2ofujrZ8PIoKxRCRyKLGGRyUvUJSvNTymaq', '70a111e9b87eb41d61a25a51c4b231d6d97c361988919f8ae6559a37d07170d1', '2026-09-25 15:10', '2026-10-10 17:00'),
('luis', '$2a$10$S7aAOMvG9RS.YlrhxNf4vOP0hBuaooZFZ.lwBwgHvz2dYoFxrZ.Nq', '98fcc84217697343937089a2272c3e014f4c2a665095031015378628b781ce09', '2026-09-26 11:00', '2026-10-13 11:20'),
('andrik', '$2a$10$N6T6BpdkQpywfm8tvAR2KeuLfq2B1TcmTtXYT5NflsPqOIpoD5ebi', '7982812e6ec02f2421efb233993f21e5b8518240fcac5bd58e80affbfe81fdff', '2026-09-28 06:00', null);

-- jesus (1): 12 partidas, la PWA muestra 10 y "Ver más partidas" pide las otras 2
-- emmanuel (2): 3, angel (3): 1, luis (4): 2, andrik (5): ninguna
-- numero_local es el contador de partidas de cada jugador en el juego
insert into partida(jugador_id, numero_local, resultado, ronda_alcanzada, puntaje, dinero_invertido, dinero_ganado, dinero_perdido, veces_todo_o_nada, empenos, prestamos, duracion_seg, creada_en) values
(1, 1, 'DERROTA', 1, 60, 400, 100, 380, 0, 0, 0, 480, '2026-09-21 13:00'),
(1, 2, 'DERROTA', 3, 175, 1100, 700, 800, 1, 0, 0, 1020, '2026-09-24 14:30'),
(1, 3, 'ABANDONO', 2, 110, 600, 350, 420, 0, 0, 0, 570, '2026-09-27 12:15'),
(1, 4, 'DERROTA', 5, 360, 3100, 2300, 2000, 1, 1, 0, 1980, '2026-09-29 15:00'),
(1, 5, 'DERROTA', 2, 150, 900, 600, 700, 0, 0, 1, 750, '2026-10-01 12:00'),
(1, 6, 'DERROTA', 4, 281, 2350, 1800, 1450, 1, 0, 1, 1510, '2026-10-03 13:00'),
(1, 7, 'ABANDONO', 3, 210, 1200, 950, 600, 0, 0, 0, 660, '2026-10-05 11:30'),
(1, 8, 'DERROTA', 7, 640, 5200, 4100, 3300, 2, 1, 1, 2325, '2026-10-07 14:00'),
(1, 9, 'VICTORIA', 9, 1320, 8800, 9900, 2100, 1, 0, 0, 2540, '2026-10-09 10:10'),
(1, 10, 'DERROTA', 1, 90, 500, 200, 450, 0, 0, 0, 580, '2026-10-11 15:00'),
(1, 11, 'DERROTA', 6, 470, 3900, 3000, 2600, 1, 1, 0, 1830, '2026-10-12 13:45'),
(1, 12, 'VICTORIA', 9, 1510, 9100, 11200, 1900, 2, 0, 1, 2645, '2026-10-13 16:00'),
(2, 1, 'DERROTA', 5, 330, 2800, 2100, 1700, 1, 0, 0, 1200, '2026-10-04 08:00'),
(2, 2, 'VICTORIA', 9, 1405, 8700, 10400, 1800, 0, 0, 1, 2820, '2026-10-08 09:00'),
(2, 3, 'ABANDONO', 2, 120, 700, 400, 500, 0, 0, 0, 720, '2026-10-12 07:30'),
(3, 1, 'DERROTA', 3, 205, 1500, 900, 1200, 1, 0, 0, 1080, '2026-10-10 17:00'),
(4, 1, 'DERROTA', 6, 520, 4100, 3300, 2500, 0, 1, 0, 2100, '2026-10-06 12:00'),
(4, 2, 'VICTORIA', 9, 1480, 9300, 10800, 2200, 1, 0, 1, 2730, '2026-10-13 11:20');

-- Comodines comprados y usados en las victorias (partidas 9, 12, 14 y 18)
-- 1 Multiplicador de puntos, 2 Bola adicional, 3 Bonificación económica, 4 Cambio de color
insert into partida_comodin(partida_id, comodin_id, veces_comprado, veces_usado) values
(9, 1, 2, 4),
(9, 3, 1, 1),
(12, 1, 3, 6),
(12, 2, 1, 2),
(14, 4, 1, 3),
(18, 1, 2, 5);

-- Totales de cada jugador. La API los recalcula cada vez que el juego envía una partida;
-- aquí se cargan ya calculados a partir de las partidas de arriba.
insert into estadistica_jugador(jugador_id, puntaje_maximo, puntaje_maximo_en, partidas_totales, partidas_ganadas, dinero_invertido, dinero_ganado, dinero_perdido, racha_derrotas_max, tiempo_jugado_seg) values
(1, 1510, '2026-10-13 16:00', 12, 2, 37150, 35200, 16700, 6, 16890),
(2, 1405, '2026-10-08 09:00', 3, 1, 12200, 12900, 4000, 1, 4740),
(3, 0, null, 1, 0, 1500, 900, 1200, 1, 1080),
(4, 1480, '2026-10-13 11:20', 2, 1, 13400, 14100, 4700, 1, 4830),
(5, 0, null, 0, 0, 0, 0, 0, 0, 0);

-- gen_random_uuid() genera la clave que en la PWA crea el navegador
insert into retroalimentacion(clave_idempotencia, categoria, componente, mensaje, creada_en) values
(gen_random_uuid(), 'SUGERENCIA', 'PWA', 'Me gustaría ver mi historial filtrado por resultado', '2026-10-12 11:00'),
(gen_random_uuid(), 'ERROR', 'JUEGO', 'La bola se quedó girando en la ronda 3 y tuve que reiniciar', '2026-10-13 14:30');

select * from jugador;
