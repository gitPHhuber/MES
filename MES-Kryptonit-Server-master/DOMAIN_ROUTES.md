# Карта доменов API

Краткое разделение маршрутов по доменам. Все примеры путей указаны относительно префикса `/api`.

## 1) Серверные комментарии (server-notes)
**Назначение:** заметки/комментарии к серверу в домене Beryll.

- `PUT /beryll/server-notes/:id` — обновить заметки сервера.

## 2) Записи о дефектах с workflow (defect-records)
**Назначение:** учёт дефектов серверов с управлением статусами и шагами обработки (Beryll).

Базовый namespace: `/beryll/defect-records`.

Примеры ключевых маршрутов:
- `GET /beryll/defect-records` — список записей (фильтры, пагинация).
- `GET /beryll/defect-records/:id` — карточка записи.
- `POST /beryll/defect-records` — создание записи.
- `PUT /beryll/defect-records/:id/status` — обновление статуса.
- `POST /beryll/defect-records/:id/start-diagnosis` — старт диагностики.
- `POST /beryll/defect-records/:id/complete-diagnosis` — завершение диагностики.
- `POST /beryll/defect-records/:id/waiting-parts` — ожидание запчастей.
- `POST /beryll/defect-records/:id/start-repair` — старт ремонта.
- `POST /beryll/defect-records/:id/resolve` — закрытие.
- `GET /beryll/defect-records/stats` — статистика.
- `GET /beryll/defect-records/part-types` — справочник типов.
- `GET /beryll/defect-records/statuses` — справочник статусов.

## 3) Дефекты плат (board-defects)
**Назначение:** справочники дефектов плат для разных линий/типов.

Базовый namespace: `/board-defects`.

- `POST /board-defects/fc` / `GET /board-defects/fc` / `PUT /board-defects/fc` / `DELETE /board-defects/fc/:id`
- `POST /board-defects/915` / `GET /board-defects/915` / `PUT /board-defects/915` / `DELETE /board-defects/915/:id`
- `POST /board-defects/2-4` / `GET /board-defects/2-4` / `PUT /board-defects/2-4` / `DELETE /board-defects/2-4/:id`
- `POST /board-defects/coral-b` / `GET /board-defects/coral-b` / `PUT /board-defects/coral-b` / `DELETE /board-defects/coral-b/:id`
