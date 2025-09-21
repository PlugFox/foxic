import { createSignal, Show } from 'solid-js';
import { ProjectInfo } from '../services/projects.service';
import { HapticIconButton } from './HapticComponents';
import { DeleteIcon, LogoutIcon, MoreVertIcon, PinIcon } from './Icon';

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
    <article
      class="project-card"
      onClick={handleCardClick}
      onContextMenu={handleContextMenu}
      role="gridcell"
      tabindex="0"
      aria-label={`Проект ${props.project.name}, роль: ${props.project.role}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick(e as any);
        }
      }}
    >
      <header class="project-card-header">
        <div class="project-card-title">
          <h3 id={`project-title-${props.projectId}`}>{props.project.name}</h3>
          <Show when={props.project.pinned}>
            <PinIcon
              class="project-card-pin"
              title="Закреплено"
              size={16}
              aria-label="Проект закреплен"
            />
          </Show>
        </div>

        <div class="project-card-dropdown">
          <HapticIconButton
            class="project-card-menu-btn"
            onClick={handleDropdownClick}
            title="Меню проекта"
            haptic="light"
            size={20}
            aria-label="Открыть меню проекта"
            aria-expanded={showDropdown()}
            aria-haspopup="menu"
          >
            <MoreVertIcon size={20} aria-hidden="true" />
          </HapticIconButton>

          <Show when={showDropdown()}>
            <div
              ref={dropdownRef}
              class="project-card-menu"
              role="menu"
              aria-labelledby={`project-title-${props.projectId}`}
            >
              <Show when={props.onTogglePin}>
                <button
                  class="project-card-menu-item"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onTogglePin?.(props.projectId);
                    setShowDropdown(false);
                  }}
                  aria-label={props.project.pinned ? 'Открепить проект' : 'Закрепить проект'}
                >
                  <PinIcon size={16} aria-hidden="true" />
                  {props.project.pinned ? 'Открепить' : 'Закрепить'}
                </button>
              </Show>
              <Show
                when={props.project.role === 'owner'}
                fallback={
                  <Show when={props.onLeave}>
                    <button
                      class="project-card-menu-item project-card-menu-item--danger"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onLeave?.(props.projectId);
                        setShowDropdown(false);
                      }}
                      aria-label="Покинуть проект"
                    >
                      <LogoutIcon size={16} aria-hidden="true" />
                      Покинуть проект
                    </button>
                  </Show>
                }
              >
                <button
                  class="project-card-menu-item project-card-menu-item--danger"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onDelete(props.projectId);
                    setShowDropdown(false);
                  }}
                  aria-label="Удалить проект"
                >
                  <DeleteIcon size={16} aria-hidden="true" />
                  Удалить проект
                </button>
              </Show>
            </div>
          </Show>
        </div>
      </header>

      <div class="project-card-content">
        <div class="project-card-role">
          <span
            class={`project-role project-role--${props.project.role}`}
            aria-label={`Ваша роль в проекте: ${props.project.role === 'owner' ? 'Владелец' :
             props.project.role === 'admin' ? 'Администратор' :
             props.project.role === 'editor' ? 'Редактор' : 'Наблюдатель'}`}
          >
            {props.project.role === 'owner' ? 'Владелец' :
             props.project.role === 'admin' ? 'Администратор' :
             props.project.role === 'editor' ? 'Редактор' : 'Наблюдатель'}
          </span>
        </div>

        <footer class="project-card-footer">
          <Show when={props.project.notifications > 0}>
            <span
              class="project-card-notifications"
              role="status"
              aria-label={`${props.project.notifications} непрочитанных уведомлений`}
            >
              {props.project.notifications}
            </span>
          </Show>
        </footer>
      </div>
    </article>
  );
}