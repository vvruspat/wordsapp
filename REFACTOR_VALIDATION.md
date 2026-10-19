# Проверка архитектурного рефакторинга

Проверено 19 октября 2026 года на реализации `7ff8ec6`, исходная база — `6ea0c3e` (`main`, обновлённый из origin перед началом работы).

## Независимые проверки

- Node 22.23.3: `npm test` — 36/36; сохранены все 15 исходных regression tests.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run architecture`, `git diff --check` — успешно. Проверка архитектуры охватывает 245 production-модулей.
- Дополнительные временные fixtures вне репозитория: разрешённая композиция, cross-feature alias, relative type import, обратный реэкспорт, dynamic import, UI → route и цикл — все семь проверок дали ожидаемый результат.
- `expo export --platform ios` и `expo export --platform android` — успешно, с генерацией Hermes bytecode.
- Сверены все 23 пути маршрутов и хеши 17 защищённых файлов: схема/миграции/модели БД, app config, EAS config, lockfile и хранение токенов не изменены.
- Graphify обновлён после изменения production-кода; генерируемые графовые файлы не включены в коммиты.

## iOS runtime

Debug development build успешно собран через Xcode для iPhone 18 Pro / iOS 27 Simulator. Финальный JS загружен через Metro. Проверены запуск, начальный экран ввода email, accessibility поля, фокус, email-клавиатура и смещение формы над клавиатурой.

Первая неподписанная локальная сборка не имела entitlement для SecureStore. Проверка повторена с временными simulator entitlements и локальной подписью через параметры xcodebuild; исходная Expo/native-конфигурация проекта не менялась. После этого ошибок SecureStore при старте нет.

Metro сообщает предупреждение об exports пути `expo-router/build/global-state/router-store` и успешно использует файловый fallback. Lockfile и версия Router сохранены. Предупреждение react-test-renderer о deprecated API также не скрывалось.

## Пределы проверки

Android проверен сборкой JS, без запуска на устройстве. Подтверждён только неавторизованный iOS smoke: реальный аккаунт не использовался, письма и backend-записи не создавались. Полный ручной проход входа/выхода, профиля, каталогов, всех тренировок, mixed, диалогов и offline/error/retry на устройстве остаётся перед выпуском. Эти сценарии частично покрыты автоматическими regression tests, что не заменяет полный device smoke.

Релиз, merge и публикация приложения не выполнялись.
