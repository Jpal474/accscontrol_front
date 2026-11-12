import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { MANAGED_CATALOGS } from './interfaces/catalog.interface';
export const catalogsGuard: CanActivateFn = () => {
  const auth = inject(AuthService); const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  return MANAGED_CATALOGS.some(catalog => auth.hasPermission(catalog.permission)) || router.createUrlTree(['/app']);
};
