export type CatalogStatus = 'active' | 'inactive';
export interface CatalogLookup {
  id: string;
  name: string;
  active: boolean;
  brandId?: string;
  brandName?: string;
}
export interface CatalogLookups {
  categories: CatalogLookup[];
  brands: CatalogLookup[];
  deviceBrands: CatalogLookup[];
  deviceModels: CatalogLookup[];
}
export interface CatalogVariant {
  id: string;
  name: string;
  sku: string;
  price: string;
  cost?: string;
  currency: string;
  status: CatalogStatus;
  attributes: Record<string, unknown>;
  barcodes: string[];
}
export interface ProductImage {
  id: string;
  altText: string;
  contentType: string;
  byteSize: number;
}
export interface CatalogProduct {
  id: string;
  name: string;
  description: string;
  categoryId: string | null;
  brandId: string | null;
  categoryName: string | null;
  brandName: string | null;
  status: CatalogStatus;
  attributes: Record<string, unknown>;
  version: number;
  variants: CatalogVariant[];
  compatibilities: CatalogLookup[];
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
}
export interface ProductInput {
  name: string;
  description: string;
  categoryId?: string | null;
  brandId?: string | null;
  status: CatalogStatus;
  attributes: Record<string, unknown>;
  modelIds: string[];
  variants: VariantInput[];
  version?: number;
}
export interface VariantInput {
  id?: string;
  name: string;
  sku: string;
  price: string;
  cost: string;
  status: CatalogStatus;
  attributes: Record<string, unknown>;
  barcodes: string[];
}
export interface CatalogPage {
  items: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  currency: string;
}
export interface ProductImageUpload {
  id: string;
  url: string;
  expiresIn: number;
  headers: Record<string, string>;
}
// Future branch policy may override a variant price; stock location is never a pricing key.
export interface BranchPricePolicy {
  variantId: string;
  branchId: string;
  price: string;
  currency: string;
}
