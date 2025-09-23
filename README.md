# pino-file-logger-transport

A Pino transport for file logging with rotation and archiving capabilities.

## Features

- Write logs to files with configurable directory and filename
- Automatic log directory creation
- JSON formatted logs compatible with Pino
- Easy integration with Pino logger

## Installation

```bash
npm install pino-file-logger-transport
```

## Usage

### Basic Usage

```javascript
const pino = require('pino');

const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: './logs',
    filename: 'app',
    retentionDays: 7,
  },
});

const logger = pino(transport);

logger.info('Hello world');
logger.error('This is an error');
```

### Advanced Usage

```javascript
const pino = require('pino');

const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: './logs',
    filename: 'application',
    retentionDays: 7,
  },
});

const logger = pino(transport);

// Log different types of messages
logger.info('Application started');
logger.warn({ userId: 123 }, 'User performed suspicious action');
logger.error(
  new Error('Database connection failed'),
  'Failed to connect to database',
);

// Child logger example
const childLogger = logger.child({ component: 'auth-service' });
childLogger.info('User authentication successful');
```

## Options

- `logDirectory` (string, required) - Path to the log directory
- `filename` (string, optional, default: 'log') - Base filename for log files (without extension)
- `retentionDays` (number, optional, default: 7) - Number of days to retain log files

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run prettier
```

## License

MIT
