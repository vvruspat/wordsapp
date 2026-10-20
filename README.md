# ParaNoun · Wordsapp

Мобильное приложение для изучения слов: словарь с каталогами и темами, отдельные
и смешанные тренировки, диалоги с преподавателем и разбором ошибок.
Этот репозиторий содержит клиент для iOS и Android. Сервер находится в
[words](https://github.com/vvruspat/words), в каталоге `apps/api`.

Стек: Expo SDK 58, React Native 0.88, React 19, TypeScript, Expo Router,
WatermelonDB и Zustand. Версии зависимостей закреплены в `package-lock.json`.

## Локальный запуск

### 1. Подготовить окружение

Нужны Node.js из [`.nvmrc`](.nvmrc), npm и инструменты целевой платформы:
Xcode с iOS Simulator на macOS либо Android Studio с Android SDK и эмулятором.
Приложение использует нативные модули WatermelonDB и требует development build;
Expo Go для этого проекта не подходит.

Пакет `@vvruspat/words-types` устанавливается из GitHub Packages. Перед установкой
задайте в окружении `GITHUB_TOKEN` с доступом к пакету и правом `read:packages`;
[`.npmrc`](.npmrc) читает токен из этой переменной.

```bash
nvm use
npm ci
```

Установка применяет патчи из [`patches/`](patches/) для воспроизведения аудио
в `expo-audio`, совместимости установщика WatermelonDB с React Native
и отмены устаревших UI-команд при уничтожении нативной сессии React Native,
а также подключает Git hooks через Husky.

### 2. Подключить API

Запустите сервер `words/apps/api` с его зависимостями отдельно: запуск Metro
не запускает API. По умолчанию сервер слушает порт `3000`; его можно изменить
через серверную переменную `PORT`.

Создайте `.env.local` в корне приложения и оставьте активным один адрес:

```dotenv
# iOS Simulator
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000

# Android Emulator
# EXPO_PUBLIC_API_URL=http://10.0.2.2:3000

# Установите false, чтобы скрыть вкладку диалогов
EXPO_PUBLIC_DIALOGUES_ENABLED=true
```

Порт должен совпадать с портом API: например, при `PORT=3002` замените `3000`
на `3002` и в адресе клиента. На физическом устройстве укажите доступный ему
LAN-адрес компьютера с API. `.env.local` исключён из Git; переменные
`EXPO_PUBLIC_*` входят в клиентскую сборку и не предназначены для секретов.
После изменения адреса перезапустите Metro и перезагрузите приложение.

### 3. Собрать и открыть приложение

Для iOS Simulator:

```bash
npm run ios
```

Для Android Emulator:

```bash
npm run android
```

Эти команды собирают нативный development client и запускают приложение.
На iOS React Native и Expo-модули собираются из исходников, чтобы применить
нативный патч Scheduler; настройка находится в
[`withSchedulerLifetimeFix`](plugins/withSchedulerLifetimeFix.js).
Если клиент уже установлен, для работы с JavaScript достаточно Metro:

```bash
npm run dev -- --dev-client
```

После изменения нативных зависимостей или конфигурации нативных модулей
пересоберите development client соответствующей командой выше.

## Структура проекта

| Каталог | Назначение |
| --- | --- |
| `app/` | Тонкие маршруты и layouts Expo Router |
| `composition/` | Провайдеры, навигация, запуск и жизненный цикл приложения |
| `features/account/` | Вход, подтверждение почты, onboarding и профиль |
| `features/catalog/` | Каталоги, темы и выбор словаря |
| `features/dialogues/` | Диалоги, исправления, история и API этой фичи |
| `features/training/` | Экраны упражнений, подготовка и управление тренировочной сессией |
| `shared/` | Общие сервисы и состояние: сессия пользователя, слова, прогресс, выбор и аудио |
| `db/` | WatermelonDB: модели, схема, миграции и repositories |
| `api/`, `utils/fetch.ts` | Общие API-операции и HTTP-транспорт |
| `components/`, `mob-ui/` | Общие компоненты и дизайн-система |
| `tests/`, `scripts/` | Регрессионные тесты и инструменты проверки |

Направление зависимостей: композиция приложения → фичи → общий код.
Фичи не импортируют друг друга. Владельцы данных, тренировочные пулы и правила
синхронизации описаны в [архитектуре](docs/architecture.md);
правила внесения изменений — в [AGENTS.md](AGENTS.md).

Слова и результаты тренировок читаются из локальной БД. После загрузки словаря
тренировки доступны без сети; автоматическая отправка прогресса на сервер
сейчас не подключена. История диалогов и черновики кешируются, а отправка
сообщений и добавление слов из диалогов требуют сети.

## Проверки

```bash
npm test
npm run typecheck
npm run lint
npm run format:check
npm run architecture
```

`npm run architecture` проверяет границы модулей и циклические зависимости.
Нативная регрессионная проверка Scheduler использует компилятор C++20:
`c++` в PATH или путь к компилятору в переменной `CXX`.
`npm run format` применяет форматирование. Перед коммитом Husky форматирует
и проверяет staged-файлы через lint-staged, затем запускает typecheck всего
проекта; вручную этот hook запускается командой `npm run precommit`.
CI выполняет lint, тесты, typecheck и проверку архитектуры.
Изменения UI и нативных возможностей дополнительно проверяются на устройстве
или эмуляторе.

## Сборки и релизы

Профили `development`, `preview` и `production` находятся в [`eas.json`](eas.json).
Команды `npm run build:ios` и `npm run build:android` запускают EAS Build;
для них нужен доступ к Expo-проекту и настроенные учётные данные сборки.

При push в `main` [GitHub Actions](.github/workflows/ios-testflight.yml)
запускает [EAS workflow](.eas/workflows/create-production-builds.yml), который
собирает обе платформы и отправляет сборки в App Store Connect и внутренний
трек Google Play. Workflow использует секреты `WORDS_TYPES_TOKEN` и `EXPO_TOKEN`.
