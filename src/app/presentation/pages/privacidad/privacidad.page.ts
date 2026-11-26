import { Component } from '@angular/core';
import { CabeceraPagina } from '../../components/cabecera-pagina/cabecera-pagina';

/** Privacy notice (/privacidad, README 8.5), linked from the footer of the landing page and the menu. */
@Component({
  selector: 'app-privacidad-page',
  imports: [CabeceraPagina],
  templateUrl: './privacidad.page.html',
  styleUrl: './privacidad.page.css',
})
export class PrivacidadPage {
  protected readonly correo = 'anumagames@gmail.com';
  protected readonly actualizacion = '23 de noviembre de 2026';
}
