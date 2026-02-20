import api from './api';

// Types matching your API docs
export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  // Final URL: http://localhost:8080/auth/login
  const response = await api.post<AuthResponse>('/auth/login', data);
  return response.data;
};

export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  // Final URL: http://localhost:8080/auth/register
  const response = await api.post<AuthResponse>('/auth/register', data);
  return response.data;
};