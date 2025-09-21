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
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../contexts/auth.context';
import { useI18n } from '../contexts/i18n.context';
import { analyticsService } from '../services/analytics.service';
import { CreateProjectData, ProjectInfo, projectsService } from '../services/projects.service';
import { toastService } from '../services/toast.service';

export default function HomePage() {
  const { user } = useAuth();
  const { t, isReady } = useI18n();
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
        setError(t().projects.loadError());
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
        setError(t().projects.loadError());
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
        t().projects.created(),
        t().projects.createdMessage({ name: projectData.name })
      );
    } catch (error) {
      console.error('Ошибка создания проекта:', error);
      toastService.error(
        t().projects.createError(),
        t().projects.createErrorMessage()
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
      alert(`${t().common.error()}: ${error instanceof Error ? error.message : t().errors.generic()}`);
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
      `${t().pwa.installed()}: ${isInstalled ? '✅' : '❌'}`,
      `${t().pwa.serviceWorker()}: ${hasServiceWorker ? '✅' : '❌'}`,
      `${t().pwa.online()}: ${isOnline ? '✅' : '❌'}`,
      `${t().pwa.cache()}: ${('caches' in window) ? '✅' : '❌'}`
    ].join('\n');

    alert(`${t().pwa.statusAlert()}\n\n${info}`);
  };

  return (
    <div class="home-container" role="application" aria-label={t().a11y.applicationLandmark()}>
      <header class="app-header" role="banner">
        <div class="header-content">
          <h1 id="app-title">{t().home.appTitle()}</h1>
          <nav class="user-menu" role="navigation" aria-label={t().home.userMenu()}>
            <div class="user-info">
              <div class="user-profile">
                <UserAvatar
                  src={user()?.photoURL || undefined}
                  alt={`${t().tooltips.userAvatar()} ${user()?.displayName || user()?.email}`}
                  size={32}
                  fallbackInitials={user()?.displayName || user()?.email || undefined}
                />
                <span class="user-name" aria-label={t().home.currentUser({ user: user()?.displayName || user()?.email || '' })}>
                  {user()?.displayName || user()?.email}
                </span>
              </div>
              <Tooltip content={t().common.settings()} position="bottom">
                <HapticButton
                  onClick={() => navigate('/settings')}
                  class="btn btn-ghost"
                  haptic="light"
                  aria-label={t().home.openSettings()}
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
            <h2 id="projects-heading">{t().home.myProjects()}</h2>
            <Show when={!isLoading() && Object.keys(projects()).length > 0}>
              <span class="projects-count" role="status" aria-live="polite">
                {Object.keys(projects()).length === 1 ? t().home.projectsCount({ count: Object.keys(projects()).length }) : t().home.projectsCountMany({ count: Object.keys(projects()).length })}
              </span>
            </Show>
          </header>

          <Show when={isLoading()}>
            <div class="projects-loading" role="status" aria-live="polite" aria-label={t().projects.loading()}>
              <LoadingSpinner size={32} />
              <p>{t().projects.loading()}</p>
            </div>
          </Show>

          <Show when={error()}>
            <LoadingState
              loading={false}
              error={error()}
              onRetry={retryLoadProjects}
              retryLabel={t().common.retry()}
            >
              <></>
            </LoadingState>
          </Show>

          <Show when={!isLoading() && Object.keys(projects()).length === 0}>
            <div class="projects-empty" role="region" aria-labelledby="empty-heading">
              <div class="empty-icon" aria-hidden="true">📁</div>
              <h3 id="empty-heading">{t().projects.empty.title()}</h3>
              <p>{t().projects.empty.description()}</p>
              <HapticButton
                class="btn btn-primary btn-large"
                onClick={() => setShowNewProjectDialog(true)}
                haptic="medium"
                aria-describedby="empty-heading"
              >
                <AddIcon size={20} aria-hidden="true" />
                {t().projects.empty.createFirst()}
              </HapticButton>
            </div>
          </Show>

          <Show when={!isLoading() && Object.keys(projects()).length > 0}>
            <div
              class="projects-grid"
              role="grid"
              aria-label={t().a11y.projectGrid()}
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
        title={projectAction()?.isOwner ? t().actions.delete.title() : t().actions.leave.title()}
        message={
          projectAction()?.isOwner
            ? t().actions.delete.message({ name: projectAction()?.name || '' })
            : t().actions.leave.message({ name: projectAction()?.name || '' })
        }
        confirmText={projectAction()?.isOwner ? t().actions.delete.confirm() : t().actions.leave.confirm()}
        cancelText={t().actions.cancel()}
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