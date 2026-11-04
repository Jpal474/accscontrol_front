import { DatePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormsModule,
  Validators,
  FormBuilder,
} from '@angular/forms';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import {
  InventoryLocation,
  InventoryVariant,
  StockBalance,
  StockCount,
  StockMovement,
  StockReservation,
} from '../../interfaces/inventory.interface';

type View = 'balances' | 'movements' | 'reservations' | 'counts' | 'locations';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    DatePipe,
    PageHeaderComponent,
    SkeletonComponent,
  ],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss',
})
export class InventoryComponent {
  readonly auth = {
    context: () => ({ branchId: 'branch-mock-01' }),
    can: (permission: string) => true,
  };

  private disposed = false;
  private revision = 0;

  readonly view = signal<View>('balances');
  readonly tabs: { id: View; label: string }[] = [
    { id: 'balances', label: 'Existencias' },
    { id: 'movements', label: 'Movimientos' },
    { id: 'reservations', label: 'Reservas' },
    { id: 'counts', label: 'Conteos' },
    { id: 'locations', label: 'Ubicaciones' },
  ];

  readonly labels: Record<string, string> = {
    entry: 'Entrada',
    exit: 'Salida',
    sale: 'Venta',
    return: 'Devolución',
    transfer: 'Traslado',
    adjustment: 'Ajuste',
    active: 'Activa',
    released: 'Liberada',
    consumed: 'Consumida',
    submitted: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
  };

  // Datos de prueba locales (Mock Data)
  readonly positions = signal<InventoryLocation[]>([
    {
      id: 'pos-1',
      warehouse: 'Bodega Central',
      shelf: 'Estante A',
      name: 'Vitrina Principal',
    },
    {
      id: 'pos-2',
      warehouse: 'Bodega Central',
      shelf: 'Estante B',
      name: 'Almacén Bajo',
    },
  ] as any);

  readonly variants = signal<InventoryVariant[]>([
    { id: 'var-1', product: 'Funda Protectora', sku: 'ACC-PRT-01' },
    { id: 'var-2', product: 'Vidrio Templado', sku: 'ACC-GLS-02' },
  ] as any);

  readonly balances = signal<StockBalance[]>([
    {
      variantId: 'var-1',
      positionId: 'pos-1',
      product: 'Funda Protectora',
      sku: 'ACC-PRT-01',
      position: 'Vitrina Principal',
      quantity: 15,
      reserved: 2,
      available: 13,
    },
  ] as any);

  readonly movements = signal<StockMovement[]>([
    {
      id: 'mov-1',
      createdAt: new Date().toISOString(),
      kind: 'entry',
      sku: 'ACC-PRT-01',
      position: 'Vitrina Principal',
      quantity: 20,
      reason: 'Compra inicial',
      reference: 'FACT-001',
      actorId: 'Juan',
      correlationId: 'corr-1',
    },
  ] as any);

  readonly reservations = signal<StockReservation[]>([
    {
      id: 'res-1',
      sku: 'ACC-PRT-01',
      position: 'Vitrina Principal',
      quantity: 2,
      status: 'active',
      reference: 'Venta en proceso',
    },
  ] as any);

  readonly counts = signal<StockCount[]>([
    {
      id: 'cnt-1',
      reference: 'Conteo Mensual',
      status: 'submitted',
      reason: 'Auditoría',
      items: [
        {
          variantId: 'var-1',
          positionId: 'pos-1',
          sku: 'ACC-PRT-01',
          position: 'Vitrina Principal',
          expected: 15,
          counted: 14,
          difference: -1,
        },
      ],
    },
  ] as any);

  readonly page = signal(1);
  readonly total = signal(1);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');

  variantFilter = '';
  positionFilter = '';

  private readonly fb = new FormBuilder();

  readonly operation = this.fb.nonNullable.group({
    action: 'entry',
    variantId: ['', Validators.required],
    positionId: ['', Validators.required],
    targetPositionId: '',
    quantity: [1, [Validators.required, Validators.min(1)]],
    reason: ['', Validators.required],
    reference: ['', Validators.required],
  });

  readonly location = this.fb.nonNullable.group({
    warehouse: ['', Validators.required],
    shelf: ['', Validators.required],
    position: ['', Validators.required],
  });

  readonly count = this.fb.nonNullable.group({
    variantId: ['', Validators.required],
    positionId: ['', Validators.required],
    counted: [0, [Validators.required, Validators.min(0)]],
    reason: ['', Validators.required],
    reference: ['', Validators.required],
  });

  constructor() {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    await new Promise((r) => setTimeout(r, 200)); // Simula latencia
    this.loading.set(false);
  }

  choose(view: View) {
    this.view.set(view);
    this.page.set(1);
  }

  filter() {
    this.page.set(1);
  }

  next(delta: number) {
    this.page.update((p) => p + delta);
  }

  async saveLocation() {
    if (this.location.invalid || this.busy()) return;
    this.busy.set(true);
    await new Promise((r) => setTimeout(r, 200));

    // Agrega de forma simulada a la lista visual
    const val = this.location.getRawValue();
    this.positions.update((list) => [
      ...list,
      {
        id: 'pos-' + Date.now(),
        warehouse: val.warehouse,
        shelf: val.shelf,
        name: val.position,
      } as any,
    ]);

    this.location.reset();
    this.busy.set(false);
  }

  async saveOperation() {
    if (this.operation.invalid || this.busy()) return;
    this.busy.set(true);
    await new Promise((r) => setTimeout(r, 200));
    this.operation.reset({ action: 'entry', quantity: 1 });
    this.busy.set(false);
  }

  async saveCount() {
    if (this.count.invalid || this.busy()) return;
    this.busy.set(true);
    await new Promise((r) => setTimeout(r, 200));
    this.count.reset({ counted: 0 });
    this.busy.set(false);
  }

  async review(id: string, action: 'approve' | 'reject') {
    this.counts.update((list) => list.filter((c) => c.id !== id));
  }

  async release(id: string) {
    this.reservations.update((list) => list.filter((r) => r.id !== id));
  }

  ngOnDestroy() {
    this.disposed = true;
    this.revision++;
  }
}
