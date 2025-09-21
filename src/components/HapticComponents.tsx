import { Component, JSX, mergeProps, splitProps } from 'solid-js';
import { HapticFeedbackType, hapticService } from '../services/haptic.service';

type ClickHandler = (event: MouseEvent) => void;

interface HapticButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  haptic?: HapticFeedbackType | boolean;
  hapticDelay?: number;
  onHapticClick?: ClickHandler;
  onClick?: ClickHandler;
}

/**
 * Button component with built-in haptic feedback
 */
export const HapticButton: Component<HapticButtonProps> = (props) => {
  const merged = mergeProps({ haptic: true, hapticDelay: 0 }, props);
  const [local, others] = splitProps(merged, [
    'haptic',
    'hapticDelay',
    'onHapticClick',
    'onClick',
    'class',
    'disabled'
  ]);

  const handleClick = async (event: MouseEvent) => {
    // Don't trigger haptic for disabled buttons
    if (local.disabled) {
      return;
    }

    // Trigger haptic feedback
    if (local.haptic) {
      const hapticType = typeof local.haptic === 'boolean' ? 'medium' : local.haptic;

      if (local.hapticDelay > 0) {
        setTimeout(() => hapticService.trigger(hapticType), local.hapticDelay);
      } else {
        await hapticService.trigger(hapticType);
      }
    }

    // Call haptic-specific handler
    local.onHapticClick?.(event);

    // Call original click handler
    local.onClick?.(event);
  };

  return (
    <button
      {...others}
      class={`haptic-button ${local.class || ''}`}
      disabled={local.disabled}
      onClick={handleClick}
    />
  );
};

interface HapticCardProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onClick'> {
  haptic?: boolean;
  onHapticClick?: ClickHandler;
  onClick?: ClickHandler;
}

/**
 * Card/div component with haptic feedback on click
 */
export const HapticCard: Component<HapticCardProps> = (props) => {
  const merged = mergeProps({ haptic: true }, props);
  const [local, others] = splitProps(merged, [
    'haptic',
    'onHapticClick',
    'onClick',
    'class'
  ]);

  const handleClick = async (event: MouseEvent) => {
    // Trigger haptic feedback
    if (local.haptic) {
      await hapticService.cardTap();
    }

    // Call haptic-specific handler
    local.onHapticClick?.(event);

    // Call original click handler
    local.onClick?.(event);
  };

  return (
    <div
      {...others}
      class={`haptic-card ${local.class || ''}`}
      onClick={handleClick}
    />
  );
};

interface HapticIconButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  haptic?: HapticFeedbackType | boolean;
  size?: number | string;
  onClick?: ClickHandler;
}

/**
 * Icon button with haptic feedback
 */
export const HapticIconButton: Component<HapticIconButtonProps> = (props) => {
  const merged = mergeProps({ haptic: 'light' as const, size: 24 }, props);
  const [local, others] = splitProps(merged, [
    'haptic',
    'onClick',
    'class',
    'disabled',
    'size'
  ]);

  const handleClick = async (event: MouseEvent) => {
    if (local.disabled) return;

    // Trigger haptic feedback
    if (local.haptic) {
      const hapticType = typeof local.haptic === 'boolean' ? 'light' : local.haptic;
      await hapticService.trigger(hapticType);
    }

    local.onClick?.(event);
  };

  return (
    <button
      {...others}
      class={`haptic-icon-button ${local.class || ''}`}
      disabled={local.disabled}
      onClick={handleClick}
      style={Object.assign({
        width: typeof local.size === 'number' ? `${local.size + 16}px` : local.size,
        height: typeof local.size === 'number' ? `${local.size + 16}px` : local.size,
        padding: '8px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        'border-radius': '50%',
        display: 'inline-flex',
        'align-items': 'center',
        'justify-content': 'center',
        transition: 'all 0.2s ease'
      }, others.style || {})}
    />
  );
};

/**
 * Hook for adding haptic feedback to any element
 */
export const useHaptic = () => {
  const trigger = hapticService.trigger.bind(hapticService);

  return {
    trigger,
    button: hapticService.button.bind(hapticService),
    success: hapticService.success.bind(hapticService),
    error: hapticService.error.bind(hapticService),
    warning: hapticService.warning.bind(hapticService),
    selection: hapticService.selection.bind(hapticService),
    cardTap: hapticService.cardTap.bind(hapticService),
    longPress: hapticService.longPress.bind(hapticService),
    isSupported: hapticService.isHapticSupported(),
    isEnabled: hapticService.isHapticEnabled(),
    setEnabled: hapticService.setEnabled.bind(hapticService),
  };
};