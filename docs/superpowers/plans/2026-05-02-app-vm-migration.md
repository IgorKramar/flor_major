# План D: миграция Next.js приложения на Timeweb VM

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести продакшен Next.js приложения с Onreza (где исчерпан бесплатный лимит build) на ту же Timeweb VM, где уже работает self-hosted Supabase. Заменить деплой через Onreza на push-to-main GitHub Action с PM2 + Caddy.

**Architecture:** Single-VM. GitHub Action собирает Next.js standalone bundle на runner'е, заливает tar.gz на VM через scp, на VM bash-скрипт распаковывает в `/opt/flormajor/releases/<ts>/`, переключает симлинк `current → releases/<ts>` атомарно, делает `pm2 reload` и health-check. Caddy перед PM2 (apex + staging + www-redirect). DNS swap apex с Onreza IP на Timeweb 77.232.129.172 — финальный шаг.

**Tech Stack:** Next.js 16 (App Router) с `output: 'standalone'`, PM2 (fork mode), Caddy v2, GitHub Actions (ubuntu-latest, pnpm 10, node 22), bash, ssh + scp + tar.

**Базовый spec:** [`../specs/2026-05-02-app-vm-migration-design.md`](../specs/2026-05-02-app-vm-migration-design.md).

---

## Контекст для исполнителя

VM `77.232.129.172` (alias `flor-server` в `~/.ssh/config`):
- Ubuntu 24.04 LTS, 4 GB RAM, 50 GB NVMe, 2 vCPU.
- Self-hosted Supabase ест ~1.2 GB. Запас ~2.6 GB.
- Доступ через SSH-ключ `~/.ssh/id_flormajor` под пользователем `supa` (имеет sudo NOPASSWD).
- Caddy уже работает, обслуживает `db.flormajor-omsk.ru` → Kong (порт 8000).
- Node на VM **не установлен** — это часть плана (Phase 1).

В репо ветка `plan-d-app-on-vm` отрезана от main, working tree чистый.

Все pnpm-команды локально через `mise exec --` (как в предыдущих планах).

---

## File Structure

**Создаются в репо:**

| Файл | Назначение |
|---|---|
| `next.config.mjs` (modify) | Добавить `output: 'standalone'` |
| `app/api/health/route.ts` | Простой эндпоинт `{ ok: true, ts: <ms> }` для PM2 wait и мониторинга |
| `ecosystem.config.cjs` | PM2 конфиг: fork, instances 1, max_memory_restart 512M, env NODE_ENV/PORT/HOSTNAME |
| `scripts/deploy/remote-deploy.sh` | Bash на сервере: распаковка, симлинк, pm2 reload, health-check, cleanup |
| `.github/workflows/deploy.yml` | GitHub Action: lint+typecheck+test+build → tar → scp → ssh remote-deploy |

**Создаётся вне репо:**

- На сервере `/opt/flormajor/{releases/, current → releases/<latest>, shared/.env, shared/logs/}`.
- На сервере новый пользователь `deploy` с SSH-доступом по отдельному ключу.
- На локальной машине `~/.ssh/id_flormajor_deploy` (приватная часть → GH Secrets, публичная → VM).
- В GitHub Settings → Secrets: `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**Меняется на сервере:**

- `/etc/caddy/Caddyfile` — добавляются блоки `flormajor-omsk.ru, staging.flormajor-omsk.ru` и `www.flormajor-omsk.ru → 301`.
- DNS provider `flormajor-omsk.ru`: новая A-запись `staging`, потом cutover apex.

---

## Phase 0 — Код-изменения в репо

### Task 1: `next.config.mjs` — `output: 'standalone'`

**Files:**
- Modify: `next.config.mjs`

- [ ] **Step 1: Применить правку**

В существующий `nextConfig` объект добавить поле `output: 'standalone'` (одна строка):

```javascript
const nextConfig = {
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // ... без изменений
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}
```

> `output: 'standalone'` говорит Next.js при `next build` создать `.next/standalone/` директорию с минимальным `server.js` + tree-shaken `node_modules`.

- [ ] **Step 2: Проверить локальный билд (опционально, если Google Fonts доступны)**

Run:
```bash
mise exec -- pnpm typecheck
```
Expected: pass.

- [ ] **Step 3: Коммит вместе с Task 2 (один коммит на код-изменения)**

Не коммитим пока, продолжаем.

---

### Task 2: `app/api/health/route.ts` — health endpoint

**Files:**
- Create: `app/api/health/route.ts`

- [ ] **Step 1: Создать роут**

```typescript
export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({ ok: true, ts: Date.now() })
}
```

- [ ] **Step 2: Typecheck**

Run: `mise exec -- pnpm typecheck`
Expected: pass.

- [ ] **Step 3: Закоммитить вместе с Task 1**

```bash
git add next.config.mjs app/api/health/route.ts
git commit -m "feat: standalone build + health endpoint для self-hosted деплоя"
```

---

### Task 3: `ecosystem.config.cjs` — PM2 конфиг

**Files:**
- Create: `ecosystem.config.cjs`

- [ ] **Step 1: Создать файл**

```javascript
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

> `HOSTNAME: '127.0.0.1'` — Next.js слушает только loopback. Наружу через Caddy. `max_memory_restart: 512M` — авторестарт при утечке памяти.

- [ ] **Step 2: Закоммитить**

```bash
git add ecosystem.config.cjs
git commit -m "feat: PM2 ecosystem config (fork mode, 512M cap)"
```

---

### Task 4: `scripts/deploy/remote-deploy.sh` — bash-скрипт на сервере

**Files:**
- Create: `scripts/deploy/remote-deploy.sh`

- [ ] **Step 1: Создать директорию и файл**

```bash
mkdir -p scripts/deploy
cat > scripts/deploy/remote-deploy.sh <<'EOF'
#!/usr/bin/env bash
# Удалённый deploy-скрипт. Запускается через ssh bash -s "$TS" < remote-deploy.sh.
# Получает timestamp релиза в $1.

set -euo pipefail
TS="${1:?usage: remote-deploy.sh <timestamp>}"
RELEASE="/opt/flormajor/releases/$TS"

mkdir -p "$RELEASE"
tar -xzf "/tmp/bundle-${TS}.tar.gz" -C "$RELEASE"
rm "/tmp/bundle-${TS}.tar.gz"

# Симлинк на shared/.env (Next.js нативно подхватит при старте)
ln -sf /opt/flormajor/shared/.env "$RELEASE/.env"

# Atomic switch
ln -sfn "$RELEASE" /opt/flormajor/current

# Reload PM2 (graceful, fork-mode держит трафик старого процесса пока новый стартует)
pm2 reload flormajor --update-env

# Health check (max 30 секунд: 15 попыток × 2 сек)
for i in {1..15}; do
  if curl -fs http://127.0.0.1:3000/api/health >/dev/null; then
    echo "✓ health OK after $((i * 2))s"
    break
  fi
  sleep 2
  if [ "$i" -eq 15 ]; then
    echo "✗ health check failed after 30s"
    exit 1
  fi
done

# Cleanup старых релизов (оставляем 5)
ls -1t /opt/flormajor/releases | tail -n +6 | \
  xargs -I{} rm -rf "/opt/flormajor/releases/{}"

echo "✓ deploy $TS complete"
EOF
chmod +x scripts/deploy/remote-deploy.sh
```

- [ ] **Step 2: Закоммитить**

```bash
git add scripts/deploy/remote-deploy.sh
git commit -m "feat: remote-deploy.sh — atomic swap + health check + cleanup"
```

---

### Task 5: `.github/workflows/deploy.yml` — GH Action

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Создать директорию и workflow**

```bash
mkdir -p .github/workflows
cat > .github/workflows/deploy.yml <<'EOF'
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
          ls -lh bundle.tar.gz

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
          scp -i ~/.ssh/deploy_key bundle.tar.gz \
            "${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/bundle-${TS}.tar.gz"
          ssh -i ~/.ssh/deploy_key "${DEPLOY_USER}@${DEPLOY_HOST}" \
            bash -s "$TS" < scripts/deploy/remote-deploy.sh
EOF
```

- [ ] **Step 2: YAML lint (sanity check)**

Run:
```bash
mise exec -- npx --yes yaml-lint .github/workflows/deploy.yml 2>&1 | tail -5
```
Expected: либо «File is valid», либо команда не найдена (тоже OK — тогда YAML синтаксис проверится в GitHub при первом push).

- [ ] **Step 3: Закоммитить**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat(ci): GitHub Action push-to-main deploy"
```

---

### Task 6: Final code-side check

**Files:** read-only

- [ ] **Step 1: Полный прогон проверок**

Run:
```bash
mise exec -- pnpm lint && mise exec -- pnpm typecheck && mise exec -- pnpm test
```
Expected: lint pass, typecheck pass, 33 теста pass.

- [ ] **Step 2: Просмотр коммитов на ветке**

Run: `git log --oneline main..HEAD`
Expected: 4 коммита (Task 1+2 объединены, потом Task 3, 4, 5).

---

## Phase 1 — Серверная подготовка

### Task 7: Установить Node 22 LTS на VM (NodeSource)

**Files:** server packages

- [ ] **Step 1: Добавить NodeSource репо и установить Node**

Run:
```bash
ssh flor-server 'curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -' 2>&1 | tail -3
ssh flor-server 'sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs 2>&1 | tail -3'
```
Expected: `node` установлен.

- [ ] **Step 2: Проверить версии**

Run:
```bash
ssh flor-server 'node --version && npm --version'
```
Expected: `v22.X.X`, `10.X.X`.

---

### Task 8: Установить PM2 глобально

**Files:** server packages

- [ ] **Step 1: Установить через npm**

Run:
```bash
ssh flor-server 'sudo npm install -g pm2 2>&1 | tail -5 && pm2 --version'
```
Expected: PM2 5.X или 6.X.

> Глобальная установка нужна, чтобы любой пользователь (deploy) мог запустить `pm2`. systemd unit для авторестарта тоже сошлётся на `/usr/bin/pm2`.

---

### Task 9: Создать пользователя `deploy` и SSH-ключ для GH Action

**Files:**
- Create на ноуте: `~/.ssh/id_flormajor_deploy`, `~/.ssh/id_flormajor_deploy.pub`
- Modify на VM: `/etc/passwd`, `/home/deploy/.ssh/authorized_keys`

- [ ] **Step 1: Создать deploy-пользователя на VM**

Run:
```bash
ssh flor-server 'sudo adduser --disabled-password --gecos "" deploy && sudo mkdir -p /home/deploy/.ssh && sudo chmod 700 /home/deploy/.ssh && sudo chown deploy:deploy /home/deploy/.ssh'
```
Expected: пользователь создан.

- [ ] **Step 2: Сгенерировать SSH-ключ для GH Action на ноуте**

Run:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_flormajor_deploy -N "" -C "github-actions@flormajor-deploy"
chmod 600 ~/.ssh/id_flormajor_deploy
chmod 644 ~/.ssh/id_flormajor_deploy.pub
cat ~/.ssh/id_flormajor_deploy.pub
```
Expected: одна строка вида `ssh-ed25519 AAAA... github-actions@flormajor-deploy`.

- [ ] **Step 3: Залить публичный ключ на VM**

Run:
```bash
PUBKEY=$(cat ~/.ssh/id_flormajor_deploy.pub)
ssh flor-server "echo '$PUBKEY' | sudo tee -a /home/deploy/.ssh/authorized_keys && sudo chmod 600 /home/deploy/.ssh/authorized_keys && sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys"
```

- [ ] **Step 4: Проверить логин под deploy с новым ключом**

Run:
```bash
ssh -i ~/.ssh/id_flormajor_deploy -o IdentitiesOnly=yes deploy@77.232.129.172 'whoami && hostname'
```
Expected:
```
deploy
<hostname>
```

---

### Task 10: Создать `/opt/flormajor/` структуру

**Files:** server `/opt/flormajor/`

- [ ] **Step 1: Создать директории**

Run:
```bash
ssh flor-server 'sudo mkdir -p /opt/flormajor/releases /opt/flormajor/shared/logs && sudo chown -R deploy:deploy /opt/flormajor && sudo chmod 755 /opt/flormajor && ls -la /opt/flormajor/'
```
Expected:
```
drwxr-xr-x ... deploy deploy ... releases
drwxr-xr-x ... deploy deploy ... shared
```

---

### Task 11: Положить runtime-секреты в `/opt/flormajor/shared/.env`

**Files:** server `/opt/flormajor/shared/.env`

- [ ] **Step 1: Создать `.env` под `deploy` пользователем**

Run:
```bash
source ~/.flormajor/secrets.env

ssh flor-server "cat > /tmp/flor.env" <<EOF
NEXT_PUBLIC_SUPABASE_URL=https://db.flormajor-omsk.ru
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
EOF

ssh flor-server 'sudo mv /tmp/flor.env /opt/flormajor/shared/.env && sudo chown deploy:deploy /opt/flormajor/shared/.env && sudo chmod 600 /opt/flormajor/shared/.env && ls -la /opt/flormajor/shared/.env'
```
Expected: `-rw------- 1 deploy deploy ... .env`.

- [ ] **Step 2: Проверить, что значения корректные (без вывода самих секретов)**

Run:
```bash
ssh flor-server 'sudo -u deploy grep -E "^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)" /opt/flormajor/shared/.env | sed "s/=.*/=***/"'
```
Expected: 3 строки `KEY=***`.

---

### Task 12: Настроить PM2 startup для авторестарта при ребуте

**Files:** server systemd unit

- [ ] **Step 1: Получить команду от `pm2 startup`**

Run под `deploy`:
```bash
ssh flor-server 'sudo -iu deploy bash -c "pm2 startup systemd -u deploy --hp /home/deploy"' 2>&1 | tail -5
```
Expected: вывод заканчивается строкой вроде:
```
[PM2] To setup the Startup Script, copy/paste the following command:
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u deploy --hp /home/deploy
```

- [ ] **Step 2: Выполнить эту команду под root**

Run на VM (через ssh с sudo):
```bash
ssh flor-server 'sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u deploy --hp /home/deploy' 2>&1 | tail -5
```
Expected: `[PM2] [v] Command successfully executed.`

> Точная команда из Step 1 может слегка отличаться по версии PM2 — использовать ту, что вывел `pm2 startup`.

- [ ] **Step 3: Проверить systemd unit создан**

Run: `ssh flor-server 'sudo systemctl status pm2-deploy.service --no-pager | head -10'`
Expected: видим юнит, состояние `active (exited)` (нет процессов пока).

---

## Phase 2 — Caddy + DNS подготовка

### Task 13: ⚠️ Владелец создаёт DNS A-запись `staging.flormajor-omsk.ru`

> **БЛОКЕР для Phase 4** (первый деплой). Можно начинать сейчас параллельно с Phase 1.

- [ ] **Step 1: Владелец заходит в DNS-панель reg.ru**

- [ ] **Step 2: Создаёт запись:**
  - Subdomain: `staging`
  - Type: `A`
  - Value: `77.232.129.172`
  - TTL: `300` (5 минут)

- [ ] **Step 3: Проверить распространение (5-30 минут)**

Run:
```bash
ssh flor-server 'dig +short staging.flormajor-omsk.ru'
```
Expected: `77.232.129.172`.

---

### Task 14: Расширить Caddyfile (apex + staging + www)

**Files:** server `/etc/caddy/Caddyfile`

- [ ] **Step 1: Прочитать текущий Caddyfile**

Run: `ssh flor-server 'cat /etc/caddy/Caddyfile'`
Expected: видим только блок `db.flormajor-omsk.ru { reverse_proxy localhost:8000 ... }`.

- [ ] **Step 2: Добавить три новых блока**

Run:
```bash
ssh flor-server "sudo tee -a /etc/caddy/Caddyfile > /dev/null" <<'EOF'

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
EOF
```

- [ ] **Step 3: Проверить синтаксис и перезагрузить**

Run:
```bash
ssh flor-server 'sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy && sudo systemctl is-active caddy'
```
Expected: `Valid configuration`, `active`.

> Caddy попытается получить TLS для `flormajor-omsk.ru` apex — **не получится** (DNS ещё на Onreza), но для `staging.flormajor-omsk.ru` получит при первом запросе после Task 13. Это OK.

- [ ] **Step 4: Без Next.js на 3000 порту Caddy будет отдавать 502 на staging — это нормально**

Run: `curl -sI https://staging.flormajor-omsk.ru/ 2>&1 | head -3`
Expected: 502 Bad Gateway или connection error (Caddy ещё не получил сертификат). После Task 16 будет 200.

---

## Phase 3 — GitHub Secrets

### Task 15: ⚠️ Владелец добавляет 5 secrets в GitHub Settings

> **БЛОКЕР для Phase 4** (первый деплой). Можно делать параллельно.

- [ ] **Step 1: Владелец заходит в GitHub: репозиторий → Settings → Secrets and variables → Actions → New repository secret**

- [ ] **Step 2: Добавляет 5 secrets**

| Имя | Значение |
|---|---|
| `DEPLOY_SSH_KEY` | Содержимое файла `~/.ssh/id_flormajor_deploy` (приватная часть, многострочная). Получить: `cat ~/.ssh/id_flormajor_deploy` |
| `DEPLOY_HOST` | `77.232.129.172` |
| `DEPLOY_USER` | `deploy` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://db.flormajor-omsk.ru` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Получить: `grep ANON_KEY ~/.flormajor/secrets.env \| cut -d= -f2` |

- [ ] **Step 3: Подтвердить что все 5 видны в Settings → Secrets**

> `SUPABASE_SERVICE_ROLE_KEY` **не добавлять в GH Secrets** — он только в `/opt/flormajor/shared/.env` на VM (Task 11).

---

## Phase 4 — Первый деплой и smoke

### Task 16: Запустить первый деплой через workflow_dispatch

**Files:** GitHub Action

- [ ] **Step 1: Push ветки plan-d-app-on-vm и мердж в main**

Сначала закоммитить план + код-изменения и сделать PR в main:
```bash
git push -u origin plan-d-app-on-vm
gh pr create --base main --head plan-d-app-on-vm --title "feat: миграция приложения на Timeweb VM (план D, code+CI/CD)" --body "Реализация плана D из docs/superpowers/plans/2026-05-02-app-vm-migration.md. Добавляет standalone build, health endpoint, PM2 ecosystem, remote-deploy.sh, GitHub Action push-to-main."
```

- [ ] **Step 2: Owner ревью + мерж PR в main**

Это инициирует первый автоматический деплой через GH Action (`on: push: branches: [main]`).

- [ ] **Step 3: Наблюдать выполнение workflow**

Run:
```bash
gh run watch --exit-status 2>&1 | tail -30
```
Expected: статус `completed/success`. Если fail — смотреть логи через `gh run view --log`.

- [ ] **Step 4: Проверить, что PM2 видит процесс**

Run:
```bash
ssh flor-server 'sudo -u deploy pm2 status'
```
Expected: видим процесс `flormajor` в статусе `online`.

- [ ] **Step 5: Сохранить состояние PM2 чтобы он стартовал при ребуте**

Run:
```bash
ssh flor-server 'sudo -u deploy pm2 save'
```

---

### Task 17: Smoke-чек staging.flormajor-omsk.ru

- [ ] **Step 1: Главная страница**

```bash
curl -sI https://staging.flormajor-omsk.ru/ 2>&1 | head -5
```
Expected: 200 OK + HSTS-заголовок.

- [ ] **Step 2: Открыть в браузере, проверить визуально**

`https://staging.flormajor-omsk.ru/`

Чек-лист:
- [ ] Hero-секция, карусель товаров, секция категорий, features, контакты — рендерятся.
- [ ] Картинки идут через render URL (Network → размер ≤ 500 КБ, content-type webp).
- [ ] Никаких 500/404 в консоли браузера.

- [ ] **Step 3: Каталог и карточка товара**

```bash
curl -sI https://staging.flormajor-omsk.ru/catalog 2>&1 | head -3
curl -sI https://staging.flormajor-omsk.ru/catalog/buket-romashek 2>&1 | head -3
```
Expected: оба 200 OK.

- [ ] **Step 4: Health endpoint**

```bash
curl -s https://staging.flormajor-omsk.ru/api/health
```
Expected: `{"ok":true,"ts":...}`.

- [ ] **Step 5: Админка**

`https://staging.flormajor-omsk.ru/admin/login`. Войти как `owner@flormajor-omsk.ru` (пароль в `~/.flormajor/secrets.env`).

Чек-лист:
- [ ] Дашборд показывает 3 stat-карточки + виджет «Последние обновлённые товары».
- [ ] Раздел «Товары» — открыть товар, поправить, сохранить, проверить ревалидацию на публичной странице.
- [ ] Загрузить новое изображение через админку — должно быть webp.
- [ ] `https://staging.flormajor-omsk.ru/admin/leads` → 404, `/admin/thanks` → 404.

- [ ] **Step 6: Удалённые маршруты**

```bash
curl -sI https://staging.flormajor-omsk.ru/thanks 2>&1 | head -3
```
Expected: 404.

---

## Phase 5 — 24-часовое наблюдение

### Task 18: Мониторинг staging минимум 24 часа

> Не спешить с DNS swap. Дать стеку постоять под реальным холостым трафиком (поисковые боты, ручные клики).

- [ ] **Каждые ~6 часов проверять:**

Run:
```bash
ssh flor-server 'sudo -u deploy pm2 status && echo "---" && free -h | head -3 && echo "---" && cd /opt/supabase/docker && docker compose ps && echo "---" && tail -10 /opt/flormajor/shared/logs/error.log 2>/dev/null || echo "no errors"'
```

Чек-лист:
- [ ] PM2 `restarts` число не выросло — нет авторестартов из-за OOM/exception.
- [ ] `free -h` — used не вырос значительно (утечка).
- [ ] Supabase containers — все healthy.
- [ ] error.log — без новых трейсов.

- [ ] **Health check каждый час**

Run: `curl -s https://staging.flormajor-omsk.ru/api/health`
Expected: `{"ok":true,"ts":...}` всегда.

- [ ] **На 24-м часу решение:**
  - Если всё стабильно → переходить к Phase 6 (cutover).
  - Если есть проблемы → не делать DNS swap, разобраться сначала. Откат — в спеке § 9.

---

## Phase 6 — Pre-cutover

### Task 19: Снизить TTL DNS на apex до 60 секунд

> Делать **за 24 часа** до планируемого cutover, чтобы провайдеры успели подхватить новый TTL.

- [ ] **Step 1: Владелец на reg.ru:**
  - Открыть существующую A-запись apex `flormajor-omsk.ru` → Onreza IP.
  - Изменить TTL с (вероятно) `3600` на `60`.
  - Не менять value пока.
  - Сохранить.

- [ ] **Step 2: Подтвердить TTL**

Run (с любого ноута):
```bash
dig flormajor-omsk.ru +noall +answer
```
Expected: TTL в выводе должен начать падать к 60.

---

### Task 20: Backup env Onreza (на случай отката)

- [ ] **Step 1: Владелец заходит в Onreza UI → Settings → Environment Variables**

- [ ] **Step 2: Скопировать все значения в `~/.flormajor/onreza-env-backup-2026-05-02.env` локально**

> Если cutover придётся откатывать — нужно вернуть DNS на Onreza IP, а Onreza-приложение уже не будет коннектиться (env переключим на новый Supabase). Backup нужен чтобы вернуть env в Onreza обратно на Supabase Cloud.

> **Альтернативно:** если Onreza не позволяет менять env (build-минуты исчерпаны) — runtime-конфиг там уже зафиксирован, backup не нужен. Проверить.

---

## Phase 7 — Cutover (DNS swap apex)

### Task 21: ⚠️ Владелец меняет A-запись apex `flormajor-omsk.ru`

> **Точка невозврата** в течение 60 секунд (TTL). Откат — вернуть Onreza IP.

- [ ] **Step 1: Владелец на reg.ru:**
  - Открыть A-запись apex `flormajor-omsk.ru`.
  - Изменить value с Onreza IP на `77.232.129.172`.
  - TTL оставить `60`.
  - Сохранить.

- [ ] **Step 2: Параллельно — A-запись `www`** (если ещё не было)
  - `www` (A) → `77.232.129.172`. TTL `300`.

- [ ] **Step 3: Засечь время cutover.**

---

### Task 22: Проверить DNS-распространение

- [ ] **Step 1: Подождать 1-2 минуты**

- [ ] **Step 2: Проверить с разных DNS-серверов**

Run:
```bash
dig +short flormajor-omsk.ru
dig +short flormajor-omsk.ru @8.8.8.8
dig +short flormajor-omsk.ru @1.1.1.1
```
Expected: все три возвращают `77.232.129.172`. Если какой-то ещё показывает Onreza — подождать 1-2 минуты, повторить.

- [ ] **Step 3: На сервере проверить:**

Run:
```bash
ssh flor-server 'dig +short flormajor-omsk.ru'
```
Expected: `77.232.129.172`.

---

### Task 23: Smoke публичного сайта

- [ ] **Step 1: TLS-сертификат**

```bash
curl -sI https://flormajor-omsk.ru/ 2>&1 | head -5
```
Expected: 200 OK.

> Caddy получит сертификат для apex при первом запросе (через HTTP-01 challenge — DNS теперь правильный). На первый запрос может уйти 10-30 секунд.

- [ ] **Step 2: Полный smoke (как в Task 17 Steps 2-6, но на apex)**

`https://flormajor-omsk.ru/` — все секции главной, каталог, карточка, админка.

- [ ] **Step 3: www → 301**

```bash
curl -sI https://www.flormajor-omsk.ru/ 2>&1 | head -5
```
Expected:
```
HTTP/2 301
location: https://flormajor-omsk.ru/
```

- [ ] **Step 4: Health endpoint**

```bash
curl -s https://flormajor-omsk.ru/api/health
```
Expected: `{"ok":true,"ts":...}`.

---

### Task 24: Если smoke провален — откат

> Только если на Step 1-4 Task 23 что-то критично сломалось (502, неработает админка, картинки не грузятся).

- [ ] **Step 1: Владелец возвращает A-запись apex обратно на Onreza IP**

Через 60 секунд (TTL) сайт работает на старом стеке.

- [ ] **Step 2: Разобраться что сломалось** — `pm2 logs`, `caddy logs`, БД.

- [ ] **Step 3: После фикса — повторить Task 21 (DNS swap)**

---

## Phase 8 — Post-cutover мониторинг (7 дней)

### Task 25: Ежедневный мониторинг 7 дней

- [ ] **Каждый день первую неделю проверять:**

Run:
```bash
echo "=== PM2 ===" && ssh flor-server 'sudo -u deploy pm2 status'
echo "=== Memory ===" && ssh flor-server 'free -h | head -3'
echo "=== Supabase ===" && ssh flor-server 'cd /opt/supabase/docker && docker compose ps | head -10'
echo "=== Errors last 50 ===" && ssh flor-server 'tail -50 /opt/flormajor/shared/logs/error.log 2>/dev/null || echo none'
echo "=== Public health ===" && curl -s https://flormajor-omsk.ru/api/health
echo "=== Backups in S3 ===" && ssh flor-server 'rclone ls timeweb-s3:flor-backups | tail -5'
```

- [ ] **Записывать любые аномалии в memory (если что-то регулярно падает) — будущая сессия использует.**

---

## Phase 9 — Decommission Onreza

### Task 26: На 8-й день после cutover — удалить Onreza-проект

> Только если 7 дней мониторинга прошли без проблем.

- [ ] **Step 1: Владелец в Onreza UI:**
  - Settings → Pause project (на 1-2 дня — последний шанс отката).
  - Через 2 дня pause → Delete project.

- [ ] **Step 2: Удалить onreza.toml из репо** (необязательно, но чистит)

```bash
git checkout -b cleanup-onreza
git rm onreza.toml
git commit -m "chore: удалить onreza.toml после переезда на VM"
git push -u origin cleanup-onreza
gh pr create --base main --head cleanup-onreza --title "chore: удалить onreza.toml" --body "После плана D приложение деплоится на Timeweb VM через GitHub Action. Onreza больше не используется."
```

- [ ] **Step 3: Поднять TTL DNS apex обратно до `3600` (на reg.ru)**

> 60-секундный TTL даёт быстрый откат, но грузит DNS-провайдера запросами. После стабилизации можно поднять.

---

## Phase 10 — Финальный CHANGELOG

### Task 27: Обновить CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Добавить запись под `[2026-05-XX]` (фактический день cutover)**

В корне README или CHANGELOG (что у нас есть) — секция:

```markdown
### Серверная инфраструктура

- **Next.js приложение перенесено с Onreza на Timeweb VM.** Single-VM архитектура: PM2 (fork mode) + Caddy (reverse_proxy на apex/staging/www-redirect) + GitHub Actions (push-to-main → standalone build → SSH deploy → atomic symlink swap). Бесплатный лимит build-времени Onreza исчерпан, бюджет (1 182 ₽/мес) не позволяет переход на платный.
- DNS swap apex `flormajor-omsk.ru` с Onreza на `77.232.129.172`.
- Staging-subdomain `staging.flormajor-omsk.ru` оставлен как preview-канал.
- Onreza-проект удалён через 8 дней наблюдения.
- Implementation plan: `docs/superpowers/plans/2026-05-02-app-vm-migration.md`.
```

- [ ] **Step 2: Закоммитить + push (можно прямо в main, либо мини-PR)**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): план D завершён — приложение на Timeweb VM"
```

---

## Definition of Done (для всего плана D)

- [ ] `flormajor-omsk.ru` (apex) и `www.flormajor-omsk.ru` отдают контент с self-hosted Supabase + self-hosted Next.js.
- [ ] `staging.flormajor-omsk.ru` остаётся как preview-канал (та же конфигурация).
- [ ] Push в main триггерит GitHub Action, который: lint+typecheck+test+build → tar+scp → ssh deploy. Полный цикл занимает 5-10 минут.
- [ ] PM2 авторестарт работает: `sudo reboot` VM → через 1-2 минуты приложение снова доступно (PM2 startup + supabase docker compose autostart).
- [ ] `/api/health` отдаёт 200 на всех доменах.
- [ ] Бэкапы Supabase каждые 6 ч продолжают работать.
- [ ] Onreza-проект удалён, `onreza.toml` убран из репо.
- [ ] CHANGELOG обновлён.

---

## Что НЕ делается в этом плане

- **Мониторинг/алертинг** (Sentry, UptimeRobot, etc.) — отдельный трек после стабилизации.
- **CDN перед Caddy** (Cloudflare, etc.) — не нужно при сервере в Москве + аудитории в Омске.
- **Multi-VM HA** — преждевременно для текущего масштаба.
- **Self-hosted шрифты** (memory `followup_self_hosted_fonts.md`) — отдельный PR.
- **Оставшиеся 4 P0-бага AUDIT.md** (A1.1, A1.2, A3.1, A3.3) — отдельный PR.
- **Offsite-зеркало бэкапов** (Selectel S3) — следующий трек.
