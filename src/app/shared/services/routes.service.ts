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
    },
  };
  constructor() {}

  public async redirectTo(route: string) {
    return this.router.navigateByUrl(route, { replaceUrl: true });
  }
}
