import { Injectable } from '@angular/core';
import { EnvioOutbox } from '../../domain/models/retroalimentacion';

const DB_NAME = 'fatfish-pwa';
const DB_VERSION = 1;
const STORE = 'outbox';

/** Outbox in IndexedDB: submissions that could not reach the API wait here until there is a connection. */
@Injectable({ providedIn: 'root' })
export class OutboxDb {
  private dbPromise?: Promise<IDBDatabase>;

  guardar(envio: EnvioOutbox): Promise<void> {
    return this.tx('readwrite', (store) => store.put(envio)).then(() => undefined);
  }

  todos(): Promise<EnvioOutbox[]> {
    return this.tx('readonly', (store) => store.getAll()).then((rows) =>
      (rows as EnvioOutbox[]).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)),
    );
  }

  private open(): Promise<IDBDatabase> {
    this.dbPromise ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('estado', 'estado');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.dbPromise;
  }

  private async tx<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
