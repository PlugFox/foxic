import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { auth } from '../config/firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

class AuthService {
  private googleProvider: GoogleAuthProvider;

  constructor() {
    this.googleProvider = new GoogleAuthProvider();
    this.googleProvider.addScope('profile');
    this.googleProvider.addScope('email');
  }

  // Преобразование Firebase User в наш тип
  private mapUser(user: User): AuthUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
  }

  // Вход с Google
  async signInWithGoogle(): Promise<AuthUser> {
    const userCredential = await signInWithPopup(auth, this.googleProvider);
    return this.mapUser(userCredential.user);
  }

  // Выход
  async signOut(): Promise<void> {
    await signOut(auth);
  }

  // Подписка на изменения состояния аутентификации
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(auth, (user) => {
      callback(user ? this.mapUser(user) : null);
    });
  }

  // Получить текущего пользователя
  getCurrentUser(): AuthUser | null {
    const user = auth.currentUser;
    return user ? this.mapUser(user) : null;
  }
}

export const authService = new AuthService();