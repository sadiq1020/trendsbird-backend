export interface AuthSessionUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  gender?: string | null;
  avatar?: string | null;
  role: string;
  permissions: string[];
}

export interface AuthLoginResponse {
  user: AuthSessionUser;
  accessToken: string;
  refreshToken: string;
}

export interface AuthRefreshResponse {
  accessToken: string;
  refreshToken: string;
}
