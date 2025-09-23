# API Reference

[English](API.md) | [Русский](API_RU.md)

## FileTransportOptions

Interface for transport configuration options.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `logDirectory` | `string` | required | Path to log directory |
| `filename` | `string` | `'log'` | Base filename for logs (without extension) |
| `retentionDays` | `number` | `7` | Number of days to retain logs |
| `bufferSize` | `number` | `100` | Buffer size for batch log writing |
| `flushInterval` | `number` | `1000` | Buffer flush interval in milliseconds |
| `level` | `'fatal' \| 'error' \| 'warn' \| 'info' \| 'debug' \| 'trace' \| 'silent'` | `'info'` | Minimum log level to write |
| `archiveFormat` | `'zip' \| 'gzip' \| 'tar' \| 'none'` | `'zip'` | Archive format for old logs |
| `compressionLevel` | `number` | `6` | Archive compression level (0-9) |
| `archiveDirectory` | `string` | same as `logDirectory` | Directory for storing archives |
| `cleanupOnRotation` | `boolean` | `true` | Clean up old files on rotation |
| `archiveOnRotation` | `boolean` | `false` | Archive files on rotation |

## Main Functions

### `fileTransport(options: FileTransportOptions)`

Creates a transport for Pino logger.

**Parameters:**
- `options`: Configuration object `FileTransportOptions`

**Returns:**
- `Writable` stream that can be used as a transport for Pino

## Internal Functions

### `rotateLogFile()`

Rotates log file when date changes.

### `archiveLogFiles()`

Archives old log files.

### `cleanupOldFiles()`

Deletes old log files and archives.

### `filterRelevantFiles()`

Filters files by naming pattern.

### `extractDateFromFilename()`

Extracts date from filename.

## File Formats

### Log Files
```
filename-YYYY-MM-DD.log
```

### Archives
- ZIP: `filename-YYYY-MM-DD.zip`
- GZIP: `filename-YYYY-MM-DD.tar.gz`
- TAR: `filename-YYYY-MM-DD.tar`