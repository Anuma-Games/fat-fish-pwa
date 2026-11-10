import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HistorialFacade } from '../../../application/facades/historial.facade';

/**
 * /acceso is the only search (README 8.1, docs/diagramas/navegacion.mmd): "Expediente" opens the
 * dossier of the player consulted last time, and a visitor who has not looked up anyone yet is
 * sent to the search instead of an empty dossier.
 */
export const expedienteGuard: CanActivateFn = () =>
  inject(HistorialFacade).jugadorGuardado() !== null || inject(Router).createUrlTree(['/acceso']);
