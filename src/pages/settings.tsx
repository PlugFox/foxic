import { useNavigate } from '@solidjs/router';
import { Show } from 'solid-js';
import { HapticButton } from '../components/HapticComponents';
import Icon, { LogoutIcon } from '../components/Icon';
import LanguageSelector from '../components/LanguageSelector';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../contexts/auth.context';
import { useI18n } from '../contexts/i18n.context';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { t, isReady } = useI18n();
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
      <Show when={isReady()} fallback={<div>Loading...</div>}>
        <header class="settings-header">
          <div class="settings-header-content">
            <HapticButton
              onClick={handleBack}
              class="btn btn-ghost settings-back-btn"
              haptic="light"
              aria-label={t().tooltips.goBack()}
            >
              <Icon name="chevron_left" size={24} aria-hidden="true" />
            </HapticButton>
            <h1 id="settings-title">{t().settings.title()}</h1>
          </div>
        </header>

      <main class="settings-content">
        <section class="settings-section" aria-labelledby="appearance-heading">
          <h2 id="appearance-heading" class="settings-section-title">
            <Icon name="palette" size={20} aria-hidden="true" />
            {t().settings.appearance.title()}
          </h2>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">{t().settings.appearance.language.title()}</div>
              <div class="settings-item-description">
                {t().settings.appearance.language.description()}
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
            {t().settings.account.title()}
          </h2>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">{t().settings.account.user()}</div>
              <div class="settings-item-description">
                {user()?.displayName || user()?.email}
              </div>
            </div>
            <div class="settings-item-control">
              <UserAvatar
                src={user()?.photoURL || undefined}
                alt={`Аватар пользователя ${user()?.displayName || user()?.email}`}
                size={40}
                fallbackInitials={user()?.displayName || user()?.email || undefined}
                class="settings-user-avatar"
              />
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">{t().settings.account.signOut.title()}</div>
              <div class="settings-item-description">
                {t().settings.account.signOut.description()}
              </div>
            </div>
            <div class="settings-item-control">
              <HapticButton
                onClick={handleSignOut}
                class="btn btn-danger"
                haptic="medium"
                aria-label={t().auth.signOut()}
              >
                <LogoutIcon size={18} aria-hidden="true" />
                {t().settings.account.signOut.button()}
              </HapticButton>
            </div>
          </div>
        </section>

        <section class="settings-section" aria-labelledby="about-heading">
          <h2 id="about-heading" class="settings-section-title">
            <Icon name="info" size={20} aria-hidden="true" />
            {t().settings.about.title()}
          </h2>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">{t().settings.about.appName()}</div>
              <div class="settings-item-description">
                {t().settings.about.appDescription()}
              </div>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">{t().settings.about.version()}</div>
              <div class="settings-item-description">1.0.0</div>
            </div>
          </div>
        </section>
      </main>
      </Show>
    </div>
  );
}