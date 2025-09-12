import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level (can be set via environment variable)
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] || LOG_LEVELS.INFO;

// Log directory
const logDir = path.join(__dirname, '../logs');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Log file paths
const logFiles = {
  error: path.join(logDir, 'error.log'),
  warn: path.join(logDir, 'warn.log'),
  info: path.join(logDir, 'info.log'),
  debug: path.join(logDir, 'debug.log'),
  combined: path.join(logDir, 'combined.log'),
  access: path.join(logDir, 'access.log')
};

// Write log to file
const writeLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta
  };

  const logString = JSON.stringify(logEntry) + '\n';

  // Write to specific level file
  fs.appendFileSync(logFiles[level.toLowerCase()], logString);
  
  // Write to combined file
  fs.appendFileSync(logFiles.combined, logString);
  
  // Console output with colors
  const colors = {
    error: '\x1b[31m', // Red
    warn: '\x1b[33m',  // Yellow
    info: '\x1b[36m',  // Cyan
    debug: '\x1b[35m', // Magenta
    reset: '\x1b[0m'
  };

  if (currentLogLevel >= LOG_LEVELS[level.toUpperCase()]) {
    console.log(
      `${colors[level.toLowerCase()] || colors.reset}[${level.toUpperCase()}] ${timestamp}${colors.reset} ${message}`,
      meta && Object.keys(meta).length > 0 ? meta : ''
    );
  }
};

// Logger class
class Logger {
  error(message, meta = {}) {
    writeLog('error', message, meta);
  }

  warn(message, meta = {}) {
    writeLog('warn', message, meta);
  }

  info(message, meta = {}) {
    writeLog('info', message, meta);
  }

  debug(message, meta = {}) {
    writeLog('debug', message, meta);
  }

  // HTTP request logger
  http(req, res, responseTime) {
    const logEntry = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
      userId: req.user?.id || 'anonymous'
    };

    fs.appendFileSync(logFiles.access, JSON.stringify(logEntry) + '\n');
  }

  // Security event logger
  security(event, details = {}) {
    this.warn(`Security Event: ${event}`, {
      type: 'security',
      ...details
    });
  }

  // Performance logger
  performance(operation, duration, details = {}) {
    this.info(`Performance: ${operation}`, {
      type: 'performance',
      duration: `${duration}ms`,
      ...details
    });
  }

  // Database query logger
  database(operation, query, duration, details = {}) {
    this.debug(`Database: ${operation}`, {
      type: 'database',
      query: query.length > 200 ? query.substring(0, 200) + '...' : query,
      duration: `${duration}ms`,
      ...details
    });
  }

  // API request logger
  api(method, endpoint, statusCode, duration, details = {}) {
    this.info(`API: ${method} ${endpoint}`, {
      type: 'api',
      method,
      endpoint,
      statusCode,
      duration: `${duration}ms`,
      ...details
    });
  }

  // Error with stack trace
  errorWithStack(message, error, meta = {}) {
    this.error(message, {
      ...meta,
      stack: error.stack,
      name: error.name,
      message: error.message
    });
  }

  // Business logic logger
  business(event, details = {}) {
    this.info(`Business: ${event}`, {
      type: 'business',
      ...details
    });
  }

  // Get log statistics
  getStats() {
    const stats = {};
    
    Object.keys(logFiles).forEach(level => {
      try {
        const filePath = logFiles[level];
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          stats[level] = lines.length;
        } else {
          stats[level] = 0;
        }
      } catch (error) {
        stats[level] = 0;
      }
    });

    return stats;
  }

  // Clean old logs (keep last 30 days)
  cleanOldLogs() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    Object.values(logFiles).forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          if (stats.mtime < thirtyDaysAgo) {
            fs.unlinkSync(filePath);
            this.info(`Cleaned old log file: ${path.basename(filePath)}`);
          }
        }
      } catch (error) {
        this.error('Failed to clean log file', { filePath, error: error.message });
      }
    });
  }
}

// Create logger instance
const logger = new Logger();

// Clean old logs on startup
logger.cleanOldLogs();

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.errorWithStack('Uncaught Exception', error);
  process.exit(1);
});

// Log unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    promise: promise.toString()
  });
});

export default logger;
