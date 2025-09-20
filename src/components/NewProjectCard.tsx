interface NewProjectCardProps {
  onCreate: () => void;
}

export default function NewProjectCard(props: NewProjectCardProps) {
  return (
    <div
      class="project-card project-card--new"
      onClick={props.onCreate}
    >
      <div class="new-project-content">
        <div class="new-project-icon">+</div>
        <h3 class="new-project-title">Создать проект</h3>
        <p class="new-project-description">
          Создайте новый проект для работы с иконками
        </p>
      </div>
    </div>
  );
}