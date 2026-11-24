import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { repairsGuard } from './repairs/repairs.guard';
import { salesGuard } from './sales/sales.guard';
import { catalogsGuard } from './catalogs/catalogs.guard';
import { productsGuard } from './products/products.guard';
import { providersGuard } from './providers/providers.guard';
import { inventoryGuard } from './storage/inventory.guard';

const loadPasswordRecovery = () => import('./auth/pages/password-recovery/password-recovery.component')
  .then(m => m.PasswordRecoveryComponent);

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [authGuard],
    data: { public: true },
    title: 'Accs Control Cloud | Tu negocio bajo control',
    loadComponent: () =>
      import('./public/pages/landing/landing.component').then(
        (m) => m.LandingComponent,
      ),
  },
  {
    path: 'login',
    canActivate: [authGuard],
    data: { public: true },
    loadComponent: () =>
      import('./auth/pages/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: 'request-access',
    canActivate: [authGuard],
    data: { public: true },
    loadComponent: () =>
      import('./public/pages/request-access/request-access.component').then(
        (m) => m.RequestAccessComponent,
      ),
  },
  {
    path: 'forgot-password',
    title: 'Recuperar contraseña',
    canActivate: [authGuard],
    data: { public: true, mode: 'request' },
    loadComponent: loadPasswordRecovery,
  },
  {
    path: 'reset-password',
    title: 'Restablecer contraseña',
    canActivate: [authGuard],
    data: { public: true, mode: 'reset' },
    loadComponent: loadPasswordRecovery,
  },
  {
    path: 'change-password',
    title: 'Cambiar contraseña',
    canActivate: [authGuard],
    data: { passwordChange: true },
    loadComponent: () => import('./auth/pages/change-password/change-password.component')
      .then(m => m.ChangePasswordComponent),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('./layout/pages/shell/shell.component').then(
        (m) => m.ShellComponent,
      ),
    children: [
      {
        path: 'recovery-settings',
        title: 'Correo de recuperación',
        data: { mode: 'settings' },
        loadComponent: loadPasswordRecovery,
      },
      {
        path: 'catalogs-list', canActivate: [catalogsGuard],
        loadComponent: () => import('./catalogs/pages/catalogs-list/catalogs-list.component').then(m => m.CatalogsListComponent),
      },
      {
        path: 'register-catalogs', canActivate: [catalogsGuard],
        loadComponent: () => import('./catalogs/pages/register-catalogs/register-catalogs.component').then(m => m.RegisterCatalogsComponent),
      },
      {
        path: 'admin',
        loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
      },
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
        path: 'providers-list',
        title: 'Proveedores',
        canActivate: [providersGuard],
        data: { permission: 'view_providers' },
        loadComponent: () => import('./providers/pages/providers-list/providers-list.component')
          .then(m => m.ProvidersListComponent),
      },
      {
        path: 'register-provider',
        title: 'Registrar proveedor',
        canActivate: [providersGuard],
        data: { permission: 'manage_providers' },
        loadComponent: () => import('./providers/pages/register-provider/register-provider.component')
          .then(m => m.RegisterProviderComponent),
      },
      {
        path: 'edit-provider/:providerId',
        title: 'Editar proveedor',
        canActivate: [providersGuard],
        data: { permission: 'manage_providers' },
        loadComponent: () => import('./providers/pages/register-provider/register-provider.component')
          .then(m => m.RegisterProviderComponent),
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
        path: 'edit-client/:clientId',
        loadComponent: () => import('./clients/pages/register-client/register-client.component').then(m => m.RegisterClientComponent),
      },
      {
        path: 'reports',
        title: 'Reportes de ventas',
        canActivate: [salesGuard],
        data: { permissions: ['manage_store'] },
        loadComponent: () => import('./sales/pages/sales-reports/sales-reports.component').then(m => m.SalesReportsComponent),
      },
      {
        path: 'pos',
        canActivate: [salesGuard],
        data: { permissions: ['create_sale'] },
        loadComponent: () => import('./sales/pages/checkout/checkout.component').then(m => m.CheckoutComponent),
      },
      {
        path: 'pos/sales',
        canActivate: [salesGuard],
        data: { permissions: ['view_all_sales', 'view_own_sales'] },
        loadComponent: () => import('./sales/pages/sale-detail/sale-detail.component').then(m => m.SaleDetailComponent),
      },
      {
        path: 'pos/sales/:saleId',
        canActivate: [salesGuard],
        data: { permissions: ['view_all_sales', 'view_own_sales'] },
        loadComponent: () => import('./sales/pages/sale-detail/sale-detail.component').then(m => m.SaleDetailComponent),
      },
      {
        path: 'repairs',
        title: 'Reparaciones',
        canActivate: [repairsGuard],
        loadComponent: () => import('./repairs/pages/repairs/repairs.component').then(m => m.RepairsComponent),
      },
      {
        path: 'repairs/:repairId',
        title: 'Expediente de reparación',
        canActivate: [repairsGuard],
        loadComponent: () => import('./repairs/pages/repair-detail/repair-detail.component').then(m => m.RepairDetailComponent),
      },
      {
        path: 'inventory',
        canActivate: [inventoryGuard],
        loadComponent: () =>
          import('./storage/pages/inventory/inventory.component').then(
            (m) => m.InventoryComponent,
          ),
      },
      {
        path: 'compabilities-list',
        title: 'Accesorios por celular',
        canActivate: [productsGuard], data: { authenticatedOnly: true },
        loadComponent: () => import('./products/pages/compabilities-list/compabilities-list.component')
          .then(m => m.CompabilitiesListComponent),
      },
      {
        path: 'products-list',
        canActivate: [productsGuard], data: { permission: 'view_products' },
        loadComponent: () =>
          import('./products/pages/products-list/products-list.component').then(
            (m) => m.ProductsListComponent,
          ),
      },
      {
        path: 'register-product',
        canActivate: [productsGuard], data: { permission: 'manage_products' },
        loadComponent: () =>
          import('./products/pages/register-product/register-product.component').then(
            (m) => m.RegisterProductComponent,
          ),
      },
      {
        path: 'edit-product/:id',
        canActivate: [productsGuard], data: { permission: 'manage_products' },
        loadComponent: () => import('./products/pages/register-product/register-product.component').then(m => m.RegisterProductComponent),
      },
      {
        path: 'product-detail/:id',
        canActivate: [productsGuard], data: { permission: 'view_products' },
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
  { path: '**', redirectTo: '' },
];
