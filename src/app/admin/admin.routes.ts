import { Routes } from '@angular/router';
import { adminGuard } from './admin.guard';

export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'users' },
  { path: 'administrators', canActivate: [adminGuard], loadComponent: () => import('./pages/admins-list/admins-list.component').then(m => m.AdminsListComponent) },
  { path: 'users', canActivate: [adminGuard], loadComponent: () => import('./pages/users-list/users-list.component').then(m => m.UsersListComponent) },
  { path: 'register', canActivate: [adminGuard], loadComponent: () => import('./pages/register-admin/register-admin.component').then(m => m.RegisterAdminComponent) },
];
