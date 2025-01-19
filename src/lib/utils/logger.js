import pino from 'pino';

const token = process.env.LOGTAIL_SOURCE_TOKEN;
const isDevelopment = process.env.NODE_ENV || 'development';

// Base logger configuration
const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info'
};

// Development transport configuration
const devTransport = pino.transport({
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: true,
    ignore: 'pid,hostname'
  }
});

// Production transport configuration with Logtail
const transport = pino.transport({
  target: '@logtail/pino',
  options: { sourceToken: token }
});

const logger =
  isDevelopment === 'development'
    ? pino(devTransport, loggerConfig)
    : pino(transport, loggerConfig);

export default logger;
