import { createSignal, Show } from 'solid-js';
import { useAuth } from '../contexts/auth.context';

export default function LoginPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [isLogin, setIsLogin] = createSignal(true);
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const handleEmailAuth = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin()) {
        await signIn(email(), password());
      } else {
        await signUp(email(), password());
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');

    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1>Foxic</h1>
          <p>Генератор иконочных шрифтов</p>
        </div>

        <div class="auth-tabs">
          <button
            class={isLogin() ? 'tab active' : 'tab'}
            onClick={() => setIsLogin(true)}
          >
            Вход
          </button>
          <button
            class={!isLogin() ? 'tab active' : 'tab'}
            onClick={() => setIsLogin(false)}
          >
            Регистрация
          </button>
        </div>

        <Show when={error()}>
          <div class="error-message">{error()}</div>
        </Show>

        <form onSubmit={handleEmailAuth} class="auth-form">
          <div class="form-group">
            <input
              type="email"
              placeholder="Email"
              value={email()}
              onInput={(e) => setEmail(e.target.value)}
              required
              class="form-input"
            />
          </div>

          <div class="form-group">
            <input
              type="password"
              placeholder="Пароль"
              value={password()}
              onInput={(e) => setPassword(e.target.value)}
              required
              class="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading()}
            class="btn btn-primary"
          >
            {loading() ? 'Загрузка...' : (isLogin() ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>

        <div class="divider">
          <span>или</span>
        </div>

        <button
          onClick={handleGoogleAuth}
          disabled={loading()}
          class="btn btn-google"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Войти через Google
        </button>
      </div>
    </div>
  );
}