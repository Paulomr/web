import { Routes } from '@angular/router';
import { Main } from './pages/main/main';
import { Minijuegos } from './pages/minijuegos/minijuegos';

export const routes: Routes = [
  { path: '', component: Main },
  { path: 'minijuegos', component: Minijuegos },
  { path: '**', redirectTo: '' },
];
