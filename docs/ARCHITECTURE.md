# Architecture of pino-file-logger-transport

[English](ARCHITECTURE.md) | [Русский](ARCHITECTURE_RU.md)

## Overall Architecture

The `pino-file-logger-transport` consists of a single main file `src/transport.ts` that exports the `fileTransport` function. This function creates a write stream for logs with various capabilities.

## Main Components

### 1. `fileTransport` Function
The main entry point that creates a transport for Pino. It accepts configuration parameters and returns a write stream.

### 2. Buffering System
For improved performance, a log buffering system is implemented:
- Buffer accumulates log entries until `bufferSize` is reached
- Periodic writing of buffer to file by `flushInterval` timer
- Immediate writing when transport is closed

### 3. Log Rotation
Automatic log rotation occurs when calendar date changes:
- Creating new file with name `filename-YYYY-MM-DD.log`
- Closing previous file
- Archiving old logs (optional)

### 4. Archiving
Support for various archive formats:
- ZIP (default)
- GZIP (tar.gz)
- TAR (without compression)
- None (no archiving)

### 5. Old File Cleanup
Automatic deletion of files older than `retentionDays` days.

## Data Flow

```
Pino Logger
    ↓
Transport Options
    ↓
fileTransport()
    ↓
Create Write Stream
    ↓
Log Entries → Buffer → File
    ↓         ↑
Rotate Logs when Date Changes
    ↓
Archive Old Files (optional)
    ↓
Cleanup Old Files
```

## Error Handling

The entire system is designed with reliability in mind:
- File system errors do not cause application crashes
- Backup streams for console writing when problems occur
- Logging of all errors for diagnostics

## Performance

- Asynchronous file writing
- Buffering to reduce I/O operations
- Non-blocking operations
- Stream processing of data