import pino from 'pino';

const isDevelopment = process.env.NODE_ENV || 'development';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    isDevelopment === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: true,
            ignore: 'pid,hostname'
          }
        }
      : undefined
});

export default logger;
