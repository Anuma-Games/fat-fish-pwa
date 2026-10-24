# Cómo contribuir

Esta guía explica cómo llevar un cambio desde un ticket de Jira hasta `main` en la PWA de Fat Fish (`fat-fish-pwa`). El flujo es el mismo en los
cuatro repositorios de Fat Fish (`fat-fish-game`, `fat-fish-api`, `fat-fish-pwa` y `fat-fish-mobile`); lo que cambia
es cómo se prepara el entorno y cómo se prueba, que está en la sección de este repositorio.

## Resumen

1. Toma un ticket en Jira.
2. Crea una rama desde `develop`.
3. Haz commits con la clave del ticket.
4. Prueba en local lo mismo que revisa el CI.
5. Sube la rama y abre un Pull Request hacia `develop`.
6. Espera la revisión y el CI en verde, y fusiona.
7. El release lleva los cambios de `develop` a `main`.

## Antes de empezar

- Node.js 24 y npm.
- Docker Desktop, si quieres levantar la PWA con la API y la base de datos (ver la sección 3 del README).
- Instala las dependencias con `npm ci`. El servidor de desarrollo es `npm start` y necesita la API en el puerto 8080.

## 1. Toma un ticket en Jira

Todo cambio nace de un ticket del proyecto **FF** en Jira. Si no existe, pídele a quien coordina el sprint que lo
cree: así el cambio queda en el tablero y en el avance del MVP. Al empezar, asígnate el ticket y muévelo a
**En curso**.

## 2. Crea la rama

Siempre desde `develop` actualizado:

```bash
git switch develop
git pull
git switch -c feature/FF-45-landing-page
```

- Formato: `feature/FF-<ticket>-<descripcion-corta>`, en minúsculas y con guiones.
- Una rama por ticket. Jira enlaza sola la rama, los commits y el PR que llevan la clave.
- No crees una rama que se llame solo `feature`: Git ya no permitiría ninguna rama `feature/...` en el repositorio.

## 3. Haz commits

Formato: `FF-<ticket> <tipo>: <qué cambia>`, en español, en presente y empezando en minúscula.

| Tipo       | Cuándo                                              |
|------------|-----------------------------------------------------|
| `feat`     | Funcionalidad nueva                                 |
| `fix`      | Corrección de un error                              |
| `docs`     | Solo documentación (README, comentarios, guías)     |
| `refactor` | Cambio de código que no cambia el comportamiento    |
| `test`     | Pruebas nuevas o corregidas                         |
| `chore`    | Mantenimiento: configuración, archivos del proyecto |
| `ci`       | Cambios en `.github/workflows`                      |

Ejemplos reales de este repositorio:

```
FF-102 feat: contenedor Docker de la PWA con Nginx y Docker Compose
FF-104 refactor: puertos del dominio para las fachadas
FF-51 docs: scripts del laboratorio con el nuevo esquema
```

Antes de cada commit revisa `git status` y agrega los archivos por nombre (`git add <archivo>`), en lugar de
`git add .` o `git commit -a`, para no subir archivos que no son parte del cambio.

## 4. Prueba en local

Corre lo mismo que revisa el CI antes de subir la rama; así no esperas varios minutos para descubrir un error de
formato.

```bash
npm run format:check   # formato con Prettier
npx ng test --watch=false
npx ng build
```

Si el formato falla, corrígelo con `npx prettier --write "src/**/*.{ts,html,css}"`. El CI también construye la
imagen de Docker; si tocaste el `Dockerfile` o la configuración de Nginx, prueba `docker build -t fat-fish-pwa .`.

## 5. Sube la rama y abre el Pull Request

```bash
git push -u origin feature/FF-45-landing-page
```

Después abre el PR **hacia `develop`**, nunca hacia `main`. Puedes usar el botón **Compare & pull request** que
aparece en GitHub después del push (revisa que la base sea `develop`) o la terminal:

```bash
gh pr create --base develop --title "FF-45 feat: landing page de promoción"
```

- **Título:** el mismo formato que los commits.
- **Descripción:** GitHub la llena con la plantilla del equipo (Ticket, Qué cambia, Cómo probarlo y Checklist). Llena cada sección y marca el checklist.
- **Revisores:** GitHub asigna solo a los responsables del repositorio, definidos en `.github/CODEOWNERS`.
- Mueve el ticket de Jira a **En revisión**.

## 6. Revisión y fusión

`develop` y `main` están protegidas. Un PR se puede fusionar cuando:

- Tiene **una aprobación**.
- Los checks **Analizar y probar** y **Compilar** están en verde.
- La rama está al día con `develop`.

- Si el revisor pide cambios, haz commits nuevos en la misma rama y súbelos; el PR se actualiza solo.
- Si GitHub dice que la rama no está al día, trae los cambios de `develop`:

  ```bash
  git fetch
  git merge origin/develop
  git push
  ```

- Se fusiona con **Merge pull request** (sin squash), para conservar los commits con la clave del ticket.
- Después de fusionar, borra la rama en GitHub y en local, y mueve el ticket a **Finalizado**.

## 7. Release a `main`

`main` es la versión estable. Quien coordina el repositorio abre un PR de `develop` hacia `main` cuando hay cambios
listos, con el título `FF-<ticket> · Release: <resumen>`, y sigue las mismas reglas de revisión y CI.

## Si algo falla

- **El CI está en rojo:** abre el detalle del check en el PR (pestaña **Checks**) y busca el primer error. Corrígelo
  con un commit nuevo en la misma rama.
- **Conflictos al fusionar `develop`:** resuélvelos en tu editor, haz commit y vuelve a subir la rama. Si el conflicto
  es en un archivo de otra persona, pregúntale antes.
- **Dependabot:** cada semana abre PRs para actualizar dependencias. Se revisan y fusionan igual que los demás.
