import { useNavigate } from '@solidjs/router';
import { createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import ConfirmDialog from '../components/ConfirmDialog';
import { HapticButton } from '../components/HapticComponents';
import { AddIcon, SettingsIcon } from '../components/Icon';
import { LoadingSpinner, LoadingState } from '../components/Loading';
import NewProjectCard from '../components/NewProjectCard';
import NewProjectDialog from '../components/NewProjectDialog';
import ProjectCard from '../components/ProjectCard';
import Tooltip from '../components/Tooltip';
import { useAuth } from '../contexts/auth.context';
import { useTranslation } from '../contexts/i18n.context';
import { analyticsService } from '../services/analytics.service';
import { CreateProjectData, ProjectInfo, projectsService } from '../services/projects.service';
import { toastService } from '../services/toast.service';

export default function HomePage() {
  const { user } = useAuth();
  const LL = useTranslation();
  const navigate = useNavigate();

  const [projects, setProjects] = createSignal<Record<string, ProjectInfo>>({});
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [showNewProjectDialog, setShowNewProjectDialog] = createSignal(false);
  const [showActionDialog, setShowActionDialog] = createSignal(false);
  const [projectAction, setProjectAction] = createSignal<{id: string, name: string, isOwner: boolean} | null>(null);

  const retryLoadProjects = () => {
    const currentUser = user();
    if (currentUser) {
      setError(null);
      setIsLoading(true);
      try {
        if (unsubscribe) unsubscribe();
        unsubscribe = projectsService.subscribeToUserProjects(
          currentUser.uid,
          (userProjects) => {
            setProjects(userProjects);
            setIsLoading(false);
          }
        );
      } catch (err) {
        console.error('Error loading projects:', err);
        setError('Не удалось загрузить проекты');
        setIsLoading(false);
      }
    }
  };

  let unsubscribe: (() => void) | null = null;

  // Подписываемся на изменения проектов пользователя
  createEffect(() => {
    const currentUser = user();
    if (currentUser) {
      setIsLoading(true);
      setError(null);
      try {
        unsubscribe = projectsService.subscribeToUserProjects(
          currentUser.uid,
          (userProjects) => {
            setProjects(userProjects);
            setIsLoading(false);
          }
        );
      } catch (err) {
        console.error('Error loading projects:', err);
        setError('Не удалось загрузить проекты');
        setIsLoading(false);
      }
    }
  });

  // Очистка подписки при размонтировании
  onCleanup(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  // Эффект прокрутки для AppBar
  onMount(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 10;
      const header = document.querySelector('.app-header');
      if (header) {
        if (scrolled) {
          header.classList.add('app-header--scrolled');
        } else {
          header.classList.remove('app-header--scrolled');
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    onCleanup(() => {
      window.removeEventListener('scroll', handleScroll);
    });
  });



  const handleOpenProject = (projectId: string) => {
    analyticsService.track('project_opened', { project_id: projectId });
    navigate(`/project/${projectId}`);
  };

  const [isCreatingProject, setIsCreatingProject] = createSignal(false);

  const handleCreateProject = async (projectData: CreateProjectData) => {
    const currentUser = user();
    if (!currentUser) return;

    setIsCreatingProject(true);
    try {
      await projectsService.createProject(
        currentUser.uid,
        projectData
      );
      // User details (email, name, avatar) will be fetched from users/{uid} when needed
      analyticsService.track('project_created', {
        project_id: projectData.name // используем name как ID для аналитики
      });

      toastService.success(
        'Проект создан',
        `Проект "${projectData.name}" успешно создан`
      );
    } catch (error) {
      console.error('Ошибка создания проекта:', error);
      toastService.error(
        'Ошибка создания проекта',
        'Не удалось создать проект. Попробуйте еще раз.'
      );
      throw error; // Пробрасываем ошибку в диалог для обработки
    } finally {
      setIsCreatingProject(false);
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
      // Потом по имени
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
    <div class="home-container" role="application" aria-label="Foxic - Генератор шрифтов иконок">
      <header class="app-header" role="banner">
        <div class="header-content">
          <h1 id="app-title">Foxic</h1>
          <nav class="user-menu" role="navigation" aria-label="Меню пользователя">
            <div class="user-info">
              <div class="user-profile">
                <Show when={user()?.photoURL}>
                  <img
                    src={user()?.photoURL!}
                    alt={`Аватар пользователя ${user()?.displayName || user()?.email}`}
                    class="user-avatar"
                    loading="lazy"
                  />
                </Show>
                <span class="user-name" aria-label={`Текущий пользователь: ${user()?.displayName || user()?.email}`}>
                  {user()?.displayName || user()?.email}
                </span>
              </div>
              <Tooltip content="Настройки" position="bottom">
                <HapticButton
                  onClick={() => navigate('/settings')}
                  class="btn btn-ghost"
                  haptic="light"
                  aria-label="Открыть настройки"
                >
                  <SettingsIcon size={20} aria-hidden="true" />
                </HapticButton>
              </Tooltip>
            </div>
          </nav>
        </div>
      </header>

      <main class="main-content" role="main" aria-labelledby="app-title">
        <section class="projects-container" aria-labelledby="projects-heading">
          <header class="projects-header">
            <h2 id="projects-heading">Мои проекты</h2>
            <Show when={!isLoading() && Object.keys(projects()).length > 0}>
              <span class="projects-count" role="status" aria-live="polite">
                {Object.keys(projects()).length} {Object.keys(projects()).length === 1 ? 'проект' : 'проектов'}
              </span>
            </Show>
          </header>

          <Show when={isLoading()}>
            <div class="projects-loading" role="status" aria-live="polite" aria-label="Загрузка проектов">
              <LoadingSpinner size={32} />
              <p>Загрузка проектов...</p>
            </div>
          </Show>

          <Show when={error()}>
            <LoadingState
              loading={false}
              error={error()}
              onRetry={retryLoadProjects}
              retryLabel="Попробовать снова"
            >
              <></>
            </LoadingState>
          </Show>

          <Show when={!isLoading() && Object.keys(projects()).length === 0}>
            <div class="projects-empty" role="region" aria-labelledby="empty-heading">
              <div class="empty-icon" aria-hidden="true">📁</div>
              <h3 id="empty-heading">У вас пока нет проектов</h3>
              <p>Создайте свой первый проект для работы с иконками</p>
              <HapticButton
                class="btn btn-primary btn-large"
                onClick={() => setShowNewProjectDialog(true)}
                haptic="medium"
                aria-describedby="empty-heading"
              >
                <AddIcon size={20} aria-hidden="true" />
                Создать первый проект
              </HapticButton>
            </div>
          </Show>

          <Show when={!isLoading() && Object.keys(projects()).length > 0}>
            <div
              class="projects-grid"
              role="grid"
              aria-label="Сетка проектов"
              aria-rowcount={Math.ceil((Object.keys(projects()).length + 1) / 3)}
            >
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
        </section>
      </main>

      {/* <footer class="app-footer" role="contentinfo">
        <HapticButton
          onClick={handlePWAInfo}
          class="pwa-info-btn"
          title="Информация о PWA"
          haptic="light"
          aria-label="Показать информацию о Progressive Web App"
        >
          <AnalyticsIcon size={16} aria-hidden="true" />
          PWA
        </HapticButton>
      </footer> */}

      <NewProjectDialog
        isOpen={showNewProjectDialog()}
        loading={isCreatingProject()}
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