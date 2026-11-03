import { Component, signal } from '@angular/core';
import {
  PosReturnInput,
  PosReturnQuote,
  PosSale,
} from '../../interfaces/pos.interface';
import { displayMoney } from '../../../shared/money/money';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
export interface InventoryLocation {
  id: string;
  name: string;
  shelf: string;
  warehouse: string;
  active: boolean;
}

interface ReturnSelection {
  saleItemId: string;
  quantity: number;
  restocked: boolean;
  positionId: string;
}

@Component({
  selector: 'app-sales-list',
  standalone: true,
  imports: [PageHeaderComponent, FormsModule, RouterLink],
  templateUrl: './sales-list.component.html',
  styleUrl: './sales-list.component.scss',
})
export class SalesListComponent {
  private readonly route = injectActivatedRouteMock(); // O usa ActivatedRoute real si está disponible

  // Auth mock para pruebas visuales (permite ver botones de devolución)
  readonly auth = {
    can: (permission: string) => true,
  };

  private disposed = false;
  private revision = 0;
  private pending: any | null = null;

  readonly sale = signal<PosSale | null>(null);
  readonly history = signal<
    Pick<
      PosSale,
      | 'id'
      | 'companyName'
      | 'branchName'
      | 'cashierName'
      | 'createdAt'
      | 'currency'
      | 'total'
    >[]
  >([]);
  readonly historyPage = signal(1);
  readonly historyTotal = signal(0);
  readonly locations = signal<InventoryLocation[]>([]);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly returnQuote = signal<PosReturnQuote | null>(null);
  readonly showReturn = signal(false);
  readonly money = displayMoney;

  lines: ReturnSelection[] = [];
  reason = '';
  method: 'cash' | 'card' | 'manual' = 'cash';
  reference = '';

  constructor() {
    void this.load();
  }

  async load(page = 1) {
    const version = ++this.revision;
    this.error.set('');
    this.busy.set(true);

    try {
      // Simulamos un retraso de red
      await new Promise((r) => setTimeout(r, 300));

      // Simulamos la obtención de datos en bruto (Mock Data)
      const mockSalesList = [
        {
          id: 'sale-001',
          companyName: 'AccsControl Store Morelia',
          branchName: 'Sucursal Centro',
          cashierName: 'Juan Pérez',
          createdAt: new Date().toISOString(),
          currency: 'MXN',
          total: '1250.00',
        },
        {
          id: 'sale-002',
          companyName: 'AccsControl Store Morelia',
          branchName: 'Sucursal Centro',
          cashierName: 'Ana Gómez',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          currency: 'MXN',
          total: '450.50',
        },
      ];

      const mockLocations: InventoryLocation[] = [
        {
          id: 'pos-1',
          warehouse: 'Almacén Principal',
          shelf: 'Estante A',
          name: 'Vitrina 1',
          active: true,
        },
        {
          id: 'pos-2',
          warehouse: 'Almacén Principal',
          shelf: 'Estante B',
          name: 'Bodega Trasera',
          active: true,
        },
      ];

      // Simulamos detección de ID en la ruta (si existe, carga detalle; si no, la lista)
      // Nota: Si usas el ActivatedRoute real de Angular, puedes mantener tu lógica de snapshot.
      const id = window.location.pathname.includes('sale-001')
        ? 'sale-001'
        : null;

      if (!id) {
        if (!this.disposed && version === this.revision) {
          this.history.set(mockSalesList);
          this.historyPage.set(page);
          this.historyTotal.set(mockSalesList.length);
        }
        return;
      }

      // Detalle de venta simulado
      const mockSaleDetail: PosSale = {
        id: 'sale-001',
        companyName: 'AccsControl Store Morelia',
        branchName: 'Sucursal Centro',
        cashierName: 'Juan Pérez',
        createdAt: new Date().toISOString(),
        currency: 'MXN',
        timezone: 'America/Mexico_City',
        subtotal: '1000.00',
        discount: '0.00',
        net: '1000.00',
        tax: '250.00',
        taxIncluded: true,
        taxBps: 1600, // 16% expresado en puntos base (bps)
        total: '1250.00',
        status: 'COMPLETED',
        actorId: 'user-001',
        correlationId: 'corr-001',
        promotionName: '',
        items: [
          {
            id: 'item-1',
            name: 'Funda Protectora Uso Rudo',
            sku: 'ACC-PRT-01',
            position: 'Vitrina 1',
            positionId: 'pos-1',
            quantity: 2,
            returnedQuantity: '0', // Nota: Asegúrate de que sea número si PosSale lo espera numérico
            unitPrice: '500.00',
            total: '1000.00',
            variantId: 'var-01',
            discount: '0.00',
            net: '1000.00',
            subtotal: '1000.00',
            tax: '0.00',
          },
        ],
        payments: [
          { method: 'cash', amount: '1250.00', reference: 'Efectivo recibido' },
        ],
        returns: [],
      };

      if (this.disposed || version !== this.revision) return;
      this.sale.set(mockSaleDetail);
      this.locations.set(mockLocations);
    } catch (e: any) {
      if (!this.disposed && version === this.revision)
        this.error.set(e?.message || 'Error simulado');
    } finally {
      if (!this.disposed && version === this.revision) this.busy.set(false);
    }
  }

  date(value: string) {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Mexico_City',
    }).format(new Date(value));
  }

  print() {
    window.print();
  }

  beginReturn() {
    if (this.busy() || this.pending) return;
    const sale = this.sale();
    if (!sale) return;
    this.lines = sale.items
      .filter((i: any) => Number(i.returnedQuantity) < Number(i.quantity))
      .map((i: any) => ({
        saleItemId: i.id,
        quantity: 0,
        restocked: false,
        positionId: i.positionId || '',
      }));
    this.returnQuote.set(null);
    this.reason = '';
    this.reference = '';
    this.showReturn.set(true);
  }

  remaining(id: string) {
    const line = this.sale()?.items.find((i: any) => i.id === id);
    return line ? line.quantity - Number(line.returnedQuantity) : 0;
  }

  label(id: string) {
    return this.sale()?.items.find((i: any) => i.id === id)?.sku || id;
  }

  changed() {
    this.returnQuote.set(null);
    this.revision++;
  }

  request(): PosReturnInput {
    return {
      saleId: this.sale()!.id,
      items: this.lines
        .filter((l) => l.quantity > 0)
        .map((l) => ({
          saleItemId: l.saleItemId,
          quantity: Number(l.quantity),
          restocked: l.restocked,
          ...(l.restocked ? { positionId: l.positionId } : {}),
        })),
    };
  }

  async calculateReturn() {
    if (this.busy() || this.pending) return;
    const request = this.request();
    if (!request.items.length) {
      this.error.set('Selecciona al menos una pieza para devolver');
      return;
    }
    this.busy.set(true);
    this.error.set('');

    // Simulación de cotización de devolución
    await new Promise((r) => setTimeout(r, 300));
    const mockQuote: PosReturnQuote = {
      saleId: this.sale()!.id,
      quoteToken: 'mock-token-123',
      net: '500.00',
      tax: '0.00',
      total: '500.00',
      currency: this.sale()?.currency || 'MXN',
      items: [],
    };
    if (!this.disposed) {
      this.returnQuote.set(mockQuote);
      this.busy.set(false);
    }
  }

  async refund() {
    if (this.busy()) return;
    const quote = this.returnQuote();
    if (!quote || !this.reason.trim()) {
      this.error.set('Revisa el motivo y el cálculo de devolución');
      return;
    }

    this.busy.set(true);
    this.error.set('');

    // Simulación de éxito de devolución
    await new Promise((r) => setTimeout(r, 400));

    const currentSale = this.sale()!;
    currentSale.returns.push({
      id: 'ret-' + Date.now(),
      total: quote.total,
      createdAt: new Date().toISOString(),
      reason: this.reason,
      items: this.lines
        .filter((l) => l.quantity > 0)
        .map((l) => ({
          saleItemId: l.saleItemId,
          quantity: l.quantity,
          restocked: l.restocked,
        })),
    } as any);

    this.sale.set({ ...currentSale });
    this.showReturn.set(false);
    this.returnQuote.set(null);
    this.busy.set(false);
  }

  locked() {
    return this.busy() || !!this.pending;
  }

  ngOnDestroy() {
    this.disposed = true;
    this.revision++;
  }
}

function injectActivatedRouteMock() {
  return {
    snapshot: {
      paramMap: {
        get: (key: string) => null, // Cambiar a 'sale-001' si quieres probar el detalle por defecto
      },
    },
  };
}
