/**
 * Simple logger utility for consistent logging
 * In production, this could be replaced with winston, pino, etc.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
  error?: Error;
}

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Format log entry for console output
 */
const formatLogEntry = (entry: LogEntry): string => {
  const { level, message, timestamp, data } = entry;
  const levelColors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m',  // Green
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m', // Red
  };
  const reset = '\x1b[0m';

  let output = `${levelColors[level]}[${level.toUpperCase()}]${reset} ${timestamp} - ${message}`;

  if (data && isDevelopment) {
    output += `\n${JSON.stringify(data, null, 2)}`;
  }

  return output;
};

/**
 * Create a log entry
 */
const createLogEntry = (
  level: LogLevel,
  message: string,
  data?: any,
  error?: Error
): LogEntry => {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
    error,
  };
};

/**
 * Logger object with methods for each log level
 */
export const logger = {
  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      const entry = createLogEntry('debug', message, data);
      console.log(formatLogEntry(entry));
    }
  },

  info: (message: string, data?: any) => {
    const entry = createLogEntry('info', message, data);
    console.log(formatLogEntry(entry));
  },

  warn: (message: string, data?: any) => {
    const entry = createLogEntry('warn', message, data);
    console.warn(formatLogEntry(entry));
  },

  error: (message: string, error?: Error | any, data?: any) => {
    const entry = createLogEntry('error', message, data, error);
    console.error(formatLogEntry(entry));

    if (error && isDevelopment) {
      if (error instanceof Error) {
        console.error(error.stack);
      } else {
        console.error(error);
      }
    }
  },

  /**
   * Log HTTP request (for middleware)
   */
  request: (method: string, path: string, statusCode: number, duration: number) => {
    const statusColor = statusCode >= 500 ? '\x1b[31m' :
                       statusCode >= 400 ? '\x1b[33m' :
                       statusCode >= 300 ? '\x1b[36m' : '\x1b[32m';
    const reset = '\x1b[0m';

    console.log(
      `${statusColor}${method}${reset} ${path} - ${statusColor}${statusCode}${reset} (${duration}ms)`
    );
  },

  /**
   * Log database operation
   */
  db: (operation: string, table: string, duration?: number) => {
    if (isDevelopment) {
      const durationStr = duration ? ` (${duration}ms)` : '';
      console.log(`\x1b[35m[DB]${reset} ${operation} on ${table}${durationStr}`);
    }
  },
};

const reset = '\x1b[0m';

/**
 * Request logging middleware
 */
export const requestLogger = () => {
  return (req: any, res: any, next: () => void) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.request(req.method, req.originalUrl, res.statusCode, duration);
    });

    next();
  };
};
