import { LogLevel, LoggerLike } from './types';

const levelOrder: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  SUCCESS: 25,
  WARNING: 30,
  ERROR: 40,
};

function normalizeLevel(value?: string): LogLevel {
  const upper = String(value ?? 'INFO').trim().toUpperCase();
  if (upper === 'DEBUG' || upper === 'INFO' || upper === 'WARNING' || upper === 'SUCCESS' || upper === 'ERROR') {
    return upper;
  }
  return 'INFO';
}

function safeMeta(meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) {
    return '';
  }
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ' {"meta":"[unserializable]"}';
  }
}

export class Logger implements LoggerLike {
  private readonly minLevel: LogLevel;
  private readonly prefix?: string;

  constructor(options?: { minLevel?: LogLevel; prefix?: string }) {
    this.minLevel = options?.minLevel ?? normalizeLevel(process.env.AI_LOCATOR_LOG_LEVEL);
    this.prefix = options?.prefix;
  }

  private emit(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    if (levelOrder[level] < levelOrder[this.minLevel]) {
      return;
    }

    const ts = new Date().toISOString();
    const pref = this.prefix ? ` [${this.prefix}]` : '';
    const line = `[${ts}] [${level}]${pref} ${message}${safeMeta(meta)}`;

    // Keep it simple and reporter-friendly.
    if (level === 'ERROR') {
      console.error(line);
    } else if (level === 'WARNING') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.emit('DEBUG', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.emit('INFO', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.emit('WARNING', message, meta);
  }

  success(message: string, meta?: Record<string, unknown>) {
    this.emit('SUCCESS', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.emit('ERROR', message, meta);
  }
}

export const defaultLogger = new Logger({});
