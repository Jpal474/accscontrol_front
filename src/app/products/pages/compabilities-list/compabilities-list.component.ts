import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { CompatibilityModel, CompatibilityResults } from '../../interfaces/product.interface';
import { ProductsService } from '../../services/products.service';
import { productImageUrl } from '../../utils/product-image';
import { formatProductMoney } from '../../utils/product-money';

@Component({
  selector: 'app-compabilities-list',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent],
  templateUrl: './compabilities-list.component.html',
  styleUrl: './compabilities-list.component.scss',
})
export class CompabilitiesListComponent {
  private readonly products = inject(ProductsService);
  readonly store = inject(SelectedStoreService);
  readonly filters = inject(FormBuilder).nonNullable.group({ brand: '', model: '' });
  readonly brand = signal('');
  readonly models = signal<CompatibilityModel[]>([]);
  readonly brands = computed(() => this.groupModels(this.models()));
  readonly modelOptions = computed(() => this.brands().find(brand => brand.id === this.brand())?.models ?? []);
  readonly results = signal<CompatibilityResults | null>(null);
  readonly modelsLoading = signal(false);
  readonly resultsLoading = signal(false);
  readonly modelsError = signal(false);
  readonly resultsError = signal(false);
  readonly expandedRow = signal<string | null>(null);
  readonly modelFilter = signal('');
  readonly imageUrl = productImageUrl;
  readonly formatMoney = formatProductMoney;

  private readonly reload = signal(0);
  private readonly request = signal<{ storeId: string; modelId: string } | null>(null);

  constructor() {
    effect(onCleanup => {
      const storeId = this.store.selectedStoreId();
      this.reload();
      this.filters.reset();
      this.brand.set('');
      this.models.set([]);
      this.modelsError.set(false);
      this.modelsLoading.set(!!storeId);
      this.clearResults();
      if (!storeId) return;

      const subscription = this.products.compatibilityModels().subscribe({
        next: response => { this.models.set(response.data); this.modelsLoading.set(false); },
        error: () => { this.modelsError.set(true); this.modelsLoading.set(false); },
      });
      onCleanup(() => subscription.unsubscribe());
    }, { allowSignalWrites: true });

    effect(onCleanup => {
      const request = this.request();
      if (!request || request.storeId !== this.store.selectedStoreId()) return;
      const subscription = this.products.compatibleAccessories(request.modelId).subscribe({
        next: response => { this.results.set(response.data); this.resultsLoading.set(false); },
        error: () => { this.resultsError.set(true); this.resultsLoading.set(false); },
      });
      onCleanup(() => subscription.unsubscribe());
    }, { allowSignalWrites: true });
  }

  retryModels() {
    this.reload.update(value => value + 1);
  }

  changeBrand() {
    this.brand.set(this.filters.controls.brand.value);
    this.filters.controls.model.reset();
    this.clearResults();
  }

  clearResults() {
    this.request.set(null);
    this.results.set(null);
    this.resultsError.set(false);
    this.resultsLoading.set(false);
    this.expandedRow.set(null);
    this.modelFilter.set('');
  }

  search() {
    const storeId = this.store.selectedStoreId();
    const modelId = this.filters.controls.model.value;
    if (!storeId || !this.modelOptions().some(model => model.id === modelId)) return;
    this.clearResults();
    this.resultsLoading.set(true);
    this.request.set({ storeId, modelId });
  }

  toggleModels(rowId: string) {
    this.modelFilter.set('');
    this.expandedRow.update(current => current === rowId ? null : rowId);
  }

  groupModels(models: CompatibilityModel[], search = '') {
    const term = search.trim().toLocaleLowerCase('es');
    const groups = new Map<string, { id: string; name: string; models: CompatibilityModel[] }>();
    for (const model of models) {
      const { id, name } = model.brand ?? { id: 'unassigned', name: 'Sin marca registrada' };
      if (!`${name} ${model.name}`.toLocaleLowerCase('es').includes(term)) continue;
      const group = groups.get(id) ?? { id, name, models: [] };
      group.models.push(model);
      groups.set(id, group);
    }
    const compare = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true });
    return [...groups.values()].sort((a, b) => compare(a.name, b.name)).map(group => ({
      ...group, models: group.models.sort((a, b) => compare(a.name, b.name)),
    }));
  }
}
