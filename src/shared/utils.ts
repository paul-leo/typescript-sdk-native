/**
 * Generate a random UUID that works across platforms (Node.js, browser, React Native)
 * Falls back to a simple implementation if crypto is not available
 */
export function generateUUID(): string {
  // Try to use crypto.randomUUID if available (Node.js environment)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback for browsers and React Native
  // Simple UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
} 