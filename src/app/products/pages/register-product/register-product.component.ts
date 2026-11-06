import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
const money = /^(0|[1-9]\d{0,15})\.\d{2}$/;
@Component({
  selector: 'app-register-product',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    SkeletonComponent,
  ],
  templateUrl: './register-product.component.html',
  styleUrl: './register-product.component.scss',
})
export class RegisterProductComponent {
  private readonly fb = inject(FormBuilder);
  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');

  private disposed = false;
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly failed = signal(false);
  readonly error = signal('');

  // Datos Mock en bruto para categorías, marcas, moneda y modelos de dispositivos
  readonly lookups = signal<any>({
    categories: [
      { id: 'cat-1', name: 'Fundas y Carcasas', active: true },
      { id: 'cat-2', name: 'Protectores de Pantalla', active: true },
    ],
    brands: [
      { id: 'brand-1', name: 'Motorola', active: true },
      { id: 'brand-2', name: 'Apple', active: true },
    ],
    deviceModels: [
      { id: 'mod-1', brandName: 'Motorola', name: 'Moto G54', active: true },
      { id: 'mod-2', brandName: 'Apple', name: 'iPhone 13', active: true },
      { id: 'mod-3', brandName: 'Samsung', name: 'Galaxy A54', active: true },
    ],
  });

  readonly currency = signal('MXN');
  readonly selectedModels = signal<string[]>([]);
  readonly modelSearch = signal('');
  readonly modelsOpen = signal(false);
  readonly activeModelIndex = signal(0);

  searchModels(value: string) {
    this.modelSearch.set(value);
    this.activeModelIndex.set(0);
    this.modelsOpen.set(true);
  }

  selectModel(id: string) {
    if (this.availableModels().some((model: { id: string }) => model.id === id))
      this.selectedModels.update((ids) => [...ids, id]);
    this.activeModelIndex.set(0);
  }

  modelKeydown(event: KeyboardEvent) {
    const count = Math.min(30, this.availableModels().length);
    if (event.key === 'Escape' || event.key === 'Tab') {
      this.modelsOpen.set(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.modelsOpen()) {
        this.modelsOpen.set(true);
        this.activeModelIndex.set(0);
      } else if (count) {
        this.activeModelIndex.update(
          (index) =>
            (index + (event.key === 'ArrowDown' ? 1 : -1) + count) % count,
        );
      }
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!this.modelsOpen()) this.modelsOpen.set(true);
      else {
        const model = this.availableModels()[this.activeModelIndex()];
        if (model) this.selectModel(model.id);
      }
    }
  }

  @HostListener('document:click', ['$event'])
  closeModelsOutside(event: MouseEvent) {
    const picker =
      this.element.nativeElement.querySelector('.model-multiselect');
    if (picker && !picker.contains(event.target as Node))
      this.modelsOpen.set(false);
  }

  readonly availableModels = computed(() => {
    const normalize = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    const terms = normalize(this.modelSearch())
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const selected = new Set(this.selectedModels());
    return (this.lookups()?.deviceModels || []).filter((model: any) => {
      const label = normalize(`${model.brandName || ''} ${model.name}`);
      return (
        model.active &&
        !selected.has(model.id) &&
        terms.every((term) => label.includes(term))
      );
    });
  });

  readonly selectedModelRecords = computed(() => {
    const selected = new Set(this.selectedModels());
    return (this.lookups()?.deviceModels || []).filter((model: any) =>
      selected.has(model.id),
    );
  });

  removeModel(id: string) {
    this.selectedModels.update((ids) => ids.filter((value) => value !== id));
  }

  private variant(value?: any) {
    return this.fb.nonNullable.group({
      id: value?.id || '',
      name: [
        value?.name || 'Estándar',
        [
          Validators.required,
          Validators.maxLength(100),
          Validators.pattern(/\S/),
        ],
      ],
      sku: [
        value?.sku || '',
        [
          Validators.required,
          Validators.pattern(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/),
        ],
      ],
      price: [
        value?.price || '',
        [Validators.required, Validators.pattern(money)],
      ],
      cost: [
        value?.cost || '',
        [Validators.required, Validators.pattern(money)],
      ],
      status: value?.status || 'active',
      barcodes: value?.barcodes?.join(', ') || '',
      attributes: this.fb.group({}),
    });
  }

  readonly form = this.fb.nonNullable.group({
    name: [
      '',
      [
        Validators.required,
        Validators.maxLength(160),
        Validators.pattern(/\S/),
      ],
    ],
    description: ['', Validators.maxLength(4000)],
    categoryId: '',
    brandId: '',
    status: 'active',
    attributes: this.fb.group({}),
    variants: this.fb.array([this.variant()]),
  });

  get variants() {
    return this.form.controls.variants;
  }

  constructor() {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.failed.set(false);

    // Simulamos latencia de red
    await new Promise((r) => setTimeout(r, 250));

    if (this.disposed) return;
    this.loading.set(false);
  }

  addVariant() {
    if (this.variants.length < 100) this.variants.push(this.variant());
  }

  private showError(message: string) {
    this.error.set(message);
    setTimeout(() => {
      if (this.disposed) return;
      const alert =
        this.element.nativeElement.querySelector<HTMLElement>(
          '[data-save-error]',
        );
      alert?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      alert?.focus();
    });
  }

  validationMessages(): string[] {
    const messages: string[] = [];
    if (this.form.controls.name.invalid)
      messages.push('Nombre del producto: escribe entre 1 y 160 caracteres.');
    if (this.form.controls.description.invalid)
      messages.push('Descripción: máximo 4000 caracteres.');

    this.variants.controls.forEach((variant, index) => {
      const prefix = `Variante ${index + 1}`;
      if (variant.controls.name.invalid)
        messages.push(`${prefix}: escribe un nombre de hasta 100 caracteres.`);
      if (variant.controls.sku.invalid)
        messages.push(
          `${prefix}: el SKU es obligatorio y admite hasta 64 letras, números, puntos, guiones o guiones bajos.`,
        );
      for (const field of ['price', 'cost'] as const)
        if (variant.controls[field].invalid)
          messages.push(
            `${prefix}: ${field === 'price' ? 'precio' : 'costo'} obligatorio, sin comas y con dos decimales (ejemplo: 200.00).`,
          );
    });
    return messages;
  }

  async save() {
    this.form.markAllAsTouched();
    this.error.set('');
    if (this.busy()) return;

    if (this.form.invalid) {
      this.showError(this.validationMessages().join(' '));
      return;
    }

    this.busy.set(true);
    await new Promise((r) => setTimeout(r, 350)); // Simula guardado
    alert('¡Producto guardado de forma simulada con éxito!');
    this.busy.set(false);
  }

  ngOnDestroy() {
    this.disposed = true;
  }
}
