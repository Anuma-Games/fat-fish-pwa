import { Component } from '@angular/core';
import { MENSAJE } from '../../../../../core/config/landing.config';
import { Reveal } from '../../reveal.directive';

/** "Why we make it": the casino look switches off so the message stands on its own. */
@Component({
  selector: 'app-landing-mensaje',
  imports: [Reveal],
  templateUrl: './mensaje.section.html',
  styleUrl: './mensaje.section.css',
})
export class MensajeSection {
  protected readonly mensaje = MENSAJE;
}
