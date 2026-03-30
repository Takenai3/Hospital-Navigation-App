import axios from 'axios';

export interface SignupRequest {
  phone_number: string;
  password: string;
  full_name: string;
  dob?: string;
  gender?: number;
}

export interface SignupResponse {
  code: string;
  message: string;
  user_id?: string;
}

export const signup = async (baseUrl: string, request: SignupRequest): Promise<SignupResponse> => {
  const response = await axios.post<SignupResponse>(`${baseUrl}/api/auth/signup`, request);
  return response.data;
};
