/**
 * Performance monitoring utilities
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
  }

  /**
   * Start measuring a performance metric
   */
  start(label) {
    if (typeof performance === 'undefined') return;

    this.metrics.set(label, {
      startTime: performance.now(),
      marks: [],
    });

    if (performance.mark) {
      performance.mark(`${label}-start`);
    }
  }

  /**
   * Mark a point in time during a measurement
   */
  mark(label, markName) {
    if (typeof performance === 'undefined') return;

    const metric = this.metrics.get(label);
    if (!metric) return;

    metric.marks.push({
      name: markName,
      time: performance.now() - metric.startTime,
    });

    if (performance.mark) {
      performance.mark(`${label}-${markName}`);
    }
  }

  /**
   * End measuring and log the results
   */
  end(label) {
    if (typeof performance === 'undefined') return;

    const metric = this.metrics.get(label);
    if (!metric) return;

    const duration = performance.now() - metric.startTime;

    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);

    if (metric.marks.length > 0) {
      console.log('  Marks:');
      metric.marks.forEach((mark) => {
        console.log(`    - ${mark.name}: ${mark.time.toFixed(2)}ms`);
      });
    }

    if (performance.measure) {
      try {
        performance.measure(label, `${label}-start`);
      } catch (e) {
        // Mark might not exist
      }
    }

    this.metrics.delete(label);
    return duration;
  }

  /**
   * Measure a function execution time
   */
  async measure(label, fn) {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }

  /**
   * Get current web vitals
   */
  getWebVitals() {
    if (typeof performance === 'undefined') return {};

    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');

    return {
      // Core Web Vitals
      FCP: paint.find((entry) => entry.name === 'first-contentful-paint')
        ?.startTime,
      LCP: navigation?.largestContentfulPaint,
      FID: navigation?.firstInputDelay,
      CLS: navigation?.cumulativeLayoutShift,

      // Other metrics
      TTFB: navigation?.responseStart - navigation?.requestStart,
      domContentLoaded:
        navigation?.domContentLoadedEventEnd -
        navigation?.domContentLoadedEventStart,
      loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
    };
  }

  /**
   * Log all web vitals
   */
  logWebVitals() {
    const vitals = this.getWebVitals();

    console.log('[Web Vitals]');
    Object.entries(vitals).forEach(([key, value]) => {
      if (value !== undefined) {
        console.log(`  ${key}: ${value.toFixed(2)}ms`);
      }
    });
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;

/**
 * React component performance wrapper
 */
export const measureComponentRender = (Component, componentName) => {
  return (props) => {
    if (process.env.NODE_ENV === 'development') {
      performanceMonitor.start(`Render: ${componentName}`);
      const result = <Component {...props} />;
      performanceMonitor.end(`Render: ${componentName}`);
      return result;
    }

    return <Component {...props} />;
  };
};
