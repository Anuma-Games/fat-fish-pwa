import { EnvioOutbox } from '../models/envio-outbox';

/** Port: submissions waiting on the device until there is a connection. */
export abstract class OutboxRepository {
  abstract guardar(envio: EnvioOutbox): Promise<void>;
  abstract todos(): Promise<EnvioOutbox[]>;
  /** The stored copy of one submission, or undefined if it is not in the outbox. */
  abstract obtener(id: string): Promise<EnvioOutbox | undefined>;
}
