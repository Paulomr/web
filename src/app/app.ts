import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { CarritoPanel } from './components/carrito/carrito-panel';
import { BearnieBot } from './components/bearnie-bot/bearnie-bot';
import { ProductoModal } from './components/producto-modal/producto-modal';
import { Toast } from './components/toast/toast';
import { RegistroModal } from './components/registro-modal/registro-modal';
import { AnaliticaService } from './analitica.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, CarritoPanel, BearnieBot, ProductoModal, Toast, RegistroModal],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor() {
    inject(AnaliticaService).iniciar();
  }
}
