<div align="center">
  <h1>pino-file-logger-transport</h1>
  <p><strong>Professional file logging transport for Pino with rotation and archiving</strong></p>
  
  <p>
    <a href="https://www.npmjs.com/package/pino-file-logger-transport">
      <img src="https://img.shields.io/npm/v/pino-file-logger-transport.svg?style=flat-square" alt="npm version">
    </a>
    <a href="https://www.npmjs.com/package/pino-file-logger-transport">
      <img src="https://img.shields.io/npm/dm/pino-file-logger-transport.svg?style=flat-square" alt="npm downloads">
    </a>
    <a href="https://github.com/ProydakD/pino-file-logger-transport/blob/main/LICENSE">
      <img src="https://img.shields.io/npm/l/pino-file-logger-transport.svg?style=flat-square" alt="license">
    </a>
  </p>
</div>

## 🚀 Features

- **Smart Log Rotation** - Automatic daily log file rotation with customizable naming
- **Intelligent Archiving** - Archive old logs in ZIP, GZIP, or TAR formats
- **Configurable Retention** - Automatic cleanup of old logs based on retention policy
- **High Performance** - Buffered writes and async I/O for optimal performance
- **Flexible Filtering** - Log level filtering to control verbosity
- **Robust Error Handling** - Graceful degradation without crashing your application
- **Pino Ecosystem** - Seamless integration with Pino logger ecosystem

## 📦 Installation

```bash
npm install pino-file-logger-transport
```

## 🎯 Quick Start

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

logger.info('Hello world!');
logger.error('Something went wrong');
```

## ⚙️ Configuration

```javascript
const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    // Required: Directory for log files
    logDirectory: './logs',
    
    // Optional: Base filename (default: 'log')
    filename: 'my-app',
    
    // Optional: Days to retain logs (default: 7)
    retentionDays: 30,
    
    // Optional: Minimum log level (default: 'info')
    level: 'warn',
    
    // Optional: Archive format (default: 'zip')
    archiveFormat: 'gzip',
    
    // Optional: Buffer size for performance (default: 100)
    bufferSize: 50,
  },
});

const logger = pino(transport);
```

## 🛠 Advanced Usage

```javascript
const pino = require('pino');

const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: './logs',
    filename: 'application',
    retentionDays: 14,
    level: 'info',
    bufferSize: 100,
    flushInterval: 1000,
    archiveFormat: 'zip',
    compressionLevel: 6,
    archiveDirectory: './archives',
    cleanupOnRotation: true,
    archiveOnRotation: true,
  },
});

const logger = pino(transport);

// Structured logging
logger.info({ userId: 123, action: 'login' }, 'User authenticated');

// Error logging with stack traces
logger.error(new Error('Database connection failed'), 'Critical system error');

// Child loggers
const authServiceLogger = logger.child({ service: 'auth' });
authServiceLogger.info('Authentication service initialized');
```

## 📖 Documentation

For complete documentation, visit our [docs](./docs/README.md):

- [🔧 Features](./docs/FEATURES.md) - Full feature overview
- [🚀 Usage Guide](./docs/USAGE.md) - Detailed usage instructions
- [📚 API Reference](./docs/API.md) - Complete API documentation
- [🏗 Architecture](./docs/ARCHITECTURE.md) - Internal architecture

## 🧪 Testing

```bash
npm test
```

## 📄 License

MIT © [ProydakD](https://github.com/ProydakD)

---

<div align="center">
  <sub>Built with ❤️ for the Node.js community</sub>
</div>