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

### Вход через Apple и Google

Вход через Apple доступен на поддерживаемых iOS-устройствах, через Google —
на iOS и Android. Оба варианта получают обычную сессию API; новым пользователям
нужно выбрать языки на onboarding. Email-вход остаётся доступным.

Сначала разверните серверную поддержку `POST /auth/social/challenge` и
`POST /auth/social/signin` из репозитория `words` и настройте на сервере:

```dotenv
APPLE_CLIENT_IDS=digital.whitesquirrel.wordsapp
GOOGLE_WEB_CLIENT_IDS=702357136848-1kh65sr1dj4ci1lrj0mij2fg03bpcfor.apps.googleusercontent.com
```

Для Apple включите **Sign in with Apple** для App ID
`digital.whitesquirrel.wordsapp` в Apple Developer. Конфигурация Expo уже содержит
`ios.usesAppleSignIn` и плагин AppleAuthentication; EAS обновит entitlements
и provisioning profile при новой сборке.

Для Google создайте OAuth consent screen и OAuth-клиенты Web, iOS и Android
в одном Google Cloud проекте. Для iOS укажите bundle ID, для Android — package
`digital.whitesquirrel.wordsapp` и SHA-1 каждого используемого сертификата
(development, EAS upload, Google Play App Signing). Добавьте в `.env.local`
и окружение соответствующего профиля EAS:

```dotenv
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=702357136848-1kh65sr1dj4ci1lrj0mij2fg03bpcfor.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=702357136848-qalkcfa0ppmfvo5hgpqmusm2a40778kn.apps.googleusercontent.com
```

В Google Cloud проекте `words-482321` созданы клиенты ParaNoun API, iOS
и Android для подписей Google Play, EAS upload и локального development build.
Оба публичных Client ID добавлены в EAS project environments `development`,
`preview`, `production`. Для локального запуска используйте значения выше.

| Android-сборка | SHA-1 зарегистрированного сертификата |
| --- | --- |
| Google Play | `6D:3C:1E:94:F1:E5:22:33:27:1F:C8:08:22:4E:EB:D3:08:80:B5:32` |
| EAS upload | `8D:3A:47:3D:3B:45:74:F2:DD:45:84:12:E0:A9:F2:E7:F1:45:06:F3` |
| Локальный debug keystore | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` |

При смене keystore зарегистрируйте его SHA-1 отдельным Android OAuth client.
Web Client ID должен совпадать с серверным `GOOGLE_WEB_CLIENT_IDS`.
Client ID — публичные идентификаторы; client secrets и Apple private keys
в приложение не добавляются. Firebase-файлы для этого сценария не нужны.
Плагин `withGoogleSignIn` регистрирует обратную iOS URL-схему, подключает
необходимые CocoaPods-настройки и передаёт callback в GoogleSignIn SDK.
Кнопка Google скрыта, пока для платформы не заданы Client ID.

После изменения Client ID пересоберите development client (`npm run ios`
или `npm run android`); для EAS создайте новую сборку. Metro reload не обновляет
нативную URL-схему и entitlements. Полный вход проверяйте реальными Apple/Google
аккаунтами на устройстве с доступом к настроенному API.

Документация: [AppleAuthentication SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/apple-authentication/),
[Google authentication в Expo](https://docs.expo.dev/guides/google-authentication/).

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
