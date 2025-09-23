# Features

[English](FEATURES.md) | [Русский](FEATURES_RU.md)

## Writing Logs to Files

The transport writes logs to files with configurable directory and filename.

### Configuration
```javascript
const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: './logs',  // Required parameter
    filename: 'app',         // Optional, default 'log'
  },
});
```

## Log Rotation

Automatic log rotation by calendar date.

### How it Works
- When calendar date changes, a new file is created
- Previous file is closed
- New logs are written to current date file

### Filename Format
```
filename-YYYY-MM-DD.log
```

Example:
```
app-2025-09-23.log
app-2025-09-24.log
```

## Log Retention Management

Configuration of log retention period.

### Configuration
```javascript
const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: './logs',
    retentionDays: 30,  // Retain logs for 30 days
  },
});
```

### How it Works
- When transport initializes, files older than `retentionDays` are deleted
- When rotation occurs (if enabled), old files are also deleted

## Log Archiving

Automatic archiving of old logs.

### Supported Formats
- **ZIP** - Standard format with good compression
- **GZIP (tar.gz)** - Unix-compatible format
- **TAR** - Uncompressed archive for maximum speed
- **None** - Disable archiving

### Configuration
```javascript
const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: './logs',
    archiveFormat: 'zip',        // Archive format
    compressionLevel: 6,          // Compression level (0-9)
    archiveDirectory: './archives', // Separate directory for archives
  },
});
```

### When Archiving Occurs
1. When transport closes (default)
2. When log rotation occurs (optional, via `archiveOnRotation: true`)

## Log Level Filtering

Writing only logs of certain level and above.

### Configuration
```javascript
const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: './logs',
    level: 'warn',  // Write only warn and above (error, fatal)
  },
});
```

### Supported Levels
- `silent` - Write nothing
- `fatal` - Only fatal errors
- `error` - Errors and fatal errors
- `warn` - Warnings, errors and fatal errors
- `info` - Informational messages and above (default)
- `debug` - Debug messages and above
- `trace` - Trace messages and above

## Buffering for Performance

Performance optimization through log buffering.

### Configuration
```javascript
const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: './logs',
    bufferSize: 50,     // Buffer size
    flushInterval: 500, // Flush interval in milliseconds
  },
});
```

### How it Works
- Logs are collected in buffer
- Buffer is written to file when `bufferSize` is reached
- Buffer is written by timer `flushInterval`
- Remaining logs are written when transport closes

## Error Handling

Reliable file system error handling.

### How it Works
- Writing errors do not cause application crashes
- Backup writing to console when file problems occur
- Logging all errors for diagnostics
- Continuing operation when directory is unavailable