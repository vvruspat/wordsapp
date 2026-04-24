# План исправления auth, Android back и тренировок

Дата: 2026-04-24

## Цель

Закрыть семь найденных проблем без смены общей архитектуры приложения. Главные риски сейчас в двух общих местах: auth flow смешивает хранение токенов и app-unlock через биометрию, а input-компоненты не дают гарантированного возврата фокуса после потери клавиатуры.

## Затронутые зоны

- Auth и routing: `app/_layout.tsx`, `app/index.tsx`, `app/signin.tsx`, `app/verify.tsx`, `app/onboarding.tsx`, `app/authorized/_layout.tsx`, `context/AuthContext.tsx`, `hooks/useSession.ts`, `utils/fetch.ts`.
- UI primitives: `mob-ui/molecules/WCharInput/WCharInput.tsx`, `mob-ui/atoms/WInput/WInput.tsx`.
- Report flow: `components/ReportButton/ReportButton.tsx`.
- Training exercises: `components/TrainingExercises/CardsExercise.tsx`, `components/TrainingExercises/MatchWordsExercise.tsx`, `components/MatchWordCard/MatchWordCard.tsx`, `components/TrainingExercises/TypeWordExercise.tsx`.
- Локализация при необходимости: `locales/*.json`.

## 1. Отказ от обязательной биометрии

### Наблюдение

До изменения `authUser` сохранял `access_token` и `refresh_token` в `SecureStore`, а затем `signin`, `verify` и `onboarding` вызывали `triggerBiometricAuth`. Биометрия работала как дополнительный app-unlock, а не как обязательная часть хранения токенов, поэтому отказ пользователя от биометрии не должен был ломать доступ к серверу.

### План

1. Вынести работу с токенами в общий модуль, например `utils/authTokenStorage.ts`: `getTokens`, `setTokens`, `clearTokens`, `hasTokens`.
2. Удалить обязательные вызовы `triggerBiometricAuth` из `signin`, `verify` и `onboarding`.
3. Упростить `AuthContext`: оставить в нем пользовательское действие `logout`.
4. В `app/_layout.tsx` оставить только восстановление сохраненной сессии по токену и очистку iOS Keychain при fresh install.
5. После успешного `signin`/`verify`/`onboarding` делать явный `router.replace(...)` в нужный экран.
6. Добавить кнопку logout в профиль, которая очищает токены и возвращает пользователя на стартовый auth screen.
7. Если app-lock понадобится позже, вернуть биометрию отдельной opt-in настройкой, не связанной с сохранением токенов.

### Проверка

- Новый пользователь: verify email -> onboarding/authorized работает без запроса биометрии.
- Существующий пользователь: sign in -> authorized работает без запроса биометрии.
- Перезапуск приложения с токеном: токены читаются, пользователь попадает в authorized.
- Logout в профиле очищает токены и возвращает на стартовый экран.
- Перезапуск после logout не восстанавливает authorized-сессию.

## 2. Цикл рендера/роутинга при Back на `verify-email`

### Наблюдение

`app/verify.tsx` использует `router.back()` без учета источника перехода. На Android аппаратная кнопка Back не завязана на тот же handler. Дополнительно `app/_layout.tsx` делает `router.push("/authorized/learning")` при `isAuthenticated`, что может повторно добавлять маршрут в stack, если auth-state меняется во время pop.

### План

1. Передавать в `/verify` параметр `returnTo` или `source`: `signup`, `profile`, `signin`.
2. В `Verify` заменить прямой `router.back()` на `handleBack`:
   - из `profile` -> `router.replace("/authorized/profile")`;
   - из signup/signin -> `router.replace("/")` или `router.replace("/signin")`;
   - если есть безопасный back stack, можно использовать `router.canGoBack()`, но финальный fallback должен быть явным.
3. Добавить Android hardware back через `BackHandler` и `useFocusEffect`, чтобы аппаратная кнопка вызывала тот же `handleBack`.
4. Аналогично обработать password stage в `app/signin.tsx`: аппаратный Back на стадии `password` должен возвращать к стадии `email`, а не выбрасывать экран из stack.
5. В `app/_layout.tsx` заменить auth redirect на guarded `router.replace`, проверяя текущие `segments`: не редиректить, если пользователь уже внутри `(authorized)` или на onboarding.
6. Проверить, что `verify` не вызывает `verifyEmail` при пустом `email` и показывает управляемую ошибку/возврат.

### Проверка

- Android: signup -> verify -> аппаратный Back -> экран signup без render loop.
- Android: profile -> verify -> аппаратный Back -> profile без перехода в learning.
- Android: signin -> password stage -> аппаратный Back -> email stage.
- После успешного verify редирект не добавляет несколько `/authorized/learning` в stack.

## 3. Android report modal нельзя закрыть без выбора варианта

### Наблюдение

`Alert.alert` на Android по умолчанию может не закрываться по outside tap/back, если не передать options.

### План

1. В `components/ReportButton/ReportButton.tsx` передать четвертым аргументом `Alert.alert(..., ..., buttons, { cancelable: true })`.
2. Добавить `onDismiss`, если нужно сбрасывать локальное состояние.
3. Сделать success/error alerts после report также cancelable.
4. Если понадобится единый UX между iOS/Android, заменить native `Alert` на собственную modal-компоненту, но это не обязательно для текущего бага.

### Проверка

- Android: report alert закрывается кнопкой Cancel.
- Android: report alert закрывается системным Back.
- Android: report alert закрывается tap outside, если платформа это поддерживает для текущей версии RN.
- Выбор report option по-прежнему отправляет `createReport`.

## 4. Flashcards: сократить ожидание и добавить смахивание

### Наблюдение

В `CardsExercise` ответ показывается `SHOW_ANSWER_MS = 3000`, после чего карточка уезжает сама. Пользователь не может ускорить переход.

### План

1. Сократить `SHOW_ANSWER_MS` с `3000` до `2000`.
2. Вынести завершение карточки в idempotent-функцию `dismissCard()`, чтобы таймер, кнопки и swipe не могли вызвать `complete()` дважды.
3. Добавить horizontal pan gesture через `react-native-gesture-handler`:
   - до ответа: swipe right = `know`, swipe left = `don't know`;
   - после раскрытия ответа: любой достаточно длинный горизонтальный swipe немедленно dismiss-ит карточку.
4. При ручном swipe отменять pending auto-dismiss timer.
5. Сохранить текущие кнопки как основной доступный путь для пользователя.
6. Проверить, что like-анимация не блокирует dismiss.

### Проверка

- Tap "Знаю" -> ответ показан около 2 секунд -> next card.
- Tap "Не знаю" -> ответ показан около 2 секунд -> next card.
- После раскрытия ответа swipe сразу переводит к следующей карточке.
- Swipe до ответа выбирает правильное действие и не вызывает двойной `onSuccess`/`onFailure`.

## 5. Match words: красная вспышка неверного слова

### Наблюдение

`MatchWordCard` уже поддерживает `state="incorrect"` и мапит его в red mode, но `MatchWordsExercise` никогда не передает это состояние.

### План

1. В `MatchWordsExercise` добавить transient state для неверного выбора:
   - `wrongWordIds: Set<number>`;
   - `wrongTranslationIds: Set<number>`.
2. При mismatch добавить оба id в соответствующие set и снять их через `setTimeout` через 350-500 ms.
3. При рендере `MatchWordCard` выставлять state priority: `correct` -> `incorrect` -> `selected` -> `default`.
4. В `MatchWordCard` при необходимости добавить короткую opacity/background flash или shake, но сначала использовать существующий red mode, чтобы не усложнять.
5. Очищать timers при unmount и при завершении exercise.

### Проверка

- Неверная пара: выбранное слово и выбранный перевод кратко краснеют.
- После вспышки выбор сбрасывается, можно продолжать.
- Правильные пары уходят в `correct` и исчезают как раньше.
- `onFailure` вызывается один раз на каждую неверную попытку.

## 6. Type word: разрешить `ceil(word.length / 2)` ошибок

### Наблюдение

`TypeWordExercise` сейчас вызывает `onFailure` сразу при полном неправильном вводе. Нужно дать несколько попыток и только потом записывать слово в failed.

### План

1. В `TypeWordExercise` вычислять `maxAttempts = Math.ceil(word.word.trim().length / 2)`.
2. Добавить счетчик `wrongAttempts` и ref `lastFailedAttemptRef`, чтобы один и тот же полный текст не засчитывался несколько раз.
3. Считать попыткой только полный неправильный ввод длиной с целевое слово. Промежуточный prefix error может красить input, но не должен записывать failed.
4. Если `wrongAttempts + 1 < maxAttempts`: показать error status, затем очистить `WCharInput` и вернуть фокус.
5. Если достигнут лимит: вызвать `onFailure(word.remoteId, score)` и показать существующую failure modal.
6. При новом слове и при `complete` сбрасывать attempts/status.
7. Для этого лучше расширить `WCharInput` через `forwardRef` и методы `clear()`/`focus()`.

### Проверка

- Длина 1-2: одна ошибка сразу приводит к failed.
- Длина 3-4: первая ошибка дает повторить, вторая пишет failed.
- Длина 5: лимит 3 ошибки.
- Правильный ответ на любой попытке вызывает success и не пишет failed.
- Синонимы из `acceptedWords` продолжают приниматься.

## 7. Возврат фокуса по tap на букву и password input

### Наблюдение

`WCharInput` фокусируется на mount и при tap по отдельной ячейке, но на Android hidden `TextInput` с `width: 0`, `height: 0`, `opacity: 0` может быть хрупким. `WInput` фокусируется только при tap непосредственно в `TextInput`, а не по всей input-row.

### План

1. В `WCharInput`:
   - обернуть весь блок ячеек в pressable area, которая вызывает `inputRef.current?.focus()`;
   - сделать hidden input focusable-friendly: минимальный размер 1x1, absolute position, opacity 0;
   - экспортировать ref API `focus`, `clear`, `setValue` при необходимости;
   - после `clear()` всегда возвращать focus.
2. В `WInput`:
   - добавить pressable/focus handler на всю `inputRow`;
   - не ломать clear и eye buttons: их `onPress` должны выполнять свое действие и возвращать focus при необходимости;
   - сохранить поддержку внешнего `ref`.
3. В `app/signin.tsx`:
   - завести `passwordInputRef`;
   - при переходе `stage = "password"` фокусировать пароль через небольшой timeout/requestAnimationFrame.
4. В `app/verify.tsx` передать ref в `WCharInput`, чтобы Back/ошибка/resend не оставляли поле без возможности повторного фокуса.

### Проверка

- Type word: потерять клавиатуру -> tap по любой букве/cell -> клавиатура возвращается.
- Verify code: потерять клавиатуру -> tap по любой cell -> клавиатура возвращается.
- Signin password: tap по строке input, label-adjacent area и после eye toggle -> keyboard/focus остаются рабочими.
- Clear button в обычном `WInput` очищает и оставляет focus.

## Рекомендуемый порядок реализации

1. Shared primitives: `WCharInput` ref/focus, `WInput` row focus.
2. Auth storage, отказ от обязательной биометрии и logout.
3. Guarded routing/back handling для `verify` и `signin`.
4. Report alert options.
5. Training fixes: cards swipe, match flash, type-word attempts.
6. Локализация новых строк, если появятся пользовательские тексты.
7. Финальная проверка на Android, затем iOS smoke test.

## Общий QA-чеклист

- `npm run lint`
- Android emulator/device:
  - signup + verify без биометрии;
  - logout и повторный запуск приложения;
  - signin + password back;
  - profile verify back;
  - report modal dismiss;
  - cards buttons/swipes;
  - match wrong-pair flash;
  - type word attempt limits;
  - focus recovery for char inputs and password.
- iOS smoke:
  - auth без biometric prompt;
  - verify back;
  - report modal;
  - cards/type-word regressions.

## Риски

- Если текущий продукт действительно требует app-lock, биометрию лучше вернуть как opt-in настройку, отдельную от auth-сессии.
- Изменение root auth redirect может проявить скрытые зависимости от `router.push("/authorized/learning")`; поэтому redirect нужно делать через текущие segments и покрыть manual QA.
- Swipe в cards должен быть idempotent, иначе легко получить двойное начисление результата.
