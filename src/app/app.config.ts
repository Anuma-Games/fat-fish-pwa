import { provideHttpClient, withFetch } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsMx from '@angular/common/locales/es-MX';
import {
  ApplicationConfig,
  LOCALE_ID,
  Provider,
  isDevMode,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { Conectividad } from './domain/ports/conectividad';
import { OutboxRepository } from './domain/ports/outbox.repository';
import { PartidaRepository } from './domain/ports/partida.repository';
import { PerfilRepository } from './domain/ports/perfil.repository';
import { RetroalimentacionRepository } from './domain/ports/retroalimentacion.repository';
import { SesionRepository } from './domain/ports/sesion.repository';
import { PartidaApiRepository } from './infrastructure/api/partida-api.repository';
import { PerfilApiRepository } from './infrastructure/api/perfil-api.repository';
import { RetroalimentacionApiRepository } from './infrastructure/api/retroalimentacion-api.repository';
import { ConnectivityService } from './infrastructure/pwa/connectivity.service';
import { OutboxDb } from './infrastructure/storage/outbox-db';
import { SesionStorage } from './infrastructure/storage/sesion-storage';

registerLocaleData(localeEsMx);

/** Each domain port points to its implementation; the facades only know the ports. */
export const puertos: Provider[] = [
  { provide: PerfilRepository, useExisting: PerfilApiRepository },
  { provide: PartidaRepository, useExisting: PartidaApiRepository },
  { provide: RetroalimentacionRepository, useExisting: RetroalimentacionApiRepository },
  { provide: OutboxRepository, useExisting: OutboxDb },
  { provide: SesionRepository, useExisting: SesionStorage },
  { provide: Conectividad, useExisting: ConnectivityService },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(withFetch()),
    { provide: LOCALE_ID, useValue: 'es-MX' },
    ...puertos,
    // Only active in production builds (npm run lab); ng serve does not register it.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
