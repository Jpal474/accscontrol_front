import { CatalogRequest } from '../../shared/interfaces/catalogs.interface';
import { ListInterface } from '../../shared/interfaces/list.interface';

// Interfaz para la dirección asociada a la tienda
export interface AddressInterface {
  id: string;
  street: string;
  externalNumber: string;
  internalNumber?: string;
  neighborhood: string;
  postalCode: string;
  localityId: string;
  locality: { id: string; value: string };
  countryId?: string;
  country: { id: string; value: string };
  stateId?: string;
  state: { id: string; value: string };
  municipalityId?: string;
  municipality: { id: string; value: string };
}

// Interfaz para la entidad Store de salida (Output / getStoreById)
export interface StoreResponse {
  id: string;
  name: string;
  isActive: boolean;
  phoneNumber?: string;
  email?: string;
  currencyId: string;
  currency: { id: string; value: string };
  productCatalogId?: string;
  addressId: string;
  address?: AddressInterface;
  createdAt?: string;
  updatedAt?: string;
}

// Interfaz de entrada para Crear Tienda (RegisterStoreDto / createStore)
export interface CreateStoreRequest {
  name: string;
  phoneNumber: string;
  email: string;
  currencyId: string;
  productCatalogId?: string;
  // Campos de dirección que tu AddressService procesa en la transacción
  street: string;
  externalNumber: string;
  internalNumber?: string;
  neighborhood: string;
  postalCode: string;
  localityId: string;
}

// Interfaz de entrada para Actualizar Tienda (UpdateStoreDto / updateStore)
// Todos los campos son opcionales ya que el backend permite actualizaciones parciales (Partial)
export interface UpdateStoreRequest {
  name?: string;
  phoneNumber?: string;
  email?: string;
  currencyId?: string;
  productCatalogId?: string;
  street?: string;
  externalNumber?: string;
  internalNumber?: string;
  neighborhood?: string;
  postalCode?: string;
  localityId?: string;
}

export interface StoreParams extends CatalogRequest {
  localityId?: string;
  email?: string;
}

export interface StoreListResponse {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  isActive: boolean;
  address: string;
  currency: string;
}
