# Data Model (MVP)

## Таблица `accounts`
- `id: uuid` — идентификатор счета.
- `user_id: uuid` — владелец (Supabase Auth user).
- `name: text` — название счета.
- `type: account_type` — `asset` или `debt`.
- `start_balance: numeric(14,2)` — стартовый остаток на дату начала учета.
- `start_date: date` — дата старта учета.
- `is_archived: boolean` — архивность.
- `created_at`, `updated_at` — служебные поля.

## Таблица `categories`
- `id: uuid`
- `user_id: uuid`
- `name: text`
- `kind: category_kind` — `income` или `expense`.
- `is_system: boolean` — системная (для «Прочее»).
- `is_archived: boolean`
- `created_at`, `updated_at`

Правило: для каждого пользователя обязательно есть системные категории «Прочее» для `income` и `expense`.

## Таблица `transactions`
- `id: uuid`
- `user_id: uuid`
- `transaction_date: date`
- `type: transaction_type` — `income`, `expense`, `transfer`.
- `account_id: uuid` — счет, к которому относится запись.
- `category_id: uuid | null` — только для `income/expense`.
- `amount: numeric(14,2)` — абсолютная сумма (> 0).
- `signed_amount: numeric(14,2)` — сумма со знаком для расчета баланса.
- `transfer_id: uuid | null` — общий идентификатор перевода.
- `transfer_direction: transfer_direction | null` — `out` или `in` для transfer.
- `note: text | null`
- `created_at`, `updated_at`

## Инварианты
- `income`: `signed_amount > 0`, категория обязательна.
- `expense`: `signed_amount < 0`, категория обязательна.
- `transfer`:
  - категория отсутствует,
  - есть `transfer_id`,
  - есть ровно две записи (`out` и `in`),
  - `out < 0`, `in > 0`.
- Баланс счета = `start_balance + sum(signed_amount)` по счету.
- Капитализация = сумма балансов `asset` + сумма балансов `debt` (долги отрицательные).

## Месячная аналитика
- Доходы месяца: `sum(signed_amount where type='income')`.
- Расходы месяца: `abs(sum(signed_amount where type='expense'))`.
- Разница: доходы − расходы.
- Операции `transfer` исключаются из графиков доход/расход и из аналитики по категориям.
