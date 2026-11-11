import { BaseInterface } from '../../shared/interfaces/base.interface';

export interface RegisterStaffInterface {
  name: string;
  lastName: string;
  email: string;
  roleId: string;
}

export interface RegisterStaffResponse extends BaseInterface {
  isActive: boolean;
  storeId: string;
  roleId: string;
  userId: string;
}

export interface RoleDetails {
  name: string;
  id: string;
}

export interface UserDetails {
  id: string;
  name: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

export interface StoreStaffItem {
  id: string;
  isActive: boolean;
  role: RoleDetails;
  user: UserDetails;
}
