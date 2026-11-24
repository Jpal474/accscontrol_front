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
      changePassword: '/change-password',
      request_access: '/request-access',
    },
    app: {
      start: '/app',
      catalog: { list: '/app/catalogs-list', register: '/app/register-catalogs' },
      admin: {
        start: '/app/admin',
        administrators: '/app/admin/administrators',
        users: '/app/admin/users',
        register: '/app/admin/register',
      },
      client: {
        list: '/app/clients-list',
        register: '/app/register-clients',
        edit: (clientId: string) => `/app/edit-client/${encodeURIComponent(clientId)}`,
      },
      staff: {
        list: '/app/staff-list',
        register: '/app/register-staff',
        edit: (staffId: string) => `/app/edit-staff/${encodeURIComponent(staffId)}`,
      },
      product: {
        list: '/app/products-list',
        register: '/app/register-product',
        edit: (productId: string) => `/app/edit-product/${encodeURIComponent(productId)}`,
        detail: (productId: string) => `/app/product-detail/${encodeURIComponent(productId)}`,
        options: '/app/catalog/options',
        compatibilities: '/app/compabilities-list',
      },
      inventory: '/app/inventory',
      provider: {
        list: '/app/providers-list',
        register: '/app/register-provider',
        edit: (providerId: string) => `/app/edit-provider/${encodeURIComponent(providerId)}`,
      },
      purchases: '/app/purchases',
      pos: '/app/pos',
      sales: {
        history: '/app/pos/sales',
        detail: (saleId: string) => '/app/pos/sales/' + encodeURIComponent(saleId),
      },
      repairs: '/app/repairs',
      repairDetail: (id: string) => '/app/repairs/' + encodeURIComponent(id),
      reports: '/app/reports',
      account: '/app/account',
      recoverySettings: '/app/recovery-settings',

      owner: {
        register: '/app/register-owner',
        list: '/app/owners-list',
        edit: (ownerId: string) => `/app/edit-owner/${ownerId}`,
      },
      store: {
        register: '/app/register-store',
        list: '/app/stores-list',
        edit: (storeId: string) => `/app/edit-store/${storeId}`,
      },
    },
  };
  constructor() {}

  public homeFor(permissions: readonly string[]): string {
    const { app } = this.routes;
    if (permissions.includes('manage_platform_admins')) return app.admin.users;
    if (permissions.includes('manage_store') || permissions.includes('view_all_stores')) return app.start;
    if (permissions.includes('create_sale')) return app.pos;
    if (permissions.some(permission => ['view_own_repairs', 'view_repairs', 'manage_repairs'].includes(permission))) {
      return app.repairs;
    }
    return app.start;
  }

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
