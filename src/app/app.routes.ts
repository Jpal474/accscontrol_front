import { permissionsGuard } from './auth/permissions.guard';
import { MANAGED_CATALOGS } from './catalogs/interfaces/catalog.interface';
import { Routes } from '@angular/router';

const loadPasswordRecovery = () => import('./auth/pages/password-recovery/password-recovery.component')
  .then(m => m.PasswordRecoveryComponent);

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [permissionsGuard],
    data: { public: true },
    title: 'Accs Control Cloud | Tu negocio bajo control',
    loadComponent: () =>
      import('./public/pages/landing/landing.component').then(
        (m) => m.LandingComponent,
      ),
  },
  {
    path: 'login',
    canActivate: [permissionsGuard],
    data: { public: true },
    loadComponent: () =>
      import('./auth/pages/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: 'request-access',
    canActivate: [permissionsGuard],
    data: { public: true },
    loadComponent: () =>
      import('./public/pages/request-access/request-access.component').then(
        (m) => m.RequestAccessComponent,
      ),
  },
  {
    path: 'forgot-password',
    title: 'Recuperar contraseña',
    canActivate: [permissionsGuard],
    data: { public: true, mode: 'request' },
    loadComponent: loadPasswordRecovery,
  },
  {
    path: 'reset-password',
    title: 'Restablecer contraseña',
    canActivate: [permissionsGuard],
    data: { public: true, mode: 'reset' },
    loadComponent: loadPasswordRecovery,
  },
  {
    path: 'change-password',
    title: 'Cambiar contraseña',
    canActivate: [permissionsGuard],
    data: { passwordChange: true },
    loadComponent: () => import('./auth/pages/change-password/change-password.component')
      .then(m => m.ChangePasswordComponent),
  },
  {
    path: 'app',
    canActivate: [permissionsGuard],
    canActivateChild: [permissionsGuard],
    loadComponent: () =>
      import('./layout/pages/shell/shell.component').then(
        (m) => m.ShellComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Dashboard y reportes',
        loadComponent: () => import('./layout/pages/shell/dashboard/dashboard.component')
          .then(m => m.DashboardComponent),
      },
      {
        path: 'recovery-settings',
        title: 'Correo de recuperación',
        data: { mode: 'settings' },
        loadComponent: loadPasswordRecovery,
      },
      {
        path: 'catalogs-list', data: { permissions: MANAGED_CATALOGS.map(catalog => catalog.permission) },
        loadComponent: () => import('./catalogs/pages/catalogs-list/catalogs-list.component').then(m => m.CatalogsListComponent),
      },
      {
        path: 'register-catalogs', data: { permissions: MANAGED_CATALOGS.map(catalog => catalog.permission) },
        loadComponent: () => import('./catalogs/pages/register-catalogs/register-catalogs.component').then(m => m.RegisterCatalogsComponent),
      },
      {
        path: 'admin',
        loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
      },
      {
        path: 'register-store',
        data: { permissions: ['manage_store'] },
        loadComponent: () =>
          import('./store/pages/register-store/register-store.component').then(
            (m) => m.RegisterStoreComponent,
          ),
      },
      {
        path: 'edit-store/:storeId',
        data: { permissions: ['manage_store'] },
        loadComponent: () =>
          import('./store/pages/register-store/register-store.component').then(
            (m) => m.RegisterStoreComponent,
          ),
      },
      {
        path: 'stores-list',
        data: { permissions: ['manage_store', 'view_all_stores'] },
        loadComponent: () =>
          import('./store/pages/stores-list/stores-list.component').then(
            (m) => m.StoresListComponent,
          ),
      },
      {
        path: 'register-owner',
        data: { permissions: ['manage_store_owners'] },
        loadComponent: () =>
          import('./store/pages/register-owner/register-owner.component').then(
            (m) => m.RegisterOwnerComponent,
          ),
      },
      {
        path: 'edit-owner/:ownerId',
        data: { permissions: ['manage_store_owners'] },
        loadComponent: () =>
          import('./store/pages/register-owner/register-owner.component').then(
            (m) => m.RegisterOwnerComponent,
          ),
      },
      {
        path: 'owners-list',
        data: { permissions: ['manage_store_owners'] },
        loadComponent: () =>
          import('./store/pages/owners-list/owners-list.component').then(
            (m) => m.OwnersListComponent,
          ),
      },
      {
        path: 'register-staff',
        data: { permissions: ['manage_staff'] },
        loadComponent: () =>
          import('./staff/pages/register-staff/register-staff.component').then(
            (m) => m.RegisterStaffComponent,
          ),
      },
      {
        path: 'edit-staff/:staffId',
        data: { permissions: ['manage_staff'] },
        loadComponent: () =>
          import('./staff/pages/register-staff/register-staff.component').then(
            (m) => m.RegisterStaffComponent,
          ),
      },
      {
        path: 'staff-list',
        data: { permissions: ['view_staff'] },
        loadComponent: () =>
          import('./staff/pages/staff-list/staff-list.component').then(
            (m) => m.StaffListComponent,
          ),
      },
      {
        path: 'providers-list',
        title: 'Proveedores',
        data: { permissions: ['view_providers'] },
        loadComponent: () => import('./providers/pages/providers-list/providers-list.component')
          .then(m => m.ProvidersListComponent),
      },
      {
        path: 'register-provider',
        title: 'Registrar proveedor',
        data: { permissions: ['manage_providers'] },
        loadComponent: () => import('./providers/pages/register-provider/register-provider.component')
          .then(m => m.RegisterProviderComponent),
      },
      {
        path: 'edit-provider/:providerId',
        title: 'Editar proveedor',
        data: { permissions: ['manage_providers'] },
        loadComponent: () => import('./providers/pages/register-provider/register-provider.component')
          .then(m => m.RegisterProviderComponent),
      },
      {
        path: 'clients-list',
        data: { permissions: ['view_clients'] },
        loadComponent: () =>
          import('./clients/pages/client-list/client-list.component').then(
            (m) => m.ClientListComponent,
          ),
      },
      {
        path: 'register-clients',
        data: { permissions: ['manage_clients'] },
        loadComponent: () =>
          import('./clients/pages/register-client/register-client.component').then(
            (m) => m.RegisterClientComponent,
          ),
      },
      {
        path: 'edit-client/:clientId',
        data: { permissions: ['manage_clients'] },
        loadComponent: () => import('./clients/pages/register-client/register-client.component').then(m => m.RegisterClientComponent),
      },
      {
        path: 'reports',
        title: 'Reportes de ventas',
        data: { permissions: ['manage_store'] },
        loadComponent: () => import('./sales/pages/sales-reports/sales-reports.component').then(m => m.SalesReportsComponent),
      },
      {
        path: 'pos',
        data: { permissions: ['create_sale'] },
        loadComponent: () => import('./sales/pages/checkout/checkout.component').then(m => m.CheckoutComponent),
      },
      {
        path: 'pos/sales',
        data: { permissions: ['view_all_sales', 'view_own_sales'] },
        loadComponent: () => import('./sales/pages/sale-detail/sale-detail.component').then(m => m.SaleDetailComponent),
      },
      {
        path: 'pos/sales/:saleId',
        data: { permissions: ['view_all_sales', 'view_own_sales'] },
        loadComponent: () => import('./sales/pages/sale-detail/sale-detail.component').then(m => m.SaleDetailComponent),
      },
      {
        path: 'repairs',
        title: 'Reparaciones',
        data: { permissions: ['view_repairs', 'view_own_repairs', 'manage_repairs'] },
        loadComponent: () => import('./repairs/pages/repairs/repairs.component').then(m => m.RepairsComponent),
      },
      {
        path: 'repairs/:repairId',
        title: 'Expediente de reparación',
        data: { permissions: ['view_repairs', 'view_own_repairs', 'manage_repairs'] },
        loadComponent: () => import('./repairs/pages/repair-detail/repair-detail.component').then(m => m.RepairDetailComponent),
      },
      {
        path: 'inventory',
        data: { storeOperationsOnly: true, permissions: ['view_inventory'] },
        loadComponent: () =>
          import('./storage/pages/inventory/inventory.component').then(
            (m) => m.InventoryComponent,
          ),
      },
      {
        path: 'compabilities-list',
        title: 'Accesorios por celular',
        data: { storeOperationsOnly: true },
        loadComponent: () => import('./products/pages/compabilities-list/compabilities-list.component')
          .then(m => m.CompabilitiesListComponent),
      },
      {
        path: 'products-list',
        data: { storeOperationsOnly: true, permissions: ['view_products'] },
        loadComponent: () =>
          import('./products/pages/products-list/products-list.component').then(
            (m) => m.ProductsListComponent,
          ),
      },
      {
        path: 'register-product',
        data: { storeOperationsOnly: true, permissions: ['manage_products'] },
        loadComponent: () =>
          import('./products/pages/register-product/register-product.component').then(
            (m) => m.RegisterProductComponent,
          ),
      },
      {
        path: 'edit-product/:id',
        data: { storeOperationsOnly: true, permissions: ['manage_products'] },
        loadComponent: () => import('./products/pages/register-product/register-product.component').then(m => m.RegisterProductComponent),
      },
      {
        path: 'product-detail/:id',
        data: { storeOperationsOnly: true, permissions: ['view_products'] },
        loadComponent: () =>
          import('./products/pages/product-detail/product-detail.component').then(
            (m) => m.ProductDetailComponent,
          ),
      },
      {
        path: 'catalog/options',
        data: { storeOperationsOnly: true },
        loadComponent: () =>
          import('./products/pages/catalog-lookups/catalog-lookups.component').then(
            (m) => m.CatalogLookupsComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
