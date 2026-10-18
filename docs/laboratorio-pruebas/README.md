# Laboratorio de pruebas · PWA + API + PostgreSQL

Banco de pruebas de la PWA de **Fat Fish** conectada a la API (Spring Boot) y a PostgreSQL 17. Verifica:

1. La **consulta** de información (`GET /api/pwa/perfil` y `GET /api/pwa/partidas`) y su **renderizado** en la PWA.
2. La **persistencia** de nuevos registros (`POST /api/pwa/retroalimentacion`) en PostgreSQL, con su estructura e integridad.
3. El **comportamiento sin conexión**: el historial se sirve desde la caché del service worker y los envíos sin red esperan en IndexedDB hasta reconectar, sin duplicarse.

Equipo: Anuma Games (IDGS101N). Los datos son **simulados** (scripts de la carpeta `sql/`).


## Tablas que usa el laboratorio

La migración `V1` de la API crea el esquema completo con `id` numérico; el diagrama y la descripción de cada tabla están en la [sección 3 del README de la PWA](../../README.md#3-modelo-de-datos). El laboratorio usa estas:

| Tabla | Uso en el laboratorio |
|---|---|
| `jugador` | 5 jugadores de prueba (`id` 1 a 5) |
| `estadistica_jugador` | Totales de cada jugador; de aquí salen las 4 tarjetas del perfil |
| `partida` | Historial de cada jugador (la PWA solo lo lee) |
| `partida_comodin` | Comodines comprados y usados en algunas partidas (la PWA todavía no los muestra) |
| `retroalimentacion` | Lo que se envía desde la PWA; `clave_idempotencia` evita guardar dos veces el mismo envío |

**¿Por qué `clave_idempotencia` es un UUID?** La genera el navegador (`crypto.randomUUID()`) en el momento del envío, incluso sin conexión, cuando todavía no puede pedirle un número al servidor. Si cada dispositivo numerara 1, 2, 3…, dos dispositivos tendrían un "envío 1" y la API descartaría uno pensando que es un reintento. El UUID no se repite y viaja en la cabecera `Idempotency-Key`. El `id` de cada fila sigue siendo el número que asigna PostgreSQL; en los datos de prueba la clave la genera `gen_random_uuid()`.

> En el juego, los jugadores se registran con alias y contraseña y envían sus partidas a `/api/juego` (ver el README de la API). En el laboratorio se cargan con `02_carga.sql`: los 5 jugadores tienen la contraseña de prueba `fatfish2026`.

## Contenido de esta carpeta

| Ruta | Qué es |
|---|---|
| `sql/00_crear_bd.sql` | Crea el usuario `fatfish` y las bases `fatfish` y `fatfish_test` (borra las anteriores) |
| `sql/01_limpieza.sql` | Vacía las tablas (excepto el catálogo de comodines) y reinicia los `id` |
| `sql/02_carga.sql` | Datos de prueba: 5 jugadores (los integrantes del equipo, `id` 1 a 5) con sus estadísticas, 18 partidas, 6 registros de comodines y 2 retroalimentaciones |
| `sql/03_consultas.sql` | Consultas de verificación para correr antes y después de usar la PWA |
| `evidencias/` | Salidas de `psql`, logs de Spring Boot, consola del navegador, capturas y volcados de Cache Storage e IndexedDB |

## Arquitectura del laboratorio

```
Navegador (Chrome)                         http://localhost:4200
 ├─ PWA Angular (build de producción) ── service worker: precaché + caché del historial
 │                                        IndexedDB: bandeja de salida (outbox) de envíos
 └─ /api/pwa/** ──▶ scripts/lab-server.mjs (mismo origen, sin CORS) ──▶ API Spring Boot :8080 ──▶ PostgreSQL 17 :5432
```

- La PWA y la API se ven en el **mismo origen**, como en producción: por eso no hace falta CORS y el service worker funciona (`localhost` cuenta como origen seguro).
- El service worker **solo** se activa con el build de producción (`npm run lab`); con `ng serve` no se registra.

## Requisitos

| Herramienta | Versión | Comprobar |
|---|---|---|
| PostgreSQL | 17 | `psql --version` |
| JDK | 21 | `java -version` |
| Node.js | 24 (incluye npm) | `node -v` |
| Git | cualquiera reciente | `git --version` |
| Google Chrome | reciente | Para DevTools |

No se necesita Docker ni instalar Maven (la API trae Maven Wrapper).

## Pasos

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

La salida termina con `select * from jugador`: 1 `jesus` (12 partidas), 2 `emmanuel` (3), 3 `angel` (1), 4 `luis` (2) y 5 `andrik` (sin partidas). Para repetir el laboratorio desde cero, vuelve a ejecutar estos dos scripts.

### 5. Levantar la PWA

```bash
cd fat-fish-pwa
npm ci
npm run lab
```

`npm run lab` compila la PWA en modo producción y la sirve en **http://localhost:4200**, reenviando `/api` a la API en `http://localhost:8080`. Abre esa dirección en Chrome (en WSL, desde el Chrome de Windows: WSL reenvía `localhost` automáticamente).

> Variables opcionales: `PORT=4300 npm run lab` cambia el puerto de la PWA y `API_URL=http://localhost:8081 npm run lab` el de la API.

## Casos de prueba

Antes de empezar, guarda el estado inicial de la base:

```bash
psql -U fatfish -h localhost -d fatfish -f fat-fish-pwa/docs/laboratorio-pruebas/sql/03_consultas.sql
```

| ID | Caso | Pasos | Resultado esperado | Evidencia |
|---|---|---|---|---|
| LAB-01 | Consulta y renderizado | Abrir `/perfil` (Expediente; ya trae el ID `1`, del jugador `jesus`) | Alias `jesus` con `ID #1`, 4 tarjetas de estadísticas y las 10 partidas más recientes; la consola muestra los dos GET, su tiempo y el tiempo de renderizado | `ui-01-expediente-en-linea.png`, `consola-navegador.txt`, `backend-spring-boot.log.txt` |
| LAB-01b | Paginación | Clic en **Ver más partidas** | Se agregan las 2 partidas restantes (`GET …&pagina=1`) y el texto cambia a "12 de 12 partidas" | `ui-01b-ver-mas-partidas.png`, `consola-navegador.txt` |
| LAB-01c | Jugador sin partidas y jugador inexistente | Buscar `5` y luego `99` | `andrik` muestra "Este jugador todavía no tiene partidas"; `99` muestra "No encontramos a ningún jugador…" (`404`) | — |
| LAB-02 | Envío en línea | En `/opinion/retroalimentacion`, enviar un mensaje de 10 o más caracteres | Aviso "Tu mensaje se guardó en el servidor"; estado `ENVIADO` con su ID; en PostgreSQL aparece la fila nueva | `ui-02-retroalimentacion-en-linea.png`, `bd-02-despues.txt` |
| LAB-03 | Validación | Enviar un mensaje de menos de 10 caracteres | Se rechaza en la PWA; la API también responde `400` si se le envía directo | — |
| LAB-04 | Envío sin conexión | DevTools → Network → **Offline**; enviar otro mensaje | Aviso "Guardado en tu dispositivo"; estado `PENDIENTE` en la tabla y en IndexedDB (`fatfish-pwa` → `outbox`); la base no cambia | `ui-03-retroalimentacion-sin-conexion.png`, `almacenamiento-sin-conexion.json` |
| LAB-05 | Historial sin conexión | Con Offline activo, abrir `/perfil` y recargar | La app abre y muestra el perfil y las partidas desde Cache Storage, con el aviso "Sin conexión" y la fecha de los datos | `ui-04-expediente-sin-conexion.png` |
| LAB-06 | Sincronización | Quitar Offline | La consola muestra "Sincronizando outbox"; el registro pasa a `ENVIADO`; en PostgreSQL aparece **una sola vez** | `ui-05-retroalimentacion-sincronizada.png`, `almacenamiento-tras-reconectar.json`, `bd-02-despues.txt` |
| LAB-07 | Integridad | Correr `03_consultas.sql` | La consulta 5 sale vacía (sin claves repetidas); las restricciones `check` y `unique` de la tabla impiden datos inválidos o duplicados | `bd-02-despues.txt` |

Al terminar, compara con el estado inicial:

```bash
psql -U fatfish -h localhost -d fatfish -f fat-fish-pwa/docs/laboratorio-pruebas/sql/03_consultas.sql
```

## Evidencias

### Incluidas en `evidencias/` (generadas en macOS con Chrome)

| Archivo | Qué demuestra |
|---|---|
| `bd-00-limpieza-y-carga.txt` | Ejecución de los scripts de limpieza y carga |
| `bd-01-antes.txt` | Estado de la base **antes** de usar la PWA (2 retroalimentaciones) |
| `bd-02-despues.txt` | Estado **después**: 4 retroalimentaciones (la `3`, enviada en línea, y la `4`, que se sincronizó al reconectar), cada una con su clave y sin duplicados |
| `backend-spring-boot.log.txt` | Logs de Spring Boot: `GET` y `POST` con código, tiempo, tamaño de petición y respuesta, memoria (heap), SQL con parámetros y métricas JDBC de cada transacción |
| `consola-navegador.txt` | Consola del navegador durante la consulta, el renderizado, el envío sin conexión y la sincronización |
| `ui-01-*.png` a `ui-05-*.png` | Capturas de la interfaz en cada caso (ver tabla de casos) |
| `almacenamiento-*.json` | Contenido de Cache Storage e IndexedDB sin conexión y tras reconectar |

### Capturas de DevTools (Chrome, tomadas a mano)

Se tomaron en una corrida aparte de las evidencias automáticas, con el esquema anterior; por eso las retroalimentaciones llegan hasta el `id` 6. Lo que muestran (Network, service worker, Cache Storage, IndexedDB y consola) no cambió con el esquema actual.

| Archivo | Pestaña | Qué muestra |
|---|---|---|
| `devtools-01a-network.png` | **Network** (`Fetch/XHR`) | `perfil`, `partidas` (página 0 y 1) y `retroalimentacion` con código (`200`/`201`), tamaño y tiempo; cada petición aparece dos veces: la de la página y la del service worker (⚙) |
| `devtools-01b-network-headers.png` | **Network → Headers** | El `POST` con `201 Created`, `Location: /api/pwa/retroalimentacion/3` y la cabecera `Idempotency-Key` |
| `devtools-01c-network-timing.png` | **Network → Timing** | Tiempo del `POST`: arranque del service worker, espera del servidor y total (~20 ms) |
| `devtools-02-service-worker.png` | **Application → Service workers** | `ngsw-worker.js` *activated and is running* |
| `devtools-03-cache-storage.png` | **Application → Cache storage** | Caché `ngsw:/:1:data:api-expediente:cache` con las respuestas de `perfil` y `partidas` |
| `devtools-04a-indexeddb-pendiente.png` | **Application → IndexedDB → fatfish-pwa → outbox** | Envío sin conexión con `estado: "PENDIENTE"` e `intentos: 0` |
| `devtools-04b-indexeddb-enviado.png` | **Application → IndexedDB → outbox** | El mismo envío tras reconectar: `estado: "ENVIADO"`, `intentos: 1`, `idServidor: "5"` |
| `devtools-05-console.png` | **Console** (filtro `[FatFish]`) | GET con tiempos, renderizado, paginación, envío guardado en IndexedDB, sincronización y `POST … OK` |

> En DevTools, la vista de IndexedDB no siempre se actualiza con ⟳: si un registro sigue en `PENDIENTE` aunque la PWA ya diga `ENVIADO`, cierra y vuelve a abrir DevTools.

## Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `relation "retroalimentacion" does not exist` al cargar datos | La API no ha arrancado todavía: Flyway crea las tablas al iniciar (paso 3) |
| La API no arranca: `Validate failed: Migrations have failed validation` | La base se creó con el esquema anterior. Vuelve a ejecutar `00_crear_bd.sql` (borra y crea las bases) y arranca la API |
| La PWA muestra "No pudimos consultar tu expediente" | La API no está corriendo en el puerto 8080; revisa la terminal del paso 3 |
| La PWA muestra "No encontramos a ningún jugador…" con el ID 1 | Faltan los datos de prueba: ejecuta el paso 4 |
| `Port 8080 was already in use` | Otro proceso usa el puerto; ciérralo o usa `SERVER_PORT=8081` y `API_URL=http://localhost:8081 npm run lab` |
| El menú dice "Service worker: inactivo" | Se abrió con `ng serve`; usa `npm run lab` |
| Se ve una versión vieja de la PWA | DevTools → Application → Service workers → **Update** (o *Unregister* y recargar) |
| `password authentication failed for user "fatfish"` | Repite el paso 2 o indica la contraseña con `DB_PASSWORD` |
