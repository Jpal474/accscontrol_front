import {
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { RoutesService } from '../../../shared/services/routes.service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrandComponent } from '../../../shared/components/brand/brand.component';
import { AuthService } from '../../../auth/services/auth.service';
import { CatalogSelectComponent } from '../../../shared/components/catalog-select/catalog-select.component';
import { StoreService } from '../../../store/services/store.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { User } from '../../../auth/interfaces/login.interface';
import { MANAGED_CATALOGS } from '../../../catalogs/interfaces/catalog.interface';


interface SidebarLink {
  label: string;
  icon: string;
  path: string;
  visible: boolean;
  related?: string[];
}

type SidebarEntry =
  | { kind: 'link'; link: SidebarLink }
  | { kind: 'group'; id: string; label: string; icon: string; links: SidebarLink[] };

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    ConfirmDialogComponent,
    RouterOutlet,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    NgTemplateOutlet,
    BrandComponent,
    CatalogSelectComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  readonly open = signal(false);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly confirmation = viewChild.required(ConfirmDialogComponent);
  readonly authSevice = inject(AuthService);
  readonly canManageCatalogs = computed(() => MANAGED_CATALOGS.some(item => this.authSevice.hasPermission(item.permission)));
  readonly isStoreOwner = computed(() => {
    const user: User | null = this.authSevice.currentUser();
    return user?.stores?.some(store => store.role?.trim().toLowerCase() === 'owner') ?? false;
  });

  private readonly router = inject(Router);
  readonly routes = inject(RoutesService).routes;
  private readonly currentNavigation = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => ({ id: event.id, url: event.urlAfterRedirects })),
    ),
    { initialValue: { id: 0, url: this.router.url } },
  );
  readonly currentPath = computed(() => this.currentNavigation().url.split(/[?#]/, 1)[0]);
  private readonly groupOverrides = signal<Record<string, { navigationId: number; open: boolean }>>({});
  readonly showAccount = computed(() => this.authSevice.isAuthenticated() && this.hasAppRoute(this.routes.app.account));
  readonly navigation = computed(() => {
    const routes = this.routes.app;
    const can = (permission: string) => this.authSevice.hasPermission(permission);
    const entries: SidebarEntry[] = [];
    const link = (item: SidebarLink) => {
      if (item.visible) entries.push({ kind: 'link', link: item });
    };
    const group = (id: string, label: string, icon: string, items: SidebarLink[]) => {
      const links = items.filter(item => item.visible);
      if (links.length) entries.push({ kind: 'group', id, label, icon, links });
    };

    link({ label: 'Inicio', icon: 'space_dashboard', path: routes.start, visible: true });
    const canViewSales = can('view_all_sales') || can('view_own_sales');
    link({ label: can('create_sale') ? 'Punto de venta' : 'Ventas', icon: 'point_of_sale',
      path: can('create_sale') ? routes.pos : routes.sales.history,
      visible: can('create_sale') || canViewSales,
      related: [routes.sales.history, routes.sales.detail('')] });
    link({ label: 'Clientes', icon: 'contacts', path: routes.client.list, visible: can('view_clients'),
      related: [routes.client.register, routes.client.edit('')] });
    group('inventory', 'Productos e inventario', 'inventory_2', [
      { label: 'Productos', icon: 'category', path: routes.product.list, visible: can('view_products'),
        related: [routes.product.register, routes.product.edit(''), routes.product.detail(''), routes.product.options] },
      { label: 'Accesorios por celular', icon: 'smartphone', path: routes.product.compatibilities, visible: this.authSevice.isAuthenticated() },
      { label: 'Inventario', icon: 'shelves', path: routes.inventory, visible: can('view_inventory') },
    ]);

    const purchases = { label: 'Compras', icon: 'shopping_cart', path: routes.purchases,
      visible: this.hasAppRoute(routes.purchases) };
    const canListProviders = can('view_providers') && this.hasAppRoute(routes.provider.list);
    const providers = { label: 'Proveedores', icon: 'local_shipping',
      path: canListProviders ? routes.provider.list : routes.provider.register,
      visible: canListProviders
        || (can('manage_providers') && this.hasAppRoute(routes.provider.register)),
      related: [routes.provider.register, routes.provider.edit('')] };
    if (purchases.visible && providers.visible) group('purchases', 'Compras', 'shopping_cart', [purchases, providers]);
    else {
      link(purchases);
      link(providers);
    }

    link({ label: 'Reparaciones', icon: 'build', path: routes.repairs,
      visible: this.hasAppRoute(routes.repairs) && (can('view_repairs') || can('view_own_repairs') || can('manage_repairs')),
      related: [routes.repairDetail('')] });
    group('administration', 'Administraci\u00f3n', 'settings', [
      { label: 'Sucursales', icon: 'storefront', path: routes.store.list,
        visible: can('view_all_stores') || can('manage_store'), related: [routes.store.register, routes.store.edit('')] },
      { label: 'Equipo', icon: 'groups', path: can('view_staff') ? routes.staff.list : routes.staff.register,
        visible: can('view_staff') || can('manage_staff'), related: [routes.staff.register, routes.staff.edit('')] },
      { label: 'Cat\u00e1logos', icon: 'folder_open', path: routes.catalog.list, visible: this.canManageCatalogs(),
        related: [routes.catalog.register] },
      { label: 'Reportes', icon: 'insights', path: routes.reports,
        visible: this.hasAppRoute(routes.reports) && can('manage_store') },
    ]);
    group('platform', 'Administraci\u00f3n de plataforma', 'admin_panel_settings', [
      { label: 'Propietarios', icon: 'supervisor_account', path: routes.owner.list, visible: can('manage_store_owners'),
        related: [routes.owner.register, routes.owner.edit('')] },
      { label: 'Usuarios de la plataforma', icon: 'manage_accounts', path: routes.admin.users,
        visible: can('manage_platform_admins'), related: [routes.admin.start] },
      { label: 'Administradores', icon: 'badge', path: routes.admin.administrators,
        visible: can('manage_platform_admins'), related: [routes.admin.register] },
    ]);
    return entries;
  });

  private hasAppRoute(url: string): boolean {
    const relative = url.slice(this.routes.app.start.length + 1);
    return this.router.config.find(route => route.path === 'app')?.children
      ?.some(route => route.path === relative) ?? false;
  }

  isLinkActive(link: SidebarLink): boolean {
    const path = this.currentPath();
    if (path === link.path) return true;
    return link.related?.some(related => related.endsWith('/') ? path.startsWith(related) : path === related) ?? false;
  }

  isGroupActive(group: Extract<SidebarEntry, { kind: 'group' }>): boolean {
    return group.links.some(link => this.isLinkActive(link));
  }

  isGroupOpen(group: Extract<SidebarEntry, { kind: 'group' }>): boolean {
    const override = this.groupOverrides()[group.id];
    return override?.navigationId === this.currentNavigation().id
      ? override.open
      : this.isGroupActive(group);
  }

  toggleGroup(group: Extract<SidebarEntry, { kind: 'group' }>) {
    const state = { navigationId: this.currentNavigation().id, open: !this.isGroupOpen(group) };
    this.groupOverrides.update(groups => ({ ...groups, [group.id]: state }));
  }

  readonly storesSevice = inject(StoreService);
  readonly selectedStoreService = inject(SelectedStoreService);
  readonly storeControl = new FormControl<string | null>(
    this.selectedStoreService.selectedStoreId(),
  );
  constructor() {
    effect(() => {
      const storeId = this.selectedStoreService.selectedStoreId();
      untracked(() => {
        this.storeControl.setValue(storeId, { emitEvent: false });
      });
    }, { allowSignalWrites: true });
  }
  @HostListener('document:keydown.escape', ['$event'])
  escapeMenu(event: Event) {
    if (this.open()) {
      event.preventDefault();
      this.closeMenu();
    }
  }
  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth >= 1024) this.open.set(false);
  }

  readonly fetchStores = (q: any) => this.storesSevice.getStoresCatalog(q);
  ngOnInit() {
    this.storeControl.valueChanges.subscribe((storeId) => {
      this.selectedStoreService.setSelectedStore(storeId);
      console.log('Tienda activa cambiada:', storeId);

      // Opcional: Puedes forzar un recargar o notificar si estás en la misma ruta
    });
  }

  toggleMenu() {
    if (this.open()) {
      this.closeMenu();
      return;
    }
    this.open.set(true);
    setTimeout(
      () =>
        this.open() &&
        this.element.nativeElement
          .querySelector<HTMLButtonElement>('.mobile-close')
          ?.focus(),
    );
  }
  menuKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMenu();
      return;
    }
    if (event.key !== 'Tab' || !this.open()) return;
    const nodes = Array.from(
      this.element.nativeElement.querySelectorAll<HTMLElement>(
        '.sidebar button, .sidebar a',
      ),
    ).filter(node => node.getClientRects().length > 0);
    const first = nodes[0],
      last = nodes[nodes.length - 1];
    if (event.shiftKey && event.target === first) {
      event.preventDefault();
      last?.focus();
    }
    if (!event.shiftKey && event.target === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  requestLogout() {
    this.closeMenu(false);
    this.confirmation().open();
  }

  async logout() {
    this.authSevice.logout();
    // try {
    //   await this.auth.logout();
    // } catch {
    //   this.notices.show(
    //     'Sesión local cerrada. No se pudo confirmar la revocación; vuelve a intentarlo al recuperar conexión.',
    //     'error',
    //   );
    // } finally {
    //   await this.router.navigateByUrl('/login', { replaceUrl: true });
    // }
  }

  closeMenu(restoreFocus = true) {
    if (!this.open()) return;
    this.open.set(false);
    if (!restoreFocus) return;
    setTimeout(() =>
      this.element.nativeElement
        .querySelector<HTMLButtonElement>('.menu-toggle')
        ?.focus(),
    );
  }
}
