# Архитектура Wordsapp

## Модули и направление зависимостей

`app/` сохраняет прежние 23 маршрута Expo Router. Маршруты подключают экраны или layouts. `composition/` собирает providers/navigation и вызывает bootstrap/lifecycle hooks.

Четыре независимые фичи: `features/account`, `features/catalog`, `features/dialogues`, `features/training`. Экраны и приватное представление находятся внутри своей фичи; данные и действия подключаются через hooks/services. Между фичами нет импортов, включая типы. Диалог открывает тренировку через прежний маршрут с `wordIds`.

`shared/` содержит действительно общие понятия: session, selection, vocabulary, progress, audio, lifecycle, logging, reporting и UI hooks. `db/` остаётся инфраструктурой WatermelonDB. `api/` — общий транспорт auth/user/vocabulary/progress/report; dialogue transport находится внутри dialogue feature. Общий UI в `components/` и `mob-ui/` не импортирует фичи. Нет промежуточного facade, который незаметно возвращает обратные зависимости.

`npm run architecture` разрешает alias/relative imports, type-only imports, динамические imports, require и реэкспорты через TypeScript AST; проверяет cross-feature, обратные импорты, зависимости отображения от API/repositories и циклы по всему production-коду. Временного allowlist нет. Biome дополнительно сообщает запрещённые alias-импорты общих модулей. Проверка подключена к CI; её отрицательные fixtures находятся в tests.

## Владельцы данных

| Данные | Владелец и способ обновления |
| --- | --- |
| Слова, переводы, каталоги, темы, синонимы | WatermelonDB, явные vocabulary persistence/integration operations |
| Результаты тренировок | WatermelonDB через progressService; запись сериализуется для user/word/training |
| Общие выбранные каталоги/темы | shared/selection/selectionStore; прежние user settings keys |
| IDs от intro/dialogue | feature-local trainingSelection; это вход следующей сессии, не рабочая очередь |
| Сессия, training pool, текущий step, покрытие | TrainingSession, один чистый наблюдаемый model |
| Полный words pool и данные текущего задания | observable store trainingController; данные получает wordsService, IDs/очередь определяет session |
| Pending writes, request generations, loading/error | trainingController; React manager подключает lifecycle и selectors |
| Tokens, текущий пользователь, restore/refresh/DB observation | один sessionOwner/sessionStore |
| Dialogue detail/cache/draft | сервер + прежний локальный cache, runtime открытого диалога с ограничением user/session identity |
| Sync/audio progress | один vocabulary coordinator и audio downloader; store хранит status и topic-name translations |

Неиспользовавшиеся DTO-копии words/translations/catalogs/topics удалены из vocabulary store. Каталог и статистика читают локальную БД и наблюдают изменения scores через `observeWithColumns`; audio readiness наблюдает audio column. Topic-name translations остаются временным представлением ответа API: отдельной таблицы для них нет, схема не менялась.

## Жизненный цикл тренировки

`useTrainingManager` — тонкая интеграция React с одним vanilla Zustand controller. При изменении пользователя, обоих языков, выбранных каталогов/тем или входных IDs создаётся новый controller. Поздняя операция предыдущего controller не может публиковать данные. Перемонтирование effects в StrictMode поддерживается.

Подготовка фиксирует исходные eligible word IDs. Пустая выборка, прочитанная до первой синхронизации, перечитывается после сохранения vocabulary; во время загрузки она не показывается как окончательный empty. Фоновая синхронизация не меняет непустой набор и знаменатель текущей сессии. Mixed ограничен 20 словами; dialogue words идут первыми, затем личные и выбранные каталоги. Standalone не получает лимит mixed. Обе формы используют TrainingSession: pool содержит допустимые незавершённые exercise IDs; у standalone один ID. Доступность listening учитывается при выборе и отображении.

Покрытие пары word/training означает **score > 0**, а не score = 1. Intro и type_translation сохраняют свои IDs, score increments и payloads. При 100% exercise удаляется из текущего pool; mixed не возвращает завершённый exercise. Пустой pool — completed; отсутствие слов — empty; ошибка чтения/записи — error.

Каждый результат связан с epoch и отображённым step ID. Дублированная доставка результата одного step не даёт второй записи, а следующий step того же слова может быть сохранён. Matching получает несколько IDs одного step и принимает результаты каждого слова отдельно. Смена упражнения инвалидирует прежний обработчик до загрузки следующего задания. Следующий выбор ожидает сохранения результатов; неуспешная запись не считается завершением. Явный retry перечитывает durable progress и даёт повторить несохранённое задание.

Действие продолжения standalone запускает отдельный review-проход того же exercise. Его покрытие начинается заново в памяти, persisted scores не сбрасываются. Поэтому ранее сохранённые scores не завершают review немедленно. Ошибочный review делает слово незавершённым. ExerciseContext остаётся фасадом событий, модалок и feedback; собственной очереди, БД-запросов и движка подбора в нём нет. Generic WCharInput получает resetKey; feature adapter переводит события тренировки в сброс/фокус.

Правила проверки typed answers находятся в чистой модели. Подготовка синонимов/допустимых переводов находится в wordsService и отменяемом hook. Недоступные distractors логируются и не удаляют основную пару.

## Session и account

Restore/refresh и подписка на users table принадлежат sessionOwner. Consumer hook не создаёт второй refresh. Сохранена исходная политика refresh за семь дней до expiry. Обновления language_learn/language_speak/name/email/email_verified/onboarded наблюдаются явно, включая мутацию того же Watermelon model object.

Изменение любого языка инвалидирует старые vocabulary/audio операции; новые операции создаются по primitive user/language identity. Authorized lifecycle синхронизирует пару языков, а не только learning language. Logout немедленно инвалидирует generation, отписывается от user, сбрасывает временные selection/training/sync представления и сериализует удаление SecureStore tokens относительно предыдущих записей. Локальные vocabulary/progress/cache таблицы сохраняются по прежней политике.

Account формы используют hooks. Pending sign-in/verification после logout или unmount не могут вызвать authUser; повторное нажатие объединяется guard. Profile/onboarding remote/local сохранение вынесено в accountService; запись проверяет generation внутри queued writer. Fresh-install `has_launched`, SecureStore keys и маршруты после авторизации сохранены.

## Sync, offline, retry и конфликты

- Локальная БД остаётся источником тренировочных данных. Cached vocabulary позволяет показывать приложение во время фонового refresh; первая загрузка блокирует по прежним status/progress.
- Один coordinator объединяет одинаковые in-flight sync по epoch/user/обоим языкам. Logout/смена языка отменяет публикацию и не даёт устаревшему запросу начать persistence; уже выполняющиеся допустимые локальные операции не объявляются откатанными.
- Vocabulary обновляется upsert по прежним remote keys. Downloaded local audio paths сохраняются при refresh. Это прежний remote replacement контракт, а не новый механизм разрешения offline-конфликтов.
- Аудио загружается с прежней конкуренцией 5, проверяет identity до и внутри queued writer. При ошибке файла остаётся remote fallback; частичные ошибки логируются и отправляются в существующую telemetry. Ошибка первоначального DB read обработана. Повторный существующий lifecycle/download trigger может повторить недостающие файлы; durable download queue не добавлена.
- Offline не считается успешной серверной синхронизацией. Сеть/ошибки отображаются существующими статусами; нового background daemon и автоматических отправок progress нет.
- `shared/progress/dormantLearningSync.ts` сохраняет прежнюю неиспользуемую реализацию upload. Live consumers отсутствуют; она **не подключена** и не является durable outbox. Прогресс сохраняется локально; новые backend writes не активировались.
- Dialogue cache и draft сохраняют прежний JSON формат. Cache failure не блокирует remote retry; uncached offline/error не выдаётся за пустой успешный thread. Client message IDs, порядок сообщений и single-flight explanation branch сохраняются. Runtime не сбрасывается при обновлении props во время ответа. Draft restore не перезаписывает уже набранный текст.

## Добавление упражнения

1. Добавить persisted ID в shared/progress/exercises и UI metadata в shared/training/presentation. Не переименовывать серверные IDs ради совпадения с названиями компонентов.
2. Добавить feature-private визуальный exercise и renderer в TrainingAppWrapper. Получать подготовленные данные из wordsPool, отправлять результат через события.
3. Если нужны новые данные/правила, добавить их в wordsService или чистую модель; не читать repository из визуального компонента.
4. Подключить тип к тому же session pool и проверить single/mixed, completion, failed save, повторную доставку и review. Не заводить вторую очередь.
5. Запустить tests/typecheck/lint/format:check/architecture и проверить соответствующий сценарий в целевом runtime.

## Проверки реализации

Локальные regression tests: 50, включая все исходные 15. Дополнительные сценарии: first-sync/loading/empty/retry, fixed pool при background sync, coverage/review/matching, повторный вход и смена упражнения, приоритет незавершённых слов, счётчики mastery, StrictMode, дублированные события, старый отображённый step, failed write/retry, serialized progress, late auth/logout и duplicate submit, same mutable user language, catalog defaults/manual deselect/late language rows, cached/offline/single-flight vocabulary, queued audio cancellation/read error/partial fallback, запрещённые imports/reexports/cycles.

Отдельно запускаются TypeScript, Biome lint, read-only format, architecture check и git diff --check. Исходное предупреждение react-test-renderer deprecated сохраняется. Независимые проверки, сборки обеих платформ и ограниченный iOS smoke описаны в [REFACTOR_VALIDATION.md](REFACTOR_VALIDATION.md). Android device runtime и полный authenticated smoke matrix локальными тестами не покрыты.
