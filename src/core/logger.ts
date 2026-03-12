// Integration with logger-pi for centralized logging
// Intercepts console methods and batches logs for efficiency

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  meta?: any;
}

class LoggerClient {
  private logs: LogEntry[] = [];
  private readonly projectId = process.env.LOGGER_PI_SERVICE_NAME || 'nesthub-pi';
  private readonly endpoint = `${process.env.LOGGER_PI_URL || 'http://127.0.0.1:4000'}/logs`;
  private readonly interval: NodeJS.Timeout;
  private flushing = false;

  private readonly origLog = console.log;
  private readonly origWarn = console.warn;
  private readonly origError = console.error;
  private readonly origInfo = console.info;
  private readonly origDebug = console.debug;

  constructor() {
    console.log = (...args: any[]) => {
      this.origLog(...args);
      this.queue('info', args);
    };
    console.info = (...args: any[]) => {
      this.origInfo(...args);
      this.queue('info', args);
    };
    console.warn = (...args: any[]) => {
      this.origWarn(...args);
      this.queue('warn', args);
    };
    console.error = (...args: any[]) => {
      this.origError(...args);
      this.queue('error', args);
    };
    console.debug = (...args: any[]) => {
      this.origDebug(...args);
      this.queue('debug', args);
    };

    this.interval = setInterval(() => this.flush(), 500);

    process.on('uncaughtException', (err) => {
      this.origError('Uncaught Exception:', err);
      this.queue('fatal', [err.stack || err.message || err]);
      this.flushSync();
      // process.exit(1); // Usually handled by the main entry
    });

    process.on('unhandledRejection', (reason) => {
      this.origError('Unhandled Rejection:', reason);
      const msg = reason instanceof Error ? reason.stack || reason.message : String(reason);
      this.queue('fatal', [msg]);
      this.flushSync();
    });
  }

  private queue(level: LogLevel, args: any[]) {
    const message = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');

    this.logs.push({
      level,
      timestamp: new Date().toISOString(),
      message,
    });

    if (this.logs.length > 5000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  public async flush() {
    if (this.flushing || this.logs.length === 0) return;
    this.flushing = true;

    const batch = [...this.logs];
    this.logs = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: this.projectId, logs: batch }),
      });
    } catch (err) {
      this.logs = [...batch, ...this.logs].slice(-5000);
    } finally {
      this.flushing = false;
    }
  }

  private flushSync() {
    if (this.logs.length === 0) return;
    try {
      fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: this.projectId, logs: this.logs }),
      }).catch(() => {});
    } catch (e) {}
  }

  public async close() {
    clearInterval(this.interval);
    await this.flush();
  }
}

export const logger = new LoggerClient();
