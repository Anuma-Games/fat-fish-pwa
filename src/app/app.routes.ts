import { Routes } from '@angular/router';
import { HistorialPage } from './presentation/pages/historial/historial.page';
import { RetroalimentacionPage } from './presentation/pages/retroalimentacion/retroalimentacion.page';

// Routes as in the PWA design (README 2.3); `seccion` is the title of the phone top bar
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'perfil' },
  {
    path: 'perfil',
    component: HistorialPage,
    title: 'Expediente · Fat Fish',
    data: { seccion: 'Expediente' },
  },
  {
    path: 'opinion/retroalimentacion',
    component: RetroalimentacionPage,
    title: 'Opinión · Fat Fish',
    data: { seccion: 'Opinión' },
  },
  { path: '**', redirectTo: 'perfil' },
];
