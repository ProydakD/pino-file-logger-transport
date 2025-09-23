// Advanced example of pino-file-logger-transport
const pino = require('pino');

// Create transport with custom options
const transport = pino.transport({
  target: '../dist/index.js',
  options: {
    logDirectory: './logs',
    filename: 'application',
    retentionDays: 7
  }
});

// Create logger with transport
const logger = pino(transport);

// Log different types of messages
logger.info('Application started');
logger.warn({ userId: 123 }, 'User performed suspicious action');
logger.error(new Error('Database connection failed'), 'Failed to connect to database');
logger.debug('Debug information');
logger.trace('Trace information');

// Child logger example
const childLogger = logger.child({ component: 'auth-service' });
childLogger.info('User authentication successful');
childLogger.error({ userId: 456 }, 'Authentication failed for user');

console.log('Check the logs directory for files with date format: application-YYYY-MM-DD.log');
