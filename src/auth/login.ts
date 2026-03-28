import axios from 'axios';

export interface LoginRequest {
  phone_number: string;
  password: string;
  device_token?: string;
  platform?: string;
}

export interface LoginResponse {
  code: string;
  message: string;
  data: {
    user_id: string;
    full_name: string;
    phone_number: string;
  };
}

export const login = async (baseUrl: string, request: LoginRequest): Promise<LoginResponse> => {
  const response = await axios.post<LoginResponse>(`${baseUrl}/api/auth/login`, request);
  return response.data;
};
