import { Routes } from '@angular/router';
import { AccesoPage } from './presentation/pages/acceso/acceso.page';
import { LandingPage } from './presentation/pages/landing/landing.page';
import { expedienteGuard } from './presentation/pages/historial/expediente.guard';
import { HistorialPage } from './presentation/pages/historial/historial.page';
import { EncuestaPage } from './presentation/pages/encuesta/encuesta.page';
import { RankingPage } from './presentation/pages/ranking/ranking.page';
import { RetroalimentacionPage } from './presentation/pages/retroalimentacion/retroalimentacion.page';

// Routes as in the PWA design (README 2.3); `seccion` is the title of the phone top bar.
// The landing page is the public promotion site: `layout: 'landing'` hides the app shell.
export const routes: Routes = [
  {
    path: '',
    component: LandingPage,
    title: 'Fat Fish: lo que el casino sabe de ti',
    data: { layout: 'landing' },
  },
  {
    path: 'acceso',
    component: AccesoPage,
    title: 'Buscar jugador · Fat Fish',
    data: { seccion: 'Expediente' },
  },
  {
    path: 'perfil',
    component: HistorialPage,
    canActivate: [expedienteGuard],
    title: 'Expediente - Fat Fish',
    data: { seccion: 'Expediente' },
  },
  {
    path: 'ranking',
    component: RankingPage,
    title: 'Ranking - Fat Fish',
    data: { seccion: 'Ranking' },
  },
  {
    path: 'opinion/retroalimentacion',
    component: RetroalimentacionPage,
    title: 'Opinión - Fat Fish',
    data: { seccion: 'Opinión' },
  },
  {
    path: 'opinion/encuesta',
    component: EncuestaPage,
    title: 'Encuesta - Fat Fish',
    data: { seccion: 'Opinión' },
  },
  { path: '**', redirectTo: '' },
];
