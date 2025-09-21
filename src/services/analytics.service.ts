import { logEvent } from 'firebase/analytics';
import { analytics } from '../config/firebase';

export interface AnalyticsEvents {
  // Auth events
  login: { method: string };
  logout: {};

  // Project events
  project_created: { project_id: string };
  project_opened: { project_id: string };
  project_deleted: { project_id: string };
  project_shared: { project_id: string };
  project_pinned: { project_id: string; pinned: boolean };

  // Icon events
  icon_uploaded: { project_id: string; icon_count: number };
  icon_deleted: { project_id: string };
  icon_edited: { project_id: string };

  // Export events
  font_exported: {
    project_id: string;
    format: string;
    icon_count: number;
    export_time_ms: number;
  };

  // UI events
  language_changed: { from_locale: string; to_locale: string };
  theme_changed: { theme: string };
  pwa_installed: {};

  // Error events
  error_occurred: {
    error_type: string;
    error_message: string;
    context: string;
  };
}

class AnalyticsService {
  private isEnabled = true;

  constructor() {
    // Disable analytics in development
    if (import.meta.env.DEV) {
      this.isEnabled = false;
      console.log('📊 Analytics disabled in development mode');
    }
  }

  /**
   * Track custom event
   */
  track<K extends keyof AnalyticsEvents>(
    eventName: K,
    eventParams: AnalyticsEvents[K]
  ): void {
    if (!this.isEnabled || !analytics) return;

    try {
      logEvent(analytics, eventName as string, {
        ...eventParams,
        timestamp: Date.now(),
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        is_mobile: /Mobi|Android/i.test(navigator.userAgent),
      });

      if (import.meta.env.DEV) {
        console.log('📊 Analytics event:', eventName, eventParams);
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  /**
   * Track page view
   */
  trackPageView(pageName: string, additionalParams?: Record<string, any>): void {
    if (!this.isEnabled || !analytics) return;

    logEvent(analytics, 'page_view', {
      page_title: pageName,
      page_location: window.location.href,
      ...additionalParams,
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metricName: string, value: number, unit?: string): void {
    if (!this.isEnabled || !analytics) return;

    logEvent(analytics, 'performance_metric', {
      metric_name: metricName,
      metric_value: value,
      metric_unit: unit || 'ms',
    });
  }

  /**
   * Track user engagement
   */
  trackEngagement(action: string, value?: number): void {
    if (!this.isEnabled || !analytics) return;

    logEvent(analytics, 'user_engagement', {
      engagement_action: action,
      engagement_value: value,
    });
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, string | number>): void {
    if (!this.isEnabled || !analytics) return;

    // Note: setUserProperties is not available in v9 modular SDK
    // We'll track it as a custom event instead
    logEvent(analytics, 'user_properties_set', properties);
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`📊 Analytics ${enabled ? 'enabled' : 'disabled'}`);
  }
}

export const analyticsService = new AnalyticsService();