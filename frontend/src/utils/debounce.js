/**
 * Debounce utility - delays function execution until after a specified delay
 * Useful for search inputs, resize handlers, etc.
 */
export const debounce = (func, delay = 300) => {
  let timeoutId;

  return function debounced(...args) {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

/**
 * Throttle utility - limits function execution to once per specified interval
 * Useful for scroll handlers, mouse move events, etc.
 */
export const throttle = (func, interval = 300) => {
  let lastCall = 0;

  return function throttled(...args) {
    const now = Date.now();

    if (now - lastCall >= interval) {
      lastCall = now;
      func.apply(this, args);
    }
  };
};

/**
 * Rate limit utility - ensures function is called at most once per interval
 * Different from throttle in that it guarantees the last call is executed
 */
export const rateLimit = (func, interval = 300) => {
  let timeoutId;
  let lastCall = 0;

  return function rateLimited(...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    clearTimeout(timeoutId);

    if (timeSinceLastCall >= interval) {
      lastCall = now;
      func.apply(this, args);
    } else {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func.apply(this, args);
      }, interval - timeSinceLastCall);
    }
  };
};

export default { debounce, throttle, rateLimit };
