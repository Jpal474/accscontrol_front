export type CatalogKind = 'payment-methods' | 'locations' | 'location-categories' | 'repair-states' | 'brands' | 'models' | 'product-categories';
export interface CatalogDefinition { key: CatalogKind; label: string; permission: string; shared: boolean; }
export const MANAGED_CATALOGS: readonly CatalogDefinition[] = [
  { key: 'payment-methods', label: 'Métodos de pago', permission: 'manage_store', shared: false },
  { key: 'locations', label: 'Ubicaciones', permission: 'manage_inventory', shared: false },
  { key: 'location-categories', label: 'Categorías de ubicación', permission: 'manage_inventory', shared: false },
  { key: 'repair-states', label: 'Estados de reparación', permission: 'manage_repairs', shared: false },
  { key: 'brands', label: 'Marcas', permission: 'manage_products', shared: true },
  { key: 'models', label: 'Modelos', permission: 'manage_products', shared: true },
  { key: 'product-categories', label: 'Categorías de producto', permission: 'manage_products', shared: true },
];
export interface CatalogEntry {
  id: string; name?: string; model?: string; code?: string; description?: string;
  locationCategoryId?: string; isActive: boolean;
}
export interface CreateCatalogEntry { name: string; isActive: boolean; description?: string; locationCategoryId?: string; }
