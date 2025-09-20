import { Accessor, createContext, createSignal, onMount, ParentComponent, useContext } from 'solid-js';
import { authService, type AuthUser } from '../services/auth.service';

interface AuthContextType {
  user: Accessor<AuthUser | null>;
  loading: Accessor<boolean>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>();

export const AuthProvider: ParentComponent = (props) => {
  const [user, setUser] = createSignal<AuthUser | null>(null);
  const [loading, setLoading] = createSignal(true);

  onMount(() => {
    // Подписываемся на изменения состояния аутентификации
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    // Отписываемся при размонтировании компонента
    return unsubscribe;
  });

  const signIn = async (email: string, password: string) => {
    try {
      await authService.signInWithEmail(email, password);
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      await authService.signUpWithEmail(email, password);
    } catch (error) {
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      await authService.signInWithGoogle();
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {props.children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};