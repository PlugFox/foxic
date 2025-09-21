import { useNavigate } from '@solidjs/router';
import { HapticButton } from '../components/HapticComponents';
import Icon, { LogoutIcon } from '../components/Icon';
import LanguageSelector from '../components/LanguageSelector';
import { useAuth } from '../contexts/auth.context';
import { useTranslation } from '../contexts/i18n.context';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const LL = useTranslation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div class="settings-container" role="main" aria-labelledby="settings-title">
      <header class="settings-header">
        <div class="settings-header-content">
          <HapticButton
            onClick={handleBack}
            class="btn btn-ghost settings-back-btn"
            haptic="light"
            aria-label="Назад к главной"
          >
            <Icon name="chevron_left" size={24} aria-hidden="true" />
          </HapticButton>
          <h1 id="settings-title">Настройки</h1>
        </div>
      </header>

      <main class="settings-content">
        <section class="settings-section" aria-labelledby="appearance-heading">
          <h2 id="appearance-heading" class="settings-section-title">
            <Icon name="palette" size={20} aria-hidden="true" />
            Внешний вид
          </h2>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Язык интерфейса</div>
              <div class="settings-item-description">
                Выберите язык для отображения интерфейса приложения
              </div>
            </div>
            <div class="settings-item-control">
              <LanguageSelector />
            </div>
          </div>
        </section>

        <section class="settings-section" aria-labelledby="account-heading">
          <h2 id="account-heading" class="settings-section-title">
            <Icon name="person" size={20} aria-hidden="true" />
            Аккаунт
          </h2>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Пользователь</div>
              <div class="settings-item-description">
                {user()?.displayName || user()?.email}
              </div>
            </div>
            <div class="settings-item-control">
              {user()?.photoURL && (
                <img
                  src={user()?.photoURL!}
                  alt={`Аватар пользователя ${user()?.displayName || user()?.email}`}
                  class="settings-user-avatar"
                  loading="lazy"
                />
              )}
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Выйти из аккаунта</div>
              <div class="settings-item-description">
                Завершить текущую сессию и вернуться к экрану входа
              </div>
            </div>
            <div class="settings-item-control">
              <HapticButton
                onClick={handleSignOut}
                class="btn btn-danger"
                haptic="medium"
                aria-label="Выйти из аккаунта"
              >
                <LogoutIcon size={18} aria-hidden="true" />
                Выйти
              </HapticButton>
            </div>
          </div>
        </section>

        <section class="settings-section" aria-labelledby="about-heading">
          <h2 id="about-heading" class="settings-section-title">
            <Icon name="info" size={20} aria-hidden="true" />
            О приложении
          </h2>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Foxic</div>
              <div class="settings-item-description">
                Генератор шрифтов иконок для ваших проектов
              </div>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Версия</div>
              <div class="settings-item-description">1.0.0</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}