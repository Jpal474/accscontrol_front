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
  {
    path: 'login',
    // canActivate: [guestGuard],
    loadComponent: () =>
      import('./auth/pages/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: 'app',
    // canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/pages/shell/shell.component').then(
        (m) => m.ShellComponent,
      ),
    children: [
      {
        path: 'register-store',
        loadComponent: () =>
          import('./store/pages/register-store/register-store.component').then(
            (m) => m.RegisterStoreComponent,
          ),
      },
      {
        path: 'register-owner',
        loadComponent: () =>
          import('./store/pages/register-owner/register-owner.component').then(
            (m) => m.RegisterOwnerComponent,
          ),
      },
    ],
  },
];
