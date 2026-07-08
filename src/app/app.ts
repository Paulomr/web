import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { CarritoPanel } from './components/carrito/carrito-panel';
import { BearnieBot } from './components/bearnie-bot/bearnie-bot';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, CarritoPanel, BearnieBot],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
