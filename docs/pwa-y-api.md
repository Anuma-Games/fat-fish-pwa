# La PWA y la API de Fat Fish: renderizado e interacción

La **PWA** es una aplicación Angular que se renderiza en el navegador (CSR) y la **API** es un servicio Spring Boot que solo responde JSON. La PWA no genera datos y la API no genera pantallas.

Este documento solo describe cómo se comunican. La estrategia de renderizado está en la [sección 4.4 del README de la PWA](../README.md#44-estrategia-de-renderizado) y los endpoints, en el [README de la API](https://github.com/Anuma-Games/fat-fish-api#endpoints).

![Arquitectura de la PWA y la API](diagramas/arquitectura.png)

## Cómo interactúan

1. El navegador pide la PWA a Firebase Hosting y recibe `index.html`, JS y CSS. Angular arranca y pinta la pantalla.
2. Cuando una pantalla necesita datos, su fachada pide a un repositorio que haga la petición a una ruta relativa (`/api/pwa/...`). El interceptor de Angular agrega `X-Api-Key`.
3. Firebase Hosting reenvía todo `/api/**` al servicio `fat-fish-api` de Cloud Run. Para el navegador sigue siendo un solo origen.
4. La API valida la petición, consulta PostgreSQL y responde JSON (fechas ISO-8601 en UTC, campos en español).
5. El repositorio convierte el JSON en un modelo, la fachada lo guarda en una *signal* y la pantalla se vuelve a pintar. Si la API falla o no hay red, la fachada lo traduce a un estado (`ERROR`, `SIN_RED`, `DESDE_CACHE`...) y la pantalla muestra el aviso que corresponde.

| Pantalla de la PWA                 | Petición a la API                                       | Sin conexión                                   |
|------------------------------------|---------------------------------------------------------|------------------------------------------------|
| Búsqueda (`/acceso`)               | `GET /api/pwa/jugadores?busqueda=`                      | Repite búsquedas del último día                |
| Expediente (`/perfil`)             | `GET /api/pwa/perfil?id=` y `GET /api/pwa/partidas?id=` | Última copia guardada (hasta 7 días)           |
| Ranking (`/ranking`)               | `GET /api/pwa/ranking?pagina=&jugadorId=`               | Última copia guardada (hasta 7 días)           |
| Retroalimentación (`/opinion/...`) | `POST /api/pwa/retroalimentacion`                       | Queda en el outbox y se envía al volver la red |
| Encuesta (`/opinion/encuesta`)     | `POST /api/pwa/encuesta`                                | Queda en el outbox y se envía al volver la red |

## Quién entrega la PWA y reenvía `/api` en cada entorno

| Entorno                     | Entrega la PWA                  | Reenvía `/api` a la API                              |
|-----------------------------|---------------------------------|------------------------------------------------------|
| Producción                  | Firebase Hosting                | Rewrite de `firebase.json` hacia Cloud Run           |
| Docker Compose              | Nginx (puerto 8080)             | `proxy_pass` de Nginx hacia el contenedor `api`      |
| Laboratorio (`npm run lab`) | `scripts/lab-server.mjs`        | El mismo servidor, hacia la API local o de Cloud Run |
| Desarrollo (`npm start`)    | `ng serve` (sin Service Worker) | `proxy.conf.json` hacia `localhost:8080`             |

## Cuándo actualizar este documento

Cuando cambie el modo de renderizado o de despliegue (`angular.json`, `firebase.json`, Nginx), o cuando la API deje de ser solo JSON. En el mismo Pull Request se actualizan la sección 4.4 del README de la PWA y los diagramas `arquitectura` y `contexto`.
