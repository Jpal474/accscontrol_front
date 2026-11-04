import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    RouterLink,
    PageHeaderComponent,
    SkeletonComponent,
    EmptyStateComponent,
  ],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent {
  // Auth mock para pruebas visuales (permite ver botones de gestión)
  readonly auth = {
    can: (permission: string) => true,
  };

  private readonly route = injectActivatedRouteMock();
  readonly id = this.route.snapshot.paramMap.get('id') || 'prod-001';

  private disposed = false;
  readonly product = signal<any | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly images = signal<Record<string, string>>({});
  readonly imageError = signal(false);

  constructor() {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.failed.set(false);

    // Simulamos latencia de red
    await new Promise((r) => setTimeout(r, 250));

    // Datos mock en bruto para el detalle del producto
    const mockProduct = {
      id: this.id,
      name: 'Funda Protectora Antigolpes Uso Rudo',
      status: 'active',
      description:
        'Funda de alta resistencia con protección reforzada en esquinas para absorción de impactos.',
      categoryName: 'Fundas y Carcasas',
      brandName: 'Motorola',
      attributes: {
        Material: 'TPU + Policarbonato',
        Acabado: 'Mate anti-huellas',
      },
      variants: [
        {
          id: 'var-1',
          name: 'Rojo Carmesí',
          status: 'active',
          sku: 'ACC-PRT-RED',
          price: '250.00',
          cost: '140.00',
          currency: 'MXN',
          barcodes: ['7501234567890'],
          attributes: { Color: 'Rojo' },
        },
        {
          id: 'var-2',
          name: 'Azul Medianoche',
          status: 'active',
          sku: 'ACC-PRT-BLU',
          price: '250.00',
          cost: '140.00',
          currency: 'MXN',
          barcodes: ['7501234567891'],
          attributes: { Color: 'Azul' },
        },
      ],
      compatibilities: [
        { id: 'mod-1', brandName: 'Motorola', name: 'Moto G54', active: true },
      ],
      images: [
        {
          id: 'img-1',
          altText: 'Vista frontal de la funda',
          url: 'https://placehold.co/400x400/png',
        },
      ],
    };

    if (!this.disposed) {
      this.product.set(mockProduct);
      // Precargamos una URL simulada para la imagen de prueba
      this.images.set({ 'img-1': 'https://placehold.co/400x400/png' });
      this.imageError.set(false);
      this.loading.set(false);
    }
  }

  attributes(value: Record<string, unknown>) {
    return Object.entries(value || {}).map(([name, value]) => ({
      name,
      value: this.attributeText(value),
    }));
  }

  private attributeText(value: unknown, depth = 0): string {
    if (value === null) return '—';
    if (depth > 4) return 'Valor estructurado';
    if (Array.isArray(value))
      return value
        .map((item) => this.attributeText(item, depth + 1))
        .join(', ');
    if (typeof value === 'object')
      return Object.entries(value as Record<string, unknown>)
        .map(
          ([name, item]) => name + ': ' + this.attributeText(item, depth + 1),
        )
        .join('; ');
    return String(value);
  }

  async upload(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    if (!file) return;

    this.busy.set(true);
    await new Promise((r) => setTimeout(r, 300));

    // Simulamos la inserción exitosa de una nueva imagen de prueba
    const current = this.product();
    if (current) {
      const newImgId = 'img-' + Date.now();
      current.images.push({
        id: newImgId,
        altText: file.name,
        url: 'https://placehold.co/400x400/png',
      });
      this.images.update((urls) => ({
        ...urls,
        [newImgId]: 'https://placehold.co/400x400/png',
      }));
      this.product.set({ ...current });
    }

    this.busy.set(false);
    input.value = '';
  }

  async remove(id: string) {
    this.busy.set(true);
    await new Promise((r) => setTimeout(r, 200));

    const current = this.product();
    if (current) {
      current.images = current.images.filter((img: any) => img.id !== id);
      this.product.set({ ...current });
    }

    this.busy.set(false);
  }

  ngOnDestroy() {
    this.disposed = true;
    this.images.set({});
  }
}

function injectActivatedRouteMock() {
  return {
    snapshot: {
      paramMap: {
        get: (key: string) => 'prod-001',
      },
    },
  };
}
