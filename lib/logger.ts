/**
 * Production-Ready Logger Utility
 * 
 * Provides structured logging with environment-aware log levels.
 * In production, only warnings and errors are logged by default.
 * In development, all logs are shown.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Get minimum log level from environment
// Production defaults to 'warn', development to 'debug'
function getMinLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return envLevel;
  }
  return process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
}

const minLevel = getMinLogLevel();

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

function formatLog(entry: LogEntry): string {
  const { timestamp, level, context, message, data } = entry;
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
  
  if (data && Object.keys(data).length > 0) {
    return `${prefix} ${message} ${JSON.stringify(data)}`;
  }
  return `${prefix} ${message}`;
}

function createLogEntry(
  level: LogLevel,
  context: string,
  message: string,
  data?: Record<string, unknown>
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    data,
  };
}

/**
 * Logger class for creating context-specific loggers
 */
class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    if (shouldLog('debug')) {
      const entry = createLogEntry('debug', this.context, message, data);
      console.log(formatLog(entry));
    }
  }

  info(message: string, data?: Record<string, unknown>): void {
    if (shouldLog('info')) {
      const entry = createLogEntry('info', this.context, message, data);
      console.log(formatLog(entry));
    }
  }

  warn(message: string, data?: Record<string, unknown>): void {
    if (shouldLog('warn')) {
      const entry = createLogEntry('warn', this.context, message, data);
      console.warn(formatLog(entry));
    }
  }

  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    if (shouldLog('error')) {
      const errorData: Record<string, unknown> = { ...data };
      
      if (error instanceof Error) {
        errorData.errorMessage = error.message;
        errorData.errorStack = error.stack;
      } else if (error) {
        errorData.error = String(error);
      }
      
      const entry = createLogEntry('error', this.context, message, errorData);
      console.error(formatLog(entry));
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`);
  }
}

/**
 * Create a logger instance for a specific context
 * 
 * @example
 * const logger = createLogger('API:Case');
 * logger.info('Case created', { transactionId: 'TX-123' });
 * logger.error('Failed to create case', error);
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Default logger for quick use
 */
export const logger = createLogger('App');

/**
 * Pre-configured loggers for common contexts
 */
export const loggers = {
  api: createLogger('API'),
  agent: createLogger('Agent'),
  db: createLogger('MongoDB'),
  payment: createLogger('Payment'),
  signal: createLogger('Signal'),
  ml: createLogger('ML'),
};

export default logger;
