<div align="center">
  <h1>pino-file-logger-transport</h1>
  <p><strong>Профессиональный транспорт файлового логирования для Pino с ротацией и архивацией</strong></p>
  
  <p>
    <a href="https://www.npmjs.com/package/pino-file-logger-transport">
      <img src="https://img.shields.io/npm/v/pino-file-logger-transport.svg?style=flat-square" alt="Версия npm">
    </a>
    <a href="https://www.npmjs.com/package/pino-file-logger-transport">
      <img src="https://img.shields.io/npm/dm/pino-file-logger-transport.svg?style=flat-square" alt="Скачиваний npm">
    </a>
    <a href="https://github.com/ProydakD/pino-file-logger-transport/blob/master/LICENSE">
      <img src="https://img.shields.io/npm/l/pino-file-logger-transport.svg?style=flat-square" alt="Лицензия">
    </a>
    <br>
    <a href="./README.md">English</a> | <strong>Русский</strong>
  </p>
</div>

## 🚀 Возможности

- **Умная ротация логов** - Автоматическая ежедневная ротация файлов логов с настраиваемым именованием
- **Интеллектуальная архивация** - Архивация старых логов в форматах ZIP, GZIP или TAR
- **Настраиваемое хранение** - Автоматическая очистка старых логов по политике хранения
- **Высокая производительность** - Буферизованные записи и асинхронный I/O для оптимальной производительности
- **Гибкая фильтрация** - Фильтрация логов по уровню для контроля детализации
- **Надежная обработка ошибок** - Грациозная деградация без падения приложения
- **Экосистема Pino** - Бесшовная интеграция с экосистемой логгера Pino

## 📦 Установка

```bash
npm install pino-file-logger-transport
```

## 🎯 Быстрый старт

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

logger.info('Привет мир!');
logger.error('Что-то пошло не так');
```

## ⚙️ Конфигурация

```javascript
const transport = pino.transport({
  target: 'pino-file-logger-transport',
  options: {
    // Обязательно: Директория для файлов логов
    logDirectory: './logs',
    
    // Опционально: Базовое имя файла (по умолчанию: 'log')
    filename: 'my-app',
    
    // Опционально: Дней хранения логов (по умолчанию: 7)
    retentionDays: 30,
    
    // Опционально: Минимальный уровень логов (по умолчанию: 'info')
    level: 'warn',
    
    // Опционально: Формат архивации (по умолчанию: 'zip')
    archiveFormat: 'gzip',
    
    // Опционально: Размер буфера для производительности (по умолчанию: 100)
    bufferSize: 50,
  },
});

const logger = pino(transport);
```

## 🛠 Расширенное использование

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

// Структурированное логирование
logger.info({ userId: 123, action: 'login' }, 'Пользователь аутентифицирован');

// Логирование ошибок со стек-трейсами
logger.error(new Error('Соединение с базой данных не удалось'), 'Критическая ошибка системы');

// Дочерние логгеры
const authServiceLogger = logger.child({ service: 'auth' });
authServiceLogger.info('Сервис аутентификации инициализирован');
```

## 📖 Документация

Полную документацию смотрите в [docs](./docs/README_RU.md):

- [🔧 Возможности](./docs/FEATURES_RU.md) - Полный обзор возможностей
- [🚀 Руководство по использованию](./docs/USAGE_RU.md) - Подробные инструкции по использованию
- [📚 Справочник API](./docs/API_RU.md) - Полная документация по API
- [🏗 Архитектура](./docs/ARCHITECTURE_RU.md) - Внутренняя архитектура

## 🧪 Тестирование

```bash
npm test
```

## 📄 Лицензия

MIT © [ProydakD](https://github.com/ProydakD)

---

<div align="center">
  <sub>Создано с ❤️ для сообщества Node.js</sub>
</div>