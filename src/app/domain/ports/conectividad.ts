import { Signal } from '@angular/core';

/** Port: whether the device has a connection right now. */
export abstract class Conectividad {
  abstract readonly enLinea: Signal<boolean>;
}
