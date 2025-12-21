import * as fs from 'fs';
import * as path from 'path';
import pino from 'pino';

export interface LogEntry {
  timestamp: string;
  level: string;
  name: string;
  message: string;
  meta?: object;
}

export class TestLogger {
  private logger: pino.Logger;
  private name: string;
  private outputDir: string;
  private entries: LogEntry[] = [];

  constructor(name: string, outputDir: string) {
    this.name = name;
    this.outputDir = outputDir;

    this.logger = pino({
      name,
      level: process.env.TEST_LOG_LEVEL || 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  info(message: string, meta?: object) {
    this.log('info', message, meta);
  }

  debug(message: string, meta?: object) {
    this.log('debug', message, meta);
  }

  warn(message: string, meta?: object) {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error | object) {
    const meta = error instanceof Error ? { error: error.message, stack: error.stack } : error;
    this.log('error', message, meta);
  }

  /**
   * Log WebRTC-specific events
   */
  webrtc(event: string, data: object) {
    this.log('debug', `[WebRTC] ${event}`, data);
  }

  /**
   * Log signaling messages
   */
  signal(direction: 'in' | 'out', type: string, payload?: object) {
    this.log('debug', `[Signal ${direction}] ${type}`, payload);
  }

  private log(level: string, message: string, meta?: object) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      name: this.name,
      message,
      ...(meta && { meta }),
    };

    this.entries.push(entry);

    // Also log to pino
    (this.logger as any)[level](meta || {}, message);
  }

  /**
   * Save all log entries to a file
   */
  saveToFile() {
    const logsDir = path.join(this.outputDir, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const filename = path.join(logsDir, `${this.name}.log`);
    const content = this.entries.map(entry => {
      const metaStr = entry.meta ? ` ${JSON.stringify(entry.meta)}` : '';
      return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${metaStr}`;
    }).join('\n');

    fs.writeFileSync(filename, content);
    this.logger.info(`Saved ${this.entries.length} log entries to ${filename}`);
  }

  /**
   * Get all log entries
   */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * Clear all log entries
   */
  clear() {
    this.entries = [];
  }
}
