import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { loginUser, registerUser } from '../services';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (fullName: string, email: string, password?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('nk_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      try {
        const saved = localStorage.getItem('nk_user');
        if (saved) {
          const parsedUser = JSON.parse(saved);
          setUser(parsedUser);
        } else {
          // Do not auto-login: unauthenticated by default
          setUser(null);
        }
      } catch (err) {
        console.warn('Auth check skipped:', err);
      } finally {
        setIsLoading(false);
      }
    }
    void initAuth();
  }, []);

  const login = async (email: string, password?: string) => {
    const res = await loginUser(email, password);
    setUser(res.user);
    localStorage.setItem('nk_user', JSON.stringify(res.user));
    localStorage.setItem('nk_token', res.token);
  };

  const register = async (fullName: string, email: string, password?: string) => {
    const res = await registerUser(fullName, email, password);
    setUser(res.user);
    localStorage.setItem('nk_user', JSON.stringify(res.user));
    localStorage.setItem('nk_token', res.token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nk_user');
    localStorage.removeItem('nk_token');
    localStorage.removeItem('nk_google_accounts');
    localStorage.removeItem('nk_active_google_account');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
