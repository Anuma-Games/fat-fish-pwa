-- Laboratorio de pruebas de la PWA · 02: datos de prueba
-- Ejecutar después de 01_limpieza.sql. Todo el dinero es ficticio.

-- id 1 a 5 en este orden
insert into jugador(alias, creado_en) values
('jesus', '2026-09-20 09:00'),
('emmanuel', '2026-09-22 12:30'),
('angel', '2026-09-25 15:10'),
('luis', '2026-09-26 11:00'),
('andrik', '2026-09-28 06:00');

-- jesus (1): 12 partidas, la PWA muestra 10 y "Ver más partidas" pide las otras 2
-- emmanuel (2): 3, angel (3): 1, luis (4): 2, andrik (5): ninguna
insert into partida(jugador_id, resultado, ronda_alcanzada, puntaje, dinero_invertido, dinero_ganado, dinero_perdido, duracion_seg, creada_en) values
(1, 'DERROTA', 1, 60, 400, 100, 380, 480, '2026-09-21 13:00'),
(1, 'DERROTA', 3, 175, 1100, 700, 800, 1020, '2026-09-24 14:30'),
(1, 'ABANDONO', 2, 110, 600, 350, 420, 570, '2026-09-27 12:15'),
(1, 'DERROTA', 5, 360, 3100, 2300, 2000, 1980, '2026-09-29 15:00'),
(1, 'DERROTA', 2, 150, 900, 600, 700, 750, '2026-10-01 12:00'),
(1, 'DERROTA', 4, 281, 2350, 1800, 1450, 1510, '2026-10-03 13:00'),
(1, 'ABANDONO', 3, 210, 1200, 950, 600, 660, '2026-10-05 11:30'),
(1, 'DERROTA', 7, 640, 5200, 4100, 3300, 2325, '2026-10-07 14:00'),
(1, 'VICTORIA', 9, 1320, 8800, 9900, 2100, 2540, '2026-10-09 10:10'),
(1, 'DERROTA', 1, 90, 500, 200, 450, 580, '2026-10-11 15:00'),
(1, 'DERROTA', 6, 470, 3900, 3000, 2600, 1830, '2026-10-12 13:45'),
(1, 'VICTORIA', 9, 1510, 9100, 11200, 1900, 2645, '2026-10-13 16:00'),
(2, 'DERROTA', 5, 330, 2800, 2100, 1700, 1200, '2026-10-04 08:00'),
(2, 'VICTORIA', 9, 1405, 8700, 10400, 1800, 2820, '2026-10-08 09:00'),
(2, 'ABANDONO', 2, 120, 700, 400, 500, 720, '2026-10-12 07:30'),
(3, 'DERROTA', 3, 205, 1500, 900, 1200, 1080, '2026-10-10 17:00'),
(4, 'DERROTA', 6, 520, 4100, 3300, 2500, 2100, '2026-10-06 12:00'),
(4, 'VICTORIA', 9, 1480, 9300, 10800, 2200, 2730, '2026-10-13 11:20');

insert into retroalimentacion(categoria, componente, mensaje, creada_en) values
('SUGERENCIA', 'PWA', 'Me gustaría ver mi historial filtrado por resultado', '2026-10-12 11:00'),
('ERROR', 'JUEGO', 'La bola se quedó girando en la ronda 3 y tuve que reiniciar', '2026-10-13 14:30');

select * from jugador;
