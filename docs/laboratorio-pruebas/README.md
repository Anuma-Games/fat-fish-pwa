# Laboratorio de pruebas – PWA + API + PostgreSQL

Banco de pruebas de la PWA de **Fat Fish** conectada a la API (Spring Boot) y a PostgreSQL 17. Verifica:

1. La **consulta** de información (`GET /api/pwa/jugadores` para buscar al jugador, `GET /api/pwa/perfil` y `GET /api/pwa/partidas`) y su **renderizado** en la PWA.
2. La **persistencia** de nuevos registros (`POST /api/pwa/retroalimentacion`) en PostgreSQL, con su estructura e integridad.
3. El **comportamiento sin conexión**: el historial se sirve desde la caché del service worker y los envíos sin red esperan en IndexedDB hasta reconectar, sin duplicarse.

Los datos son **simulados** (scripts de la carpeta [`sql/`](./sql/)).

## Índice

1. [Tablas que usa el laboratorio](#1-tablas-que-usa-el-laboratorio)
2. [Contenido de esta carpeta](#2-contenido-de-esta-carpeta)
3. [Arquitectura del laboratorio](#3-arquitectura-del-laboratorio)
4. [Requisitos](#4-requisitos)
5. [Pasos](#5-pasos)
   1. [Clonar los dos repositorios en la misma carpeta](#1-clonar-los-dos-repositorios-en-la-misma-carpeta)
   2. [Crear el usuario y la base de datos (una sola vez)](#2-crear-el-usuario-y-la-base-de-datos-una-sola-vez)
   3. [Levantar la API con el perfil del laboratorio](#3-levantar-la-api-con-el-perfil-del-laboratorio)
   4. [Cargar los datos simulados (terminal de psql)](#4-cargar-los-datos-simulados-terminal-de-psql)
   5. [Levantar la PWA](#5-levantar-la-pwa)
6. [Casos de prueba](#6-casos-de-prueba)
7. [Evidencias](#7-evidencias)
   1. [Persistencia y base de datos (backend y DB)](#71-persistencia-y-base-de-datos-backend-y-db)
   2. [Frontend y comportamiento PWA](#72-frontend-y-comportamiento-pwa)
8. [Solución de problemas](#8-solución-de-problemas)

## 1. Tablas que usa el laboratorio

La migración `V1` de la API crea el esquema completo con `id` numérico; el diagrama y la descripción de cada tabla están en la [sección 5 del README de la PWA](../../README.md#5-modelo-de-datos). El laboratorio usa estas:

| Tabla                 | Uso en el laboratorio                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `jugador`             | 28 jugadores ficticios (`id` 1 a 28), los mismos de producción                            |
| `estadistica_jugador` | Totales de cada jugador; de aquí salen las 4 tarjetas del perfil                          |
| `partida`             | Historial de cada jugador (la PWA solo lo lee)                                            |
| `partida_comodin`     | Comodines comprados y usados en algunas partidas (la PWA todavía no los muestra)          |
| `retroalimentacion`   | Lo que se envía desde la PWA; `clave_idempotencia` evita guardar dos veces el mismo envío |

**¿Por qué `clave_idempotencia` es un UUID?** La genera el navegador (`crypto.randomUUID()`) en el momento del envío, incluso sin conexión, cuando todavía no puede pedirle un número al servidor. Si cada dispositivo numerara 1, 2, 3…, dos dispositivos tendrían un "envío 1" y la API descartaría uno pensando que es un reintento. El UUID no se repite y viaja en la cabecera `Idempotency-Key`. El `id` de cada fila sigue siendo el número que asigna PostgreSQL; en los datos de prueba la clave la genera `gen_random_uuid()`.

> En el juego, los jugadores se registran con alias y contraseña y envían sus partidas a `/api/juego` (ver el README de la API). En el laboratorio se cargan con [`02_carga.sql`](./sql/02_carga.sql), que es copia de [`fat-fish-api/sql/demo/02_cargar.sql`](https://github.com/Anuma-Games/fat-fish-api/blob/develop/sql/demo/02_cargar.sql) (los datos de demostración de producción). Su contraseña es aleatoria y nadie la conoce: el laboratorio solo lee sus datos desde la PWA.

## 2. Contenido de esta carpeta

| Ruta                                             | Qué es                                                                                                                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`sql/00_crear_bd.sql`](./sql/00_crear_bd.sql)   | Crea el usuario `fatfish` y las bases `fatfish` y `fatfish_test` (borra las anteriores)                                                                                             |
| [`sql/01_limpieza.sql`](./sql/01_limpieza.sql)   | Vacía las tablas (excepto el catálogo de comodines) y reinicia los `id`                                                                                                             |
| [`sql/02_carga.sql`](./sql/02_carga.sql)         | Datos de prueba (los mismos de producción): 28 jugadores ficticios (`id` 1 a 28) con sus estadísticas, 107 partidas, 45 registros de comodines, 6 retroalimentaciones y 8 encuestas |
| [`sql/03_consultas.sql`](./sql/03_consultas.sql) | Consultas de verificación para correr antes y después de usar la PWA                                                                                                                |
| [`evidencias/`](./evidencias/)                   | Salidas de `psql`, logs de Spring Boot, consola del navegador, capturas y volcados de Cache Storage e IndexedDB                                                                     |

## 3. Arquitectura del laboratorio

```
Navegador (Chrome)                         http://localhost:4200
 ├─ PWA Angular (build de producción) ── service worker: precaché + caché del historial
 │                                        IndexedDB: bandeja de salida (outbox) de envíos
 └─ /api/pwa/** ──▶ scripts/lab-server.mjs (mismo origen, sin CORS) ──▶ API Spring Boot :8080 ──▶ PostgreSQL 17 :5432
```

- La PWA y la API se ven en el **mismo origen**, como en producción: por eso no hace falta CORS y el service worker funciona (`localhost` cuenta como origen seguro).
- El service worker **solo** se activa con el build de producción (`npm run lab`); con `ng serve` no se registra.

## 4. Requisitos

| Herramienta   | Versión             | Comprobar        |
| ------------- | ------------------- | ---------------- |
| PostgreSQL    | 17                  | `psql --version` |
| JDK           | 21                  | `java -version`  |
| Node.js       | 24 (incluye npm)    | `node -v`        |
| Git           | cualquiera reciente | `git --version`  |
| Google Chrome | reciente            | Para DevTools    |

No se necesita Docker ni instalar Maven (la API trae Maven Wrapper).

## 5. Pasos

Los comandos están para **Linux / WSL** (terminal de Linux en Windows) y para **macOS**. Abre **tres terminales**: una para la API, otra para la PWA y otra para `psql`.

### 1. Clonar los dos repositorios en la misma carpeta

```bash
mkdir fat-fish && cd fat-fish
git clone https://github.com/Anuma-Games/fat-fish-api.git
git clone https://github.com/Anuma-Games/fat-fish-pwa.git
```

Debe quedar así: `fat-fish/fat-fish-api` y `fat-fish/fat-fish-pwa`. Todos los comandos siguientes se ejecutan desde la carpeta `fat-fish`.

### 2. Crear el usuario y la base de datos (una sola vez)

Linux / WSL:

```bash
sudo service postgresql start
sudo -u postgres psql < fat-fish-pwa/docs/laboratorio-pruebas/sql/00_crear_bd.sql
```

> Se usa `<` para que tu usuario lea el archivo y se lo pase a `psql`; así el usuario `postgres` no necesita permisos sobre tu carpeta.

macOS (Homebrew):

```bash
brew services start postgresql@17
psql -U postgres -h localhost -f fat-fish-pwa/docs/laboratorio-pruebas/sql/00_crear_bd.sql
```

> En macOS, si tu instalación no tiene el rol `postgres`, usa tu usuario: `psql -d postgres -f …`.
> **Atención:** el script borra las bases `fatfish` y `fatfish_test` si ya existen, para empezar desde cero.

Crea el usuario `fatfish` con contraseña `fatfish`, que son los valores por defecto de la API.

### 3. Levantar la API con el perfil del laboratorio

```bash
cd fat-fish-api
./mvnw spring-boot:run -Dspring-boot.run.profiles=lab
```

- Espera la línea `Started FatFishApiApplication`. Flyway crea las tablas (migración `V1`) en el primer arranque.
- Si tu sistema tiene otra versión de Java por defecto, indica el JDK 21 antes del comando:
  - Linux / WSL: `export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64` (ajusta la ruta a tu instalación).
  - macOS: `export JAVA_HOME=$(/usr/libexec/java_home -v 21)`.
- Si PostgreSQL usa otro puerto o contraseña: `DB_URL=jdbc:postgresql://localhost:5433/fatfish DB_PASSWORD=otra ./mvnw spring-boot:run -Dspring-boot.run.profiles=lab`.
- El perfil `lab` escribe en consola **y** en `fat-fish-api/logs/fat-fish-api-lab.log`: una línea por petición (método, ruta, código, tiempo, tamaños y memoria), el SQL con sus parámetros y las métricas de cada transacción.

Deja esta terminal abierta.

### 4. Cargar los datos simulados (terminal de `psql`)

Linux / WSL y macOS:

```bash
export PGPASSWORD=fatfish
psql -U fatfish -h localhost -d fatfish -f fat-fish-pwa/docs/laboratorio-pruebas/sql/01_limpieza.sql
psql -U fatfish -h localhost -d fatfish -f fat-fish-pwa/docs/laboratorio-pruebas/sql/02_carga.sql
```

La salida termina con un resumen de los 28 jugadores: 1 `ManoDeHierro` (14 partidas), 5 `recien_llegado` (sin partidas) y dos jugadores con el alias `Tiburon` (6 y 20). Para repetir el laboratorio desde cero, vuelve a ejecutar estos dos scripts.

### 5. Levantar la PWA

```bash
cd fat-fish-pwa
npm ci
npm run lab
```

`npm run lab` compila la PWA en modo producción y la sirve en **http://localhost:4200**, reenviando `/api` a la API en `http://localhost:8080`. Abre esa dirección en Chrome (en WSL, desde el Chrome de Windows: WSL reenvía `localhost` automáticamente).

> Variables opcionales: `PORT=4300 npm run lab` cambia el puerto de la PWA y `API_URL=http://localhost:8081 npm run lab` el de la API.

## 6. Casos de prueba

Antes de empezar, guarda el estado inicial de la base:

```bash
psql -U fatfish -h localhost -d fatfish -f fat-fish-pwa/docs/laboratorio-pruebas/sql/03_consultas.sql
```

| ID      | Caso                                       | Pasos                                                                                                                                                                       | Resultado esperado                                                                                                                                                                                                                          | Evidencia                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LAB-01  | Consulta y renderizado                     | Abrir **Expediente**, que lleva al buscador (`/acceso`), buscar `1` (o `ManoDeHierro`) y elegir al jugador                                                                  | Alias `ManoDeHierro` con `ID #1`, 4 tarjetas de estadísticas y las 10 partidas más recientes; la consola muestra los dos GET, su tiempo y el tiempo de renderizado                                                                          | [`ui-01-expediente-en-linea.png`](./evidencias/ui-01-expediente-en-linea.png), [`consola-navegador.txt`](./evidencias/consola-navegador.txt), [`backend-spring-boot.log.txt`](./evidencias/backend-spring-boot.log.txt)                                                                                                                                                                                   |
| LAB-01b | Paginación                                 | Clic en **Ver más partidas**                                                                                                                                                | Se agregan las 4 partidas restantes (`GET …&pagina=1`) y el texto cambia a "14 de 14 partidas"                                                                                                                                              | [`ui-01b-ver-mas-partidas.png`](./evidencias/ui-01b-ver-mas-partidas.png), [`consola-navegador.txt`](./evidencias/consola-navegador.txt)                                                                                                                                                                                                                                                                  |
| LAB-01c | Jugador sin partidas y jugador inexistente | En **Buscar otro jugador** (`/acceso`), buscar `5` y luego `999`                                                                                                            | `recien_llegado` muestra "Este jugador todavía no tiene partidas"; `999` muestra **Sin resultados** y el Crupier responde "No tengo a nadie llamado «999»…" (`99` no sirve: coincide con el alias `TodoONada99`)                            | —                                                                                                                                                                                                                                                                                                                                                                                                         |
| LAB-02  | Envío en línea                             | En `/opinion/retroalimentacion`, enviar un mensaje de 10 o más caracteres                                                                                                   | Aviso "Tu mensaje se guardó en el servidor"; en PostgreSQL aparece la fila nueva                                                                                                                                                            | [`ui-02-retroalimentacion-en-linea.png`](./evidencias/ui-02-retroalimentacion-en-linea.png), [`bd-02-despues.txt`](./evidencias/bd-02-despues.txt)                                                                                                                                                                                                                                                        |
| LAB-03  | Validación                                 | Enviar un mensaje de menos de 10 caracteres                                                                                                                                 | Se rechaza en la PWA; la API también responde `400` si se le envía directo                                                                                                                                                                  | —                                                                                                                                                                                                                                                                                                                                                                                                         |
| LAB-04  | Envío sin conexión                         | DevTools → Network → **Offline**; enviar otro mensaje                                                                                                                       | Aviso "Guardado en tu dispositivo"; en DevTools → Application → IndexedDB → `fatfish-pwa` → `outbox` el registro tiene `estado: "PENDIENTE"` e `intentos: 0`; la base no cambia                                                             | [`ui-03-retroalimentacion-sin-conexion.png`](./evidencias/ui-03-retroalimentacion-sin-conexion.png), [`devtools-04a-indexeddb-pendiente.png`](./evidencias/devtools-04a-indexeddb-pendiente.png), [`almacenamiento-sin-conexion.json`](./evidencias/almacenamiento-sin-conexion.json)                                                                                                                     |
| LAB-05  | Historial sin conexión                     | En línea, buscar `1` para que la app vuelva a recordar a `ManoDeHierro` (LAB-01c la dejó en el `5`); luego, con Offline activo, abrir **Expediente** (`/perfil`) y recargar | La app abre y muestra el perfil y las partidas desde Cache Storage, con el aviso "Sin conexión" y la fecha de los datos                                                                                                                     | [`ui-04-expediente-sin-conexion.png`](./evidencias/ui-04-expediente-sin-conexion.png)                                                                                                                                                                                                                                                                                                                     |
| LAB-06  | Sincronización                             | Quitar Offline (en cualquier página: la app envía lo pendiente al reconectar) y volver a abrir DevTools → Application → IndexedDB → `fatfish-pwa` → `outbox`                | La consola muestra "Conexión recuperada" y "Sincronizando outbox"; en IndexedDB el mismo registro pasa a `estado: "ENVIADO"` con su `idServidor`; en PostgreSQL aparece **una sola vez**                                                    | [`devtools-04b-indexeddb-enviado.png`](./evidencias/devtools-04b-indexeddb-enviado.png), [`devtools-01b-network-headers.png`](./evidencias/devtools-01b-network-headers.png), [`almacenamiento-tras-reconectar.json`](./evidencias/almacenamiento-tras-reconectar.json), [`bd-02-despues.txt`](./evidencias/bd-02-despues.txt), [`backend-spring-boot.log.txt`](./evidencias/backend-spring-boot.log.txt) |
| LAB-07  | Integridad                                 | Correr [`03_consultas.sql`](./sql/03_consultas.sql) y `\d retroalimentacion`                                                                                                | La consulta 5 sale vacía (sin claves repetidas); la tabla tiene llave primaria, `unique` en `clave_idempotencia` y `check` en `categoria`, `componente` y el mínimo de 10 caracteres de `mensaje`, que impiden datos inválidos o duplicados | [`bd-02-despues.txt`](./evidencias/bd-02-despues.txt), [`bd-03-estructura.txt`](./evidencias/bd-03-estructura.txt)                                                                                                                                                                                                                                                                                        |

Al terminar, compara con el estado inicial:

```bash
psql -U fatfish -h localhost -d fatfish -f fat-fish-pwa/docs/laboratorio-pruebas/sql/03_consultas.sql
```

## 7. Evidencias

> Las evidencias de la entrega del 17 de octubre de 2026 están en [`evidencias/2026-10/`](./evidencias/2026-10/), con la interfaz y los datos de entonces (bandeja de envíos en la PWA, jugadores con los nombres del equipo y el expediente abierto con el ID 1). Las de [`evidencias/`](./evidencias/) son de la corrida actual.

Se agrupan con las mismas categorías que pide la práctica.

### 7.1 Persistencia y base de datos (backend y DB)

#### Scripts de carga y limpieza

Los scripts están en [`sql/`](./sql/) (descritos en [Contenido de esta carpeta](#2-contenido-de-esta-carpeta)).

| Archivo                                                                 | Qué demuestra                                                                                                                                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`bd-00-limpieza-y-carga.txt`](./evidencias/bd-00-limpieza-y-carga.txt) | Ejecución de [`01_limpieza.sql`](./sql/01_limpieza.sql) y [`02_carga.sql`](./sql/02_carga.sql): tablas vacías y luego 28 jugadores, 107 partidas, 6 retroalimentaciones y 8 encuestas |

#### Consultas antes y después del registro

| Archivo                                                     | Qué demuestra                                                                                                                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`bd-01-antes.txt`](./evidencias/bd-01-antes.txt)           | Salida de [`03_consultas.sql`](./sql/03_consultas.sql) **antes** de usar la PWA: 6 retroalimentaciones                                                             |
| [`bd-02-despues.txt`](./evidencias/bd-02-despues.txt)       | La misma consulta **después**: 8 retroalimentaciones (la `7`, enviada en línea, y la `8`, que se sincronizó al reconectar), cada una con su clave y sin duplicados |
| [`bd-03-estructura.txt`](./evidencias/bd-03-estructura.txt) | Estructura de `retroalimentacion` (`\d retroalimentacion`): columnas y tipos, llave primaria, `unique` de `clave_idempotencia` y las restricciones `check`         |

#### Logs del servidor backend (Spring Boot)

| Archivo                                                                   | Qué demuestra                                                                                                                                                              |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`backend-spring-boot.log.txt`](./evidencias/backend-spring-boot.log.txt) | Cada `GET` y `POST` con su código de respuesta, tiempo, tamaño de petición y respuesta y memoria (heap); el SQL con sus parámetros y las métricas JDBC de cada transacción |

### 7.2 Frontend y comportamiento PWA

#### Capturas de la interfaz

| Archivo                                                                                             | Caso    | Qué muestra                                                                                            |
| --------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------ |
| [`ui-01-expediente-en-linea.png`](./evidencias/ui-01-expediente-en-linea.png)                       | LAB-01  | El expediente de `ManoDeHierro` renderizado tras los `GET`: 4 tarjetas y las 10 partidas más recientes |
| [`ui-01b-ver-mas-partidas.png`](./evidencias/ui-01b-ver-mas-partidas.png)                           | LAB-01b | Las 14 partidas tras **Ver más partidas**                                                              |
| [`ui-02-retroalimentacion-en-linea.png`](./evidencias/ui-02-retroalimentacion-en-linea.png)         | LAB-02  | Aviso "Tu mensaje se guardó en el servidor"                                                            |
| [`ui-03-retroalimentacion-sin-conexion.png`](./evidencias/ui-03-retroalimentacion-sin-conexion.png) | LAB-04  | Aviso "Guardado en tu dispositivo" sin conexión                                                        |
| [`ui-04-expediente-sin-conexion.png`](./evidencias/ui-04-expediente-sin-conexion.png)               | LAB-05  | El expediente sin conexión desde Cache Storage, con el aviso "Sin conexión" y la fecha de los datos    |

#### DevTools: Network

| Archivo                                                                             | Qué muestra                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`devtools-01a-network.png`](./evidencias/devtools-01a-network.png)                 | `perfil`, `partidas` y `retroalimentacion` con su código (`200` y `201`); cada petición aparece dos veces: la de la página y la del service worker (⚙)                                                                                                                   |
| [`devtools-01b-network-headers.png`](./evidencias/devtools-01b-network-headers.png) | **Headers** del `POST` sincronizado al reconectar: `Location: /api/pwa/retroalimentacion/8` y la misma `Idempotency-Key` del registro en IndexedDB                                                                                                                       |
| [`devtools-01c-network-timing.png`](./evidencias/devtools-01c-network-timing.png)   | **Timing** del mismo `POST`: arranque del service worker, `respondWith`, espera del servidor y total (~27 ms)                                                                                                                                                            |
| [`devtools-01d-network-tamanos.png`](./evidencias/devtools-01d-network-tamanos.png) | Columnas **Size** y **Time** de los `GET` del expediente: `perfil` (0.5 kB) y `partidas` páginas 0 y 1 (2.1 kB y 1.0 kB), entre 24 y 41 ms. Las filas con ⚙ son las del service worker hacia la API; las que dicen _(ServiceWorker)_ son las que la página recibió de él |

#### DevTools: Application (service worker, almacenamiento y sincronización)

| Archivo                                                                                     | Qué muestra                                                                                                           |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [`devtools-02-service-worker.png`](./evidencias/devtools-02-service-worker.png)             | **Service workers**: `ngsw-worker.js` _activated and is running_                                                      |
| [`devtools-03-cache-storage.png`](./evidencias/devtools-03-cache-storage.png)               | **Cache storage**: `ngsw:/:1:data:api-expediente:cache` con las respuestas de `perfil` y `partidas`                   |
| [`devtools-04a-indexeddb-pendiente.png`](./evidencias/devtools-04a-indexeddb-pendiente.png) | **IndexedDB → fatfish-pwa → outbox**: el envío sin conexión con `estado: "PENDIENTE"` e `intentos: 0`                 |
| [`devtools-04b-indexeddb-enviado.png`](./evidencias/devtools-04b-indexeddb-enviado.png)     | El mismo envío tras reconectar: `estado: "ENVIADO"`, `intentos: 2` (cuenta cada intento de envío) e `idServidor: "8"` |
| [`almacenamiento-sin-conexion.json`](./evidencias/almacenamiento-sin-conexion.json)         | Volcado de Cache Storage e IndexedDB sin conexión                                                                     |
| [`almacenamiento-tras-reconectar.json`](./evidencias/almacenamiento-tras-reconectar.json)   | El mismo volcado tras reconectar                                                                                      |

> En DevTools, la vista de IndexedDB no siempre se actualiza con ⟳: si un registro sigue en `PENDIENTE` aunque la consola ya muestre `POST … OK`, cierra y vuelve a abrir DevTools.

#### DevTools: Console

| Archivo                                                           | Qué muestra                                                                                                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`devtools-05-console.png`](./evidencias/devtools-05-console.png) | Consola con el filtro `[FatFish]`: inicio de la PWA con el service worker activo, los dos `GET` del expediente con su tiempo y el renderizado          |
| [`consola-navegador.txt`](./evidencias/consola-navegador.txt)     | La consola completa de la corrida: búsqueda, consulta, renderizado, paginación, envío en línea, envío sin conexión y carga del expediente sin conexión |

## 8. Solución de problemas

| Síntoma                                                                 | Causa y solución                                                                                                                                |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `relation "retroalimentacion" does not exist` al cargar datos           | La API no ha arrancado todavía: Flyway crea las tablas al iniciar (paso 3)                                                                      |
| La API no arranca: `Validate failed: Migrations have failed validation` | La base se creó con el esquema anterior. Vuelve a ejecutar [`00_crear_bd.sql`](./sql/00_crear_bd.sql) (borra y crea las bases) y arranca la API |
| La PWA muestra "No pudimos consultar tu expediente"                     | La API no está corriendo en el puerto 8080; revisa la terminal del paso 3                                                                       |
| Buscar `1` o `ManoDeHierro` en `/acceso` da **Sin resultados**          | Faltan los datos de prueba: ejecuta el paso 4                                                                                                   |
| `Port 8080 was already in use`                                          | Otro proceso usa el puerto; ciérralo o usa `SERVER_PORT=8081` y `API_URL=http://localhost:8081 npm run lab`                                     |
| El menú dice "Service worker: inactivo"                                 | Se abrió con `ng serve`; usa `npm run lab`                                                                                                      |
| Se ve una versión vieja de la PWA                                       | DevTools → Application → Service workers → **Update** (o _Unregister_ y recargar)                                                               |
| `password authentication failed for user "fatfish"`                     | Repite el paso 2 o indica la contraseña con `DB_PASSWORD`                                                                                       |
