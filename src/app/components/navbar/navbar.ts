import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Carrito } from '../../carrito';
import { CuentaService } from '../../cuenta.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  readonly carrito = inject(Carrito);
  readonly cuenta = inject(CuentaService);
}
