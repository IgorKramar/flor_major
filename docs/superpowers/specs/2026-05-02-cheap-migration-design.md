# Дизайн: миграция ФлорМажора на self-host Supabase (CHEAP-сценарий)

> **Статус:** дизайн утверждён 2026-05-02 в результате брайнсторм-сессии.
> **Реализация:** в отдельной ветке `migrate-cheap-stack`, через writing-plans.
>
> **Базовые документы:**
> - [`docs/migration/cheap.md`](../../migration/cheap.md) — backbone-чек-лист (17 разделов, 15 шагов). Этот spec ничего не отменяет, только уточняет.
> - [`docs/migration/overview.md`](../../migration/overview.md) — общая логика Сценария B (без формы лидов).
> - [`docs/audit/2026-05-audit.md`](../../audit/2026-05-audit.md) — аудит, из которого взяты 2 пункта в эту же ветку.

---

## 1. Контекст

ФлорМажор переезжает с Supabase Cloud (US) на self-hosted Supabase в РФ-ДЦ для соблюдения 152-ФЗ. Хостинг публичного Next.js-приложения остаётся в Onreza (РФ, Москва — подтверждено). Сценарий B: публичная форма обратной связи удаляется полностью, контакт через `tel:`/мессенджеры.

**Ограничения, под которые делаем дизайн:**
- VM Timeweb Cloud MSK-50 (2 vCPU / 4 ГБ RAM / 50 ГБ NVMe) — куплена за 1 182 ₽/мес. Апгрейд исключён.
- Объём данных в каталоге — десятки товаров, 1–2 картинки на товар. Лидов в `public.leads` фактически нет (2 тестовых).
- Бюджет на доп. инфру ≤ 1 200 ₽/мес сверх текущего.

---

## 2. Принятые решения

| # | Решение | Что меняет в cheap.md |
|---|---|---|
| 1 | VM = MSK-50 (2/4/50), уже куплена | подтверждение § 2 |
| 2 | Стек Supabase урезан под 4 ГБ: выключены `realtime`, `functions`, `analytics`, `vector` | дополняет § 5 |
| 3 | Storage backend = `file` (локально) | подтверждение § 5.2, без перехода на S3 сейчас |
| 4 | Studio **не** публикуется наружу. Поднимается on-demand через SSH-туннель | заменяет § 6 (нет `studio.flormajor-omsk.ru`) и § 7 (нет DNS-записи `studio`) |
| 5 | Миграции применяются через SSH-туннель `psql`, не через scp+exec | подтверждение § 8 «Рекомендую SSH-туннель» |
| 6 | Сценарий B: данных в `leads` нет → архив-дамп не делаем | упрощает § 10 |
| 7 | Бэкапы: `pg_dump` каждые 6 ч, retention 14 д, в Timeweb Cloud Storage. Локальный pull на ноут раз в неделю — offsite-копия | заменяет § 11 (Selectel → Timeweb, периодичность 24 ч → 6 ч, retention 30 → 14) |
| 8 | В ветку `migrate-cheap-stack` берём только 2 из 6 P0-багов audit doc (те, что снижают нагрузку на новую БД) | сужает § 12.3 |
| 9 | Cutover в любое удобное время (даунтайм 10–20 мин). Ночное окно не нужно | упрощает § 13 |
| 10 | Юр-документы (политика ПД, приказ, положение) — после cutover, отдельный трек | подтверждение § 15 как post-migration |
| 11 | SMTP-сервис **не подключаем**. У владелицы нет возможности оформить бизнес-почту сейчас. Управление паролями админов — через Studio/SQL вручную | заменяет SMTP-секцию § 5.2 |

---

## 3. Уточнения по разделам cheap.md

### 3.1. § 5 — Supabase: shrink под 4 ГБ

**Сервисы, которые оставляем активными в `docker-compose.yml`:**
- `db` (Postgres 15)
- `kong` (API gateway)
- `auth` (GoTrue)
- `rest` (PostgREST)
- `storage` (Storage API)
- `imgproxy` (для будущей компрессии картинок — лёгкий, ~50–100 МБ)
- `meta` (postgres-meta, нужен для Studio)
- `studio` — **не запускается по умолчанию**, поднимается on-demand (см. § 3.2)

**Сервисы, которые отключаем** (комментируем в `docker-compose.yml` или удаляем):
- `realtime` — после Сценария B нет ни одной подписки в коде. Сейчас он используется в двух местах: канал `dashboard-leads` в `app/admin/page.tsx:75-93` (удаляется при рефакторинге дашборда, см. § 3.7) и канал `admin-leads` в `app/admin/leads/page.tsx:52-76` (уходит вместе с папкой `app/admin/leads/`). После этого подписок не остаётся — Realtime-сервис не нужен. Экономия: 150–300 МБ RAM.
- `functions` (Edge Functions / Deno) — не используются. Экономия: 50–100 МБ.
- `analytics` (Logflare) — не нужен. Экономия: 100–200 МБ.
- `vector` (логи) — не нужен. Экономия: 50–100 МБ.
- `supavisor` — не нужен на нашей нагрузке (десятки запросов в минуту). PostgREST подключается к Postgres напрямую.

**Суммарно сэкономлено ~500–800 МБ RAM** — критично на 4 ГБ.

**Memory limits в `docker-compose.override.yml`:**

```yaml
services:
  db:
    deploy:
      resources:
        limits:
          memory: 1500M
  kong:
    deploy:
      resources:
        limits:
          memory: 256M
  auth:
    deploy:
      resources:
        limits:
          memory: 128M
  rest:
    deploy:
      resources:
        limits:
          memory: 128M
  storage:
    deploy:
      resources:
        limits:
          memory: 256M
  imgproxy:
    deploy:
      resources:
        limits:
          memory: 256M
  meta:
    deploy:
      resources:
        limits:
          memory: 128M
  studio:
    deploy:
      resources:
        limits:
          memory: 384M   # активен только когда поднят on-demand
```

> **Сумма limits** при выключенном Studio: ~2.65 ГБ. Остаётся ~1.3 ГБ для OS, Caddy, swap, кэшей. При поднятом Studio — ~3 ГБ, что близко к потолку. Поэтому Studio гасим после работы (см. § 4).

**Postgres tuning.** Применяется одним из двух способов:
1. Через `command: postgres -c shared_buffers=512MB -c ...` в `docker-compose.override.yml`.
2. Положить `postgresql.conf.user` в volume и подмонтировать в `/etc/postgresql/postgresql.conf.user` с `include` в основном конфиге.

Конкретный механизм выберем при реализации (зависит от того, какой образ Postgres использует Supabase docker — `supabase/postgres` или просто `postgres:15`).

```
shared_buffers = 512MB
effective_cache_size = 1500MB
work_mem = 8MB
maintenance_work_mem = 128MB
max_connections = 50
```

**Swap-файл 2 ГБ** — обязательно, как страховка от OOM-killer:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 3.2. § 6 — Caddy: только публичный API

`Caddyfile`:

```
db.flormajor-omsk.ru {
    reverse_proxy localhost:8000
    encode gzip
}
```

`studio.flormajor-omsk.ru` **не создаётся**. Studio доступен только через SSH-туннель (см. § 4).

### 3.3. § 7 — DNS: только одна запись

В DNS-провайдере домена `flormajor-omsk.ru`:
- `db` (A) → `<TIMEWEB_IP>`

Запись `studio` **не создаём**.

### 3.4. § 8 — Миграции через SSH-туннель

С локальной машины (где репо ФлорМажора):

```bash
# Открыть туннель в фоне
ssh -fN -L 5432:localhost:5432 supa@<TIMEWEB_IP>

# Применить
export PGPASSWORD=<POSTGRES_PASSWORD>
for f in supabase/migrations/*.sql; do
  echo "Applying $f"
  psql -h localhost -p 5432 -U postgres -d postgres -f "$f" || break
done

# Закрыть туннель
pkill -f "ssh.*-L 5432"
```

`scp + docker compose exec` не используем.

### 3.5. § 10 — Упрощённый перенос данных

Так как `leads` и `rate_limits` пустые (2 тестовых лида, не имеющих ценности):

```bash
# Дамп с Supabase Cloud — только нужный контент
pg_dump --data-only --no-owner --no-privileges \
  --schema=public \
  --exclude-table=public.leads \
  --exclude-table=public.rate_limits \
  -h <supabase-cloud-host>.supabase.co -p 5432 -U postgres -d postgres \
  -Fc -f flor-data.dump

# Восстановление в новый Postgres через тот же туннель
pg_restore --data-only --no-owner --no-privileges \
  -h localhost -p 5432 -U postgres -d postgres \
  flor-data.dump
```

**Архив-дамп `leads`/`rate_limits` не делаем** — нечего сохранять.

### 3.6. § 11 — Бэкапы: каждые 6 ч, Timeweb S3, локальный pull

**Cron на сервере:**

```cron
# Каждые 6 часов: 00:00, 06:00, 12:00, 18:00 МСК
0 */6 * * * /opt/backup/backup.sh >> /var/log/flor-backup.log 2>&1
```

**`/opt/backup/backup.sh`:**

```bash
#!/usr/bin/env bash
set -euo pipefail

DATE=$(date -u +%Y%m%d-%H%M%S)
BACKUP_DIR=/opt/backup/work
mkdir -p "$BACKUP_DIR"

# Дамп Postgres (через docker volume — без буфера в памяти контейнера)
docker compose -f /opt/supabase/docker/docker-compose.yml exec -T db \
  pg_dump -U postgres -Fc postgres > "$BACKUP_DIR/db-$DATE.dump"

# Storage (file backend)
tar -czf "$BACKUP_DIR/storage-$DATE.tar.gz" -C /opt/supabase/docker/volumes/storage .

# Залить в Timeweb Cloud Storage через rclone
rclone copy "$BACKUP_DIR" timeweb-s3:flor-backups/ --progress
rclone delete --min-age 14d timeweb-s3:flor-backups/

# Очистить локальные временные файлы старше суток
find "$BACKUP_DIR" -mtime +1 -delete
```

**Локальный pull (на ноуте, раз в неделю):**

```bash
# alias flor-backup-pull в ~/.zshrc
rclone copy timeweb-s3:flor-backups ~/Backups/flormajor/ --progress --max-age 14d
```

Time Machine (если используется) подхватит `~/Backups/flormajor/` автоматически.

### 3.7. § 12 — Scope ветки `migrate-cheap-stack`

**В ветку входит:**

1. **Удаление формы лидов** (§ 12.1 cheap.md):
   - **Удалить файлы целиком:**
     - `components/contact-form.tsx` — компонент формы
     - `app/actions/submit-lead.ts` — Server Action
     - `app/admin/leads/` — раздел «Заявки» в админке (страница и подразделы)
   - **`app/admin/page.tsx` — рефакторинг (файл остаётся, это дашборд):**
     - Убрать тип `Lead` и импорт `Tables` если больше не нужен.
     - Из `DashboardStats` убрать поля `totalLeads`, `newLeadsToday`.
     - Из `Promise.all` убрать 3 запроса к `leads` (count + count_today + recent).
     - Удалить state `recentLeads`, секцию «Последние заявки» (строки 173–198).
     - Из `statCards` убрать 2 карточки: «Всего заявок» и «Заявок сегодня».
     - Удалить весь `useEffect` с Realtime-каналом `dashboard-leads` (строки 73–93). Заменить на простой `useEffect(loadDashboardData, [loadDashboardData])`.
     - Подчистить импорты `Users`, `TrendingUp`, `toast`.
     - **Замена «Последних заявок»:** мини-превью «5 последних обновлённых товаров» — список из `products` с сортировкой по `updated_at desc`, лимит 5. На каждой строке: название, дата обновления, ссылка на `/admin/products?id=<id>`. Тот же визуальный паттерн, что был у «Последних заявок» (`flex items-center justify-between` + `bg-gray-50 hover:bg-gray-100`).
     - **Замена двух stat-карточек:** новые stat-карточки на основе `products`. Конкретные метрики решим при реализации (варианты: «Дата последнего обновления каталога», «Размер каталога», «Featured товары»).
   - **`components/contact-section.tsx`** (или где встроен `<ContactForm />`) — заменить форму на статический блок: `tel:`-ссылка, WhatsApp, Telegram, режим работы. Данные берём из `contact_info` (уже в БД).
   - **`lib/validation/schemas.ts`** — удалить лидовские схемы (`leadSchema` и связанные).
   - **`next.config.mjs`** — убрать `TELEGRAM_*` env-объявления, если есть.
   - **`lib/supabase.ts:33`** — удалить `export type Lead = ...Tables<'leads'>`.
   - **`lib/database.types.ts`** — автогенерируемый. После применения `0027_remove_leads.sql` на новой БД пересгенерировать: `supabase gen types typescript --db-url 'postgresql://postgres:<pwd>@localhost:5432/postgres' > lib/database.types.ts` (через активный SSH-туннель). Тип `leads` уйдёт сам.
   - **`grep -r "leads\|submit-lead\|TELEGRAM" .`** — финальная проверка перед коммитом, подчистить любые хвосты (например в `proxy.ts`, в тестах).
   - **Тесты на лиды** — удалить, если найдутся.

2. **Миграция `supabase/migrations/0027_remove_leads.sql`:**
   ```sql
   ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.leads;
   DROP TABLE IF EXISTS public.leads CASCADE;
   DROP TABLE IF EXISTS public.rate_limits CASCADE;
   ```

3. **Из audit doc — только пункты, снижающие нагрузку на новую БД:**
   - **B1.3** (`lib/site-data.ts`): обернуть `getSiteSettings`, `getThemeSettings`, `getNavItems` и др. в `unstable_cache`. На каждый рендер главной сейчас 5–10 запросов; станет 0 при кэш-хите.
   - **B1.2** (`app/catalog/[slug]/page.tsx`): добавить `generateStaticParams`. Все товары пререндерятся → не бьём БД при первом хите.

**В ветку НЕ входит** (отдельный PR после миграции):
- A1.1 — `use-mobile.tsx` hydration
- A1.2 — `header.tsx` `body.overflow` cleanup
- A3.1 — `revalidateSiteCache('/catalog/${slug}')` после правки товара
- A3.3 — try/catch в `app/api/revalidate/route.ts`
- Любые другие косметические улучшения

### 3.8. § 5.2 / § 10.2 — Работа без SMTP

cheap.md § 5.2 предполагает SMTP (Yandex 360 / Mail.ru) для писем восстановления админ-паролей. У нас этой возможности нет, поэтому:

**В `.env` Supabase:**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN_EMAIL`, `SMTP_SENDER_NAME` — **оставить пустыми или закомментировать**.
- `ENABLE_EMAIL_SIGNUP=false` — публичная регистрация всё равно отключена.
- `ENABLE_EMAIL_AUTOCONFIRM=true` — чтобы при INSERT в `auth.users` через SQL/Studio пользователь сразу был подтверждён (не ждал письма с подтверждением, которого не будет).
- `MAILER_AUTOCONFIRM=true` (вариант параметра в новых версиях GoTrue).

GoTrue будет писать в логи warning при попытке вызвать password reset — это нормально, эту фичу мы не используем.

**Создание админов** (Шаг 10.2 cheap.md в новой формулировке):
1. Через **flor-studio-up** → Studio → Authentication → Users → Add user → ввести email + **постоянный пароль** (не «временный с письмом», как в исходном плане).
2. В Public → `admin_users` → INSERT row с `user_id` нового пользователя и role `owner`.
3. Передать пароль владелице через защищённый канал (Telegram secret chat, Bitwarden share-link).

**Сброс забытого пароля** (когда владелица забудет):
1. flor-studio-up → SQL Editor:
   ```sql
   UPDATE auth.users
   SET encrypted_password = crypt('<новый_пароль>', gen_salt('bf'))
   WHERE email = 'admin@flormajor-omsk.ru';
   ```
2. Или через Studio UI: Authentication → Users → выбрать пользователя → «Reset password» → ввести новый пароль вручную.

**Что не работает без SMTP:**
- Email Magic Link login (никем не используется).
- Email confirmation на signup (signup отключён).
- Password reset через self-service форму (заменили ручным сбросом).
- Email change confirmation (на маленькой команде из 1–2 админов делается через прямой SQL).

**Когда стоит подключить SMTP:** если число админов вырастет до 5+ или появится self-service флоу. Тогда либо Yandex 360, либо Resend (зарубежный, но это служебный канал, не пользовательские ПД).

### 3.9. § 13 — Cutover-runbook

В любое удобное время. Ожидаемый даунтайм публичного сайта: 10–20 минут.

**Pre-flight (до окна):**
- [ ] Ветка `migrate-cheap-stack` смерджена в готовый-к-деплою commit (на staging-deploy в Onreza проверена работоспособность с **новой** БД).
- [ ] Финальные миграции `0001..0026` накатаны на новой БД (без данных).
- [ ] `pg_dump` Supabase Cloud прошёл без ошибок на тестовом прогоне.

**Во время окна:**
1. **t+0** — В старой Supabase Cloud Studio: `UPDATE site_settings SET maintenance_mode = true;` → `proxy.ts` сразу включает заглушку.
2. **t+1** — Финальный `pg_dump --data-only` со старой БД (см. § 3.5 выше).
3. **t+2** — `pg_restore` через SSH-туннель в новую БД.
4. **t+3** — Применить миграцию `0027_remove_leads.sql` в новой БД.
5. **t+4** — `rclone copy supabase-cloud:media flor-local:/opt/supabase/docker/volumes/storage` (повторно — добрать что появилось после первого прогона в pre-flight).
6. **t+6** — В Onreza: заменить env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), удалить `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `RATE_LIMIT_SALT`. Триггер деплой.
7. **t+8** — Smoke-тест (см. § 13.3 cheap.md).
8. **t+15** — В новой Studio: `UPDATE site_settings SET maintenance_mode = false;`.

**Post-cutover:**
- 7 дней — старая Supabase Cloud в read-only.
- День 7 — удалить старый проект Supabase Cloud, удалить старые env в Onreza.

---

## 4. Studio on-demand — реализация

### На сервере

`docker-compose.override.yml` для Studio (опционально, но удобно):

```yaml
services:
  studio:
    profiles: ["manual"]   # Не стартует с docker compose up -d
```

Тогда обычное `docker compose up -d` поднимет всё, кроме Studio. Studio запускается отдельно: `docker compose --profile manual up -d studio`.

### На локальном ноуте (две shell-команды)

`~/.bin/flor-studio-up`:

```bash
#!/usr/bin/env bash
set -euo pipefail
HOST="supa@<TIMEWEB_IP>"

ssh "$HOST" 'cd /opt/supabase/docker && docker compose --profile manual up -d studio'
echo "Studio запущен. Туннель на http://localhost:3000 — Ctrl+C для выхода."
echo "Не забудь после работы: flor-studio-down"
ssh -N -L 3000:localhost:3000 "$HOST"
```

`~/.bin/flor-studio-down`:

```bash
#!/usr/bin/env bash
set -euo pipefail
HOST="supa@<TIMEWEB_IP>"
ssh "$HOST" 'cd /opt/supabase/docker && docker compose stop studio'
echo "Studio остановлен."
```

`~/.bin/flor-db-tunnel` (для миграций):

```bash
#!/usr/bin/env bash
set -euo pipefail
HOST="supa@<TIMEWEB_IP>"
echo "Туннель Postgres на localhost:5432 — Ctrl+C для выхода."
ssh -N -L 5432:localhost:5432 "$HOST"
```

`chmod +x ~/.bin/flor-*` и добавить `~/.bin` в `PATH`.

---

## 5. Деление труда

### Что делает пользователь (только то, что требует web-UI / документов)

1. § 2 — VM Timeweb уже создана ✅
2. § 7 — DNS A-запись `db.flormajor-omsk.ru` → IP VM в панели регистратора домена.
3. Регистрация **Timeweb Cloud Storage** в личном кабинете: создать бакет `flor-backups`, получить `access_key`/`secret_key`.
4. § 13.1 — В личном кабинете Onreza заменить env (после готовности кода).
5. После cutover — оформить юр-документы (политика, приказ, положение) в § 15.

### Что делает Claude (через SSH/Bash/Edit, по согласованию)

- §§ 3–6 — Hardening сервера, Docker, Supabase shrink, Caddy.
- §§ 8–9 — Миграции через SSH-туннель.
- §§ 10–11 — Перенос данных, настройка cron-бэкапов.
- § 12 — Все изменения в коде в ветке `migrate-cheap-stack`.
- § 13 — Cutover-runbook (с подтверждением каждого шага).

### Что нужно от пользователя для запуска серверной части

- IP VM, SSH-доступ для пользователя `supa` (или `root` с моим публичным ключом).
- Учётка администратора Supabase Cloud (для финального дампа).
- Креды Timeweb S3.

---

## 6. Follow-up после миграции (НЕ в этой ветке)

| Трек | Что | Когда |
|---|---|---|
| Оставшиеся P0-баги audit doc | A1.1, A1.2, A3.1, A3.3 | Отдельный PR через 1–2 недели после cutover |
| Юр-документы | Политика ПД на `/privacy` + ссылка в футере + внутренние документы | Параллельно/после cutover |
| Заголовки безопасности | CSP, HSTS, X-Frame-Options в `next.config.mjs` (AUDIT C1) | С юр-треком одной волной |
| Сжатие картинок | `browser-image-compression` или imgproxy URL-трансформации | Когда захочется, см. memory `followup_image_compression.md` |
| Offsite-зеркало бэкапов | `rclone copy` в Selectel/Yandex S3 раз в неделю | Через 2–3 месяца, если будет ощущение «один провайдер мало» |

---

## 7. Что прямо сейчас не покрыто и решается позже

- **Конкретный IP VM, конкретный пароль БД** — заполнятся секретами в момент реализации, в spec'е placeholders.
- **Точный список env, которые удаляются из Onreza** — сверим по `lib/supabase/env.ts` и `app/actions/submit-lead.ts` при подготовке ветки.

---

## 8. Готовность к writing-plans

После одобрения этого spec'а — переход к skill `writing-plans` для построения implementation plan: разбиение на конкретные задачи с порядком, owner-ами и критериями приёмки.
