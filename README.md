# Fat Fish – PWA del videojuego

[![CI](https://github.com/Anuma-Games/fat-fish-pwa/actions/workflows/ci.yml/badge.svg)](https://github.com/Anuma-Games/fat-fish-pwa/actions/workflows/ci.yml)

Aplicación web progresiva (PWA) del proyecto integrador **Fat Fish**, del equipo Anuma Games (IDGS101N, Universidad Tecnológica de Chihuahua). Está hecha con Angular, un Service Worker y un manifiesto de aplicación web, y se conecta a la API del proyecto ([fat-fish-api](https://github.com/Anuma-Games/fat-fish-api)).

Este documento reúne la **propuesta de diseño** de la PWA y el **estado actual** de su construcción. Las pruebas de integración con la base de datos están en el [laboratorio de pruebas](docs/laboratorio-pruebas/README.md).

## Contenido

1. [Propósito](#1-propósito)
2. [Estado actual](#2-estado-actual)
3. [Cómo ejecutarla](#3-cómo-ejecutarla)
4. [Arquitectura](#4-arquitectura)
5. [Modelo de datos](#5-modelo-de-datos)
6. [Consumo de API](#6-consumo-de-api)
7. [Estrategia PWA](#7-estrategia-pwa)
8. [Experiencia de usuario (UI/UX)](#8-experiencia-de-usuario-uiux)
9. [Diagramas de la aplicación](#9-diagramas-de-la-aplicación)
10. [Integración continua y flujo de trabajo](#10-integración-continua-y-flujo-de-trabajo)
11. [Equipo](#11-equipo)

### Dónde se cumple cada requisito

| Actividad                | Requisito                                                  | Sección                                                                                                                   |
|--------------------------|------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| Diseño preproyecto       | Consumo de API y listas dinámicas                          | [6](#6-consumo-de-api)                                                                                                    |
| Diseño preproyecto       | Service Worker y manifiesto (sin conexión y segundo plano) | [7](#7-estrategia-pwa)                                                                                                    |
| Diseño preproyecto       | Estructura modular (JS/CSS) y diseño adaptativo            | [4.2](#42-capas-del-código) y [8](#8-experiencia-de-usuario-uiux)                                                         |
| Diseño preproyecto       | Diagramas de la aplicación                                 | [4](#4-arquitectura), [5](#5-modelo-de-datos) y [9](#9-diagramas-de-la-aplicación)                                        |
| Laboratorio de pruebas 1 | Scripts de carga y limpieza                                | [`sql/`](docs/laboratorio-pruebas/sql)                                                                                    |
| Laboratorio de pruebas 1 | Consultas antes y después, logs del backend                | [Evidencias](docs/laboratorio-pruebas/README.md#evidencias)                                                               |
| Laboratorio de pruebas 1 | Interfaz y DevTools (Network, Application, Console)        | [Casos de prueba](docs/laboratorio-pruebas/README.md#casos-de-prueba) y [evidencias](docs/laboratorio-pruebas/evidencias) |

---

## 1. Propósito

Fat Fish es un videojuego de ruleta que trata el tema de la **ludopatía**. Dentro del juego se habla de "invertir", nunca de "apostar", y el dinero es ficticio. El juego registra cada partida, pero no es el mejor lugar para analizar esos datos ni para recibir opiniones; la PWA cubre ese hueco como un canal web complementario.

La PWA cierra el ciclo **jugar → registrar → reflexionar → opinar**:

| Rol                     | Qué ofrece                                                                                                                                                             |
|-------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Espejo de datos         | El expediente *"Lo que el casino sabe de ti"*: estadísticas e historial del jugador presentados como el perfil que un casino construye de sus clientes, no como logros |
| Competencia social      | Ranking mundial con el mejor puntaje de cada jugador                                                                                                                   |
| Canal de opinión        | Retroalimentación y reporte de errores                                                                                                                                 |
| Investigación           | Encuesta anónima sobre la percepción del juego y la ludopatía                                                                                                          |
| Referencia *(deseable)* | Wiki del juego disponible sin conexión                                                                                                                                 |

La PWA solo lee datos del juego y solo inserta opiniones. No registra jugadores ni partidas, no maneja contraseñas y no permite jugar. El jugador se identifica con su **ID público**, sin iniciar sesión.

---

## 2. Estado actual

| Función                                                                   | Estado                   |
|---------------------------------------------------------------------------|--------------------------|
| Expediente por ID: estadísticas e historial paginado ("Ver más partidas") | ✅ Construido            |
| Retroalimentación con envío sin conexión (outbox en IndexedDB)            | ✅ Construido            |
| Service Worker: precaché de la app y caché del expediente                 | ✅ Construido            |
| Manifiesto e instalación                                                  | ✅ Construido            |
| Diseño adaptativo (teléfono, tableta y escritorio)                        | ✅ Construido            |
| Imagen de Docker con Nginx y Docker Compose (PWA + API + PostgreSQL)      | ✅ Construido            |
| Búsqueda por alias                                                        | ⏳ Pendiente para el MVP |
| Ranking mundial                                                           | ⏳ Pendiente para el MVP |
| Encuesta anónima                                                          | ⏳ Pendiente para el MVP |
| Aviso de versión nueva y Background Sync                                  | ⏳ Pendiente para el MVP |
| Wiki                                                                      | ⏳ Deseable              |
| Publicación en Google Cloud                                               | ⏳ Por definir           |

---

## 3. Cómo ejecutarla

**Con Docker (recomendado).** Requiere Docker Desktop y el repositorio `fat-fish-api` clonado junto a este. Levanta PostgreSQL, la API y la PWA:

```bash
docker compose up -d --build
docker compose exec -T postgres psql -U fatfish -d fatfish < docs/laboratorio-pruebas/sql/02_carga.sql
```

La PWA queda en <http://localhost:8080> y la documentación de la API en <http://localhost:8081/swagger-ui.html>. Los datos de prueba se cargan cuando la API ya creó las tablas. Para detener todo se usa `docker compose down` (con `-v` también se borra la base).

**Sin Docker.** Con la API corriendo en el puerto 8080:

| Comando       | Uso                                                                        |
|---------------|----------------------------------------------------------------------------|
| `npm start`   | Servidor de desarrollo con proxy a `/api` (el Service Worker no se activa) |
| `npm run lab` | Build de producción con Service Worker, como en el laboratorio de pruebas  |
| `npm test`    | Pruebas                                                                    |

**Imagen de Docker.** El [`Dockerfile`](Dockerfile) tiene dos etapas: Node compila la PWA y Nginx, sin permisos de administrador, la sirve en el puerto 8080. Nginx también reenvía `/api` a la API, de modo que el navegador ve un solo origen y no se necesita CORS. La configuración está en [`docker/nginx/default.conf.template`](docker/nginx/default.conf.template).

| Variable  | Valor por defecto | Uso                                                                                 |
|-----------|-------------------|-------------------------------------------------------------------------------------|
| `API_URL` | `http://api:8080` | Dirección de la API                                                                 |
| `API_KEY` | vacía             | Llave que Nginx envía a la API en la cabecera `X-Api-Key`; nunca llega al navegador |

---

## 4. Arquitectura

### 4.1 Vista general

![Vista general de la arquitectura](docs/diagramas/arquitectura.png)

- **Un solo origen.** La PWA consume la API con rutas relativas (`/api/pwa/...`), por lo que no requiere CORS. En la propuesta, el mismo contenedor sirve la PWA y la API; en el laboratorio, Nginx cumple ese papel con un proxy hacia la API. El alojamiento definitivo en Google Cloud está por definir.
- **El Service Worker atiende todas las peticiones** y decide qué responder desde la caché y qué pedir a la red ([7](#7-estrategia-pwa)).
- **Angular moderno:** componentes *standalone* y *signals* para el estado.

### 4.2 Capas del código

El código se organiza en capas; cada una tiene una sola responsabilidad y solo depende de la capa interior.

```
src/app/
├── presentation/      # páginas (Expediente y Opinión) y componentes reutilizables
├── application/       # fachadas: casos de uso y estado con signals
├── domain/            # modelos y puertos (interfaces de los repositorios)
├── infrastructure/    # implementación de los puertos: API, IndexedDB, localStorage, conectividad
└── core/              # configuración común
```

```
presentation  →  application  →  domain  ←  infrastructure
```

- Las páginas solo hablan con las fachadas.
- Las fachadas usan los **puertos** del dominio (`PerfilRepository`, `PartidaRepository`, `RetroalimentacionRepository`, `OutboxRepository`, `SesionRepository` y `Conectividad`) y no saben si los datos vienen de HTTP, de la caché o de IndexedDB.
- `app.config.ts` enlaza cada puerto con su implementación en `infrastructure`.
- Los estilos son modulares: variables de diseño en `src/styles/tokens.css` y estilos propios en cada componente ([8.4](#84-estructura-modular-y-diseño-adaptativo)).

Recorrido de una consulta:

```
Página → Fachada → Puerto → Repositorio HTTP → /api/pwa/...
Página ← Fachada (signal) ← Modelo ← DTO ←───────┘
```

---

## 5. Modelo de datos

La base de datos pertenece a la API; la PWA solo usa algunas tablas.

![Modelo de datos](docs/diagramas/modelo-datos.png)

| Tabla                        | Uso en la PWA                                                                                              |
|------------------------------|------------------------------------------------------------------------------------------------------------|
| `jugador`                    | Lectura de `id`, `alias`, fecha de alta y última actividad. La contraseña y el token nunca salen de la API |
| `estadistica_jugador`        | Lectura de las estadísticas del expediente y, después, del ranking                                         |
| `partida`                    | Lectura del historial                                                                                      |
| `retroalimentacion`          | Inserción. `clave_idempotencia` evita guardar dos veces el mismo envío                                     |
| `encuesta`                   | Inserción anónima (pendiente)                                                                              |
| `comodin`, `partida_comodin` | Sin uso por ahora                                                                                          |

El `id` del jugador lo genera la API y es único; el alias se puede repetir. Todas las fechas se guardan en UTC.

---

## 6. Consumo de API

### 6.1 Endpoints

| Endpoint                                    | Uso                                                                | Estado       |
|---------------------------------------------|--------------------------------------------------------------------|--------------|
| `GET /api/pwa/perfil?id=`                   | Datos del jugador y sus estadísticas                               | ✅ En uso    |
| `GET /api/pwa/partidas?id=&pagina=&tamano=` | Historial paginado, de la partida más reciente a la más antigua    | ✅ En uso    |
| `POST /api/pwa/retroalimentacion`           | Envía categoría, componente y mensaje (mínimo 10 caracteres)       | ✅ En uso    |
| `GET /api/pwa/jugadores?busqueda=`          | Busca por alias o ID; devuelve una lista porque el alias se repite | ⏳ Pendiente |
| `GET /api/pwa/ranking?pagina=&jugadorId=`   | Top 50 en páginas de 10 y la posición propia                       | ⏳ Pendiente |
| `POST /api/pwa/encuesta`                    | Encuesta anónima con tres escalas del 1 al 5 y un comentario       | ⏳ Pendiente |

Reglas comunes:

- JSON en UTF-8, fechas ISO-8601 en UTC y nombres de campo en español (`camelCase`).
- El ID del jugador viaja en la URL. Es un dato público y así el Service Worker puede usar la URL como llave de la caché.
- Los `POST` llevan la cabecera `Idempotency-Key` con un UUID generado en el dispositivo; si el envío se repite, la API devuelve el registro existente en lugar de duplicarlo.
- Las listas paginadas indican si hay más páginas (`ultima`) y cuándo se generaron (`generadoEn`), para mostrar la antigüedad de los datos sin conexión.

### 6.2 De la respuesta a la lista en pantalla

La infraestructura convierte cada respuesta (DTO) en un modelo del dominio, por ejemplo una partida del historial:

```ts
export interface Partida {
  id: string;
  resultado: 'VICTORIA' | 'DERROTA' | 'ABANDONO';
  rondaAlcanzada: number;
  puntaje: number;
  dineroInvertido: number;
  dineroGanado: number;
  dineroPerdido: number;
  duracionSeg: number;
  creadaEn: Date;
}
```

La fachada del historial guarda las partidas en una *signal* y la página las pinta como tarjetas en el teléfono o como tabla en pantallas grandes. **Ver más partidas** pide la página siguiente y la agrega a la lista hasta que la API indica que es la última.

---

## 7. Estrategia PWA

### 7.1 Manifiesto

[`public/manifest.webmanifest`](public/manifest.webmanifest) permite instalar la PWA en el teléfono o la computadora:

| Propiedad     | Valor                                                                             |
|---------------|-----------------------------------------------------------------------------------|
| Nombre        | "Fat Fish" con el lema "Lo que el casino sabe de ti"; en el ícono solo "Fat Fish" |
| Visualización | `standalone`: se abre como app, sin la barra del navegador                        |
| Íconos        | Logo del juego en 192 × 192 y 512 × 512                                           |
| Colores       | `#0B1416`, el fondo del casino                                                    |
| Idioma        | Español                                                                           |

### 7.2 Service Worker y caché

Se usa el Service Worker de Angular, configurado en [`ngsw-config.json`](ngsw-config.json). Solo se activa en el build de producción y requiere HTTPS o `localhost`.

| Recurso                          | Estrategia                                                                    | Vigencia                    |
|----------------------------------|-------------------------------------------------------------------------------|-----------------------------|
| Código de la app (HTML, JS, CSS) | Precaché al instalar                                                          | Hasta la siguiente versión  |
| Íconos, fuentes e imágenes       | Al primer uso                                                                 | Hasta la siguiente versión  |
| Perfil e historial               | Red primero; si la red falla o tarda más de 5 s, la última respuesta guardada | 7 días, hasta 30 respuestas |
| Envíos (`POST`)                  | Sin caché; se usa el outbox                                                   | —                           |

### 7.3 Sin conexión

| Sección           | Comportamiento sin red                                                                                                           |
|-------------------|----------------------------------------------------------------------------------------------------------------------------------|
| Abrir la app      | Abre desde la precaché                                                                                                           |
| Expediente        | Muestra los últimos datos consultados con el aviso "Sin conexión" y su fecha; si nunca se consultaron, avisa que se necesita red |
| Retroalimentación | Guarda el envío en el **outbox** (IndexedDB) y lo envía solo al volver la conexión                                               |
| Menú              | Indica si hay conexión y la fecha de la última sincronización                                                                    |

El outbox guarda cada envío con su UUID, el contenido, el número de intentos y su estado (`PENDIENTE`, `ENVIANDO`, `ENVIADO` o `FALLIDO`). Se vacía al recuperar la conexión y al abrir la sección de Opinión, con hasta 5 intentos. Como el UUID viaja en `Idempotency-Key`, un reintento nunca crea un duplicado.

### 7.4 Segundo plano y actualizaciones

El Service Worker funciona aparte de la página: descarga la app por adelantado y responde las consultas aunque no haya red. La propuesta agrega **Background Sync** para vaciar el outbox aun con la pestaña cerrada (solo existe en navegadores Chromium) y un aviso cuando hay una versión nueva; ambos están pendientes. Las notificaciones push quedan fuera de alcance.

---

## 8. Experiencia de usuario (UI/UX)

La PWA se ve como el casino clandestino del juego: fondo oscuro con un patrón de rombos, paño verde, detalles dorados y letras pixeladas. Colores, fuentes y logo salen del arte del juego en Unity.

### 8.1 Vistas

- **Consulta:** búsqueda por ID y expediente (estadísticas e historial). La propuesta suma el ranking.
- **Captura:** retroalimentación. La propuesta suma la encuesta anónima.

![Vistas en teléfono](docs/img/pantallas-telefono.jpg)

![Vistas de captura](docs/img/pantallas-captura.jpg)

### 8.2 Colores y tipografía

| Uso                                      | Valor                                                                                       |
|------------------------------------------|---------------------------------------------------------------------------------------------|
| Fondo                                    | `#0B1416` con el patrón [`patron-casino.svg`](docs/img/patron-casino.svg)                   |
| Paño (menú y botón principal)            | `#0D3522` y `#105030`                                                                       |
| Dorado (lo importante, foco del teclado) | `#E8B850`                                                                                   |
| Victoria / derrota                       | `#6FD39A` / `#882020`                                                                       |
| Texto                                    | `#F2E8CC` y `#9AA8A2`                                                                       |
| Fuentes                                  | **Jersey 10** (títulos y cifras), **Press Start 2P** (etiquetas cortas) y **Geist** (texto) |

Los textos tienen buen contraste y el resultado de una partida siempre se escribe (VICTORIA, DERROTA, ABANDONO), no se indica solo con color. Las fuentes están en `public/fonts/` para funcionar sin conexión.

![Colores y tipografía](docs/img/guia-colores-tipografia.jpg)

### 8.3 Componentes

La guía define botones, campos, fichas de estado, tarjetas de estadística, historial, menú lateral y avisos de conexión. Los íconos son pixel art de 12 × 12 hecho para la PWA (componente `pixel-icon`) y los controles miden al menos 44 px para tocarse con el dedo.

![Componentes base e íconos](docs/img/guia-componentes.jpg)

### 8.4 Estructura modular y diseño adaptativo

```
src/styles/
├── tokens.css    # colores, fuentes y espacios (variables --ff-*)
├── base.css      # estilos generales y fondo
└── layout.css    # menú, márgenes y puntos de quiebre
```

Los valores de diseño solo se escriben en `tokens.css`; cada componente tiene sus propios estilos y usa esas variables. El diseño parte del teléfono y se amplía; las tarjetas de estadísticas ocupan tantas columnas como quepan en cada ancho:

| Ancho                  | Cambios                                                         |
|------------------------|-----------------------------------------------------------------|
| Teléfono (< 768 px)    | Menú con el botón ☰ e historial en tarjetas                    |
| Tableta (≥ 768 px)     | Historial en tabla                                              |
| Escritorio (≥ 1024 px) | Menú lateral siempre visible y contenido de 1040 px como máximo |

![Vistas en escritorio](docs/img/pantallas-escritorio.jpg)

Los textos van en español y de **tú**. El expediente describe hechos sin felicitar, como parte del mensaje sobre la ludopatía.

---

## 9. Diagramas de la aplicación

Los diagramas corresponden a la propuesta completa; su código está en [`docs/diagramas/`](docs/diagramas).

| Diagrama                                             | Qué muestra                                                                                 |
|------------------------------------------------------|---------------------------------------------------------------------------------------------|
| ![Contexto](docs/diagramas/contexto.png)             | **Contexto:** cómo llegan los datos del juego a la PWA                                      |
| ![Navegación](docs/diagramas/navegacion.png)         | **Navegación:** rutas de la propuesta; hoy existen `/perfil` y `/opinion/retroalimentacion` |
| ![Búsqueda](docs/diagramas/busqueda.png)             | **Búsqueda:** buscar por alias, elegir un jugador y ver su expediente                       |
| ![Estados](docs/diagramas/estados.png)               | **Estados de una pantalla:** cargando, con datos, vacío, sin conexión o con error           |
| ![Service Worker](docs/diagramas/service-worker.png) | **Service Worker:** instalación, atención sin red y actualización                           |
| ![Outbox](docs/diagramas/outbox.png)                 | **Outbox:** envío de retroalimentación con y sin conexión                                   |

---

## 10. Integración continua y flujo de trabajo

GitHub Actions ([`ci.yml`](.github/workflows/ci.yml)) corre en cada Pull Request y en cada cambio a `develop` y `main`:

1. **Analizar y probar:** formato del código y pruebas.
2. **Compilar:** build de producción.
3. **Construir imagen Docker:** comprueba que el `Dockerfile` funciona.

- Ramas: `main` (producción), `develop` (integración) y `feature/FF-<ticket>-<descripción>`. Las dos principales están protegidas.
- Todo cambio entra por Pull Request con una aprobación y el CI en verde; `CODEOWNERS` asigna a los revisores y la plantilla pide el ticket de Jira.
- Dependabot propone cada semana las actualizaciones de dependencias.

---

## 11. Equipo

**Anuma Games** – Proyecto integrador, grupo IDGS101N, Universidad Tecnológica de Chihuahua

- Luis Ángel Gaxiola Gamboa
- Emmanuel González Hernández
- Jesús Antonio Jiménez Mendoza
- Ángel Gael Jurado Rodríguez
- Andrik Rivera Esquer
