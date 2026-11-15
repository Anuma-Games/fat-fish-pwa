import { Routes } from '@angular/router';
import { LandingPage } from './presentation/pages/landing/landing.page';
import { expedienteGuard } from './presentation/pages/historial/expediente.guard';

// Routes as in the PWA design (README 2.3); `seccion` is the link highlighted in the top bar and the menu.
// The landing page is the public promotion site: `layout: 'landing'` takes the whole window and
// the page brings its own top bar (the same component, with its room sound). The other pages load
// when they are opened; the service worker prefetches every chunk, so they also open offline.
export const routes: Routes = [
  {
    path: '',
    component: LandingPage,
    title: 'Fat Fish: lo que el casino sabe de ti',
    data: { layout: 'landing' },
  },
  {
    path: 'acceso',
    loadComponent: () =>
      import('./presentation/pages/acceso/acceso.page').then((m) => m.AccesoPage),
    title: 'Buscar jugador - Fat Fish',
    data: { seccion: 'Expediente' },
  },
  {
    path: 'perfil',
    loadComponent: () =>
      import('./presentation/pages/historial/historial.page').then((m) => m.HistorialPage),
    canActivate: [expedienteGuard],
    title: 'Expediente - Fat Fish',
    data: { seccion: 'Expediente' },
  },
  {
    path: 'ranking',
    loadComponent: () =>
      import('./presentation/pages/ranking/ranking.page').then((m) => m.RankingPage),
    title: 'Ranking - Fat Fish',
    data: { seccion: 'Ranking' },
  },
  {
    path: 'opinion/retroalimentacion',
    loadComponent: () =>
      import('./presentation/pages/retroalimentacion/retroalimentacion.page').then(
        (m) => m.RetroalimentacionPage,
      ),
    title: 'Opinión - Fat Fish',
    data: { seccion: 'Opinión' },
  },
  {
    path: 'opinion/encuesta',
    loadComponent: () =>
      import('./presentation/pages/encuesta/encuesta.page').then((m) => m.EncuestaPage),
    title: 'Encuesta - Fat Fish',
    data: { seccion: 'Opinión' },
  },
  { path: '**', redirectTo: '' },
];
