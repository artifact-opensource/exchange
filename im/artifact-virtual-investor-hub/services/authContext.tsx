import React, { createContext, useContext, useState, ReactNode } from 'react';
import { InvestorProfile } from '../types';
import { INVESTOR_PROFILE } from './mockData';

interface AuthContextType {
  isAuthenticated: boolean;
  user: InvestorProfile | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: React.PropsWithChildren) => {
  // Initial state logic would go here (e.g., checking localStorage)
  const [user, setUser] = useState<InvestorProfile | null>(null);

  const login = () => {
    // Simulating API call
    setTimeout(() => {
      setUser(INVESTOR_PROFILE);
    }, 500);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};