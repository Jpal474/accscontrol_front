export enum MovementType { IN = 'IN', OUT = 'OUT' }
export enum MovementReason {
  PURCHASE = 'PURCHASE', SALE = 'SALE', TRANSFER = 'TRANSFER', DAMAGE = 'DAMAGE',
  AUDIT_ADJUSTMENT = 'AUDIT_ADJUSTMENT', RETURN = 'RETURN', CANCELLATION = 'CANCELLATION',
}
export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = { IN: 'Entrada', OUT: 'Salida' };
export const MOVEMENT_REASON_LABELS: Record<MovementReason, string> = {
  PURCHASE: 'Compra', SALE: 'Venta', TRANSFER: 'Traslado', DAMAGE: 'Daño',
  AUDIT_ADJUSTMENT: 'Ajuste por auditoría', RETURN: 'Devolución', CANCELLATION: 'Cancelación',
};
export interface InventoryVariant {
  id: string; productName: string; sku: string; color: string; trackSerialNumbers: boolean; isActive: boolean;
}
export interface StockBalance extends Omit<InventoryVariant, 'id'> {
  productVariationId: string; productId: string; existence: number;
  locations?: StockLocation[];
}
export interface StockLocation {
  id: string; code: string; description: string; categoryName?: string | null; existence: number;
}
export interface InventoryLocation {
  id: string; code: string; description: string; locationCategory?: { name: string };
  existence: number;
}
export interface StockMovement {
  id: string; type: MovementType; reason: MovementReason; quantity: number;
  previousExistence: number; newExistence: number; createdAt: string; notes?: string; saleId?: string; userId?: string;
  serialNumbers?: string[];
  productVariation: { id: string; sku: string; color: string; product: { id: string; name: string } };
}
export interface InventoryUnit {
  id: string; serialNumber: string; productVariationId: string; status: 'AVAILABLE' | 'OUT';
}
export interface InventoryQuery {
  page?: number; pageSize?: number; search?: string; productVariationId?: string; type?: MovementType; reason?: MovementReason; isActive?: boolean;
}
export interface InventoryMovementRequest {
  reason: MovementReason; notes?: string; saleId?: string;
  items: { productVariationId: string; quantity: number; locationId: string; targetLocationId?: string; serialNumbers?: string[] }[];
}
export interface TransferTarget { id: string; name: string; }
export interface InventorySale {
  id: string; folio: string; date: string; total: number | string;
  currency: string | null; itemCount: number; products: string[];
}
