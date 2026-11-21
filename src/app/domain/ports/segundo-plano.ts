/**
 * Port: asks the browser to empty the outbox in the background when the network returns, even if
 * the PWA is closed by then (Background Sync). Where the browser does not support it, it does nothing
 * and the outbox is emptied as before: when the app opens or the connection returns.
 */
export abstract class SegundoPlano {
  abstract programarEnvio(): void;
}
