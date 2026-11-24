export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ChangePasswordCredentials {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface LoginApiResponse {
  access_token: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  globalRole: string | null;
  stores: { storeId: string; role: string | null }[];
  permissions: string[];
  mustChangePassword?: boolean;
}
