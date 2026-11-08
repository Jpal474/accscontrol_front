import { ListInterface } from './list.interface';

export interface CatalogRequest extends ListInterface {
  search?: string;
  isActive?: boolean;
}

export interface CatalogApiResponse {
  id: string;
  value: string;
}
