# Dexcelerate - test

# Dexcellerate Scanner UI (кратко)

Небольшая документация для локальной разработки и быстрого понимания, где что в проекте.

## Что это

Приложение React + TypeScript на Vite, показывающее два сканера токенов (Trending и New) в виде двух таблиц рядом. Данные берутся из REST `/scanner` и обновляются в реальном времени через WebSocket (tick / pair-stats / scanner-pairs). В таблицах есть мини-графики (sparklines), которые получают начальное значение из REST/Pair-Stats и дополняются live-тиками.

## Технологии

- React + TypeScript
- Vite
- Zustand (store)
- @tanstack/react-table + virtual для виртуализации
- Axios для REST
- WebSocket (встроенный клиент в `src/services/wsClient.ts`)
- Vitest для тестов

## Быстрый старт

1. Установить зависимости

```bash
pnpm install
```

2. Запустить dev-сервер

```bash
pnpm dev
```

3. Запустить тесты

```bash
pnpm test
```

(Если у вас другой пакетный менеджер — используйте npm или yarn, команды аналогичны.)

## Ключевые файлы

- `src/components/ScannerTables.tsx` — главный компонент, который собирает фильтры и две таблицы.
- `src/components/ScannerTable.tsx` — компонент таблицы с виртуализацией и infinite-scroll.
- `src/components/ScannerTableFilters.tsx` — панель фильтров для обеих таблиц.
- `src/stores/scannerTablesStore.ts` — Zustand store: загрузка, обработка WS-сообщений, батчинг тиков и хранение `priceHistory`.
- `src/services/wsClient.ts` — WebSocket клиент: подписки на пары, pair-stats и фильтры; переподписка при реконнекте.
- `src/api/mapScannerResultToTokenData.ts` — маппер REST-результата в `TokenData` (инициализирует `priceHistory`).
- `src/api/types.ts` — основные типы, включая `TokenData` и WS-сообщения.

## Особенности реализации (коротко)

- Sparklines: короткий `priceHistory` (макс ~30 точек). Инициализируется из REST-результата и/или `pair-stats` (поля `first`/`last`), затем дополняется live-tick событиями.
- Батчинг тиков: тики агрегируются в `pendingTicks` и применляются примерно каждые 100ms, чтобы снизить нагрузку на рендер.
- Подписки WS: клиент теперь поддерживает несколько scanner-filter подписок (нужно для двух таблиц с разными фильтрами) и переподписывается при реконнекте.

## Где настраивать бекенд-адреса

- REST и WS константы/точки настройки можно искать в `src/api/*` и `src/services/wsClient.ts` (переменные `API_URL`, URL WebSocket).

## Тесты и контроль качества

- Есть минимальные unit-тесты для маппера в `tests/mapper.test.ts`.
- Рекомендуется добавить тесты для store: батчинг тиков, поведение подписок и seed history из pair-stats.

## Быстрые TODO / Возможные улучшения

- Добавить unit-тесты для store и ws поведения.
- Улучшить sparklines (сглаживание, тултипы с временной шкалой).
- Документация по развёртыванию/production сборке при необходимости.

## Деплой на GitHub Pages

В проект добавлён GitHub Actions workflow (`.github/workflows/deploy.yml`), который билдит проект и публикует содержимое `dist` в ветку `gh-pages` при пуше в `main`.

Дополнительно в `vite.config.ts` добавлена опция `base`, которую можно задать через переменную окружения `GH_PAGES_BASE`. Например, если ваш репозиторий `username/repo`, то установите `GH_PAGES_BASE=/repo/` в GitHub Actions (как секрет или в workflow):

```yaml
# пример: в workflow можно определить env:
# env:
#   GH_PAGES_BASE: '/my-repo/'
```

Чтобы развернуть:

- Запушьте изменения в `main` — workflow автоматически соберёт и опубликует `dist` в ветку `gh-pages`.
- В настройках репозитория (Settings → Pages) укажите источник публикации — ветка `gh-pages` (директория `/`), если GitHub не настроил это автоматически.

---
