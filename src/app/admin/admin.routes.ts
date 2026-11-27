import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'users' },
  { path: 'administrators', data: { permissions: ['manage_platform_admins'] }, loadComponent: () => import('./pages/admins-list/admins-list.component').then(m => m.AdminsListComponent) },
  { path: 'users', data: { permissions: ['manage_platform_admins'] }, loadComponent: () => import('./pages/users-list/users-list.component').then(m => m.UsersListComponent) },
  { path: 'register', data: { permissions: ['manage_platform_admins'] }, loadComponent: () => import('./pages/register-admin/register-admin.component').then(m => m.RegisterAdminComponent) },
];
