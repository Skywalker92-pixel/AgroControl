import { create } from 'zustand';
import { Usuario } from '../types';

interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  isAuthenticated: boolean;
  login: (token: string, usuario: Usuario) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const token = localStorage.getItem('agrocontrol_token');
  const userJson = localStorage.getItem('agrocontrol_user');
  let usuario: Usuario | null = null;
  if (userJson) {
    try {
      usuario = JSON.parse(userJson);
    } catch {
      usuario = null;
    }
  }

  return {
    token,
    usuario,
    isAuthenticated: !!token && !!usuario,
    login: (token, usuario) => {
      localStorage.setItem('agrocontrol_token', token);
      localStorage.setItem('agrocontrol_user', JSON.stringify(usuario));
      set({ token, usuario, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('agrocontrol_token');
      localStorage.removeItem('agrocontrol_user');
      set({ token: null, usuario: null, isAuthenticated: false });
    },
  };
});
