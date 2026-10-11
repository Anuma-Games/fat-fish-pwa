# PWA del Videojuego · Proyecto Integrador

> **Fase actual:** 1 · Planeación — propuesta de arquitectura
> **Stack de la PWA:** Angular · Service Worker · Web App Manifest
> **Hosting:** Cloud Run (mismo contenedor y mismo origen que el backend)
> **Idioma:** Español
> **Versión del documento:** 0.3 (borrador de planeación)
> **Fuente de requisitos:** *Recuento final (versión 2): PWA de la integradora*

---

## Tabla de contenido

1. [Finalidad de la PWA dentro del proyecto](#1-finalidad-de-la-pwa-dentro-del-proyecto)
2. [Arquitectura](#2-arquitectura)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Consumo de API](#4-consumo-de-api)
5. [Estrategia PWA](#5-estrategia-pwa)

---

## 1. Finalidad de la PWA dentro del proyecto

### 1.1 Resumen y contexto

La PWA es la **cara web del videojuego**: un sitio instalable que permite a los jugadores consultar los datos que el juego genera sobre ellos, ver un ranking mundial, leer una wiki y enviar retroalimentación o una encuesta anónima.

El proyecto es un videojuego de casino (ruleta, apuestas, fichas especiales, comodines, jefes y tienda) que, además de entretener, trata el tema del juego de azar y la **ludopatía**. El juego genera datos (partidas, apuestas, pérdidas, duración), pero no es el mejor lugar para analizarlos ni para recibir opiniones. La PWA cubre ese hueco como un **canal web complementario**.

| Aspecto | Decisión |
|---|---|
| Frontend | Angular, PWA con Service Worker y Web App Manifest |
| Arquitectura | N capas |
| Hosting | Cloud Run, en el mismo contenedor que el backend; al compartir origen **no se necesita CORS** |
| Consumo de datos | Solo endpoints `/api/pwa/...` |
| Identidad del jugador | Alias + ID públicos, sin contraseña (provisional hasta usar el inicio de sesión de Steam) |
| Requisito de datos | La PWA **lee** (perfil, historial, ranking) e **inserta** (retroalimentación, encuesta) |
| Idioma | Todo el contenido está en español |

### 1.2 Rol de la PWA

La PWA cierra el ciclo **jugar → registrar → reflexionar → opinar**:

| Rol | Descripción |
|---|---|
| **Espejo de datos** | Muestra al jugador lo que el juego registró de él. La sección *"Lo que el casino sabe de ti"* se presenta como **el perfil que el casino construyó del jugador, no como una lista de logros**. La intención es hacer visibles métricas como total apostado, total perdido o la racha máxima de derrotas. |
| **Competencia social** | Ranking mundial con el mejor puntaje de cada jugador (solo victorias; desempata quien lo logró primero). |
| **Referencia del juego** | Wiki estática con mecánicas, fichas, comodines, efectos, jefes, tienda y glosario; disponible sin conexión. |
| **Canal de voz del usuario** | Formulario de retroalimentación y reporte de errores (categoría + mensaje). |
| **Instrumento de investigación** | Encuesta anónima sobre percepción del juego y la ludopatía, útil para evaluar el impacto del proyecto. |

### 1.3 Qué puede hacer el usuario

- Entrar con su **alias e ID** (públicos, sin contraseña) para ver su perfil.
- Consultar su **resumen estadístico**: partidas jugadas y ganadas, total apostado, total perdido, racha máxima de derrotas y tiempo jugado.
- Revisar su **historial de partidas** (resultado, ronda alcanzada, puntaje, dinero máximo, apostado y perdido, duración y fecha), paginado.
- Ver el **ranking mundial** (top 50) y, si consultó su perfil, **su propia posición**.
- Leer la **wiki** del juego, incluso sin internet.
- **Enviar retroalimentación** o reportar errores del juego o de la propia PWA.
- Responder la **encuesta anónima**.
- **Instalar** la PWA en el celular o la computadora y usarla como una app.

### 1.4 Alcance y mapa funcional

| Sección | Acceso | Operación | Endpoint que consume |
|---|---|---|---|
| Acceso | Libre | Validar alias + ID | `GET /api/pwa/perfil` |
| Lo que el casino sabe de ti | **Alias + ID** | Leer | `GET /api/pwa/perfil`, `GET /api/pwa/partidas` |
| Ranking mundial | Libre | Leer | `GET /api/pwa/ranking` |
| Wiki *(deseable)* | Libre | Leer (contenido estático dentro de Angular) | — |
| Retroalimentación y reporte de errores | Libre | **Insertar** | `POST /api/pwa/retroalimentacion` |
| Encuesta anónima | Libre | **Insertar** | `POST /api/pwa/encuesta` |

- **Actores:** el *visitante* (sin alias/ID) accede a todo salvo a las estadísticas; el *jugador identificado* (con alias e ID) accede además a su perfil e historial.
- **Fuera de alcance:** la PWA no registra jugadores, partidas ni puntajes (solo los lee), no maneja contraseñas ni el token del juego, no envía notificaciones push y no permite jugar.

---

## 2. Arquitectura

### 2.1 Vista general

```mermaid
flowchart LR
    subgraph NAV["Navegador del jugador"]
        APP["PWA Angular"]
        SW["Service Worker<br/>precaché + caché de datos"]
        IDB[("IndexedDB<br/>outbox de formularios")]
        LS["localStorage<br/>sesión alias + ID"]
        APP <--> SW
        APP --> IDB
        APP --> LS
    end

    subgraph CR["Cloud Run · contenedor único"]
        SB["Spring Boot<br/>sirve la PWA (estáticos) y /api/pwa/..."]
    end

    SW -->|"HTTPS · mismo origen"| SB
```

### 2.2 Decisiones clave

- **Un solo origen.** El backend sirve el build de Angular como archivos estáticos y expone la API en el mismo dominio. Por eso la PWA usa **rutas relativas** (`/api/pwa/...`) y **no requiere CORS**.
- **Contacto único con el backend.** La PWA solo consume `/api/pwa/**`.
- **Todo el tráfico pasa por el Service Worker**, que decide qué responder desde caché y qué enviar a la red (ver [5. Estrategia PWA](#5-estrategia-pwa)).
- **Desarrollo local.** `ng serve` con un proxy que reenvía `/api` al backend local, de modo que el código siempre usa rutas relativas.
- **Angular moderno:** componentes *standalone* y *signals* para el estado.

### 2.3 Arquitectura en N capas (Angular)

Se organiza **por capa** en el primer nivel y **por sección funcional** dentro de cada capa. Cada capa tiene una única responsabilidad y solo puede depender de la que tiene "hacia adentro".

```
proyecto-pwa/
├── public/                          # manifest.webmanifest, íconos, imágenes de la wiki
├── ngsw-config.json                 # configuración del Service Worker
├── proxy.conf.json                  # proxy de desarrollo hacia /api
└── src/app/
    │
    ├── presentation/                # ── CAPA 1 · PRESENTACIÓN ──────────────────────
    │   ├── pages/                   # una carpeta por sección (cada una es una ruta)
    │   │   ├── acceso/
    │   │   ├── perfil/              # resumen + historial
    │   │   ├── ranking/
    │   │   ├── wiki/
    │   │   ├── retroalimentacion/
    │   │   └── encuesta/
    │   ├── components/              # componentes reutilizables sin lógica de negocio
    │   ├── guards/                  # sesion.guard.ts (protege /perfil)
    │   └── app.routes.ts
    │
    ├── application/                 # ── CAPA 2 · APLICACIÓN (casos de uso) ─────────
    │   └── facades/
    │       ├── sesion.facade.ts             # iniciar/cerrar sesión (alias + ID)
    │       ├── perfil.facade.ts             # resumen estadístico
    │       ├── historial.facade.ts          # lista acumulada + paginación
    │       ├── ranking.facade.ts            # top 50 + posición propia
    │       ├── retroalimentacion.facade.ts
    │       ├── encuesta.facade.ts
    │       └── wiki.facade.ts
    │
    ├── domain/                      # ── CAPA 3 · DOMINIO ───────────────────────────
    │   ├── models/                  # Jugador, Perfil, Estadisticas, Partida, Pagina<T>,
    │   │                            # Ranking, RankingEntrada, Retroalimentacion, Encuesta,
    │   │                            # ResultadoEnvio
    │   ├── enums/                   # ResultadoPartida, Categoria, Componente
    │   └── repositories/            # PUERTOS: PerfilRepository, PartidaRepository,
    │                                # RankingRepository, RetroalimentacionRepository,
    │                                # EncuestaRepository, WikiRepository, SesionRepository
    │
    ├── infrastructure/              # ── CAPA 4 · INFRAESTRUCTURA (datos y plataforma)
    │   ├── api/                     # acceso remoto a /api/pwa
    │   │   ├── dto/                 # DTOs tal como viajan por la red
    │   │   ├── mappers/             # DTO → modelo de dominio
    │   │   └── repositories/        # implementaciones HTTP de los puertos
    │   ├── content/
    │   │   └── wiki/                # contenido estático tipado + WikiEstaticoRepository
    │   ├── storage/                 # SesionStorage (localStorage) y OutboxDb (IndexedDB)
    │   └── pwa/                     # SwUpdateService, InstallPromptService,
    │                                # ConnectivityService, OutboxSyncService
    │
    ├── core/                        # ── TRANSVERSAL (sin lógica de negocio) ────────
    │   └── config/                  # URL base de la API, constantes, tokens de inyección
    │
    ├── app.config.ts                # raíz de composición: router, HttpClient, Service Worker
    │                                # y enlace puerto → implementación
    └── app.component.ts
```

**Responsabilidad de cada capa**

| Capa | Responsabilidad | No debe |
|---|---|---|
| **Presentación** | Páginas, componentes, rutas y guards. Solo habla con las **fachadas** | Usar `HttpClient`, `localStorage` ni IndexedDB |
| **Aplicación** | Casos de uso: orquesta el flujo y mantiene el estado con *signals* | Conocer DTOs, HTTP ni mecanismos de almacenamiento |
| **Dominio** | Modelos, enumerados y **puertos** (contratos abstractos) | Depender de Angular HTTP ni de otras capas |
| **Infraestructura** | Implementa los puertos: repositorios HTTP, DTOs, mappers, wiki estática, almacenamiento local y piezas del Service Worker | Contener lógica de presentación |
| **Core** | Configuración transversal | Contener lógica de negocio |

**Reglas de dependencia**

```
presentation  →  application  →  domain  ←  infrastructure
```

- `presentation` nunca importa de `infrastructure`.
- `application` depende solo de los **puertos** de `domain`; no sabe si los datos vienen de HTTP, de caché o de IndexedDB.
- `infrastructure` es la única capa que conoce DTOs, HTTP, `localStorage` e IndexedDB.
- Los puertos se enlazan con sus implementaciones en `app.config.ts` por inyección de dependencias.

**Recorrido de una consulta**

```
Página → Fachada → Puerto (domain) → Repositorio HTTP (infrastructure) → /api/pwa/...
                                                                          │
Página ← Fachada (signal) ← Modelo ← Mapper ← DTO ←──────────────────────┘
```

**Envíos sin conexión.** Los repositorios de escritura (retroalimentación y encuesta) devuelven un `ResultadoEnvio` (`ENVIADO` o `EN_COLA`). Si no hay red, **el propio repositorio** deja la solicitud en el outbox (IndexedDB); la capa de aplicación solo conoce el resultado.

**La wiki como fuente de datos.** Su contenido vive en `infrastructure/content/wiki` como datos tipados dentro del bundle, expuesto mediante `WikiRepository`. Así la wiki sigue el mismo flujo que el resto de las secciones y queda disponible sin conexión por formar parte del precaché.

---

## 3. Modelo de datos

Esquema de referencia sobre el que se construyen los DTOs de la PWA.

```mermaid
erDiagram
    jugador ||--|| estadistica_jugador : "tiene (1:1)"
    jugador ||--o{ partida : "registra (1:N)"

    jugador {
        id id PK
        varchar alias UK "varchar(24), NN, único sin distinguir mayúsculas"
        timestamp creado_en "NN"
        timestamp ultima_actividad "nulo"
        varchar token "solo hash, nulo"
    }

    estadistica_jugador {
        id jugador_id PK, FK
        int partidas_totales "NN"
        int partidas_ganadas "NN"
        bigint total_apostado "NN"
        bigint total_perdido "NN"
        int racha_derrotas_max "NN"
        bigint tiempo_jugado_seg "NN"
    }

    partida {
        id id PK
        id jugador_id FK "NN"
        varchar semilla "varchar(64), NN"
        varchar mazo_id "varchar(40), NN"
        resultado_partida resultado "VICTORIA, DERROTA, ABANDONO, NN"
        int ronda_alcanzada "NN"
        bigint puntaje "NN"
        int dinero_maximo "NN"
        int dinero_apostado "NN"
        int dinero_perdido "NN"
        int duracion_seg "NN"
        timestamp creada_en "NN"
    }

    retroalimentacion {
        id id PK
        enum categoria "ERROR, SUGERENCIA, OTRO, NN"
        enum componente "JUEGO, PWA, OTRO, NN"
        varchar mensaje "varchar(1000), NN, mínimo 10 caracteres"
        timestamp creada_en "NN"
    }

    encuesta_rapida {
        id id PK
        smallint percepcion_riesgo "NN, 1 a 5"
        smallint cambio_opinion "NN, 1 a 5"
        smallint claridad_mensaje "NN, 1 a 5"
        varchar comentario "varchar(500), nulo"
        timestamp enviada_en "NN"
    }
```

> `NN` = *not null*. `retroalimentacion` y `encuesta_rapida` no tienen relación con `jugador`: la encuesta es anónima y ambas son de solo inserción. Todas las marcas de tiempo se guardan en UTC. Para el ranking existe un índice parcial `(jugador_id, puntaje DESC, creada_en) WHERE resultado = 'VICTORIA'`.

**Cómo usa la PWA cada tabla**

| Tabla | Acceso de la PWA | Columnas que salen en la API | Columnas que nunca salen |
|---|---|---|---|
| `jugador` | Lectura | `id`, `alias`, `creado_en`, `ultima_actividad` | `token` |
| `estadistica_jugador` | Lectura | Todas (incluidas dentro del perfil) | — |
| `partida` | Lectura | `id`, `resultado`, `ronda_alcanzada`, `puntaje`, `dinero_maximo`, `dinero_apostado`, `dinero_perdido`, `duracion_seg`, `creada_en` | `jugador_id`, `semilla`, `mazo_id` |
| `retroalimentacion` | **Inserción** | Entrada: `categoria`, `componente`, `mensaje` | — |
| `encuesta_rapida` | **Inserción** | Entrada: `percepcion_riesgo`, `cambio_opinion`, `claridad_mensaje`, `comentario` | No se devuelve ningún identificador (anonimato) |

La PWA **nunca escribe** en `jugador`, `partida` ni `estadistica_jugador`.

---

## 4. Consumo de API

### 4.1 Principios

1. **Rutas relativas** (`/api/pwa/...`), mismo origen, sin CORS.
2. **JSON en UTF-8**; fechas en **ISO-8601 UTC**; nombres de campo en `camelCase` español.
3. **Los DTOs de red no son los modelos de dominio.** La capa de infraestructura mapea `DTO → modelo`, así un cambio en el contrato solo afecta a los mappers.
4. **Los DTOs se derivan del modelo de datos** (sección 3) y no exponen `token`, `semilla`, `mazo_id` ni `partida.jugador_id`.
5. **La identidad viaja en la URL** (alias e ID como query params) en las consultas del jugador. Al ser datos públicos es aceptable y además **es necesario para la caché**: el Service Worker usa la URL como llave; si la identidad fuera una cabecera, un usuario podría recibir datos cacheados de otro en el mismo dispositivo.
6. Las rutas son **sugeridas**; el contrato definitivo se fija en el diseño detallado.

### 4.2 Equivalencia de tipos y DTOs comunes

| BD (PostgreSQL) | TypeScript / JSON | Nota |
|---|---|---|
| `id` | `string` | Identificador único del sistema. El formato exacto se define en el contrato |
| `varchar(n)` | `string` | Se respeta la longitud máxima |
| `int`, `smallint` | `number` | |
| `bigint` | `number` | Aplica a `puntaje`, `total_apostado`, `total_perdido` y `tiempo_jugado_seg`. Se asume que no superan `Number.MAX_SAFE_INTEGER` (2⁵³ − 1) |
| `timestamp` | `string` | ISO-8601 en UTC |
| `enum` | unión de literales | p. ej. `'VICTORIA' \| 'DERROTA' \| 'ABANDONO'` |

```ts
// infrastructure/api/dto/comun.dto.ts

/** Respuesta paginada */
export interface PaginaDto<T> {
  contenido: T[];
  pagina: number;          // base 0
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
  ultima: boolean;
  generadoEn: string;      // momento en que el servidor generó la respuesta (ISO-8601 UTC)
}
```

> `generadoEn` permite indicar la antigüedad de los datos cuando se sirven desde la caché sin conexión (ver [5.4](#54-qué-pasa-con-los-puntajes-si-se-pierde-la-conexión)).

### 4.3 Endpoints consumidos por la PWA

#### 4.3.1 Consultar perfil

`GET /api/pwa/perfil?alias={alias}&id={id}`

Devuelve los datos básicos del jugador (alias, fecha de alta y última actividad) junto con sus seis métricas estadísticas.

| Parámetro | Tipo | Obligatorio | Origen y reglas |
|---|---|---|---|
| `alias` | string | Sí | `jugador.alias` · 3 a 24 caracteres · sin distinguir mayúsculas |
| `id` | string (id) | Sí | `jugador.id` |

**Tablas:** `jugador` + `estadistica_jugador` (1:1, se entrega anidada).

```ts
// infrastructure/api/dto/perfil.dto.ts
export interface EstadisticasDto {
  partidasTotales: number;     // estadistica_jugador.partidas_totales  · int
  partidasGanadas: number;     // estadistica_jugador.partidas_ganadas  · int
  totalApostado: number;       // estadistica_jugador.total_apostado    · bigint
  totalPerdido: number;        // estadistica_jugador.total_perdido     · bigint
  rachaDerrotasMax: number;    // estadistica_jugador.racha_derrotas_max · int
  tiempoJugadoSeg: number;     // estadistica_jugador.tiempo_jugado_seg · bigint
}

export interface PerfilDto {
  jugadorId: string;               // jugador.id · id
  alias: string;                   // jugador.alias · varchar(24)
  creadoEn: string;                // jugador.creado_en
  ultimaActividad: string | null;  // jugador.ultima_actividad · nulo
  estadisticas: EstadisticasDto;
  generadoEn: string;
}
```

Al recibir la respuesta, `SesionFacade` guarda alias e ID para reutilizarlos en el historial y en el ranking.

#### 4.3.2 Consultar historial de partidas

`GET /api/pwa/partidas?alias={alias}&id={id}&pagina=0&tamano=10`

Devuelve las partidas del jugador, de la más reciente a la más antigua, en páginas.

| Parámetro | Tipo | Obligatorio | Origen y reglas |
|---|---|---|---|
| `alias` | string | Sí | `jugador.alias` |
| `id` | string (id) | Sí | `jugador.id` |
| `pagina` | int | No | Base 0; por defecto `0` |
| `tamano` | int | No | Por defecto `10`; máximo `50` |

**Tabla:** `partida`, filtrada por el jugador. **Orden fijo:** `creada_en` descendente.

```ts
// infrastructure/api/dto/partida.dto.ts
export type ResultadoPartidaDto = 'VICTORIA' | 'DERROTA' | 'ABANDONO';

export interface PartidaDto {
  id: string;                      // partida.id · id
  resultado: ResultadoPartidaDto;  // partida.resultado · enum resultado_partida
  rondaAlcanzada: number;          // partida.ronda_alcanzada · int
  puntaje: number;                 // partida.puntaje · bigint
  dineroMaximo: number;            // partida.dinero_maximo · int
  dineroApostado: number;          // partida.dinero_apostado · int
  dineroPerdido: number;           // partida.dinero_perdido · int
  duracionSeg: number;             // partida.duracion_seg · int
  creadaEn: string;                // partida.creada_en
}
// Respuesta: PaginaDto<PartidaDto>
```

El DTO **no incluye** `jugador_id`, `semilla` ni `mazo_id`. `HistorialFacade` mantiene la lista acumulada y solicita la página siguiente mientras `ultima` sea `false`.

#### 4.3.3 Consultar ranking

`GET /api/pwa/ranking?limite=50&jugadorId={id}`

Devuelve el top del ranking mundial y, si se envía el ID del jugador, también su posición. Es de acceso libre.

| Parámetro | Tipo | Obligatorio | Origen y reglas |
|---|---|---|---|
| `limite` | int | No | Por defecto y máximo `50` (supuesto a validar) |
| `jugadorId` | string (id) | No | `jugador.id`. Si se envía, la respuesta incluye `miPosicion` |

**Tablas:** `partida` + `jugador`.

**Regla:** por cada jugador se toma su **mejor `puntaje`** entre las partidas con `resultado = 'VICTORIA'`; se ordena por puntaje descendente y, ante empate, por `creada_en` ascendente (**quien lo logró primero**).

```ts
// infrastructure/api/dto/ranking.dto.ts
export interface RankingEntradaDto {
  posicion: number;      // calculada por el servidor (no es una columna)
  alias: string;         // jugador.alias
  puntaje: number;       // partida.puntaje · bigint (el mejor de sus victorias)
  logradoEn: string;     // partida.creada_en de esa partida
}

export interface RankingDto {
  top: RankingEntradaDto[];
  miPosicion: RankingEntradaDto | null;   // null si no se envió jugadorId o no tiene victorias
  limite: number;
  generadoEn: string;
}
```

#### 4.3.4 Enviar retroalimentación

`POST /api/pwa/retroalimentacion`

**Tabla:** `retroalimentacion` (solo inserción). Responde `201` con el `id` generado por el servidor y la fecha de creación.

```ts
// infrastructure/api/dto/retroalimentacion.dto.ts
export type CategoriaDto = 'ERROR' | 'SUGERENCIA' | 'OTRO';
export type ComponenteDto = 'JUEGO' | 'PWA' | 'OTRO';

export interface RetroalimentacionRequestDto {
  categoria: CategoriaDto;     // retroalimentacion.categoria · enum · NN
  componente: ComponenteDto;   // retroalimentacion.componente · enum · NN (dónde ocurrió)
  mensaje: string;             // retroalimentacion.mensaje · varchar(1000) · NN · mínimo 10 caracteres
}

export interface RetroalimentacionResponseDto {
  id: string;                  // retroalimentacion.id · id · lo genera el servidor
  creadaEn: string;            // retroalimentacion.creada_en
}
```

#### 4.3.5 Enviar encuesta anónima

`POST /api/pwa/encuesta`

**Tabla:** `encuesta_rapida` (anónima, solo inserción). Responde `201` solo para confirmar la recepción; **no devuelve ningún identificador**.

```ts
// infrastructure/api/dto/encuesta.dto.ts
export interface EncuestaRequestDto {
  percepcionRiesgo: number;    // encuesta_rapida.percepcion_riesgo · smallint · NN · 1 a 5
  cambioOpinion: number;       // encuesta_rapida.cambio_opinion    · smallint · NN · 1 a 5
  claridadMensaje: number;     // encuesta_rapida.claridad_mensaje  · smallint · NN · 1 a 5
  comentario?: string | null;  // encuesta_rapida.comentario        · varchar(500) · opcional
}

export interface EncuestaResponseDto {
  recibida: true;
  enviadaEn: string;           // encuesta_rapida.enviada_en
}
```

| Campo | Qué mide |
|---|---|
| `percepcionRiesgo` | Qué tan riesgosos considera los juegos de azar |
| `cambioOpinion` | Si el juego cambió su percepción |
| `claridadMensaje` | Qué tan claro fue el mensaje de responsabilidad social |

**Anonimato:** la petición no lleva alias, ID, token ni datos de sesión, y el outbox tampoco los guarda.

### 4.4 Flujo de consumo en Angular

Todas las secciones siguen el mismo recorrido. Se describe con el ranking como ejemplo:

1. **La página** (presentación) solicita los datos a su fachada al abrirse. Nunca llama a HTTP directamente.
2. **La fachada** (aplicación) trabaja con el puerto `RankingRepository`, definido en el dominio. Si hay una sesión activa, incluye el ID del jugador para obtener también su posición.
3. **El repositorio HTTP** (infraestructura) hace la petición `GET` a la ruta relativa `/api/pwa/ranking`, con el límite de 50 y, opcionalmente, el ID del jugador.
4. **La respuesta** llega como `RankingDto` y el mapper la convierte al modelo de dominio `Ranking`.
5. **La fachada** guarda el resultado en una *signal* y mantiene otra que indica si la carga está en curso.
6. **La página** lee esas signals y pinta la lista de forma dinámica: una fila por cada entrada del top, un mensaje cuando no hay registros y, aparte, la posición del propio jugador si no aparece entre los primeros 50.
7. **El enlace entre puertos e implementaciones** se declara una sola vez en `app.config.ts`: cada puerto del dominio apunta a su implementación en infraestructura (repositorios HTTP, wiki estática o almacenamiento local de la sesión).

**Qué usa cada sección**

| Sección | Fachada | Puerto (dominio) | Fuente de datos | Qué se renderiza |
|---|---|---|---|---|
| Acceso | `SesionFacade` | `PerfilRepository`, `SesionRepository` | `GET /api/pwa/perfil` + `localStorage` | Validación de alias e ID |
| Perfil | `PerfilFacade` | `PerfilRepository` | `GET /api/pwa/perfil` | Resumen estadístico |
| Historial | `HistorialFacade` | `PartidaRepository` | `GET /api/pwa/partidas` | Lista paginada y acumulada |
| Ranking | `RankingFacade` | `RankingRepository` | `GET /api/pwa/ranking` | Top 50 y posición propia |
| Wiki | `WikiFacade` | `WikiRepository` | Contenido estático local | Secciones de la wiki |
| Retroalimentación | `RetroalimentacionFacade` | `RetroalimentacionRepository` | `POST /api/pwa/retroalimentacion` (o outbox) | Confirmación de envío |
| Encuesta | `EncuestaFacade` | `EncuestaRepository` | `POST /api/pwa/encuesta` (o outbox) | Confirmación de envío |

**Particularidades**

- **Historial:** la fachada conserva la lista acumulada y, cada vez que el usuario pide más, solicita la página siguiente y la agrega, hasta que la API indica que es la última.
- **Formularios:** la fachada valida los campos (longitudes y rangos del modelo de datos) y llama al repositorio, que intenta enviar por HTTP. Si no hay red, el repositorio guarda la solicitud en el outbox y devuelve `EN_COLA`; la fachada solo comunica si quedó `ENVIADO` o `EN_COLA`.
- **Sesión:** tras validar el perfil, la fachada de sesión guarda alias e ID en `localStorage` para que las demás secciones y el modo sin conexión puedan reutilizarlos.

---

## 5. Estrategia PWA

La PWA se apoya en dos piezas: el **manifiesto**, que permite instalarla, y el **Service Worker**, que da soporte sin conexión y trabajo en segundo plano. Se usa el Service Worker oficial de Angular (`@angular/service-worker`).

### 5.1 Manifiesto

El archivo `manifest.webmanifest` (generado con `ng add @angular/pwa` y ajustado) describe la app para que el navegador pueda instalarla.

| Propiedad | Valor propuesto |
|---|---|
| Nombre y nombre corto | "[Nombre del juego] · Compañero del casino" y "[Juego]" (provisionales) |
| Descripción | Consulta tus estadísticas, el ranking mundial y la wiki del juego |
| Idioma | Español |
| Modo de visualización | `standalone` (se abre como una app, sin barra del navegador) |
| Inicio y alcance | `/` en ambos |
| Íconos | 192×192 y 512×512, más una versión *maskable* de 512×512 |
| Accesos directos | Mi perfil, Ranking y Wiki |
| Colores | Provisionales hasta definir la identidad visual |

### 5.2 Service Worker y estrategia de caché

El Service Worker se configura de forma declarativa en `ngsw-config.json`. Solo se activa en producción y requiere HTTPS (Cloud Run lo provee). Maneja dos tipos de recursos:

- **Archivos de la app** (código y wiki): se descargan por adelantado al instalar el Service Worker (*precaché*), así la app abre sin red. Incluye las imágenes de la wiki.
- **Respuestas de la API** (`GET`): estrategia **red primero**. Se intenta la red y, si falla o tarda más de 5 segundos, se responde con la última respuesta guardada.

| Recurso | Estrategia | Vigencia |
|---|---|---|
| Código de la app y wiki | Precaché | Hasta la siguiente versión |
| Ranking | Red primero | 1 día |
| Perfil | Red primero | 7 días |
| Historial | Red primero | 7 días (solo las páginas ya visitadas) |
| Envíos (`POST`) | Sin caché; cola propia | — |

Puntos a tener en cuenta:
- Los `POST` nunca se cachean; por eso los formularios usan una cola propia (ver [5.5](#55-cola-de-envío-outbox)).
- Las rutas de la API se excluyen de la navegación del Service Worker para que nunca se respondan con la página principal.
- Los patrones de URL se verifican con la página de depuración `/ngsw/state`, para confirmar que cubren los parámetros de consulta.

### 5.3 Comportamiento sin conexión por sección

| Sección | Sin conexión | Mecanismo |
|---|---|---|
| Wiki | ✅ Completa | Contenido dentro del bundle + precaché |
| Acceso (primera validación) | ❌ Requiere red | La validación es contra la base de datos |
| Acceso (sesión previa) | ✅ Se reabre | Alias e ID guardados en `localStorage` |
| Perfil e historial | ⚠️ Últimos datos consultados | Caché del Service Worker; si nunca se consultaron, se avisa que se necesita red |
| Ranking | ⚠️ Último ranking consultado | Caché del Service Worker |
| Retroalimentación y encuesta | ✅ Se capturan y se encolan | Outbox en IndexedDB |

> **Supuesto del recuento:** la wiki queda disponible sin conexión y las estadísticas muestran un aviso si no hay red. Esta propuesta lo **amplía**: además del aviso, se conservan los últimos datos consultados indicando su fecha de actualización. Queda por validar.

### 5.4 ¿Qué pasa con los puntajes si se pierde la conexión?

Los puntajes tienen tres momentos, cada uno con su propia protección:

- **Cuando se generan.** La PWA nunca escribe partidas ni puntajes: los envía el videojuego, que los conserva en su cola local hasta recuperar la conexión. Por eso una partida jugada sin red aparece en la PWA (historial, estadísticas y ranking) hasta que el juego la sincronice. Es consistencia eventual.
- **Cuando se consultan en la PWA.** Si el usuario ya había abierto su perfil, su historial o el ranking y pierde la conexión, **esos datos siguen disponibles** gracias a la caché del Service Worker. La PWA avisa que está sin conexión y muestra la fecha de la última actualización (`generadoEn`). Al volver la red, la siguiente consulta los refresca. Si nunca se habían consultado, se avisa que se necesita conexión.
- **Cuando el usuario envía algo.** La retroalimentación y la encuesta se guardan en el dispositivo y se envían solas al reconectar (ver 5.5).

| Dato | Dónde queda si no hay red | Cuándo se sincroniza |
|---|---|---|
| Partida y puntaje nuevos | Cola local del videojuego | Cuando el juego recupera conexión |
| Perfil, historial y ranking consultados | Caché del Service Worker | En la siguiente consulta con red |
| Retroalimentación y encuesta pendientes | Outbox (IndexedDB) | Al reconectar, al abrir la app o por Background Sync |
| Sesión (alias + ID) | `localStorage` | No aplica (solo local) |
| Wiki | Precaché | Con cada nueva versión de la app |

**Ejemplo:** Ana termina una partida en el metro, sin red; el juego la guarda. Abre la PWA y consulta el ranking que vio hace dos horas, marcado como "sin conexión". Llena la encuesta y queda pendiente de envío. Al llegar a casa recupera la red: el juego envía la partida y la PWA envía la encuesta. Cuando Ana abre su perfil, ya ve la partida reflejada.

### 5.5 Cola de envío (Outbox)

```mermaid
sequenceDiagram
    actor U as Jugador
    participant APP as PWA Angular
    participant OB as Outbox IndexedDB
    participant API as /api/pwa

    U->>APP: Envía retroalimentación
    APP->>API: POST /api/pwa/retroalimentacion
    alt Sin conexión o fallo de red
        API--xAPP: Error de red
        APP->>OB: Guarda solicitud como PENDIENTE
        APP-->>U: Guardado en tu dispositivo, se enviará al reconectar
        Note over OB,API: Evento online, arranque de la app o Background Sync
        OB->>API: POST con Idempotency-Key
        API-->>OB: 201 Created
        OB-->>APP: Marca ENVIADO
    else Con conexión
        API-->>APP: 201 Created
        APP-->>U: Enviado
    end
```

Cada registro del outbox guarda un identificador único generado en el dispositivo, el tipo de envío (retroalimentación o encuesta), el contenido, la fecha, el número de intentos y su estado (pendiente, enviando, enviado o fallido).

- **Se encola** cuando el envío falla por falta de red.
- **Se vacía** al recuperar la conexión, al abrir la app, al volver a primer plano y, donde existe, con Background Sync.
- **Reintentos** con espera creciente hasta un máximo de intentos o de días; después el registro pasa a *fallido*.
- **Sin duplicados:** cada envío lleva una cabecera `Idempotency-Key` con el identificador del registro, de modo que un reintento no genere un duplicado. Requiere soporte del backend (mejora recomendada).
- **Anonimato:** el outbox de la encuesta no guarda alias, ID ni ningún dato personal.

### 5.6 Segundo plano y actualizaciones

- **Segundo plano.** El Service Worker vive aparte de la página y se aprovecha para el precaché, la detección de versiones nuevas y, como *mejora progresiva*, **Background Sync**, que vacía el outbox aunque la pestaña ya esté cerrada. Background Sync solo existe en Chromium; en Safari y Firefox el respaldo es vaciar la cola al reconectar, al abrir la app o al volver a primer plano. Las notificaciones push y la sincronización periódica quedan fuera de alcance.
- **Actualizaciones.** La PWA revisa si hay una versión nueva al iniciar y periódicamente (p. ej. cada 6 horas). Cuando la descarga está lista, avisa al usuario y, si acepta, activa la versión y recarga.
- **Almacenamiento persistente.** Se solicita al navegador para reducir el riesgo de que purgue la caché o IndexedDB.

### 5.7 Hosting y limitaciones

Como Angular se sirve desde el mismo contenedor que el backend, el servidor debe cumplir tres condiciones:

1. **Responder `index.html` ante las rutas de Angular** (`/ranking`, `/perfil`…) cuando el usuario las abre directamente o recarga, sin interferir con `/api/**`.
2. **No cachear los archivos de control** (`index.html`, `ngsw.json`, `ngsw-worker.js`, `manifest.webmanifest`), para que las actualizaciones lleguen, y dar caché larga e inmutable a los bundles con hash.
3. **Servir el Service Worker desde la raíz** (`/`) para que controle toda la app.
