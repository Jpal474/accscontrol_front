import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class RoutesService {
  private readonly router = inject(Router);
  public routes = {
    public: {
      landing: '',
      login: '/login',
      request_access: '/request-access',
    },
    app: {
      start: '/app',
      owner: {
        register: '/app/register-owner',
        list: '/app/owners-list',
        edit: (ownerId: string) => `/app/edit-owner/${ownerId}`,
      },
    },
  };
  constructor() {}

  public async redirectTo(
    route: string,
    replace = false,
    state?: Record<string, any>,
  ) {
    return this.router.navigateByUrl(route, {
      replaceUrl: replace,
      state,
    });
  }
}
