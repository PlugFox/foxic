import { Component } from 'solid-js';

export interface AlphaRibbonProps {
  text?: string;
  class?: string;
}

/**
 * Alpha ribbon component that displays in the top-right corner
 * Fixed position overlay that appears above all content
 */
export const AlphaRibbon: Component<AlphaRibbonProps> = (props) => {
  const text = () => props.text || 'ALPHA';

  return (
    <div class={`alpha-ribbon ${props.class || ''}`} role="banner" aria-label={`${text()} версия приложения`}>
      <span class="alpha-ribbon-text">{text()}</span>
    </div>
  );
};

export default AlphaRibbon;