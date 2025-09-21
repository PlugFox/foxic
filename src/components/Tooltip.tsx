import { JSX, ParentComponent, Show, createSignal, onCleanup, onMount } from 'solid-js';
import { Portal } from 'solid-js/web';

export interface TooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  disabled?: boolean;
  class?: string;
  children: JSX.Element;
}

export const Tooltip: ParentComponent<TooltipProps> = (props) => {
  const [isVisible, setIsVisible] = createSignal(false);
  const [tooltipRef, setTooltipRef] = createSignal<HTMLDivElement>();
  const [targetRef, setTargetRef] = createSignal<HTMLElement>();

  let showTimeout: ReturnType<typeof setTimeout>;
  let hideTimeout: ReturnType<typeof setTimeout>;

  const position = () => props.position || 'top';
  const delay = () => props.delay || 300;

  const showTooltip = () => {
    if (props.disabled) return;

    clearTimeout(hideTimeout);
    showTimeout = setTimeout(() => {
      setIsVisible(true);
      // Обновляем позицию после рендера
      requestAnimationFrame(() => {
        updatePosition();
      });
    }, delay());
  };

  const hideTooltip = () => {
    clearTimeout(showTimeout);
    hideTimeout = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  const updatePosition = () => {
    const tooltip = tooltipRef();
    const target = targetRef();

    if (!tooltip || !target) return;

    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (position()) {
      case 'top':
        top = targetRect.top - tooltipRect.height - 8;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + 8;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.right + 8;
        break;
    }

    // Keep tooltip within viewport
    if (left < 8) left = 8;
    if (left + tooltipRect.width > viewportWidth - 8) {
      left = viewportWidth - tooltipRect.width - 8;
    }
    if (top < 8) top = 8;
    if (top + tooltipRect.height > viewportHeight - 8) {
      top = viewportHeight - tooltipRect.height - 8;
    }

    tooltip.style.top = `${top + window.scrollY}px`;
    tooltip.style.left = `${left + window.scrollX}px`;
  };

  onMount(() => {
    const target = targetRef();
    if (target) {
      target.addEventListener('mouseenter', showTooltip);
      target.addEventListener('mouseleave', hideTooltip);
      target.addEventListener('focus', showTooltip);
      target.addEventListener('blur', hideTooltip);
    }

    // Обновляем позицию при скролле и ресайзе
    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition, { passive: true });
  });

  onCleanup(() => {
    clearTimeout(showTimeout);
    clearTimeout(hideTimeout);

    const target = targetRef();
    if (target) {
      target.removeEventListener('mouseenter', showTooltip);
      target.removeEventListener('mouseleave', hideTooltip);
      target.removeEventListener('focus', showTooltip);
      target.removeEventListener('blur', hideTooltip);
    }

    window.removeEventListener('scroll', updatePosition);
    window.removeEventListener('resize', updatePosition);
  });

  return (
    <>
      <div
        ref={setTargetRef}
        class={`tooltip-trigger ${props.class || ''}`}
        style={{ display: 'contents' }}
      >
        {props.children}
      </div>

      <Show when={isVisible() && props.content}>
        <Portal>
          <div
            ref={(el) => {
              setTooltipRef(el);
              // Обновляем позицию сразу после установки ref
              if (el) {
                requestAnimationFrame(() => updatePosition());
              }
            }}
            class={`tooltip tooltip--${position()}`}
            role="tooltip"
            aria-hidden={!isVisible()}
          >
            <div class="tooltip-content">
              {props.content}
            </div>
            <div class="tooltip-arrow" />
          </div>
        </Portal>
      </Show>
    </>
  );
};

export default Tooltip;