import { createClient } from '@supabase/supabase-js';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { SUPABASE_CONFIG, STORAGE_KEYS } from '@/utils/constants';

// Initialize Supabase client
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

interface SignUpData {
  user: User | null;
  session: Session | null;
}

interface SignInData {
  user: User | null;
  session: Session | null;
}

/**
 * Auth Service - handles all authentication operations
 */
class AuthService {
  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, fullName: string): Promise<SignUpData> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      // Store token
      if (data.session) {
        this.storeSession(data.session);
      }

      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('SignUp error:', error);
      throw error;
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<SignInData> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Store token
      if (data.session) {
        this.storeSession(data.session);
      }

      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('SignIn error:', error);
      throw error;
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear stored session
      this.clearSession();
    } catch (error) {
      console.error('SignOut error:', error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  }

  /**
   * Listen to auth changes
   */
  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ): { data: { subscription: { unsubscribe: () => void } } } {
    return supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        this.storeSession(session);
      } else {
        this.clearSession();
      }
      callback(event, session);
    });
  }

  /**
   * Store session in localStorage
   */
  private storeSession(session: Session): void {
    if (session?.access_token) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, session.access_token);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, session.refresh_token);
    }
  }

  /**
   * Clear session from localStorage
   */
  private clearSession(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export Supabase client for direct access if needed
export { supabase };

export default authService;