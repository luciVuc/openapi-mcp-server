/**
 * Simple logging utility with different levels
 */
export class Logger {
  constructor(private debugEnabled: boolean = false) {}

  info(message: string, ...args: any[]): void {
    console.log(`[INFO] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (this.debugEnabled) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  setDebugMode(debug: boolean): void {
    this.debugEnabled = debug;
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();

/**
 * Set debug mode for the global logger
 */
export function setDebugMode(debug: boolean): void {
  logger.setDebugMode(debug);
}

export default logger;
