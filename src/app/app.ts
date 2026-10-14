import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { CarritoPanel } from './components/carrito/carrito-panel';
import { ProductoModal } from './components/producto-modal/producto-modal';
import { Toast } from './components/toast/toast';
import { RegistroModal } from './components/registro-modal/registro-modal';
import { WhatsappFab } from './components/whatsapp-fab/whatsapp-fab';
import { BienvenidaAviso } from './components/bienvenida-aviso/bienvenida-aviso';
import { AnaliticaService } from './analitica.service';
import { PixelService } from './pixel.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, CarritoPanel, ProductoModal, Toast, RegistroModal, WhatsappFab, BienvenidaAviso],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor() {
    inject(AnaliticaService).iniciar();
    inject(PixelService).iniciar();
  }
}
