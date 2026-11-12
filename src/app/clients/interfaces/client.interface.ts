export interface Client {
  id: string;
  name: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
  storeId: string;
}
export interface ClientRequest {
  name: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
}
export interface ClientQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  email?: string;
  isActive?: boolean;
}
