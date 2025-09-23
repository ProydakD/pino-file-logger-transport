# Documentation pino-file-logger-transport

## Table of Contents

1. [Features](FEATURES.md) - Complete overview of all transport features
2. [Usage Guide](USAGE.md) - Detailed usage instructions
3. [API Reference](API.md) - Complete API documentation
4. [Architecture](ARCHITECTURE.md) - Internal architecture and design

## Quick Start

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
```

## Main Features

- ✅ Write logs to files with configurable directory and filename
- ✅ Automatic log rotation by date
- ✅ Configurable log retention with automatic cleanup
- ✅ Archive old logs in various formats (ZIP, GZIP, TAR)
- ✅ Log level filtering
- ✅ Buffering for high performance
- ✅ Error handling without crashing the application
- ✅ Compatibility with Pino and its ecosystem

## Documentation Languages

- [English](README.md)
- [Русский](README_RU.md)

## License

MIT