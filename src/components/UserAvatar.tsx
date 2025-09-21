import { createSignal, onMount, Show } from 'solid-js';
import Icon from './Icon';

export interface UserAvatarProps {
  src?: string;
  alt: string;
  size?: number;
  fallbackInitials?: string;
  class?: string;
}

export default function UserAvatar(props: UserAvatarProps) {
  const [imageLoaded, setImageLoaded] = createSignal(false);
  const [imageError, setImageError] = createSignal(false);
  const [cachedSrc, setCachedSrc] = createSignal<string | null>(null);

  const size = () => props.size || 32;

  // Cache key based on src
  const getCacheKey = (src: string) => `avatar_cache_${btoa(src).substring(0, 16)}`;

  // Check if image is cached
  const checkCache = (src: string) => {
    try {
      const cacheKey = getCacheKey(src);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache for 1 hour
        const cacheExpiry = 60 * 60 * 1000;
        if (Date.now() - timestamp < cacheExpiry) {
          return data;
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.warn('Avatar cache check failed:', error);
    }
    return null;
  };

  // Cache image data
  const cacheImage = (src: string, dataUrl: string) => {
    try {
      const cacheKey = getCacheKey(src);
      const cacheData = {
        data: dataUrl,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Avatar cache save failed:', error);
    }
  };

  // Load and cache image
  const loadImage = async (src: string) => {
    try {
      // Check cache first
      const cached = checkCache(src);
      if (cached) {
        setCachedSrc(cached);
        setImageLoaded(true);
        return;
      }

      // Load image
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const loadPromise = new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            // Convert to canvas and cache as data URL
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              reject(new Error('Canvas context not available'));
              return;
            }

            canvas.width = size();
            canvas.height = size();

            ctx.drawImage(img, 0, 0, size(), size());
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

            cacheImage(src, dataUrl);
            setCachedSrc(dataUrl);
            setImageLoaded(true);
            resolve();
          } catch (error) {
            console.warn('Image processing failed:', error);
            // Fallback to original src
            setCachedSrc(src);
            setImageLoaded(true);
            resolve();
          }
        };

        img.onerror = () => {
          console.warn('Avatar image failed to load:', src);
          setImageError(true);
          reject(new Error('Image load failed'));
        };
      });

      img.src = src;
      await loadPromise;
    } catch (error) {
      console.warn('Avatar load failed:', error);
      setImageError(true);
    }
  };

  onMount(() => {
    if (props.src) {
      loadImage(props.src);
    } else {
      setImageError(true);
    }
  });

  // Generate initials from alt text or fallback
  const getInitials = () => {
    if (props.fallbackInitials) {
      return props.fallbackInitials.substring(0, 2).toUpperCase();
    }

    const name = props.alt.replace(/^Аватар пользователя\s*/i, '').trim();
    const parts = name.split(/\s+/);

    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts[0]) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return '?';
  };

  const avatarStyle = () => ({
    width: `${size()}px`,
    height: `${size()}px`,
  });

  return (
    <div
      class={`user-avatar-container ${props.class || ''}`}
      style={avatarStyle()}
    >
      <Show when={imageLoaded() && cachedSrc() && !imageError()}>
        <img
          src={cachedSrc()!}
          alt={props.alt}
          class="user-avatar user-avatar--loaded"
          style={avatarStyle()}
          loading="lazy"
        />
      </Show>

      <Show when={imageError() || (!imageLoaded() && !props.src)}>
        <div
          class="user-avatar user-avatar--fallback"
          style={avatarStyle()}
          title={props.alt}
        >
          <Show
            when={props.fallbackInitials || props.alt}
            fallback={
              <Icon name="person" size={Math.round(size() * 0.6)} />
            }
          >
            <span class="avatar-initials">
              {getInitials()}
            </span>
          </Show>
        </div>
      </Show>

      <Show when={!imageLoaded() && !imageError() && props.src}>
        <div
          class="user-avatar user-avatar--loading"
          style={avatarStyle()}
        >
          <div class="avatar-loading-spinner" />
        </div>
      </Show>
    </div>
  );
}