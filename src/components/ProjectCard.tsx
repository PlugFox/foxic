import { createSignal, Show } from 'solid-js';
import { ProjectInfo } from '../services/projects.service';

interface ProjectCardProps {
  projectId: string;
  project: ProjectInfo;
  onOpen: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  onLeave?: (projectId: string) => void;
  onTogglePin?: (projectId: string) => void;
}

export default function ProjectCard(props: ProjectCardProps) {
  const [showDropdown, setShowDropdown] = createSignal(false);
  let dropdownRef: HTMLDivElement | undefined;

  // Закрытие дропдауна при клике вне его области
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
      setShowDropdown(false);
    }
  };

  // Обработчик правого клика
  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    setShowDropdown(true);
    document.addEventListener('click', handleClickOutside, { once: true });
  };

  // Обработчик клика на дропдаун
  const handleDropdownClick = (event: MouseEvent) => {
    event.preventDefault();
    setShowDropdown(!showDropdown());
    if (showDropdown()) {
      document.addEventListener('click', handleClickOutside, { once: true });
    }
  };

  // Обработчик клика на карточку
  const handleCardClick = (event: MouseEvent) => {
    // Предотвращаем открытие проекта при клике на дропдаун
    if ((event.target as HTMLElement).closest('.project-card-dropdown')) {
      return;
    }
    props.onOpen(props.projectId);
  };

  return (
    <div
      class="project-card"
      onClick={handleCardClick}
      onContextMenu={handleContextMenu}
    >
      <div class="project-card-header">
        <div class="project-card-title">
          <h3>{props.project.name}</h3>
          <Show when={props.project.pinned}>
            <span class="project-card-pin" title="Закреплено">📌</span>
          </Show>
        </div>

        <div class="project-card-dropdown">
          <button
            class="project-card-menu-btn"
            onClick={handleDropdownClick}
            title="Меню проекта"
          >
            ⋮
          </button>

          <Show when={showDropdown()}>
            <div ref={dropdownRef} class="project-card-menu">
              <Show when={props.onTogglePin}>
                <button
                  class="project-card-menu-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onTogglePin?.(props.projectId);
                    setShowDropdown(false);
                  }}
                >
                  {props.project.pinned ? '📌 Открепить' : '📌 Закрепить'}
                </button>
              </Show>
              <Show
                when={props.project.role === 'owner'}
                fallback={
                  <Show when={props.onLeave}>
                    <button
                      class="project-card-menu-item project-card-menu-item--danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onLeave?.(props.projectId);
                        setShowDropdown(false);
                      }}
                    >
                      🚪 Покинуть проект
                    </button>
                  </Show>
                }
              >
                <button
                  class="project-card-menu-item project-card-menu-item--danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onDelete(props.projectId);
                    setShowDropdown(false);
                  }}
                >
                  🗑️ Удалить проект
                </button>
              </Show>
            </div>
          </Show>
        </div>
      </div>

      <div class="project-card-content">
        <div class="project-card-role">
          <span class={`project-role project-role--${props.project.role}`}>
            {props.project.role === 'owner' ? 'Владелец' :
             props.project.role === 'admin' ? 'Администратор' :
             props.project.role === 'editor' ? 'Редактор' : 'Наблюдатель'}
          </span>
        </div>

        <div class="project-card-footer">
          <Show when={props.project.notifications > 0}>
            <span class="project-card-notifications">
              {props.project.notifications}
            </span>
          </Show>
        </div>
      </div>
    </div>
  );
}