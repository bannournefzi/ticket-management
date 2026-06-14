export interface AuthenticationRequest {
  email: string;
  password: string;
}

export interface AuthenticationResponse {
  token: string;
  mustChangePassword: boolean;
}

export interface RegistrationRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  dateOfBirth: string;
  role?: string; 
}