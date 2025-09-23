# Использование

## Установка

```bash
npm install pino-file-logger-transport
```

## Базовое использование

### Простая конфигурация

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

### Продвинутая конфигурация

```javascript
const pino = require('pino');

const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: './logs',
    filename: 'application',
    retentionDays: 30,
    level: 'warn',
    bufferSize: 50,
    flushInterval: 500,
    archiveFormat: 'zip',
    compressionLevel: 6,
    archiveDirectory: './archives',
    cleanupOnRotation: true,
    archiveOnRotation: true,
  },
});

const logger = pino(transport);

// Логирование разных типов сообщений
logger.info('Application started');
logger.warn({ userId: 123 }, 'User performed suspicious action');
logger.error(
  new Error('Database connection failed'),
  'Failed to connect to database',
);

// Дочерний логгер
const childLogger = logger.child({ component: 'auth-service' });
childLogger.info('User authentication successful');
```

## Интеграция с Express.js

```javascript
const express = require('express');
const pino = require('pino');
const pinoHttp = require('pino-http');

const app = express();

const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: './logs',
    filename: 'express-app',
    retentionDays: 14,
    archiveFormat: 'gzip',
  },
});

const logger = pino(transport);

// Middleware для логирования HTTP запросов
app.use(pinoHttp({ logger }));

app.get('/', (req, res) => {
  req.log.info('Home page accessed');
  res.send('Hello World!');
});

app.listen(3000, () => {
  logger.info('Server started on port 3000');
});
```

## Интеграция с другими фреймворками

### Fastify

```javascript
const fastify = require('fastify')({ logger: true });

const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: './logs',
    filename: 'fastify-app',
    retentionDays: 7,
  },
});

fastify.get('/', (request, reply) => {
  request.log.info('Home page accessed');
  reply.send({ hello: 'world' });
});

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Server listening at ${address}`);
});
```

## Работа с ошибками

### Обработка ошибок файловой системы

Транспорт автоматически обрабатывает ошибки файловой системы:

```javascript
const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: '/restricted/directory', // Недоступная директория
    filename: 'app',
  },
});

const logger = pino(transport);

// Ошибки будут логироваться в консоль, но приложение не упадет
logger.info('This message will go to console if file writing fails');
```

## Настройка производительности

### Высокая нагрузка

Для приложений с высокой нагрузкой:

```javascript
const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: './logs',
    filename: 'high-load-app',
    bufferSize: 1000,      // Большой буфер
    flushInterval: 100,    // Частый сброс
    retentionDays: 3,       // Меньше хранение для экономии места
    archiveFormat: 'none', // Без архивации для скорости
  },
});
```

### Низкая нагрузка

Для приложений с низкой нагрузкой:

```javascript
const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: './logs',
    filename: 'low-load-app',
    bufferSize: 10,        // Маленький буфер
    flushInterval: 5000,   // Редкий сброс
    retentionDays: 90,     // Долгое хранение
    archiveFormat: 'zip',  // ZIP архивация
    compressionLevel: 9,   // Максимальное сжатие
  },
});
```

## Мониторинг и отладка

### Логирование ошибок транспорта

Все ошибки транспорта логируются в stderr:

```javascript
// Эти сообщения помогут диагностировать проблемы
Error in write stream: [Error: ENOENT: no such file or directory, open '...']
```

### Проверка работы

```javascript
const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: './logs',
    filename: 'debug-app',
  },
});

const logger = pino(transport);

// Проверим, что логирование работает
logger.info('Transport initialized successfully');

// Проверим файлы в директории логов
const fs = require('fs');
const path = require('path');

setTimeout(() => {
  const logDir = './logs';
  if (fs.existsSync(logDir)) {
    const files = fs.readdirSync(logDir);
    console.log('Log files created:', files);
  }
}, 1000);
```

## Лучшие практики

### 1. Настройка путей

```javascript
const path = require('path');

const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: path.join(__dirname, 'logs'),
    filename: 'my-app',
    archiveDirectory: path.join(__dirname, 'archives'),
  },
});
```

### 2. Управление ресурсами

```javascript
const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: './logs',
    filename: 'app',
    retentionDays: 7,           // Не занимать много места
    bufferSize: 100,           // Баланс между производительностью и памятью
    flushInterval: 1000,       // Разумный интервал
    archiveFormat: 'zip',     // Хорошее сжатие
    compressionLevel: 6,       // Средний уровень сжатия
  },
});
```

### 3. Безопасность

```javascript
const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    logDirectory: '/var/log/my-app',  // Безопасная директория
    filename: 'app',
    level: 'info',  // Не логировать debug в production
  },
});
```