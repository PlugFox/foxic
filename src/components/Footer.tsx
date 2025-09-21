import { Component } from 'solid-js';
import { useI18n } from '../contexts/i18n.context';

const Footer: Component = () => {
  const { LL } = useI18n();

  return (
    <footer class="footer" role="contentinfo">
      <div class="footer-content">
        <div class="footer-info">
          <p class="footer-text">
            Made by{' '}
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
            Version {import.meta.env.VITE_APP_VERSION || '1.0.0'}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;