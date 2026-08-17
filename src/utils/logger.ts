const timestamp = () => new Date().toISOString();

export const logger = {
  info: (message: string, meta?: unknown) => {
    if (meta === undefined) {
      console.log(`[${timestamp()}] INFO ${message}`);
      return;
    }
    console.log(`[${timestamp()}] INFO ${message}`, meta);
  },
  warn: (message: string, meta?: unknown) => {
    if (meta === undefined) {
      console.warn(`[${timestamp()}] WARN ${message}`);
      return;
    }
    console.warn(`[${timestamp()}] WARN ${message}`, meta);
  },
  error: (message: string, meta?: unknown) => {
    if (meta === undefined) {
      console.error(`[${timestamp()}] ERROR ${message}`);
      return;
    }
    console.error(`[${timestamp()}] ERROR ${message}`, meta);
  },
};
