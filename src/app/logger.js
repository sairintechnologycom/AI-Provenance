import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom format for logs
const logFormat = printf(({ level, message, timestamp, stack, service }) => {
  return `${timestamp} [${service}] ${level}: ${stack || message}`;
});

// Configure the transport for rotating files
const combinedFileTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'info'
});

const errorFileTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error'
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'mergebrief-backend' },
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    combinedFileTransport,
    errorFileTransport
  ]
});

// Add console logging in non-production environments OR if explicitly requested
if (process.env.NODE_ENV !== 'production' || process.env.CONSOLE_LOG === 'true') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      logFormat
    )
  }));
}

export default logger;
