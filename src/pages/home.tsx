import { useAuth } from '../contexts/auth.context';

export default function HomePage() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  // Тестовая функция для демонстрации отладки
  const handleTestDebug = () => {
    console.log('🐛 Тестовая функция для отладки');
    debugger; // Поставьте брейкпоинт здесь!

    const testData = {
      user: user(),
      timestamp: new Date().toISOString(),
      message: 'Тест отладки SolidJS'
    };

    console.log('Данные для отладки:', testData);
    alert(`Привет, ${user()?.displayName || user()?.email}!`);
  };

  return (
    <div class="home-container">
      <header class="app-header">
        <div class="header-content">
          <h1>Foxic</h1>
          <div class="user-menu">
            <div class="user-info">
              <span class="user-name">{user()?.displayName || user()?.email}</span>
              <button onClick={handleSignOut} class="btn btn-secondary">
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="main-content">
        <div class="container">
          <div class="welcome-section">
            <h2>Добро пожаловать в Foxic!</h2>
            <p>Генератор иконочных шрифтов из SVG файлов</p>
          </div>

          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon">📁</div>
              <h3>Загрузка SVG</h3>
              <p>Загружайте ваши SVG иконки для создания шрифта</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">🔤</div>
              <h3>Генерация шрифта</h3>
              <p>Автоматическое создание шрифтовых файлов из ваших иконок</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">💾</div>
              <h3>Облачное хранение</h3>
              <p>Все ваши проекты сохраняются в облаке</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">📱</div>
              <h3>Адаптивность</h3>
              <p>Работает на всех устройствах и экранах</p>
            </div>
          </div>

          <div class="action-section">
            <button class="btn btn-primary btn-large">
              Создать новый проект
            </button>
            <button
              onClick={handleTestDebug}
              class="btn btn-secondary btn-large"
              style="margin-left: 1rem;"
            >
              🐛 Тест отладки
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}