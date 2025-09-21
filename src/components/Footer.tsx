import { Component, Show } from 'solid-js';
import { useI18n } from '../contexts/i18n.context';

const Footer: Component = () => {
  const { isReady, t } = useI18n();

  return (
    <Show when={isReady()} fallback={<div class="footer-loading">Loading...</div>}>
      <footer class="footer" role="contentinfo">
        <div class="footer-content">
          <div class="footer-info">
            <p class="footer-text">
              {t().footer.madeBy()}{' '}
              <a
                href="https://plugfox.dev"
                target="_blank"
                rel="noopener noreferrer"
                class="footer-link"
                aria-label="Visit PlugFox website"
              >
                Mike Matiunin aka PlugFox
              </a>
            </p>
            <p class="footer-version">
              {t().footer.version()} {import.meta.env.VITE_APP_VERSION || '1.0.0'}
            </p>
          </div>
        </div>
      </footer>
    </Show>
  );
};

export default Footer;