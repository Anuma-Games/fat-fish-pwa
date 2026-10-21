-- Laboratorio de pruebas de la PWA – 01: limpieza
-- Vacía las tablas y reinicia los id (el siguiente jugador vuelve a ser el 1).
-- El catálogo de comodines (tabla comodin) no se borra: lo carga la API al crear las tablas.

truncate table retroalimentacion, encuesta, partida_comodin, partida, estadistica_jugador, jugador restart identity;

select count(*) as jugadores from jugador;
select count(*) as partidas from partida;
select count(*) as retroalimentaciones from retroalimentacion;
