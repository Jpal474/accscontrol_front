import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Client } from '../../../clients/interfaces/client.interface';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { Router, RouterLink } from '@angular/router';
import {
  PosCartInput,
  PosCheckoutInput,
  PosPaymentInput,
  PosPromotion,
  PosQuote,
  PosSearchItem,
  PosSettings,
} from '../../interfaces/pos.interface';
import {
  decimalAmount,
  displayMoney,
  minorUnits,
} from '../../../shared/money/money';

interface CartLine {
  product: PosSearchItem;
  positionId: string;
  positionName: string;
  quantity: number;
}

@Component({
  selector: 'app-register-sale',
  standalone: true,
  imports: [PageHeaderComponent, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './register-sale.component.html',
  styleUrl: './register-sale.component.scss',
})
export class RegisterSaleComponent {
  readonly cashSessionId = signal<string | undefined>(undefined);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private disposed = false;
  private searchRevision = 0;
  private quoteRevision = 0;
  private key = crypto.randomUUID();
  private pending: PosCheckoutInput | null = null;
  readonly scanner = viewChild<ElementRef<HTMLInputElement>>('scanner');
  readonly payInput = viewChild<ElementRef<HTMLInputElement>>('payInput');
  readonly settings = signal<PosSettings | null>(null);
  readonly promotions = signal<PosPromotion[]>([]);
  readonly products = signal<PosSearchItem[]>([]);
  readonly cart = signal<CartLine[]>([]);
  readonly quote = signal<PosQuote | null>(null);
  readonly payments = signal<PosPaymentInput[]>([]);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly quoting = signal(false);
  readonly totalProducts = signal(0);
  readonly searchPage = signal(1);
  searchText = '';
  promotionId = '';
  readonly selections: Record<string, string> = {};
  readonly money = displayMoney;
  readonly payment = this.fb.nonNullable.group({
    method: 'cash',
    amount: [
      '',
      [Validators.required, Validators.pattern(/^[0-9]{1,16}\.[0-9]{2}$/)],
    ],
    reference: '',
  });
  public mockPosSearchResponse = {
    items: [
      {
        id: 'prod_var_001',
        sku: 'SKU-SHIRT-RED-L',
        name: 'Camiseta Básica de Algodón (Rojo, L)',
        price: '299.00',
        currency: 'MXN',
        barcodes: ['7501234567890', '7501234567891'],
        positions: [
          {
            id: 'pos_loc_01',
            name: 'Sucursal Centro - Estante A1',
            available: '15.00',
          },
          {
            id: 'pos_loc_02',
            name: 'Sucursal Norte - Bodega B',
            available: '5.00',
          },
        ],
      },
      {
        id: 'prod_var_002',
        sku: 'SKU-PANT-BLU-32',
        name: 'Pantalón de Mezclilla Slim (Azul, 32)',
        price: '799.50',
        currency: 'MXN',
        barcodes: ['7509876543210'],
        positions: [
          {
            id: 'pos_loc_01',
            name: 'Sucursal Centro - Estante B3',
            available: '8.00',
          },
        ],
      },
      {
        id: 'prod_var_003',
        sku: 'SKU-SHOE-BLK-27',
        name: 'Tenis Deportivos Urbanos (Negro, 27)',
        price: '1299.00',
        currency: 'MXN',
        barcodes: ['7505554443332', '7505554443333'],
        positions: [
          {
            id: 'pos_loc_01',
            name: 'Sucursal Centro - Vitrina Principal',
            available: '2.00',
          },
          {
            id: 'pos_loc_03',
            name: 'Sucursal Sur - Exhibición',
            available: '4.00',
          },
        ],
      },
    ],
    total: 3,
    page: 1,
    pageSize: 10,
  };

  @HostListener('document:keydown', ['$event']) keyboard(event: KeyboardEvent) {
    if (event.key === 'F2') {
      event.preventDefault();
      this.scanner()?.nativeElement.focus();
    }
    if (event.key === 'F8') {
      event.preventDefault();
      this.payInput()?.nativeElement.focus();
    }
  }

  async search(scan = true, page = 1) {
    if (this.busy() || this.pending) return;
    const revision = ++this.searchRevision;
    const term = this.searchText.trim();
    this.loading.set(true);
    this.error.set('');
    try {
      const result = this.mockPosSearchResponse;
      if (this.disposed || revision !== this.searchRevision) return;
      this.products.set(result.items);
      this.totalProducts.set(result.total);
      this.searchPage.set(page);
      for (const product of result.items) {
        if (
          !product.positions.some(
            (position) => position.id === this.selections[product.id],
          )
        ) {
          this.selections[product.id] = product.positions[0]?.id || '';
        }
      }
      const exact =
        result.items.find((p) => p.barcodes.includes(term)) ||
        result.items.find((p) => p.sku === term.toUpperCase());
      if (scan && term && exact) {
        await this.add(exact);
        this.searchText = '';
        this.scanner()?.nativeElement.focus();
      }
    } catch (e) {
      // if (!this.disposed && revision === this.searchRevision) this.error.set(errorMessage(e));
    } finally {
      if (!this.disposed && revision === this.searchRevision)
        this.loading.set(false);
    }
  }
  cartInput(): PosCartInput {
    return {
      items: this.cart().map((l) => ({
        variantId: l.product.id,
        positionId: l.positionId,
        quantity: l.quantity,
      })),
      ...(this.promotionId ? { promotionId: this.promotionId } : {}),
    };
  }
  async add(product: PosSearchItem) {
    if (this.busy() || this.pending) return;
    const id = this.selections[product.id];
    const position = product.positions.find((p) => p.id === id);
    if (!position) {
      this.error.set('No hay una posición con piezas disponibles');
      return;
    }
    const lines = this.cart().map((l) => ({ ...l }));
    const old = lines.find(
      (l) => l.product.id === product.id && l.positionId === id,
    );
    if (old) old.quantity++;
    else
      lines.push({
        product,
        positionId: id,
        positionName: position.name,
        quantity: 1,
      });
    this.cart.set(lines);
    await this.requote();
  }
  async quantity(index: number, event: Event) {
    if (this.busy() || this.pending) return;
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isInteger(value) || value < 1 || value > 1000000) {
      this.error.set('Usa una cantidad entera entre 1 y 1,000,000');
      this.quote.set(null);
      return;
    }
    this.cart.update((lines) =>
      lines.map((l, i) => (i === index ? { ...l, quantity: value } : l)),
    );
    await this.requote();
  }
  async remove(index: number) {
    if (this.busy() || this.pending) return;
    this.cart.update((lines) => lines.filter((_, i) => i !== index));
    await this.requote();
  }
  async requote() {
    if (this.busy() || this.pending) return;
    const revision = ++this.quoteRevision;
    this.quote.set(null);
    this.payments.set([]);
    this.payment.reset({ method: 'cash' });
    this.key = crypto.randomUUID();
    if (!this.cart().length) return;
    this.quoting.set(true);
    this.error.set('');
    try {
      // const quote = await this.api.quote(this.cartInput());
      if (!this.disposed && revision === this.quoteRevision) {
        // this.quote.set(quote);
        // this.payment.controls.amount.setValue(quote.total);
      }
    } catch (e) {
      // if (!this.disposed && revision === this.quoteRevision) this.error.set(errorMessage(e));
    } finally {
      if (!this.disposed && revision === this.quoteRevision)
        this.quoting.set(false);
    }
  }
  remaining(): string {
    const quote = this.quote();
    if (!quote) return '0.00';
    try {
      return decimalAmount(
        minorUnits(quote.total) -
          this.payments().reduce((n, p) => n + minorUnits(p.amount), 0n),
      );
    } catch {
      return '0.00';
    }
  }
  addPayment() {
    if (this.busy() || this.pending || !this.quote()) return;
    if (this.payments().length >= 10) {
      this.error.set('Puedes registrar hasta diez pagos por venta');
      return;
    }
    this.payment.markAllAsTouched();
    if (this.payment.invalid) return;
    const v = this.payment.getRawValue();
    if (
      minorUnits(v.amount) <= 0n ||
      minorUnits(v.amount) > minorUnits(this.remaining())
    ) {
      this.error.set('El pago debe ser positivo y no superar lo pendiente');
      return;
    }
    if (v.method !== 'cash' && !v.reference.trim()) {
      this.error.set('Captura la referencia del pago');
      return;
    }
    this.error.set('');
    this.payments.update((list) => [
      ...list,
      {
        method: v.method as PosPaymentInput['method'],
        amount: v.amount,
        reference: v.reference.trim(),
      },
    ]);
    this.payment.reset({ method: 'cash', amount: this.remaining() });
  }
  removePayment(index: number) {
    if (this.busy() || this.pending) return;
    this.payments.update((list) => list.filter((_, i) => i !== index));
    this.payment.controls.amount.setValue(this.remaining());
  }
  // async complete() {
  //   if (this.busy()) return;
  //   const quote = this.quote();
  //   if (!this.pending && (!quote || this.remaining() !== '0.00')) {
  //     this.error.set('Completa los pagos antes de confirmar');
  //     return;
  //   }
  //   if (!this.pending) {
  //     try {
  //       // const context = await this.cash.context();
  //       // this.cashSessionId.set(context.session?.id);
  //       // if (context.policy.requireSession && !context.session) {
  //       //   this.error.set('Abre tu sesión de caja antes de vender.');
  //       //   return;
  //       // }
  //     } catch (e) {
  //       // this.error.set(errorMessage(e));
  //       return;
  //     }
  //   }
  //   this.pending ||= {
  //     ...(this.cashSessionId() ? { cashSessionId: this.cashSessionId() } : {}),
  //     ...this.cartInput(),
  //     idempotencyKey: this.key,
  //     quoteToken: quote!.quoteToken,
  //     payments: this.payments().map((p) => ({ ...p })),
  //   };
  //   this.busy.set(true);
  //   this.error.set('');
  //   try {
  //     this.recovery.save('sale', { request: this.pending, quote: this.quote(), cart: this.cart() });
  //     const sale = await this.api.checkout(this.pending);
  //     this.recovery.clear('sale');
  //     if (this.disposed) return;
  //     await this.router.navigate(['/app/pos/sales', sale.id]);
  //   } catch (e) {
  //     if (!this.disposed) {
  //       this.error.set(errorMessage(e));
  //       const status = (e as { status?: number }).status;
  //       if (status && status >= 400 && status < 500) {
  //         this.pending = null;
  //         this.recovery.clear('sale');
  //         this.busy.set(false);
  //         await this.requote();
  //         this.error.set(errorMessage(e));
  //       } else
  //         this.error.set(
  //           'No se pudo confirmar la respuesta. Reintenta la misma venta para evitar duplicados.',
  //         );
  //     }
  //   } finally {
  //     if (!this.disposed) this.busy.set(false);
  //   }
  // }
  locked() {
    return this.busy() || !!this.pending;
  }
  ngOnDestroy() {
    this.disposed = true;
    this.searchRevision++;
    this.quoteRevision++;
  }
}
