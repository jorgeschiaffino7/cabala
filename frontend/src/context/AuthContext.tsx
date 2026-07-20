import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { authService } from '@/services/auth.service';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize auth state
  useEffect(() => {
    checkUser();

    // Listen to auth changes
    const { data: authListener } = authService.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Check user error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<AuthResult> => {
    try {
      const { user } = await authService.signUp(email, password, fullName);
      setUser(user);
      navigate(ROUTES.DASHBOARD);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { user } = await authService.signIn(email, password);
      setUser(user);
      navigate(ROUTES.DASHBOARD);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const signOut = async (): Promise<AuthResult> => {
    try {
      await authService.signOut();
      setUser(null);
      navigate(ROUTES.HOME);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (email: string): Promise<AuthResult> => {
    try {
      await authService.resetPassword(email);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};