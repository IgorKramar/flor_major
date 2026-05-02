# Дизайн: миграция Next.js приложения с Onreza на Timeweb VM

> **Статус:** дизайн утверждён 2026-05-02 в результате брайнсторм-сессии. Документ — основа для writing-plans skill (план D).
>
> **Базовые документы:**
> - [`memory/onreza_dropped_app_self_hosted.md`](../../../.claude/projects/-Users-user-Work-self-flor-major/memory/onreza_dropped_app_self_hosted.md) — почему переезжаем (Onreza исчерпала бесплатный лимит build-времени)
> - [`memory/plan_d_decisions.md`](../../../.claude/projects/-Users-user-Work-self-flor-major/memory/plan_d_decisions.md) — четыре стартовых решения

---

## 1. Контекст

ФлорМажор сейчас работает в гибридной схеме, унаследованной от плана C cutover:

| Компонент | Где живёт |
|---|---|
| Next.js приложение | **Onreza** (бесплатный тариф, build-минуты исчерпаны) |
| Supabase (db, kong, auth, rest, storage, meta, imgproxy) | **Timeweb VM MSK-50** (1.2 ГБ used из 3.8 ГБ, IP `77.232.129.172`) |
| Публичный домен `flormajor-omsk.ru` apex | DNS A-запись на Onreza |
| `db.flormajor-omsk.ru` | DNS A-запись на Timeweb (через Caddy → Kong) |

Owner не может публиковать новые версии сайта, потому что Onreza требует апгрейд тарифа, а бюджет жёсткий (1 182 ₽/мес VM = всё). Решение — **Next.js приложение тоже переезжает на ту же Timeweb VM** (single-VM архитектура).

**Ограничения:**
- Память VM 4 ГБ. Supabase ест ~1.2 ГБ. Запас ~2.6 ГБ — хватает Next.js (~150-300 МБ runtime), Caddy (~20 МБ), Studio on-demand (~300 МБ).
- Build на VM **исключён** (риск OOM из-за Supabase и одновременной сборки). Build идёт в GitHub Action runner, на VM едет готовый артефакт.
- Бюджет на инфру — 1 182 ₽/мес уже потрачены. Доплат нет.

---

## 2. Принятые решения

| # | Решение | Обоснование |
|---|---|---|
| 1 | **Build стратегия:** standalone build в GitHub Action runner | Снимает нагрузку с VM, артефакт ~50-150 МБ |
| 2 | **Process manager:** PM2, fork mode (1 instance) | Маленький трафик, экономим память |
| 3 | **Maршрутизация:** Caddy reverse_proxy `localhost:3000`. apex + 301-redirect www → apex | Стандарт SEO, единый canonical URL |
| 4 | **CI/CD:** push в `main` → GitHub Action → SSH deploy → PM2 reload | Авто-деплой, manual rollback через симлинк |
| 5 | **Deploy-пользователь:** новый `deploy` (не `supa`, не root) | Принцип наименьших привилегий, изоляция SSH-ключа |
| 6 | **Структура:** Capistrano-style `/opt/flormajor/{releases/<ts>, current → releases/<ts>, shared/.env, shared/logs}` | Atomic swap через симлинк, простой rollback, последние 5 релизов |
| 7 | **Runtime-секреты:** `/opt/flormajor/shared/.env` (chmod 600, owner deploy) | Next.js нативно читает `.env` при `node server.js`, секреты вне releases/ |
| 8 | **Транспорт артефакта:** `tar.gz` + `scp` + распаковка на сервере | Атомарный (весь файл или ничего), минимум deps |
| 9 | **Pre-DNS-swap testing:** staging-subdomain `staging.flormajor-omsk.ru` | Реальный TLS-сертификат, поведение 1:1 с production |
| 10 | **DNS swap timing:** после первого deploy + 24 часа наблюдения staging | Компромисс срочность/надёжность |
| 11 | **Build env:** `NEXT_PUBLIC_*` в GH Secrets (build-time), `SUPABASE_SERVICE_ROLE_KEY` только на сервере | Service role не должен попадать в GH (минимизируем blast radius утечки) |
| 12 | **Health endpoint:** `app/api/health/route.ts` (200 OK + timestamp) | Deploy-скрипт ждёт healthy после `pm2 reload` |

---

## 3. Архитектура

```
                              Internet
                                  │
                       ┌──────────┼──────────┐
                       │          │          │
                       ▼          ▼          ▼
        flormajor-omsk.ru   www.flormajor-omsk.ru   db.flormajor-omsk.ru
        staging.flormajor-omsk.ru  (staging до cutover)
                       │          │          │
                       │          │          │
                       └──────────┴──────────┘
                                  │ TLS via Let's Encrypt
                       ┌──────────▼──────────┐
                       │      Caddy v2        │  ← на VM, port 80/443
                       │                      │
                       │  apex → :3000        │  (Next.js)
                       │  staging → :3000     │  (Next.js)
                       │  www → 301 → apex    │
                       │  db → :8000          │  (Kong → Supabase)
                       └──────────┬───────────┘
                                  │
                       ┌──────────┴───────────┐
                       │                      │
              ┌────────▼────────┐    ┌────────▼─────────┐
              │  PM2 (fork)     │    │  Docker Compose  │
              │  Next.js        │    │  Supabase stack  │
              │  127.0.0.1:3000 │    │  (db, kong, ...) │
              │                 │    │                  │
              │  /opt/flormajor │    │  /opt/supabase   │
              └─────────────────┘    └──────────────────┘

       /opt/flormajor/                       Memory budget на 4 ГБ:
       ├── releases/                         - Supabase: 1.2 GB
       │   ├── 2026-05-02-1430-abc123/       - Next.js (PM2): 200-400 MB
       │   ├── 2026-05-02-1530-def456/       - Caddy: 20 MB
       │   └── ... (max 5)                   - OS + buffers: 300-500 MB
       ├── current → releases/<latest>       - Studio on-demand: +384 MB
       └── shared/                           ────────────
           ├── .env (chmod 600)              ~2 ГБ used, запас 1.8 ГБ
           └── logs/
```

---

## 4. Структура артефакта и серверных директорий

### 4.1. Что внутри одного `releases/<timestamp>/`

После `next build` с `output: 'standalone'` Next.js создаёт `.next/standalone/` с минимальным `server.js` + tree-shaken `node_modules`. К нему нужно добавить `public/` (статика — favicon, иконки, og-image) и `.next/static/` (сборочные JS/CSS, hashed).

Артефакт = объединение этих трёх:
```
releases/<timestamp>/
├── server.js               # из .next/standalone/server.js
├── package.json            # из .next/standalone/package.json
├── node_modules/           # tree-shaken, ~50-100 МБ
├── public/                 # копия из репо (~236 КБ)
└── .next/
    └── static/             # из .next/static/, ~5-15 МБ
```

Размер на release: ~80-150 МБ. На 5 релизов: ~400-750 МБ. На 50 ГБ NVMe — копейки.

### 4.2. Cleanup старых релизов

В deploy-скрипте после успешного `pm2 reload` и health-check:
```bash
ls -1t /opt/flormajor/releases | tail -n +6 | xargs -I{} rm -rf /opt/flormajor/releases/{}
```

### 4.3. `/opt/flormajor/shared/.env`

```
NEXT_PUBLIC_SUPABASE_URL=https://db.flormajor-omsk.ru
NEXT_PUBLIC_SUPABASE_ANON_KEY=<значение из ~/.flormajor/secrets.env>
SUPABASE_SERVICE_ROLE_KEY=<значение>
```

Симлинк `current/.env → ../shared/.env` создаётся в deploy-скрипте, Next.js при запуске подхватывает через стандартный dotenv loader.

> **Build-time vs runtime:** `NEXT_PUBLIC_*` нужны при `next build` (баeкаются в client bundle), плюс runtime для server-side. Поэтому они и в GH Secrets (build), и в shared/.env (runtime). `SUPABASE_SERVICE_ROLE_KEY` — только runtime, только в shared/.env.

---

## 5. GitHub Action workflow

### 5.1. `.github/workflows/deploy.yml`

```yaml
name: Deploy to Timeweb VM

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install deps
        run: pnpm install --frozen-lockfile

      - name: Lint + typecheck + test
        run: |
          pnpm lint
          pnpm typecheck
          pnpm test

      - name: Build standalone
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
        run: pnpm build

      - name: Pack artifact
        run: |
          mkdir -p artifact
          cp -r .next/standalone/. artifact/
          cp -r public artifact/public
          mkdir -p artifact/.next
          cp -r .next/static artifact/.next/static
          tar -czf bundle.tar.gz -C artifact .

      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H ${{ secrets.DEPLOY_HOST }} >> ~/.ssh/known_hosts

      - name: Deploy
        env:
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
          TS: ${{ github.run_number }}-${{ github.sha }}
        run: |
          # Заливаем артефакт во временный файл с уникальным именем
          scp -i ~/.ssh/deploy_key bundle.tar.gz \
            "${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/bundle-${TS}.tar.gz"

          # Запускаем remote-скрипт через ssh bash -s "$TS"
          ssh -i ~/.ssh/deploy_key "${DEPLOY_USER}@${DEPLOY_HOST}" \
            bash -s "$TS" < scripts/deploy/remote-deploy.sh
```

### 5.2. `scripts/deploy/remote-deploy.sh` (committed в репо)

Скрипт получает timestamp через `$1`:

```bash
#!/usr/bin/env bash
set -euo pipefail
TS="$1"
RELEASE="/opt/flormajor/releases/$TS"

mkdir -p "$RELEASE"
tar -xzf "/tmp/bundle-${TS}.tar.gz" -C "$RELEASE"
rm "/tmp/bundle-${TS}.tar.gz"

# Симлинк на shared/.env
ln -sf /opt/flormajor/shared/.env "$RELEASE/.env"

# Atomic switch
ln -sfn "$RELEASE" /opt/flormajor/current

# Reload PM2 (graceful)
pm2 reload flormajor --update-env

# Health check (max 30 секунд = 15 попыток × 2 сек)
for i in {1..15}; do
  if curl -fs http://127.0.0.1:3000/api/health >/dev/null; then
    echo "✓ health OK after $((i * 2))s"
    break
  fi
  sleep 2
  if [ "$i" -eq 15 ]; then
    echo "✗ health check failed"
    exit 1
  fi
done

# Cleanup старых релизов (оставляем 5)
ls -1t /opt/flormajor/releases | tail -n +6 | \
  xargs -I{} rm -rf "/opt/flormajor/releases/{}"

echo "✓ deploy $TS complete"
```

Преимущества вынесения в отдельный файл:
- Версионируется в репо вместе с кодом (правки видны в diff'ах PR-ов).
- Легко запустить локально для отладки: `ssh deploy@host bash -s "manual-$(date +%s)" < scripts/deploy/remote-deploy.sh` (требует уже залитого `bundle-manual-*.tar.gz`).
- Не путается с YAML escaping в workflow.

### 5.2. GH Secrets (заранее)

| Secret | Значение |
|---|---|
| `DEPLOY_SSH_KEY` | Приватный ed25519 (создан локально, не `id_flormajor`!) |
| `DEPLOY_HOST` | `77.232.129.172` |
| `DEPLOY_USER` | `deploy` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://db.flormajor-omsk.ru` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (из `~/.flormajor/secrets.env`) |

`SUPABASE_SERVICE_ROLE_KEY` — **не в GH Secrets**. Только в `/opt/flormajor/shared/.env` на VM.

---

## 6. PM2 конфиг

### 6.1. `ecosystem.config.cjs` (в репо, копируется в release при unpack)

```js
module.exports = {
  apps: [
    {
      name: 'flormajor',
      script: 'server.js',
      cwd: '/opt/flormajor/current',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '127.0.0.1',
      },
      error_file: '/opt/flormajor/shared/logs/error.log',
      out_file: '/opt/flormajor/shared/logs/out.log',
      time: true,
    },
  ],
}
```

Запуск (один раз при первой настройке):
```bash
sudo -iu deploy
cd /opt/flormajor/current
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u deploy --hp /home/deploy
# (последняя команда выводит инструкцию — выполнить под root)
```

### 6.2. PM2 reload vs restart

`pm2 reload` для fork mode выполняет **graceful reload**: старый процесс держит трафик пока новый стартует и привязывается к порту. Если новый зафейлился — старый остаётся живым. Это и есть наш zero-downtime deploy.

`pm2 restart` — жёсткий kill + spawn, есть короткое окно 502. Не используем.

---

## 7. Caddyfile (обновление)

Текущий блок `db.flormajor-omsk.ru` сохраняется. Добавляем:

```
flormajor-omsk.ru, staging.flormajor-omsk.ru {
    reverse_proxy 127.0.0.1:3000
    encode gzip

    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }

    log {
        output file /var/log/caddy/app.log {
            roll_size 10mb
            roll_keep 5
            roll_keep_for 168h
        }
        format json
    }
}

www.flormajor-omsk.ru {
    redir https://flormajor-omsk.ru{uri} permanent
}
```

Apex + staging обрабатываются одним блоком (одинаковая конфигурация). После cutover staging-subdomain полезно **оставить** как preview-канал для будущих превью-деплоев / тестирования следующих изменений до DNS swap. Если когда-то решим убрать — отдельный одноstrochный edit Caddyfile.

> **Note:** Caddy не сможет получить TLS-сертификат для apex `flormajor-omsk.ru` пока DNS-запись смотрит на Onreza (HTTP-01 challenge не пройдёт). Это **OK** — Caddy не блокирует старт из-за этого, он повторяет получение сертификата периодически. После DNS swap apex → 77.232.129.172 Caddy получит сертификат при первом запросе.

---

## 8. Health endpoint

`app/api/health/route.ts`:

```typescript
export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({ ok: true, ts: Date.now() })
}
```

Используется:
- Deploy-скрипт после `pm2 reload` — ждёт пока endpoint начнёт отдавать 200 (max 30 сек).
- Опционально для внешнего мониторинга (uptimerobot и т.д.) — позже.

---

## 9. Pre-DNS-swap testing

### 9.1. Подготовка (заранее, до первого деплоя)

1. **Создать `deploy` пользователя** на VM:
   ```bash
   ssh flor-server-root 'adduser --disabled-password --gecos "" deploy'
   # SSH-ключ для GH Action генерируем локально, кладём публичную часть в /home/deploy/.ssh/authorized_keys
   ```
2. **Дать `deploy` право на `pm2 reload flormajor`** через sudoers (если PM2 запущен под deploy без sudo — этого не нужно).
3. **Создать `/opt/flormajor/`** с правильными правами:
   ```bash
   sudo mkdir -p /opt/flormajor/{releases,shared/logs}
   sudo chown -R deploy:deploy /opt/flormajor
   ```
4. **Положить `/opt/flormajor/shared/.env`** с runtime-секретами.
5. **Установить PM2** на VM глобально под deploy:
   ```bash
   sudo -iu deploy
   npm install -g pm2  # требует Node на VM — устанавливаем mise или nvm под deploy
   ```
6. **DNS A-запись `staging.flormajor-omsk.ru → 77.232.129.172`** на reg.ru (владелец делает).
7. **Caddyfile обновлён** (см. § 7), `sudo systemctl reload caddy`.

### 9.2. Первый деплой

Через GH Action workflow_dispatch (manual trigger) — прогон всего pipeline на ветке main. После успешного прогона:
- `https://staging.flormajor-omsk.ru` отдаёт реальный сайт с настоящим Let's Encrypt сертификатом.
- Caddy получил сертификат при первом запросе (через HTTP-01 challenge — DNS уже корректный для staging).

### 9.3. Smoke-checklist на staging

- [ ] Главная: hero, карусель товаров, каталог, контакты (все секции).
- [ ] Картинки идут через Storage Renderer (Network → размер ≤ 500 КБ, content-type webp).
- [ ] `/catalog` — список товаров.
- [ ] `/catalog/<slug>` — карточка с галереей.
- [ ] `/admin/login` — вход под `owner@flormajor-omsk.ru`.
- [ ] Дашборд админки, виджет «Последние обновлённые товары» работает.
- [ ] Правка товара → сохранение → видно на публичной части (через cache invalidation).
- [ ] Загрузка нового изображения через админку.
- [ ] `/thanks` → 404, `/admin/leads` → 404.

### 9.4. 24-часовое наблюдение

Между smoke-чеком и DNS swap — **минимум 24 часа** наблюдаем:
- `pm2 status` — не было ли рестартов.
- `pm2 logs flormajor --lines 100` — нет ли ошибок.
- `curl https://staging.flormajor-omsk.ru/api/health` — отвечает.
- `free -h` на VM — память не утекает.
- `docker compose ps` — Supabase healthy.

---

## 10. Cutover (DNS swap)

### 10.1. Pre-flight

- [ ] 24-часа наблюдения staging без замечаний.
- [ ] Бэкап текущих env в Onreza (на случай rollback).
- [ ] Снизить TTL DNS на `flormajor-omsk.ru` apex заранее до 60 секунд (за 24 часа до cutover).

### 10.2. Само переключение

1. **На reg.ru:** меняем A-запись apex `flormajor-omsk.ru` с Onreza IP на `77.232.129.172`.
2. Ждём 5–10 минут распространения DNS.
3. **Проверяем:** `dig +short flormajor-omsk.ru` → `77.232.129.172`.
4. Открываем `https://flormajor-omsk.ru/` — Caddy получит сертификат при первом запросе (~10-30 секунд первый раз). Дальше работает мгновенно.
5. Smoke-чек публичного сайта (тот же, что в § 9.3).

### 10.3. www-redirect

DNS A-запись `www.flormajor-omsk.ru` тоже должна указывать на нашу VM (если её нет — добавить). Caddy блок `www.flormajor-omsk.ru` сделает 301 на apex.

### 10.4. Откат (в течение TTL)

Если что-то пошло не так — DNS A-запись apex обратно на Onreza IP. Через 60 секунд (TTL) сайт работает на старом стеке.

---

## 11. Decommission Onreza

Через **7 дней** наблюдения после DNS swap, если apex стабильно работает на VM:

1. В Onreza — поставить проект на pause (без оплаты), потом удалить.
2. Удалить из GH старые env (если есть привязка к старому Onreza).
3. **Staging-subdomain оставляем** как preview-канал для будущих изменений (см. § 7).

---

## 12. Что НЕ покрыто этим планом

- **Мониторинг/алертинг** (Sentry, UptimeRobot и т.п.) — отдельный трек, после стабилизации.
- **CDN перед Caddy** (Cloudflare) — не нужно, у нас сервер в Москве, аудитория в Омске. Если будет всё-таки нужно — отдельный PR.
- **Зеркало бэкапов в Selectel** — отдельный follow-up из плана C, не блокирует D.
- **Self-hosted шрифты** — отдельный PR (memory `followup_self_hosted_fonts.md`).
- **Перенос auth.users из старого Cloud** (если бы там были админы кроме одного) — у нас единственный админ создан заново на этапе плана C.
- **Build на VM** как fallback — пока не нужен. Если GH Action когда-то отвалится — добавим возможность ручного локального deploy через `pnpm build && rsync && ssh ...`.
- **Multi-environment** (dev/staging/prod на разных VM) — преждевременно. Staging — это subdomain на той же VM, для будущих превью можно будет использовать.

---

## 13. Структура файлов в репо после плана D

**Создаются:**

| Файл | Назначение |
|---|---|
| `.github/workflows/deploy.yml` | GitHub Action: build + deploy при push в main |
| `scripts/deploy/remote-deploy.sh` | Bash-скрипт, выполняемый на сервере через `ssh bash -s "$TS"` |
| `ecosystem.config.cjs` | PM2 конфиг (committed, копируется в каждый release) |
| `app/api/health/route.ts` | Health endpoint для PM2 wait |

**Модифицируются:**

| Файл | Что |
|---|---|
| `next.config.mjs` | `output: 'standalone'` |

**На сервере (вне репо):**

| Путь | Назначение |
|---|---|
| `/opt/flormajor/` | Капистрановская структура releases/current/shared |
| `/home/deploy/` | Пользователь для GH Action SSH |
| `/etc/caddy/Caddyfile` | Расширен блоком apex+staging+www |
| `~/.ssh/deploy_key` (на ноуте владельца) | На случай ручного деплоя в обход GH |

---

## 14. Деление труда

### Что делает владелец вручную (web-UI / DNS / GitHub Settings)

1. На reg.ru: A-запись `staging.flormajor-omsk.ru` → `77.232.129.172` (заранее).
2. В GitHub Settings → Secrets: добавить `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. На reg.ru: A-запись apex `flormajor-omsk.ru` с Onreza на `77.232.129.172` (cutover-момент).
4. В Onreza UI: pause/delete старый проект через 7 дней.

### Что делает Claude через SSH/Bash/код

- §§ 4-9 — создание `deploy` user, `/opt/flormajor/`, PM2 setup, Caddyfile.
- Код в репо: `next.config.mjs` правка, `app/api/health/route.ts`, `ecosystem.config.cjs`, `.github/workflows/deploy.yml`.
- Первый деплой через workflow_dispatch.
- Smoke-проверки staging, мониторинг 24 часа.
- Cutover-команды и проверки (но DNS меняет владелец вручную).

---

## 15. Готовность к writing-plans

После одобрения этого spec'а — переход к skill `writing-plans` для построения пошагового implementation plan'а.
