import { Routes } from '@angular/router';
import { Main } from './pages/main/main';
import { Minijuegos } from './pages/minijuegos/minijuegos';
import { Galeria } from './pages/galeria/galeria';
import { Catalogo } from './pages/catalogo/catalogo';
import { Sedes } from './pages/sedes/sedes';
import { Fidelidad } from './pages/fidelidad/fidelidad';
import { Privacidad } from './pages/privacidad/privacidad';
import { Admin } from './pages/admin/admin';
import { NoEncontrada } from './pages/no-encontrada/no-encontrada';

export const routes: Routes = [
  { path: '', component: Main },
  { path: 'catalogo', component: Catalogo },
  { path: 'sedes', component: Sedes },
  { path: 'galeria', component: Galeria },
  { path: 'minijuegos', component: Minijuegos },
  { path: 'fidelidad', component: Fidelidad },
  { path: 'privacidad', component: Privacidad },
  { path: 'admin', component: Admin },
  {
    path: 'admin/estadisticas',
    loadComponent: () => import('./pages/admin-stats/admin-stats').then((m) => m.AdminStats),
  },
  { path: '**', component: NoEncontrada },
];
