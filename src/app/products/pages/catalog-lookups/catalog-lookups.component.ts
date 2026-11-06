import { Component, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogLookups } from '../../interfaces/catalogs.interface';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

@Component({
  selector: 'app-catalog-lookups',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    SkeletonComponent,
  ],
  templateUrl: './catalog-lookups.component.html',
  styleUrl: './catalog-lookups.component.scss',
})
export class CatalogLookupsComponent {
  private disposed = false;

  readonly kinds = [
    { key: 'categories', label: 'Categorías' },
    { key: 'brands', label: 'Marcas de producto' },
    { key: 'deviceBrands', label: 'Marcas de teléfono' },
    { key: 'deviceModels', label: 'Modelos de teléfono' },
  ] as const;

  readonly kind = signal<keyof CatalogLookups>('categories');

  // Datos mock en bruto para simular las opciones de catálogo
  readonly data = signal<any>({
    categories: [
      { id: 'cat-1', name: 'Fundas y Carcasas', active: true },
      { id: 'cat-2', name: 'Protectores de Pantalla', active: true },
    ],
    brands: [
      { id: 'brand-1', name: 'Motorola', active: true },
      { id: 'brand-2', name: 'Apple', active: true },
    ],
    deviceBrands: [
      { id: 'dbrand-1', name: 'Motorola', active: true },
      { id: 'dbrand-2', name: 'Apple', active: true },
      { id: 'dbrand-3', name: 'Samsung', active: true },
    ],
    deviceModels: [
      {
        id: 'dmod-1',
        name: 'Moto G54',
        brandId: 'dbrand-1',
        brandName: 'Motorola',
        active: true,
      },
      {
        id: 'dmod-2',
        name: 'iPhone 13',
        brandId: 'dbrand-2',
        brandName: 'Apple',
        active: true,
      },
    ],
  });

  readonly editing = signal<string | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');

  readonly records = computed(() => this.data()?.[this.kind()] || []);

  private readonly fb = new FormBuilder();
  readonly form = this.fb.nonNullable.group({
    name: [
      '',
      [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(/\S/),
      ],
    ],
    active: true,
    brandId: '',
  });

  constructor() {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    await new Promise((r) => setTimeout(r, 200)); // Simula latencia
    if (!this.disposed) {
      this.loading.set(false);
    }
  }

  choose(event: Event) {
    this.kind.set(
      (event.target as HTMLSelectElement).value as keyof CatalogLookups,
    );
    this.cancel();
  }

  cancel() {
    this.editing.set(null);
    this.form.reset({ name: '', active: true, brandId: '' });
    this.error.set('');
  }

  edit(record: any) {
    this.editing.set(record.id);
    this.form.setValue({
      name: record.name,
      active: record.active,
      brandId: record.brandId || '',
    });
    this.error.set('');
  }

  async save() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;

    const value = this.form.getRawValue();
    if (this.kind() === 'deviceModels' && !value.brandId) {
      this.error.set('Selecciona una marca de teléfono.');
      return;
    }

    this.error.set('');
    this.busy.set(true);

    // Simula guardado con latencia
    await new Promise((r) => setTimeout(r, 300));

    const currentData = this.data();
    const currentList = [...currentData[this.kind()]];
    const editId = this.editing();

    if (editId) {
      // Actualiza existente
      const index = currentList.findIndex((item: any) => item.id === editId);
      if (index > -1) {
        currentList[index] = {
          ...currentList[index],
          name: value.name.trim(),
          active: value.active,
          ...(this.kind() === 'deviceModels'
            ? {
                brandId: value.brandId,
                brandName:
                  currentData.deviceBrands.find(
                    (b: any) => b.id === value.brandId,
                  )?.name || '',
              }
            : {}),
        };
      }
    } else {
      // Crea nuevo registro mock
      const newId = 'mock-' + Date.now();
      const newItem: any = {
        id: newId,
        name: value.name.trim(),
        active: value.active,
      };
      if (this.kind() === 'deviceModels') {
        newItem.brandId = value.brandId;
        newItem.brandName =
          currentData.deviceBrands.find((b: any) => b.id === value.brandId)
            ?.name || '';
      }
      currentList.push(newItem);
    }

    this.data.set({
      ...currentData,
      [this.kind()]: currentList,
    });

    this.cancel();
    this.busy.set(false);
  }

  ngOnDestroy() {
    this.disposed = true;
  }
}
