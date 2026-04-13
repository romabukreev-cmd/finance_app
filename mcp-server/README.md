# super-app MCP server

MCP-сервер для super-app (https://super-app.su).
Даёт MCP-агенту доступ к финансам, дневнику и планеру через единый набор tools.

## Архитектура

```
[MCP клиент]  --HTTP/SSE-->  [mcp-server :3200]  --HTTP-->  [super-app :3100]
                              Bearer: ACCESS_TOKEN          Bearer: API_TOKEN
```

- MCP-сервер слушает на `:3200`, защищён `MCP_ACCESS_TOKEN`
- Дёргает API super-app по `localhost:3100` с `MCP_API_TOKEN`
- Оба токена хранятся в `.env`

## Env

```
MCP_PORT=3200
MCP_ACCESS_TOKEN=<token-for-mcp-clients>
MCP_API_TOKEN=<token-for-super-app-api>
APP_URL=http://127.0.0.1:3100
```

## Запуск

```bash
npm install
npm run build
npm start
```

## Подключение из MCP-клиента

```json
{
  "mcpServers": {
    "super-app": {
      "type": "http",
      "url": "https://super-app.su/mcp",
      "headers": {
        "Authorization": "Bearer <MCP_ACCESS_TOKEN>"
      }
    }
  }
}
```

## Tools (~30 штук)

- **Финансы**: list/create/update/delete для accounts, transactions, categories
- **Дневник**: get_diary_entries, add/update/delete_thought, toggle_diary_buff_debuff, toggle_diary_bookmark
- **Планер**: list/create/update/delete для tasks и subtasks, reorder_tasks, get_work_hours
- **Meta**: get_today_date, get_constants (справочник ID направлений, категорий, бафов и т.д.)
