# pino-file-logger-transport

A Pino transport for file logging with rotation and archiving capabilities.

## Features

- Write logs to files with configurable directory and filename
- Automatic log directory creation
- JSON formatted logs compatible with Pino
- Easy integration with Pino logger
- Automatic log rotation by date
- Configurable log retention with automatic cleanup
- Log level filtering
- Archive old log files in various formats (ZIP, GZIP)
- Configurable compression levels
- Buffering for high-performance logging

## Log Archiving

The transport automatically archives old log files when:
1. A new day starts (log rotation)
2. The transport is closed

### Archive Formats

- **ZIP** - Default format with good compression
- **GZIP** - Alternative format with faster compression
- **None** - Disable archiving completely

### Compression Levels

You can configure the compression level from 0 (no compression) to 9 (maximum compression). Higher levels provide better compression but require more CPU resources.

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
    level: 'warn',
    bufferSize: 50,
    flushInterval: 500,
    archiveFormat: 'zip',
    compressionLevel: 6,
    autoArchive: true,
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
- `level` (string, optional, default: 'info') - Minimum log level to write to file ('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
- `bufferSize` (number, optional, default: 100) - Buffer size for batching log writes
- `flushInterval` (number, optional, default: 1000) - Flush interval in milliseconds
- `archiveFormat` (string, optional, default: 'zip') - Archive format for old log files ('zip', 'gzip', 'none')
- `compressionLevel` (number, optional, default: 9) - Compression level for archives (0-9, where 9 is maximum compression)
- `autoArchive` (boolean, optional, default: true) - Whether to automatically archive old log files

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

### Release Process

This package uses `release-please` for automated release management:

1. **Create Release PR** - Creates a pull request with version bump and changelog:
   ```bash
   npm run release:create
   ```

2. **Approve Release** - Creates GitHub release and tags after PR is merged:
   ```bash
   npm run release:approve
   ```

### Version Management

You can also manage versions directly:
```bash
npm run version:patch    # 1.0.0 -> 1.0.1
npm run version:minor    # 1.0.1 -> 1.1.0
npm run version:major    # 1.1.0 -> 2.0.0
```

## License

MIT
