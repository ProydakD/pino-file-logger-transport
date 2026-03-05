# Справочник по API

[English](API.md) | [Русский](API_RU.md)

## FileTransportOptions

Интерфейс опций конфигурации транспорта.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `logDirectory` | `string` | required | Путь к директории логов |
| `filename` | `string` | `'log'` | Базовое имя файла логов (без расширения) |
| `retentionDays` | `number` | `7` | Количество дней хранения логов |
| `bufferSize` | `number` | `100` | Размер буфера для пакетной записи логов |
| `flushInterval` | `number` | `1000` | Интервал сброса буфера в миллисекундах |
| `level` | `'fatal' \| 'error' \| 'warn' \| 'info' \| 'debug' \| 'trace' \| 'silent'` | `'info'` | Минимальный уровень логов для записи |
| `archiveFormat` | `'zip' \| 'gzip' \| 'tar' \| 'none'` | `'zip'` | Формат архивации старых логов |
| `compressionLevel` | `number` | `6` | Уровень сжатия архивов (0-9) |
| `archiveDirectory` | `string` | same as `logDirectory` | Директория для хранения архивов |
| `cleanupOnRotation` | `boolean` | `true` | Очистка старых файлов при ротации |
| `archiveOnRotation` | `boolean` | `false` | Архивация файлов при ротации |
| `maxFileSizeMB` | `number` | отключено | Ротация файла текущего дня при достижении лимита размера (с `2.1.0`) |
| `maxFiles` | `number` | отключено | Максимум управляемых файлов на директорию (с `2.1.0`) |

## Основные функции

### `fileTransport(options: FileTransportOptions)`

Создает транспорт для Pino логгера.

**Параметры:**
- `options`: Объект конфигурации `FileTransportOptions`

**Возвращает:**
- `Writable` поток, который может использоваться как транспорт для Pino

## Внутренние функции

### `rotateLogFile()`

Ротирует лог файл при смене даты.

### `archiveLogFiles()`

Архивирует старые лог файлы.

### `cleanupOldFiles()`

Удаляет старые лог файлы и архивы.

### Ротация по размеру

При включении `maxFileSizeMB` (с `2.1.0`) используются индексные файлы:

- `filename-YYYY-MM-DD.log` (первый файл дня)
- `filename-YYYY-MM-DD-1.log`
- `filename-YYYY-MM-DD-2.log`

## Форматы файлов

### Лог файлы
```
filename-YYYY-MM-DD.log
filename-YYYY-MM-DD-1.log
filename-YYYY-MM-DD-2.log
```

### Архивы
- ZIP: `filename-YYYY-MM-DD.zip`
- GZIP: `filename-YYYY-MM-DD.tar.gz`
- TAR: `filename-YYYY-MM-DD.tar`
