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
    path: 'request-access',
    loadComponent: () =>
      import('./public/pages/request-access/request-access.component').then(
        (m) => m.RequestAccessComponent,
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
        path: 'edit-store/:storeId',
        loadComponent: () =>
          import('./store/pages/register-store/register-store.component').then(
            (m) => m.RegisterStoreComponent,
          ),
      },
      {
        path: 'stores-list',
        loadComponent: () =>
          import('./store/pages/stores-list/stores-list.component').then(
            (m) => m.StoresListComponent,
          ),
      },
      {
        path: 'register-owner',
        loadComponent: () =>
          import('./store/pages/register-owner/register-owner.component').then(
            (m) => m.RegisterOwnerComponent,
          ),
      },
      {
        path: 'edit-owner/:ownerId',
        loadComponent: () =>
          import('./store/pages/register-owner/register-owner.component').then(
            (m) => m.RegisterOwnerComponent,
          ),
      },
      {
        path: 'owners-list',
        loadComponent: () =>
          import('./store/pages/owners-list/owners-list.component').then(
            (m) => m.OwnersListComponent,
          ),
      },
      {
        path: 'register-staff',
        loadComponent: () =>
          import('./staff/pages/register-staff/register-staff.component').then(
            (m) => m.RegisterStaffComponent,
          ),
      },
      {
        path: 'edit-staff/:staffId',
        loadComponent: () =>
          import('./staff/pages/register-staff/register-staff.component').then(
            (m) => m.RegisterStaffComponent,
          ),
      },
      {
        path: 'staff-list',
        loadComponent: () =>
          import('./staff/pages/staff-list/staff-list.component').then(
            (m) => m.StaffListComponent,
          ),
      },
      {
        path: 'clients-list',
        loadComponent: () =>
          import('./clients/pages/client-list/client-list.component').then(
            (m) => m.ClientListComponent,
          ),
      },
      {
        path: 'register-clients',
        loadComponent: () =>
          import('./clients/pages/register-client/register-client.component').then(
            (m) => m.RegisterClientComponent,
          ),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./storage/pages/inventory/inventory.component').then(
            (m) => m.InventoryComponent,
          ),
      },
      {
        path: 'products-list',
        loadComponent: () =>
          import('./products/pages/products-list/products-list.component').then(
            (m) => m.ProductsListComponent,
          ),
      },
      {
        path: 'register-product',
        loadComponent: () =>
          import('./products/pages/register-product/register-product.component').then(
            (m) => m.RegisterProductComponent,
          ),
      },
      {
        path: 'product-detail',
        loadComponent: () =>
          import('./products/pages/product-detail/product-detail.component').then(
            (m) => m.ProductDetailComponent,
          ),
      },
      {
        path: 'catalog/options',
        // canActivate: [permissionGuard],
        // data: { permission: 'catalog.manage' },
        loadComponent: () =>
          import('./products/pages/catalog-lookups/catalog-lookups.component').then(
            (m) => m.CatalogLookupsComponent,
          ),
      },
    ],
  },
];
