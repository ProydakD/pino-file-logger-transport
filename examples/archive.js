// Example to test archiving functionality
const pino = require('pino');

// Create transport with custom options
const transport = pino.transport({
  target: '../dist/index.js',
  options: {
    logDirectory: './logs',
    filename: 'archive-test',
    retentionDays: 3,
    archiveFormat: 'gzip',
    compressionLevel: 6,
    archiveDirectory: './archives',
    archiveOnRotation: true,
  },
});

// Create logger with transport
const logger = pino(transport);

// Log some messages
logger.info('First log message');
logger.warn('Warning message');
logger.error('Error message');

// Close transport to trigger archiving
transport.on('ready', () => {
  logger.info('Transport is ready');
  transport.end();
});

console.log('Check the logs directory for archived files');
