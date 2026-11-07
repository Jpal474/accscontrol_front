export interface RegisterOwnerInterface {
  name: string;
  lastName: string;
  email: string;
  //   temporaryPassword: string;
}

export interface OwnerApiResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  lastName: string;
  email: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLogin: string;
  globalRoleId: string;
}

export interface OwnersListApiRequest {
  page?: number;
  pageSize?: number;
  search?: string;
  email?: string;
  isActive?: boolean;
}

export interface GetOwnerApiResponse {
  id: string;
  name: string;
  lastName: string;
  email: string;
}

export interface OwnersListApiResponse extends GetOwnerApiResponse {
  isActive: boolean;
  storesCount: number;
  stores: {
    id: string;
    name: string;
    staffActive: boolean;
  }[];
}
