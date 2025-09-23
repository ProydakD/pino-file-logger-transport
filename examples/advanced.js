// Advanced example of pino-file-logger-transport
const pino = require('pino');

// Create transport with custom options
const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: './logs',
    filename: 'application',
    retentionDays: 7,
  },
});

// Create logger with transport
const logger = pino(transport);

// Log different types of messages
logger.info('Application started');
logger.warn({ userId: 123 }, 'User performed suspicious action');
logger.error(
  new Error('Database connection failed'),
  'Failed to connect to database',
);
logger.debug('Debug information');
logger.trace('Trace information');

// Child logger example
const childLogger = logger.child({ component: 'auth-service' });
childLogger.info('User authentication successful');
childLogger.error({ userId: 456 }, 'Authentication failed for user');

console.log('Logs have been written to ./logs/application.log');
