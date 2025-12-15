import { lazy } from 'react';

/**
 * Lazy load components with retry logic
 * Helps with code splitting and handling temporary network failures
 */
export const lazyLoadWithRetry = (importFunc, retries = 3, interval = 1000) => {
  return lazy(() => {
    return new Promise((resolve, reject) => {
      const attemptImport = (remainingRetries) => {
        importFunc()
          .then(resolve)
          .catch((error) => {
            if (remainingRetries === 0) {
              reject(error);
              return;
            }

            console.warn(
              `Failed to load component, retrying... (${remainingRetries} retries left)`,
              error
            );

            setTimeout(() => {
              attemptImport(remainingRetries - 1);
            }, interval);
          });
      };

      attemptImport(retries);
    });
  });
};

/**
 * Preload a lazy component
 * Useful for preloading routes or components before they're needed
 */
export const preloadComponent = (LazyComponent) => {
  const componentModule = LazyComponent._init || LazyComponent._payload?._result;

  if (componentModule && componentModule.preload) {
    componentModule.preload();
  }
};

export default lazyLoadWithRetry;
