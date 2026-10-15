-- Laboratorio de pruebas de la PWA · 01: limpieza
-- Vacía las tablas de la PWA y reinicia los id (el siguiente jugador vuelve a ser el 1).

truncate table retroalimentacion, partida, jugador restart identity;

select count(*) as jugadores from jugador;
select count(*) as partidas from partida;
select count(*) as retroalimentaciones from retroalimentacion;
