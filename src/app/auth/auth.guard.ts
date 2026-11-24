import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RoutesService } from '../shared/services/routes.service';
import { AuthService } from './services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const navigation = inject(RoutesService);
  const paths = navigation.routes.public;

  if (!auth.isAuthenticated()) {
    const requested = router.parseUrl(state.url);
    if (requested.fragment && /^[a-f0-9]{64}$/.test(requested.fragment)
      && state.url.startsWith(navigation.routes.app.recoverySettings + '#')) {
      return router.createUrlTree([paths.login], { fragment: requested.fragment });
    }
    return route.data['public'] === true || router.parseUrl(paths.login);
  }

  if (auth.mustChangePassword()) {
    return route.data['passwordChange'] === true || router.parseUrl(paths.changePassword);
  }

  if (route.data['passwordChange']) {
    return router.parseUrl(navigation.homeFor(auth.permissions()));
  }

  return true;
};
