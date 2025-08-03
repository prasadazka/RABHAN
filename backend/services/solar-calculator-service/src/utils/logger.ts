import winston from 'winston';
import path from 'path';

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(logColors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...metadata } = info;
    return `${timestamp} [${level}]: ${message} ${
      Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : ''
    }`;
  })
);

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.simple()
    ),
  }),
];

if (process.env['NODE_ENV'] === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }) as any,
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }) as any
  );
}

export const logger = winston.createLogger({
  level: process.env['LOG_LEVEL'] || 'info',
  levels: logLevels,
  format,
  transports,
  exitOnError: false,
});

export const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'audit.log'),
      maxsize: 10485760,
      maxFiles: 10,
    }),
  ],
});

export const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'performance.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

export const logAuditEvent = (event: string, userId: string, details: any) => {
  auditLogger.info({
    event,
    userId,
    timestamp: new Date().toISOString(),
    details,
    service: 'solar-calculator-service',
  });
};

export const logPerformanceMetric = (operation: string, duration: number, metadata?: any) => {
  performanceLogger.info({
    operation,
    duration,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};