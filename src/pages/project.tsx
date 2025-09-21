import { useNavigate, useParams } from '@solidjs/router';
import { createEffect, createSignal } from 'solid-js';
import { useAuth } from '../contexts/auth.context';
import { Project, projectsService } from '../services/projects.service';

export default function ProjectPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = createSignal<Project | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  // Загружаем данные проекта
  createEffect(async () => {
    const projectId = params.id;
    if (!projectId) {
      navigate('/');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const projectData = await projectsService.getProject(projectId);

      if (!projectData) {
        setError('Проект не найден');
        return;
      }

      // Проверяем права доступа к проекту
      const currentUser = user();
      if (!currentUser || !projectData.members[currentUser.uid]) {
        setError('У вас нет доступа к этому проекту');
        return;
      }

      setProject(projectData);
    } catch (err) {
      console.error('Ошибка загрузки проекта:', err);
      setError('Ошибка загрузки проекта');
    } finally {
      setIsLoading(false);
    }
  });

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div class="project-page">
      <header class="project-header">
        <div class="project-header-content">
          <button
            class="btn btn-secondary btn-back"
            onClick={handleBackToHome}
          >
            ← Назад к проектам
          </button>

          {project() && (
            <div class="project-title-section">
              <h1>{project()?.name}</h1>
              {project()?.description && (
                <p class="project-description">{project()?.description || ''}</p>
              )}
            </div>
          )}
        </div>
      </header>

      <main class="project-content">
        {isLoading() && (
          <div class="project-loading">
            <div class="loading-spinner"></div>
            <p>Загрузка проекта...</p>
          </div>
        )}

        {error() && (
          <div class="project-error">
            <div class="error-icon">⚠️</div>
            <h2>Ошибка</h2>
            <p>{error()}</p>
            <button
              class="btn btn-primary"
              onClick={handleBackToHome}
            >
              Вернуться к проектам
            </button>
          </div>
        )}

        {!isLoading() && !error() && project() && (
          <div class="project-workspace">
            <div class="workspace-placeholder">
              <div class="placeholder-icon">🚧</div>
              <h2>Рабочее место проекта</h2>
              <p>Здесь будет интерфейс для работы с иконками:</p>
              <ul class="feature-list">
                <li>• Загрузка SVG файлов</li>
                <li>• Предварительный просмотр иконок</li>
                <li>• Редактирование и настройка</li>
                <li>• Генерация иконочного шрифта</li>
                <li>• Экспорт готовых файлов</li>
              </ul>

              <div class="project-info">
                <div class="project-info-item">
                  <strong>Владелец:</strong> {project()?.owner || 'Неизвестно'}
                </div>
                <div class="project-info-item">
                  <strong>Ваша роль:</strong> {(() => {
                    const currentUser = user();
                    if (!currentUser) return 'Неизвестно';
                    const role = project()!.members[currentUser.uid]?.role;
                    return role === 'owner' ? 'Владелец' :
                           role === 'admin' ? 'Администратор' :
                           role === 'editor' ? 'Редактор' : 'Наблюдатель';
                  })()}
                </div>
                <div class="project-info-item">
                  <strong>Видимость:</strong> {(() => {
                    const visibility = project()?.visibility || 'private';
                    return visibility === 'private' ? 'Приватный' :
                           visibility === 'link' ? 'По ссылке' : 'Публичный';
                  })()}
                </div>
                <div class="project-info-item">
                  <strong>Участников:</strong> {Object.keys(project()?.members || {}).length}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}