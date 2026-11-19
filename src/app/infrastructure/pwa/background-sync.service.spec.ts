import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { BackgroundSyncService } from './background-sync.service';

describe('BackgroundSyncService', () => {
  function crear(swActivo: boolean | null): BackgroundSyncService {
    TestBed.configureTestingModule({
      providers:
        swActivo === null ? [] : [{ provide: SwUpdate, useValue: { isEnabled: swActivo } }],
    });
    return TestBed.inject(BackgroundSyncService);
  }

  // jsdom has neither SyncManager nor navigator.serviceWorker: touching them would throw
  it('does nothing in browsers without Background Sync (Safari, Firefox)', () => {
    expect('SyncManager' in window).toBe(false);
    expect(() => crear(true).programarEnvio()).not.toThrow();
  });

  it('does nothing without the service worker (ng serve) or without SwUpdate', () => {
    expect(() => crear(false).programarEnvio()).not.toThrow();
    TestBed.resetTestingModule();
    expect(() => crear(null).programarEnvio()).not.toThrow();
  });
});
