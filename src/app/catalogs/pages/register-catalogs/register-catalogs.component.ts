import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { CatalogsService } from '../../services/catalogs.service';
import { CatalogKind, CreateCatalogEntry, MANAGED_CATALOGS } from '../../interfaces/catalog.interface';
import { AuthService } from '../../../auth/services/auth.service';
import { SelectedStoreService } from '../../../shared/services/selected-store.service';
import { ToastService } from '../../../shared/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { CatalogSelectComponent } from '../../../shared/components/catalog-select/catalog-select.component';
import { CatalogRequest } from '../../../shared/interfaces/catalogs.interface';
@Component({ selector: 'app-register-catalogs', standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterLink, PageHeaderComponent, CatalogSelectComponent],
  templateUrl: './register-catalogs.component.html', styleUrl: './register-catalogs.component.scss' })
export class RegisterCatalogsComponent {
  private readonly service = inject(CatalogsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(SelectedStoreService);
  readonly definitions = MANAGED_CATALOGS.filter(item => this.auth.hasPermission(item.permission));
  readonly kind = signal<CatalogKind>(this.definitions[0]?.key || 'payment-methods');
  readonly definition = computed(() => this.definitions.find(item => item.key === this.kind()));
  readonly busy = signal(false); readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    description: ['', Validators.maxLength(100)], locationCategoryId: [''], isActive: [true],
  });
  readonly fetchLocationCategories = (query: CatalogRequest) => this.service.locationCategories(query);
  constructor() {
    const initial = inject(ActivatedRoute).snapshot.queryParamMap.get('kind');
    this.selectKind(this.definitions.some(item => item.key === initial) ? initial as CatalogKind : this.kind());
    toObservable(this.store.selectedStoreId).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => { this.form.reset({ isActive: true }); this.error.set(''); });
  }
  selectKind(kind: CatalogKind) {
    if (!this.definitions.some(item => item.key === kind)) return;
    this.kind.set(kind); this.form.reset({ isActive: true }); this.error.set('');
    this.form.controls.name.setValidators([Validators.required, Validators.pattern(/\S/), Validators.maxLength(kind === 'locations' ? 15 : 100)]);
    this.form.controls.locationCategoryId.setValidators(kind === 'locations' ? [Validators.required] : []);
    this.form.controls.name.updateValueAndValidity(); this.form.controls.locationCategoryId.updateValueAndValidity();
  }
  submit() {
    const storeId = this.store.selectedStoreId(); const kind = this.kind();
    if (this.busy() || !storeId || !this.definition()) return;
    this.form.controls.name.setValue(this.form.controls.name.value.trim());
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error.set('Revisa los campos señalados.'); return; }
    const values = this.form.getRawValue();
    const body: CreateCatalogEntry = { name: values.name, isActive: values.isActive };
    if (kind === 'locations') { body.description = values.description.trim(); body.locationCategoryId = values.locationCategoryId; }
    this.busy.set(true); this.error.set('');
    this.service.create(kind, body).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.toast.show('Registro creado correctamente.', 'success');
        if (storeId === this.store.selectedStoreId() && kind === this.kind()) void this.router.navigate(['/app/catalogs-list'], { queryParams: { kind } });
      },
      error: err => {
        if (storeId !== this.store.selectedStoreId() || kind !== this.kind()) return;
        const message = err.error?.message || err.message;
        this.error.set(Array.isArray(message) ? message.join(' ') : message || 'No se pudo crear el registro.');
      },
    });
  }
}
