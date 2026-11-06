import { Component, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    DataTableComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  templateUrl: './products-list.component.html',
  styleUrl: './products-list.component.scss',
})
export class ProductsListComponent {
  readonly auth = {
    can: (permission: string) => true,
  };

  private disposed = false;
  private revision = 0;

  // Datos mock en bruto para catálogos y filtros
  private readonly mockItems = [
    {
      id: 'prod-001',
      name: 'Funda Protectora Antigolpes',
      status: 'active',
      variants: [
        {
          sku: 'ACC-PRT-RED',
          price: '250.00',
          currency: 'MXN',
          status: 'active',
        },
      ],
      compatibilities: [{ brandName: 'Motorola', name: 'Moto G54' }],
    },
    {
      id: 'prod-002',
      name: 'Vidrio Templado 9H',
      status: 'active',
      variants: [
        {
          sku: 'ACC-GLS-01',
          price: '120.00',
          currency: 'MXN',
          status: 'active',
        },
      ],
      compatibilities: [{ brandName: 'Apple', name: 'iPhone 13' }],
    },
  ];

  readonly result = signal<any>({
    items: this.mockItems,
    total: this.mockItems.length,
    page: 1,
    pageSize: 20,
  });

  readonly lookups = signal<any>({
    deviceModels: [
      { id: 'mod-1', brandName: 'Motorola', name: 'Moto G54' },
      { id: 'mod-2', brandName: 'Apple', name: 'iPhone 13' },
    ],
    categories: [
      { id: 'cat-1', name: 'Fundas y Carcasas' },
      { id: 'cat-2', name: 'Protectores de Pantalla' },
    ],
  });

  readonly loading = signal(false);
  readonly failed = signal(false);

  private readonly fb = new FormBuilder();
  readonly filters = this.fb.nonNullable.group({
    q: '',
    modelId: '',
    categoryId: '',
    status: 'active',
  });

  readonly columns = [
    { key: 'name', label: 'Producto' },
    { key: 'sku', label: 'SKU' },
    { key: 'price', label: 'Precio' },
    { key: 'models', label: 'Compatibilidad' },
    { key: 'status', label: 'Estado' },
  ];

  readonly rows = computed(
    () =>
      this.result()?.items.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku:
          p.variants
            .filter((v: any) => v.status === 'active')
            .map((v: any) => v.sku)
            .join(', ') || 'Variantes inactivas',
        price:
          p.variants
            .filter((v: any) => v.status === 'active')
            .map((v: any) => v.price + ' ' + v.currency)
            .join(' / ') || '—',
        models:
          p.compatibilities
            .map((m: any) => `${m.brandName} ${m.name}`)
            .join(', ') || 'Sin compatibilidades',
        status: p.status === 'active' ? 'Activo' : 'Inactivo',
      })) || [],
  );

  constructor() {
    void this.load();
  }

  async load(page = 1) {
    const revision = ++this.revision;
    this.loading.set(true);
    this.failed.set(false);

    // Simulamos latencia de red
    await new Promise((r) => setTimeout(r, 250));

    if (!this.disposed && revision === this.revision) {
      this.result.set({
        items: this.mockItems,
        total: this.mockItems.length,
        page: page,
        pageSize: 20,
      });
      this.loading.set(false);
    }
  }

  open(row: Record<string, string | number>) {
    console.log('Abriendo detalle de producto con ID:', row['id']);
    // window.alert(`Navegando al detalle del producto: ${row['id']}`);
  }

  ngOnDestroy() {
    this.disposed = true;
  }
}
