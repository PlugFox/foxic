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
  const [showDeleteDialog, setShowDeleteDialog] = createSignal(false);
  const [projectToDelete, setProjectToDelete] = createSignal<{id: string, name: string} | null>(null);

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
    // Обновляем время последнего доступа
    const currentUser = user();
    if (currentUser) {
      projectsService.updateLastAccess(currentUser.uid, projectId);
    }
    navigate(`/project/${projectId}`);
  };

  const handleCreateProject = async (projectData: CreateProjectData) => {
    const currentUser = user();
    if (!currentUser) return;

    await projectsService.createProject(
      currentUser.uid,
      currentUser.email || '',
      currentUser.displayName || currentUser.email || 'Пользователь',
      currentUser.photoURL,
      projectData
    );
  };

  const handleDeleteProject = (projectId: string) => {
    const project = projects()[projectId];
    if (project) {
      setProjectToDelete({ id: projectId, name: project.name });
      setShowDeleteDialog(true);
    }
  };

  const handleConfirmDelete = async () => {
    const currentUser = user();
    const toDelete = projectToDelete();

    if (!currentUser || !toDelete) return;

    await projectsService.deleteProject(currentUser.uid, toDelete.id);
    setProjectToDelete(null);
    setShowDeleteDialog(false);
  };

  const handleTogglePin = async (projectId: string) => {
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

      // Затем по времени последнего доступа
      const aTime = (a.lastAccessed as any)?.seconds || 0;
      const bTime = (b.lastAccessed as any)?.seconds || 0;
      return bTime - aTime;
    });
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
                    onTogglePin={handleTogglePin}
                  />
                )}
              </For>
              <NewProjectCard onCreate={() => setShowNewProjectDialog(true)} />
            </div>
          </Show>
        </div>
      </main>

      <NewProjectDialog
        isOpen={showNewProjectDialog()}
        onClose={() => setShowNewProjectDialog(false)}
        onConfirm={handleCreateProject}
      />

      <ConfirmDialog
        isOpen={showDeleteDialog()}
        title="Удалить проект"
        message={`Вы уверены, что хотите удалить проект "${projectToDelete()?.name}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        cancelText="Отмена"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setProjectToDelete(null);
        }}
      />
    </div>
  );
}