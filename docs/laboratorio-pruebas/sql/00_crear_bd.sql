-- Laboratorio de pruebas de la PWA · 00: usuario y bases de datos
-- Ejecutar con el superusuario postgres. OJO: borra las bases fatfish y fatfish_test si ya existen.
-- Las tablas las crea la API (Flyway) al arrancar.

drop database if exists fatfish;
drop database if exists fatfish_test;
drop role if exists fatfish;

create role fatfish login password 'fatfish';
create database fatfish owner fatfish;
create database fatfish_test owner fatfish;

select datname from pg_database where datname like 'fatfish%';
