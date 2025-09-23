// Example to test level filtering functionality
const pino = require('pino');

// Create transport with level filtering
const transport = pino.transport({
  target: '../dist/index.js',
  options: {
    logDirectory: './logs',
    filename: 'level-test',
    retentionDays: 3,
    level: 'warn', // Only log warnings and above
    bufferSize: 50,
    flushInterval: 500,
    cleanupOnRotation: true,
  },
});

// Create logger with transport
const logger = pino(transport);

// Log messages at different levels
logger.trace('This trace message should NOT be written to file');
logger.debug('This debug message should NOT be written to file');
logger.info('This info message should NOT be written to file');
logger.warn('This warning message SHOULD be written to file');
logger.error('This error message SHOULD be written to file');
logger.fatal('This fatal message SHOULD be written to file');

// Close transport
transport.on('ready', () => {
  logger.info('Transport is ready');
  transport.end();
});

console.log('Check the logs directory for filtered log files');