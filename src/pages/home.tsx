import { useNavigate } from '@solidjs/router';
import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import ConfirmDialog from '../components/ConfirmDialog';
import NewProjectCard from '../components/NewProjectCard';
import NewProjectDialog from '../components/NewProjectDialog';
import ProjectCard from '../components/ProjectCard';
import { useAuth } from '../contexts/auth.context';
import { CreateProjectData, ProjectInfo, projectsService } from '../services/projects.service';

export default function HomePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = createSignal<Record<string, ProjectInfo>>({});
  const [isLoading, setIsLoading] = createSignal(true);
  const [showNewProjectDialog, setShowNewProjectDialog] = createSignal(false);
  const [showActionDialog, setShowActionDialog] = createSignal(false);
  const [projectAction, setProjectAction] = createSignal<{id: string, name: string, isOwner: boolean} | null>(null);

  let unsubscribe: (() => void) | null = null;

  // Подписываемся на изменения проектов пользователя
  createEffect(() => {
    const currentUser = user();
    if (currentUser) {
      setIsLoading(true);
      unsubscribe = projectsService.subscribeToUserProjects(
        currentUser.uid,
        (userProjects) => {
          setProjects(userProjects);
          setIsLoading(false);
        }
      );
    }
  });

  // Очистка подписки при размонтировании
  onCleanup(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  const handleOpenProject = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const handleCreateProject = async (projectData: CreateProjectData) => {
    const currentUser = user();
    if (!currentUser) return;

    try {
      await projectsService.createProject(
        currentUser.uid,
        projectData
      );
      // User details (email, name, avatar) will be fetched from users/{uid} when needed
    } catch (error) {
      console.error('Ошибка создания проекта:', error);
      // В реальном приложении здесь можно показать toast-уведомление
      throw error; // Пробрасываем ошибку в диалог для обработки
    }
  };

  const handleDeleteProject = (projectId: string) => {
    const project = projects()[projectId];
    if (project) {
      setProjectAction({ id: projectId, name: project.name, isOwner: project.role === 'owner' });
      setShowActionDialog(true);
    }
  };

  const handleLeaveProject = (projectId: string) => {
    const project = projects()[projectId];
    if (project) {
      setProjectAction({ id: projectId, name: project.name, isOwner: false });
      setShowActionDialog(true);
    }
  };

  const handleConfirmAction = async () => {
    const currentUser = user();
    const action = projectAction();

    if (!currentUser || !action) return;

    try {
      if (action.isOwner) {
        await projectsService.deleteProject(currentUser.uid, action.id);
      } else {
        await projectsService.leaveProject(currentUser.uid, action.id);
      }

      setProjectAction(null);
      setShowActionDialog(false);
    } catch (error) {
      console.error('Ошибка при выполнении действия:', error);
      // В реальном приложении здесь можно показать toast-уведомление
      alert(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };  const handleTogglePin = async (projectId: string) => {
    const currentUser = user();
    if (!currentUser) return;

    await projectsService.toggleProjectPin(currentUser.uid, projectId);
  };

  // Сортировка проектов: сначала закрепленные, потом по времени последнего доступа
  const sortedProjects = () => {
    const projectsObj = projects();
    const entries = Object.entries(projectsObj);

    return entries.sort(([, a], [, b]) => {
      // Сначала закрепленные
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      // Затем по алфавиту (без lastAccessed для экономии записей)
      return a.name.localeCompare(b.name);
    });
  };

  const handlePWAInfo = () => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const hasServiceWorker = 'serviceWorker' in navigator;
    const isOnline = navigator.onLine;

    const info = [
      `PWA установлено: ${isInstalled ? '✅' : '❌'}`,
      `Service Worker: ${hasServiceWorker ? '✅' : '❌'}`,
      `Онлайн: ${isOnline ? '✅' : '❌'}`,
      `Кэш: ${('caches' in window) ? '✅' : '❌'}`
    ].join('\n');

    alert(`Статус PWA:\n\n${info}`);
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
        <div class="projects-container">
          <div class="projects-header">
            <h2>Мои проекты</h2>
            <Show when={!isLoading() && Object.keys(projects()).length > 0}>
              <span class="projects-count">
                {Object.keys(projects()).length} {Object.keys(projects()).length === 1 ? 'проект' : 'проектов'}
              </span>
            </Show>
          </div>

          <Show when={isLoading()}>
            <div class="projects-loading">
              <div class="loading-spinner"></div>
              <p>Загрузка проектов...</p>
            </div>
          </Show>

          <Show when={!isLoading() && Object.keys(projects()).length === 0}>
            <div class="projects-empty">
              <div class="empty-icon">�</div>
              <h3>У вас пока нет проектов</h3>
              <p>Создайте свой первый проект для работы с иконками</p>
              <button
                class="btn btn-primary btn-large"
                onClick={() => setShowNewProjectDialog(true)}
              >
                Создать первый проект
              </button>
            </div>
          </Show>

          <Show when={!isLoading() && Object.keys(projects()).length > 0}>
            <div class="projects-grid">
              <For each={sortedProjects()}>
                {([projectId, project]) => (
                  <ProjectCard
                    projectId={projectId}
                    project={project}
                    onOpen={handleOpenProject}
                    onDelete={handleDeleteProject}
                    onLeave={handleLeaveProject}
                    onTogglePin={handleTogglePin}
                  />
                )}
              </For>
              <NewProjectCard onCreate={() => setShowNewProjectDialog(true)} />
            </div>
          </Show>
        </div>
      </main>

      <footer class="app-footer">
        <button onClick={handlePWAInfo} class="pwa-info-btn" title="Информация о PWA">
          📱 PWA
        </button>
      </footer>

      <NewProjectDialog
        isOpen={showNewProjectDialog()}
        onClose={() => setShowNewProjectDialog(false)}
        onConfirm={handleCreateProject}
      />

      <ConfirmDialog
        isOpen={showActionDialog()}
        title={projectAction()?.isOwner ? "Удалить проект" : "Покинуть проект"}
        message={
          projectAction()?.isOwner
            ? `Вы уверены, что хотите удалить проект "${projectAction()?.name}"? Это действие нельзя отменить.`
            : `Вы уверены, что хотите покинуть проект "${projectAction()?.name}"? Вы потеряете доступ к проекту.`
        }
        confirmText={projectAction()?.isOwner ? "Удалить" : "Покинуть"}
        cancelText="Отмена"
        isDestructive={true}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          setShowActionDialog(false);
          setProjectAction(null);
        }}
      />
    </div>
  );
}