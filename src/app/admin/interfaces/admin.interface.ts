export interface CreatePlatformAdmin {
  name: string;
  lastName: string;
  email: string;
}
export interface PlatformUser {
  id: string;
  name: string;
  lastName: string;
  email: string;
  isActive: boolean;
  globalRole?: { id: string; name: string } | null;
  storeStaff?: { id: string; role: { id: string; name: string } | null; store?: { id: string; name: string } | null }[];
}

export interface PlatformUsersQuery {
  page?: number;
  search?: string;
  roleId?: string;
  storeId?: string;
}

export interface PlatformAdminsQuery {
  page?: number;
  pageSize?: number;
  email?: string;
  search?: string;
}
