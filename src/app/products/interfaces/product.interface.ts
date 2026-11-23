export interface ProductLookup {
  id: string;
  name: string;
  isActive: boolean;
}

export interface ProductModel {
  id: string;
  model: string;
  isActive: boolean;
}

export interface ProductVariation {
  trackSerialNumbers?: boolean;
  id: string;
  productId: string;
  sku: string;
  color: string;
  size?: string | null;
  material?: string | null;
  capacity?: string | null;
  ram?: string | null;
  price?: number | string | null;
  purchasePrice?: number | string | null;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number | string;
  purchasePrice?: number | string;
  image?: string;
  isActive: boolean;
  categoryId: string;
  brandId: string;
  deviceModelId?: string | null;
  category?: ProductLookup;
  brand?: ProductLookup;
  deviceModel?: ProductModel;
  variations: ProductVariation[];
  compatibleModels?: { id: string; deviceModelId: string; deviceModel: ProductModel }[];
}

export interface SaveProductVariation {
  trackSerialNumbers?: boolean;
  id?: string;
  sku: string;
  color: string;
  size?: string;
  material?: string;
  capacity?: string;
  ram?: string;
  price?: number | null;
  purchasePrice?: number | null;
  isActive: boolean;
}

export interface SaveProduct {
  name: string;
  description: string;
  price: number;
  purchasePrice?: number;
  productCategoryId: string;
  brandId: string;
  isActive: boolean;
  variations: SaveProductVariation[];
}

export interface ProductQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  isActive?: boolean;
}

export interface ProductLookups {
  categories: ProductLookup[];
  brands: ProductLookup[];
  models: ProductModel[];
}

export interface StoreCurrency {
  id: string;
  code: string;
  description: string;
}

export interface CompatibilityModel {
  id: string;
  name: string;
  brand: { id: string; name: string } | null;
}

export interface CompatibleAccessory {
  id: string;
  name: string;
  image?: string;
  description?: string;
  sizes: string[];
  price: number | string;
  stock: number;
  locations: string[];
  otherModels: CompatibilityModel[];
}

export interface CompatibilityResults {
  model: CompatibilityModel;
  currency: StoreCurrency | null;
  categories: { id: string; name: string; rows: CompatibleAccessory[] }[];
}
