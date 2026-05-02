# Dev-скрипты для self-hosted Supabase

Скрипты предполагают:
- SSH-алиас `flor-server` в `~/.ssh/config` (см. план A, Task 0.3).
- Переменные окружения в `~/.flormajor/secrets.env` (см. план A, Task 3.2).

## Скрипты

- **`flor-studio-up`** — поднимает Studio на сервере и открывает SSH-туннель на `http://localhost:3000`. Studio выключается отдельной командой.
- **`flor-studio-down`** — останавливает Studio на сервере (экономит ~300 МБ RAM в простое).
- **`flor-db-tunnel`** — открывает SSH-туннель Postgres на `localhost:5432` для миграций, `psql`, `supabase gen types`. Использует временный socat-relay контейнер на сервере.
- **`flor-backup-pull`** — стягивает свежие бэкапы из Timeweb S3 в `~/Backups/flormajor/` (offsite-копия, см. spec § 3.6).

## Зачем Studio on-demand

VM Timeweb MSK-50 имеет всего 4 ГБ RAM. Studio в простое съедает ~200–400 МБ — это 5–10% всей памяти. Постоянно держать его не нужно: товары меняются раз в неделю-месяц.

См. [`docs/superpowers/specs/2026-05-02-cheap-migration-design.md`](../../docs/superpowers/specs/2026-05-02-cheap-migration-design.md) § 4.
