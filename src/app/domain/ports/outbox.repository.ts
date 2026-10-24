import { EnvioOutbox } from '../models/retroalimentacion';

/** Port: submissions waiting on the device until there is a connection. */
export abstract class OutboxRepository {
  abstract guardar(envio: EnvioOutbox): Promise<void>;
  abstract todos(): Promise<EnvioOutbox[]>;
}
