# Финансы MVP

Личное онлайн-приложение учета финансов (ПК + мобильный браузер) на стеке:
- Next.js + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth + Postgres)

## Что уже сделано
- Каркас приложения и навигация.
- Страницы: `Dashboard`, `Transactions`, `Settings`.
- Базовые UI-компоненты на `shadcn/ui`.
- Зафиксирован MVP scope и модель данных:
  - `docs/mvp-scope.md`
  - `docs/data-model.md`
- Подготовлен SQL-файл схемы для Supabase:
  - `supabase/schema.sql`

## Быстрый запуск
1. Установи зависимости:
```bash
npm install
```
2. Создай `.env.local` из шаблона:
```bash
copy .env.example .env.local
```
3. Запусти dev-сервер:
```bash
npm run dev
```
4. Открой [http://localhost:3000](http://localhost:3000)

## Подключение Supabase
1. Создай проект в Supabase.
2. Скопируй URL и ANON KEY в `.env.local`.
3. Выполни SQL из `supabase/schema.sql` в SQL Editor Supabase.
4. Следующий шаг в коде: подключить клиент Supabase и авторизацию по email.

## Следующие шаги разработки
1. Авторизация по почте и защита роутов.
2. CRUD для счетов и категорий.
3. CRUD для операций (`income`, `expense`, `transfer` как 2 ноги).
4. Реальные расчеты балансов, капитализации и помесячной аналитики.
5. Графики и полировка UX под мобильный формат.
6. Деплой на Vercel.
