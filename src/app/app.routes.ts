import { Routes } from '@angular/router';
import { Main } from './pages/main/main';
import { Minijuegos } from './pages/minijuegos/minijuegos';
import { Galeria } from './pages/galeria/galeria';
import { Catalogo } from './pages/catalogo/catalogo';
import { NoEncontrada } from './pages/no-encontrada/no-encontrada';

export const routes: Routes = [
  { path: '', component: Main },
  { path: 'catalogo', component: Catalogo },
  { path: 'galeria', component: Galeria },
  { path: 'minijuegos', component: Minijuegos },
  { path: '**', component: NoEncontrada },
];
