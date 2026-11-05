export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginApiResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    globalRole: string;
    stores: { storeId: string; roleId: string }[];
    permisssions: string[];
  };
}
