import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Accs Control Cloud | Tu negocio bajo control',
    loadComponent: () =>
      import('./public/pages/landing/landing.component').then(
        (m) => m.LandingComponent,
      ),
  },
];
