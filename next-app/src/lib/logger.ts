const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  error: (context: string, error?: unknown) => {
    if (isDev) {
      console.error(`${context}:`, error);
    }
    // In production, silently fail. For critical errors, use structured logging to Sentry/etc.
  },
};
