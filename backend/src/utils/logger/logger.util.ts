export const Logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, meta ? meta : '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, meta ? meta : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, error ? error : '');
  },
  spatial: (message: string, meta?: any) => {
    console.log(`[SPATIAL 10KM] [${new Date().toISOString()}] ${message}`, meta ? meta : '');
  },
};
