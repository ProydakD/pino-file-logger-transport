# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0](https://github.com/ProydakD/pino-file-logger-transport/compare/v1.2.0...v1.3.0) (2025-09-23)


### Added

* **transport:** добавлены опции archiveFormat, compressionLevel и archiveDirectory ([6c825a7](https://github.com/ProydakD/pino-file-logger-transport/commit/6c825a72db2dae3d93bc651b4fef0232701b2a2c))

## 1.2.0 (2025-09-23)


### Added

* **transport:** добавлен суффикс даты к лог-файлам и реализована суточная ротация ([6ee1f2f](https://github.com/ProydakD/pino-file-logger-transport/commit/6ee1f2f8cea6c1e498d8fc19e2571b3c514dda49))
* **transport:** добавлен фильтр логов по уровню ([2ae2877](https://github.com/ProydakD/pino-file-logger-transport/commit/2ae287717367ce36d5a1fe36169748c851a265e8))
* **transport:** добавлен Pino File Logger Transport и настройка проекта ([697573b](https://github.com/ProydakD/pino-file-logger-transport/commit/697573b2125ac35a7ba088d7f4c345eeac4d6d97))
* **transport:** добавлена буферизация записей логов ([0f48ee2](https://github.com/ProydakD/pino-file-logger-transport/commit/0f48ee2d8430577389c793b8ed5a8d04a45a3ec4))
* **transport:** добавлена очистка старых логов по сроку хранения ([6737ab8](https://github.com/ProydakD/pino-file-logger-transport/commit/6737ab819289dfeffbd7b3a9a29a34c576dca04b))
* **transport:** добавлена функциональность архивации старых лог-файлов ([d4aba21](https://github.com/ProydakD/pino-file-logger-transport/commit/d4aba2117a8bd21565fee9e4ae72ad893f909de4))
* **transport:** добавлено архивирование устаревших лог-файлов ([c77c51d](https://github.com/ProydakD/pino-file-logger-transport/commit/c77c51dfc88659a69c078fa6b4999e70bf3db2c4))
* **transport:** реализован файловый транспорт на основе pino-abstract-transport, добавлены тесты и пример ([7a86db7](https://github.com/ProydakD/pino-file-logger-transport/commit/7a86db7096ea4ded8c661fa471616da8a0d5d31a))


### Fixed

* **transport:** добавлена обработка ошибок и резервный поток ([1af0b99](https://github.com/ProydakD/pino-file-logger-transport/commit/1af0b99443ed30a499d8be0e4d2db884d23bc96e))
* **transport:** обеспечено продолжение работы при ошибках записи логов ([90145cf](https://github.com/ProydakD/pino-file-logger-transport/commit/90145cf9aac49244a5b1fc00320a91baaf3d926d))


### Changed

* **.gitignore:** добавить игнорирование всех .md-файлов, кроме README и файлов в подпапках ([9027dcd](https://github.com/ProydakD/pino-file-logger-transport/commit/9027dcd6a289575617f50128d6dbe0cdee8eee73))
* **package:** обновлён конфиг пакета для файлового логирования ([f8671a0](https://github.com/ProydakD/pino-file-logger-transport/commit/f8671a0fb9f447e39df3f5171475d60e5572cd2f))
* **readme:** добавлен файл документации с описанием установки, использования и опций плагина ([7f768fb](https://github.com/ProydakD/pino-file-logger-transport/commit/7f768fbf0ca323f95e218e290c991d9888d5fda7))
* **release:** обновлена метаинформация и скрипты релиза ([506a58d](https://github.com/ProydakD/pino-file-logger-transport/commit/506a58d76ffeb7494f810510da13dceac262c9c9))
* **release:** удалён release-please и настроен standard-version ([a09d84e](https://github.com/ProydakD/pino-file-logger-transport/commit/a09d84eb8a475441c19f7814aa0ee71bb34ee260))
* **release:** удалён release-please и настроен standard-version ([58aab0a](https://github.com/ProydakD/pino-file-logger-transport/commit/58aab0ae74e0f99a458294a926bfa2ac519d47d3))
* **transport:** вынесены утилиты файловых операций ([abdaeab](https://github.com/ProydakD/pino-file-logger-transport/commit/abdaeabb97e81923039b59e0b5f8dbb042a99932))

## 1.1.0 (2025-09-23)


### Added

* **transport:** добавлен суффикс даты к лог-файлам и реализована суточная ротация ([6ee1f2f](https://github.com/ProydakD/pino-file-logger-transport/commit/6ee1f2f8cea6c1e498d8fc19e2571b3c514dda49))
* **transport:** добавлен фильтр логов по уровню ([2ae2877](https://github.com/ProydakD/pino-file-logger-transport/commit/2ae287717367ce36d5a1fe36169748c851a265e8))
* **transport:** добавлен Pino File Logger Transport и настройка проекта ([697573b](https://github.com/ProydakD/pino-file-logger-transport/commit/697573b2125ac35a7ba088d7f4c345eeac4d6d97))
* **transport:** добавлена буферизация записей логов ([0f48ee2](https://github.com/ProydakD/pino-file-logger-transport/commit/0f48ee2d8430577389c793b8ed5a8d04a45a3ec4))
* **transport:** добавлена очистка старых логов по сроку хранения ([6737ab8](https://github.com/ProydakD/pino-file-logger-transport/commit/6737ab819289dfeffbd7b3a9a29a34c576dca04b))
* **transport:** добавлена функциональность архивации старых лог-файлов ([d4aba21](https://github.com/ProydakD/pino-file-logger-transport/commit/d4aba2117a8bd21565fee9e4ae72ad893f909de4))
* **transport:** добавлено архивирование устаревших лог-файлов ([c77c51d](https://github.com/ProydakD/pino-file-logger-transport/commit/c77c51dfc88659a69c078fa6b4999e70bf3db2c4))
* **transport:** реализован файловый транспорт на основе pino-abstract-transport, добавлены тесты и пример ([7a86db7](https://github.com/ProydakD/pino-file-logger-transport/commit/7a86db7096ea4ded8c661fa471616da8a0d5d31a))


### Changed

* **.gitignore:** добавить игнорирование всех .md-файлов, кроме README и файлов в подпапках ([9027dcd](https://github.com/ProydakD/pino-file-logger-transport/commit/9027dcd6a289575617f50128d6dbe0cdee8eee73))
* **package:** обновлён конфиг пакета для файлового логирования ([f8671a0](https://github.com/ProydakD/pino-file-logger-transport/commit/f8671a0fb9f447e39df3f5171475d60e5572cd2f))
* **readme:** добавлен файл документации с описанием установки, использования и опций плагина ([7f768fb](https://github.com/ProydakD/pino-file-logger-transport/commit/7f768fbf0ca323f95e218e290c991d9888d5fda7))
* **release:** обновлена метаинформация и скрипты релиза ([506a58d](https://github.com/ProydakD/pino-file-logger-transport/commit/506a58d76ffeb7494f810510da13dceac262c9c9))
* **transport:** вынесены утилиты файловых операций ([abdaeab](https://github.com/ProydakD/pino-file-logger-transport/commit/abdaeabb97e81923039b59e0b5f8dbb042a99932))


### Fixed

* **transport:** добавлена обработка ошибок и резервный поток ([1af0b99](https://github.com/ProydakD/pino-file-logger-transport/commit/1af0b99443ed30a499d8be0e4d2db884d23bc96e))
* **transport:** обеспечено продолжение работы при ошибках записи логов ([90145cf](https://github.com/ProydakD/pino-file-logger-transport/commit/90145cf9aac49244a5b1fc00320a91baaf3d926d))

## [1.0.0] - 2025-09-23

### Added
- Initial release of pino-file-logger-transport
- File logging with configurable directory and filename
- Automatic log rotation by date
- Log archiving in ZIP format
- Configurable log retention with automatic cleanup
- Log level filtering (fatal, error, warn, info, debug, trace, silent)
- Support for different archive formats (ZIP, GZIP, none)
- Configurable compression levels
- Buffering for high-performance logging
- Comprehensive test suite with 11 tests
- Full TypeScript support with type definitions
- Detailed documentation and usage examples
- Release automation scripts (prerelease, release, postrelease)
- Version management utilities

### Changed
- Enhanced error handling to prevent application crashes
- Improved performance with async writing and buffering
- Refined API with additional configuration options
- Updated documentation with comprehensive examples

### Fixed
- Various bug fixes and stability improvements