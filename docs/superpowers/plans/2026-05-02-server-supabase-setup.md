# План A: серверная часть — self-hosted Supabase на Timeweb VM

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Поднять и захардененный self-hosted Supabase-стек на VM Timeweb MSK-50 (`77.232.129.172`), готовый принять миграции `0001..0028` и данные ФлорМажора в плане C. Стек урезан под 4 ГБ RAM (без realtime/functions/analytics/vector), Studio поднимается on-demand через SSH-туннель, Caddy обеспечивает авто-TLS на `db.flormajor-omsk.ru`, бэкапы каждые 6 ч в Timeweb Cloud Storage.

**Architecture:** Ubuntu 22.04 LTS → hardening (non-root `supa`, ufw, fail2ban, no-password-ssh, swap 2 ГБ) → Docker Compose с supabase/supabase репо → `docker-compose.override.yml` для memory limits / Postgres tuning / Studio profile / выключенных сервисов → Caddy reverse-proxy → cron-бэкапы в Timeweb S3 + локальный pull-скрипт на ноут владельца.

**Tech Stack:** Ubuntu 22.04 LTS, OpenSSH, ufw, fail2ban, unattended-upgrades, Docker + Compose v2, Postgres 15 (внутри supabase/postgres), Caddy v2, rclone, expect (одноразово для парольного логина), Timeweb Cloud Storage (S3-compat).

**Базовый spec:** [`../specs/2026-05-02-cheap-migration-design.md`](../specs/2026-05-02-cheap-migration-design.md), разделы 3.1–3.6 + § 4.

**Связанные документы:**
- [`docs/migration/cheap.md`](../../migration/cheap.md) — backbone-чек-лист.
- [`docs/migration/overview.md`](../../migration/overview.md) — общая логика Сценария B.

---

## Контекст для исполнителя (читать первым)

Эта ветка — **только серверные операции и локальные helper-скрипты**. Никаких правок кода приложения — это план B (уже смержен). Никакого переноса данных и cutover'а — это план C (отдельно).

**Что есть на старте:**
- VM Timeweb Cloud MSK-50 (2 vCPU / 4 ГБ / 50 ГБ NVMe), Ubuntu 22.04 LTS.
- IP, root-пароль, SSH-доступ по паролю — в `/tmp/tw_cr/creds.md` на локальной машине (НЕ в git!).
- Домен `flormajor-omsk.ru` зарегистрирован, DNS-провайдер доступен владельцу.

**Что НЕ есть и нужно владельцу самому сделать через web-UI:**
- DNS A-запись `db.flormajor-omsk.ru` → IP сервера (Phase 4).
- Регистрация Timeweb Cloud Storage и создание бакета `flor-backups` с access/secret ключами (Phase 7).

**Принципы:**
- Все генерируемые секреты (JWT, пароль Postgres, токены) — никогда не попадают в git. На сервере лежат в `/opt/supabase/docker/.env` (chmod 600), локально — в `~/.flormajor/secrets.env` (тоже 600, не в git).
- IP сервера (`77.232.129.172`) можно держать в helper-скриптах в `scripts/dev/` (это публичный IP, не секрет).
- Hardening применяется ДО установки Supabase. Никаких «потом затвердим» — иначе забудем.

---

## File Structure

**Создаётся в репо:**

| Файл | Назначение |
|---|---|
| `scripts/dev/flor-studio-up` | Запуск Studio на сервере + SSH-туннель на localhost:3000 |
| `scripts/dev/flor-studio-down` | Остановка Studio |
| `scripts/dev/flor-db-tunnel` | SSH-туннель Postgres на localhost:5432 (для миграций / psql / type generation) |
| `scripts/dev/flor-backup-pull` | Подтянуть свежие бэкапы из Timeweb S3 в `~/Backups/flormajor/` |
| `scripts/dev/README.md` | Описание helper-скриптов и зависимостей |

**Создаётся ВНЕ репо:**

| Путь | Назначение |
|---|---|
| `~/.ssh/id_flormajor`, `~/.ssh/id_flormajor.pub` | SSH-ключ для логина `supa@77.232.129.172` |
| `~/.ssh/config` (запись) | Алиас `flor-server` для удобства |
| `~/.flormajor/secrets.env` | Локальная копия паролей/токенов (chmod 600) |
| `~/Backups/flormajor/` | Локальная копия бэкапов БД и стораджа |

**Создаётся на сервере (`/opt/supabase/docker/`):**
- Клон `supabase/supabase` (git).
- `.env` — заполненный по spec § 3.8 (без SMTP).
- `docker-compose.override.yml` — наш override для memory limits, Studio profile, postgres tuning.
- Закомментированные `realtime`/`functions`/`analytics`/`vector` сервисы.

**Создаётся на сервере (`/opt/backup/`):**
- `backup.sh` — скрипт бэкапа.
- `work/` — staging-директория.

**На сервере глобально:**
- `/etc/caddy/Caddyfile` — reverse-proxy для `db.flormajor-omsk.ru`.
- `/etc/fail2ban/`, `/etc/ufw/` — стандартные настройки.
- `/swapfile`, `/etc/fstab`, `/etc/sysctl.conf` — swap.
- `/etc/cron.d/flor-backup` или crontab — расписание.

---

## Phase 0 — Локальная подготовка (SSH-доступ)

### Task 0.1: Сгенерировать SSH-ключ для FlorMajor сервера

**Files:**
- Create: `~/.ssh/id_flormajor`, `~/.ssh/id_flormajor.pub`

- [ ] **Step 1: Проверить, что ключ ещё не существует**

Run:
```bash
ls ~/.ssh/id_flormajor* 2>&1
```
Expected: `No such file or directory`. Если файлы уже есть — пропустить генерацию, просто использовать существующие.

- [ ] **Step 2: Сгенерировать новый ed25519-ключ без passphrase**

Run:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_flormajor -N "" -C "claude@flormajor-server-2026-05"
```
Expected: создаются два файла. Без интерактивного ввода (passphrase пустой через `-N ""`).

- [ ] **Step 3: Установить корректные права**

Run:
```bash
chmod 600 ~/.ssh/id_flormajor
chmod 644 ~/.ssh/id_flormajor.pub
```

- [ ] **Step 4: Показать публичную часть для проверки**

Run: `cat ~/.ssh/id_flormajor.pub`
Expected: одна строка вида `ssh-ed25519 AAAA... claude@flormajor-server-2026-05`.

---

### Task 0.2: Залить публичный ключ на сервер (одноразово, через парольный вход)

**Files:**
- Modify (на сервере): `/root/.ssh/authorized_keys`

- [ ] **Step 1: Прочитать креды из `/tmp/tw_cr/creds.md`**

Run:
```bash
cat /tmp/tw_cr/creds.md
```
Зафиксировать IP, user, pass в переменных окружения для сессии (НЕ выводить в логи / не сохранять в файлы):
```bash
export TW_IP=$(grep '^IP:' /tmp/tw_cr/creds.md | awk '{print $2}')
export TW_USER=$(grep '^ssh user:' /tmp/tw_cr/creds.md | awk '{print $3}')
export TW_PASS=$(grep '^ssh pass:' /tmp/tw_cr/creds.md | awk '{print $3}')
```

- [ ] **Step 2: Принять fingerprint сервера в known_hosts**

Run:
```bash
ssh-keyscan -H "$TW_IP" >> ~/.ssh/known_hosts 2>/dev/null
```
Expected: тихое добавление. Если уже есть — дубль не страшен.

- [ ] **Step 3: Залить публичный ключ через expect**

Run:
```bash
PUBKEY=$(cat ~/.ssh/id_flormajor.pub)
expect <<EOF
set timeout 30
spawn ssh -o StrictHostKeyChecking=accept-new $TW_USER@$TW_IP "mkdir -p ~/.ssh && echo '$PUBKEY' >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
expect {
  "password:" { send "$TW_PASS\r"; exp_continue }
  eof { }
}
EOF
```
Expected: завершение без ошибок. Если экран зависает на `password:` — проверить, что переменная передалась.

- [ ] **Step 4: Проверить логин по ключу**

Run:
```bash
ssh -i ~/.ssh/id_flormajor -o IdentitiesOnly=yes "$TW_USER@$TW_IP" 'whoami && hostname'
```
Expected:
```
root
<hostname сервера>
```

Если просит пароль — ключ не залил. Дебажить.

- [ ] **Step 5: Очистить пароль из переменных окружения**

Run:
```bash
unset TW_PASS
```
Дальше пароль больше нигде не используется.

---

### Task 0.3: Добавить алиас в `~/.ssh/config`

**Files:**
- Modify: `~/.ssh/config`

- [ ] **Step 1: Проверить, что алиаса ещё нет**

Run:
```bash
grep -A 1 "Host flor-server" ~/.ssh/config 2>/dev/null
```
Expected: пусто.

- [ ] **Step 2: Добавить блок (для root, до создания supa)**

Run:
```bash
cat >> ~/.ssh/config <<'EOF'

# FlorMajor self-hosted Supabase server (added 2026-05-02)
Host flor-server-root
  HostName 77.232.129.172
  User root
  IdentityFile ~/.ssh/id_flormajor
  IdentitiesOnly yes

Host flor-server
  HostName 77.232.129.172
  User supa
  IdentityFile ~/.ssh/id_flormajor
  IdentitiesOnly yes
EOF
```

- [ ] **Step 3: Проверить алиас (до создания supa работает только flor-server-root)**

Run:
```bash
ssh flor-server-root 'echo "ok"'
```
Expected: `ok`.

`flor-server` (для supa) пока не работает — supa создадим в Task 1.2.

---

## Phase 1 — Hardening (CHEAP § 3)

### Task 1.1: Обновить систему и поставить базовые пакеты

**Files:** read-only локально / system change на сервере

- [ ] **Step 1: Обновить пакеты**

Run:
```bash
ssh flor-server-root 'apt-get update && DEBIAN_FRONTEND=noninteractive apt-get upgrade -y'
```
Expected: успешный апдейт, без ошибок. Если ядро обновилось — может потребоваться reboot, **отложить на финал phase 1**.

- [ ] **Step 2: Установить базовые пакеты hardening + tooling**

Run:
```bash
ssh flor-server-root 'DEBIAN_FRONTEND=noninteractive apt-get install -y ufw fail2ban unattended-upgrades curl git ca-certificates gnupg lsb-release vim htop'
```
Expected: успешная установка.

- [ ] **Step 3: Проверить версии**

Run:
```bash
ssh flor-server-root 'lsb_release -d && ufw --version && fail2ban-client --version && git --version'
```
Expected: Ubuntu 22.04, ufw 0.36+, fail2ban 0.11+, git 2.34+.

---

### Task 1.2: Создать non-root пользователя `supa` и дать ему ключ

**Files:** server `/etc/passwd`, `/home/supa/`

- [ ] **Step 1: Создать пользователя**

Run:
```bash
ssh flor-server-root 'adduser --disabled-password --gecos "" supa && usermod -aG sudo supa'
```
Expected: пользователь создан, добавлен в sudo. Если уже существует — `adduser` скажет про это, идти дальше.

- [ ] **Step 2: Скопировать SSH-ключ из root в supa**

Run:
```bash
ssh flor-server-root 'mkdir -p /home/supa/.ssh && cp /root/.ssh/authorized_keys /home/supa/.ssh/authorized_keys && chown -R supa:supa /home/supa/.ssh && chmod 700 /home/supa/.ssh && chmod 600 /home/supa/.ssh/authorized_keys'
```

- [ ] **Step 3: Дать supa sudo без пароля (для скриптов автоматизации)**

Run:
```bash
ssh flor-server-root 'echo "supa ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/supa && chmod 440 /etc/sudoers.d/supa'
```

> **Безопасность:** sudo NOPASSWD выглядит небезопасно, но в нашей модели единственный способ зайти под supa — это SSH-ключ, доступ к которому ограничен. Если ключ украден — атакующий и так получает root через sudo. Без NOPASSWD автоматизированные скрипты ломаются на интерактивных запросах.

- [ ] **Step 4: Проверить логин под supa**

Run:
```bash
ssh flor-server 'whoami && sudo -n whoami'
```
Expected:
```
supa
root
```

---

### Task 1.3: Запретить root login и парольную аутентификацию

**Files:** server `/etc/ssh/sshd_config`

- [ ] **Step 1: Изменить настройки**

Run:
```bash
ssh flor-server "sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config && \
                 sudo sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && \
                 sudo sed -i 's/^#*ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config && \
                 sudo sed -i 's/^#*KbdInteractiveAuthentication.*/KbdInteractiveAuthentication no/' /etc/ssh/sshd_config"
```

- [ ] **Step 2: Проверить, что нет конфликтных drop-in конфигов с PasswordAuthentication yes**

Run:
```bash
ssh flor-server 'sudo grep -r "PasswordAuthentication" /etc/ssh/sshd_config.d/ 2>/dev/null'
```
Если есть `PasswordAuthentication yes` где-то в `sshd_config.d/*.conf` — поправить там тоже:
```bash
ssh flor-server 'sudo find /etc/ssh/sshd_config.d -name "*.conf" -exec sudo sed -i "s/^#*PasswordAuthentication.*/PasswordAuthentication no/" {} \;'
```

- [ ] **Step 3: Перезапустить sshd**

Run:
```bash
ssh flor-server 'sudo systemctl restart ssh'
```

- [ ] **Step 4: Проверить, что root login закрыт (должен fail)**

Run:
```bash
ssh -o BatchMode=yes -o IdentitiesOnly=yes flor-server-root 'echo ok' 2>&1 | head -3
```
Expected: успех (наш ключ всё ещё в `/root/.ssh/authorized_keys`, и `PermitRootLogin no` запрещает, но через ключ может пускать в зависимости от значения; точная семантика — без ключа нельзя, по ключу зависит от опции).

> **Если хочется параноить:** удалить ключ root: `ssh flor-server 'sudo truncate -s 0 /root/.ssh/authorized_keys'`. Но тогда восстановление через root станет сложнее. Оставляем `/root/.ssh/authorized_keys` как escape hatch.

- [ ] **Step 5: Подтвердить, что вход под supa по ключу всё ещё работает**

Run:
```bash
ssh flor-server 'whoami'
```
Expected: `supa`.

---

### Task 1.4: Настроить ufw

**Files:** server `/etc/ufw/`

- [ ] **Step 1: Базовые правила**

Run:
```bash
ssh flor-server 'sudo ufw default deny incoming && sudo ufw default allow outgoing && sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp'
```

- [ ] **Step 2: Включить ufw**

Run:
```bash
ssh flor-server 'echo y | sudo ufw enable'
```

- [ ] **Step 3: Проверить статус**

Run:
```bash
ssh flor-server 'sudo ufw status verbose'
```
Expected:
```
Status: active
Default: deny (incoming), allow (outgoing), disabled (routed)
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
22/tcp (v6)                ALLOW IN    Anywhere (v6)
80/tcp (v6)                ALLOW IN    Anywhere (v6)
443/tcp (v6)               ALLOW IN    Anywhere (v6)
```

---

### Task 1.5: Включить fail2ban

**Files:** server systemd

- [ ] **Step 1: Включить и стартануть**

Run:
```bash
ssh flor-server 'sudo systemctl enable --now fail2ban'
```

- [ ] **Step 2: Проверить, что sshd jail активен**

Run:
```bash
ssh flor-server 'sudo fail2ban-client status sshd'
```
Expected: вывод вида:
```
Status for the jail: sshd
|- Filter
|  |- Currently failed: 0
|  ...
```

Если `sshd` jail не существует — убедиться, что в `/etc/fail2ban/jail.d/` или `jail.local` есть `[sshd] enabled = true`. По умолчанию в Ubuntu 22.04 sshd jail включён.

---

### Task 1.6: Настроить unattended-upgrades

**Files:** server `/etc/apt/apt.conf.d/`

- [ ] **Step 1: Включить через dpkg-reconfigure**

Run:
```bash
ssh flor-server 'echo unattended-upgrades unattended-upgrades/enable_auto_updates boolean true | sudo debconf-set-selections && sudo dpkg-reconfigure -fnoninteractive unattended-upgrades'
```

- [ ] **Step 2: Проверить активность**

Run:
```bash
ssh flor-server 'sudo systemctl status unattended-upgrades.service | head -10'
```
Expected: `active (running)` или `active (exited)` (нормально для one-shot службы).

- [ ] **Step 3: Включить автоматическую перезагрузку при необходимости (для kernel updates)**

Run:
```bash
ssh flor-server 'sudo tee /etc/apt/apt.conf.d/51unattended-upgrades-reboot > /dev/null <<EOF
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:30";
EOF'
```
04:30 МСК — самое тихое время для перезагрузки (после ночного бэкапа в 04:00).

---

### Task 1.7: Создать swap-файл 2 ГБ

**Files:** server `/swapfile`, `/etc/fstab`, `/etc/sysctl.conf`

- [ ] **Step 1: Проверить, что swap ещё нет**

Run:
```bash
ssh flor-server 'sudo swapon --show'
```
Expected: пусто. Если swap уже есть — возможно от провайдера, проверить размер. Если ≥ 1 ГБ — пропустить, иначе пересоздать.

- [ ] **Step 2: Создать swap-файл**

Run:
```bash
ssh flor-server 'sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile'
```

- [ ] **Step 3: Сделать постоянным через fstab**

Run:
```bash
ssh flor-server 'echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab'
```

- [ ] **Step 4: Снизить swappiness (агрессивность использования swap)**

Run:
```bash
ssh flor-server 'echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf && sudo sysctl -p'
```

- [ ] **Step 5: Проверить**

Run:
```bash
ssh flor-server 'free -h && cat /proc/sys/vm/swappiness'
```
Expected: видим `Swap: 2.0Gi`, swappiness `10`.

---

### Task 1.8: Перезагрузить (если apt upgrade требовал)

- [ ] **Step 1: Проверить нужду в reboot**

Run:
```bash
ssh flor-server 'ls /var/run/reboot-required 2>/dev/null && echo "REBOOT NEEDED" || echo "no reboot needed"'
```

- [ ] **Step 2: Если REBOOT NEEDED — перезагрузить**

Run:
```bash
ssh flor-server 'sudo reboot'
```
Подождать 30-60 секунд, потом:
```bash
ssh -o ConnectTimeout=10 flor-server 'uptime'
```
Если соединение сразу — повторить через 30 секунд. После успеха продолжать.

---

## Phase 2 — Docker

### Task 2.1: Установить Docker через get.docker.com

**Files:** server systemd, `/etc/docker/`

- [ ] **Step 1: Скачать и запустить установочный скрипт**

Run:
```bash
ssh flor-server 'curl -fsSL https://get.docker.com -o /tmp/get-docker.sh && sudo sh /tmp/get-docker.sh'
```
Expected: `# Docker version XX.XX.X, build XXXXX`.

- [ ] **Step 2: Добавить supa в группу docker**

Run:
```bash
ssh flor-server 'sudo usermod -aG docker supa'
```

- [ ] **Step 3: Перелогиниться, чтобы группа применилась**

```bash
# SSH-сессии перезапускаются — следующий ssh flor-server возьмёт новую группу
ssh flor-server 'docker ps' 2>&1 | head -5
```
Expected: либо пустой список контейнеров (если группа взялась), либо ошибка `permission denied` (тогда выйти и зайти снова, либо использовать `sg docker -c 'docker ps'`).

- [ ] **Step 4: Проверить compose v2**

Run:
```bash
ssh flor-server 'docker compose version'
```
Expected: `Docker Compose version v2.X.X`.

- [ ] **Step 5: Проверить автозапуск Docker**

Run:
```bash
ssh flor-server 'sudo systemctl is-enabled docker'
```
Expected: `enabled`.

---

## Phase 3 — Подготовка Supabase (CHEAP § 5, spec § 3.1)

### Task 3.1: Клонировать supabase docker-репо

**Files:** server `/opt/supabase/`

- [ ] **Step 1: Создать директорию и клонировать**

Run:
```bash
ssh flor-server 'sudo mkdir -p /opt && sudo chown supa:supa /opt && cd /opt && git clone --depth 1 https://github.com/supabase/supabase.git'
```
Expected: ~50 МБ репо склонирован.

- [ ] **Step 2: Перейти в docker-каталог и скопировать .env.example в .env**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && cp .env.example .env'
```

---

### Task 3.2: Сгенерировать секреты

**Files:**
- Local: `~/.flormajor/secrets.env`
- Remote: `/opt/supabase/docker/.env`

- [ ] **Step 1: Создать локальную папку для секретов**

Run:
```bash
mkdir -p ~/.flormajor && chmod 700 ~/.flormajor
```

- [ ] **Step 2: Сгенерировать значения**

Run:
```bash
JWT_SECRET=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-64)
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-24)
DASHBOARD_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-20)

cat > ~/.flormajor/secrets.env <<EOF
# FlorMajor self-hosted Supabase secrets — created 2026-05-02
# DO NOT COMMIT to git. chmod 600.
JWT_SECRET=${JWT_SECRET}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}
EOF
chmod 600 ~/.flormajor/secrets.env
```

- [ ] **Step 3: Сгенерировать ANON_KEY и SERVICE_ROLE_KEY (JWT, подписанные JWT_SECRET)**

Можно использовать утилиту supabase или рукописный скрипт. Проще через npx:
```bash
source ~/.flormajor/secrets.env

# ANON_KEY: payload {role: "anon", iss: "supabase", iat: <now>, exp: <now+10y>}
# SERVICE_ROLE_KEY: payload {role: "service_role", iss: "supabase", iat: <now>, exp: <now+10y>}

# Используем mise exec node для запуска скрипта
mise exec -- node -e '
const crypto = require("crypto");
const secret = process.env.JWT_SECRET;
const now = Math.floor(Date.now() / 1000);
const exp = now + 60 * 60 * 24 * 365 * 10; // 10 лет

function sign(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const data = `${enc(header)}.${enc(payload)}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

const anon = sign({ role: "anon", iss: "supabase", iat: now, exp });
const service = sign({ role: "service_role", iss: "supabase", iat: now, exp });
console.log("ANON_KEY=" + anon);
console.log("SERVICE_ROLE_KEY=" + service);
' >> ~/.flormajor/secrets.env
```

- [ ] **Step 4: Проверить файл секретов**

Run:
```bash
cat ~/.flormajor/secrets.env
```
Expected: 5 переменных: JWT_SECRET, POSTGRES_PASSWORD, DASHBOARD_PASSWORD, ANON_KEY, SERVICE_ROLE_KEY.

---

### Task 3.3: Заполнить `.env` на сервере под Сценарий B

**Files:** server `/opt/supabase/docker/.env`

- [ ] **Step 1: Залить полный .env через ssh-heredoc**

Run:
```bash
source ~/.flormajor/secrets.env

ssh flor-server "cat > /opt/supabase/docker/.env" <<EOF
############
# Postgres
############
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=postgres
POSTGRES_PORT=5432
POSTGRES_HOST=db

############
# JWT
############
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
JWT_EXPIRY=3600

############
# Site
############
SITE_URL=https://flormajor-omsk.ru
ADDITIONAL_REDIRECT_URLS=
DISABLE_SIGNUP=true
API_EXTERNAL_URL=https://db.flormajor-omsk.ru
SUPABASE_PUBLIC_URL=https://db.flormajor-omsk.ru

############
# Studio
############
STUDIO_DEFAULT_ORGANIZATION=FlorMajor
STUDIO_DEFAULT_PROJECT=FlorMajor
STUDIO_PORT=3000

############
# Auth — без SMTP (см. spec § 3.8)
############
ENABLE_EMAIL_SIGNUP=false
ENABLE_EMAIL_AUTOCONFIRM=true
ENABLE_PHONE_SIGNUP=false
ENABLE_ANONYMOUS_USERS=false
SMTP_ADMIN_EMAIL=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_SENDER_NAME=

############
# Storage — file backend (медиа на 50 ГБ NVMe; см. spec решение #3)
############
STORAGE_BACKEND=file
FILE_SIZE_LIMIT=52428800

############
# Dashboard auth (basic auth для Studio — даже хотя Studio не наружу)
############
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}

############
# API gateway (Kong)
############
KONG_HTTP_PORT=8000
KONG_HTTPS_PORT=8443

############
# Pooler (Supavisor) — оставляем дефолты, не используем
############
POOLER_PROXY_PORT_TRANSACTION=6543
POOLER_DEFAULT_POOL_SIZE=20
POOLER_MAX_CLIENT_CONN=100
POOLER_TENANT_ID=flormajor

############
# Imgproxy (для будущей компрессии)
############
IMGPROXY_ENABLE_WEBP_DETECTION=true

############
# Logflare/analytics — выключено (см. spec § 3.1)
############
LOGFLARE_PUBLIC_ACCESS_TOKEN=
LOGFLARE_PRIVATE_ACCESS_TOKEN=
EOF
```

- [ ] **Step 2: Установить chmod 600**

Run:
```bash
ssh flor-server 'chmod 600 /opt/supabase/docker/.env'
```

- [ ] **Step 3: Проверить, что секреты на месте**

Run:
```bash
ssh flor-server 'grep -E "^(POSTGRES_PASSWORD|JWT_SECRET|ANON_KEY|SERVICE_ROLE_KEY|DASHBOARD_PASSWORD)=" /opt/supabase/docker/.env | sed "s/=.*/=***/"'
```
Expected: 5 строк, все со значениями (замаскированы как `***`).

---

### Task 3.4: Создать `docker-compose.override.yml`

**Files:** server `/opt/supabase/docker/docker-compose.override.yml`

- [ ] **Step 1: Создать файл с memory limits, profile manual для Studio, postgres tuning**

Run:
```bash
ssh flor-server "cat > /opt/supabase/docker/docker-compose.override.yml" <<'EOF'
# FlorMajor override — shrink под 4 ГБ RAM (см. spec § 3.1).
# Memory limits защищают от OOM, Studio выключен по умолчанию (поднимается on-demand),
# Postgres tunнинг — под 4 ГБ.

services:
  db:
    command:
      - postgres
      - -c
      - shared_buffers=512MB
      - -c
      - effective_cache_size=1500MB
      - -c
      - work_mem=8MB
      - -c
      - maintenance_work_mem=128MB
      - -c
      - max_connections=50
      - -c
      - wal_buffers=16MB
      - -c
      - random_page_cost=1.1
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
    profiles: ["manual"]
    deploy:
      resources:
        limits:
          memory: 384M
EOF
```

- [ ] **Step 2: Проверить синтаксис YAML**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && docker compose config 2>&1 | head -30'
```
Expected: валидный YAML-вывод (не ошибка). Ошибки про missing services — это нормально для override (они слетят с основного compose).

---

### Task 3.5: Закомментировать выключенные сервисы в основном `docker-compose.yml`

**Files:** server `/opt/supabase/docker/docker-compose.yml`

> **Подход:** Вместо `profiles: ["disabled"]` (требует явного включения) — комментирование. Так компоненты не запускаются и не висят в памяти Docker Engine.

- [ ] **Step 1: Сделать backup оригинального файла**

Run:
```bash
ssh flor-server 'cp /opt/supabase/docker/docker-compose.yml /opt/supabase/docker/docker-compose.yml.bak'
```

- [ ] **Step 2: Найти точные имена сервисов (могут отличаться между версиями supabase)**

Run:
```bash
ssh flor-server 'grep -E "^  [a-z-]+:" /opt/supabase/docker/docker-compose.yml | head -20'
```
Expected: список сервисов вида `db:`, `kong:`, `auth:`, `rest:`, `realtime:`, `storage:`, `meta:`, `studio:`, `imgproxy:`, `analytics:`, `vector:`, `functions:`, `supavisor:`.

- [ ] **Step 3: Добавить `profiles: ["disabled"]` через override (вместо комментирования)**

Это безопаснее, чем редактирование основного файла — обновление supabase репо не сломает наш override.

Расширить `docker-compose.override.yml` (создан в Task 3.4):

```bash
ssh flor-server "cat >> /opt/supabase/docker/docker-compose.override.yml" <<'EOF'

  # Выключенные сервисы — не запускаются по умолчанию (см. spec § 3.1).
  realtime:
    profiles: ["disabled"]

  functions:
    profiles: ["disabled"]

  analytics:
    profiles: ["disabled"]

  vector:
    profiles: ["disabled"]

  supavisor:
    profiles: ["disabled"]
EOF
```

> Если в текущей версии supabase нет какого-то из этих сервисов (`functions`, `vector`, `supavisor`), Docker Compose проигнорирует override для несуществующих сервисов с warning. Это безопасно.

- [ ] **Step 4: Проверить, что override valid**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && docker compose config --services 2>&1 | head -20'
```
Expected: список активных сервисов БЕЗ `realtime`, `functions`, `analytics`, `vector`, `supavisor`, `studio` (последний из-за `profiles: manual`).

Должны остаться: `db`, `kong`, `auth`, `rest`, `storage`, `meta`, `imgproxy`.

---

## Phase 4 — DNS + Caddy (CHEAP § 6-7, spec § 3.2-3.3)

### Task 4.1: ⚠️ Владелец создаёт DNS A-запись

**Files:** DNS-провайдер `flormajor-omsk.ru`

> **БЛОКЕР для Phase 4-5.** Без DNS Caddy не сможет получить TLS-сертификат. Если запись уже создана — пропустить.

- [ ] **Step 1: Владелец заходит в DNS-панель регистратора домена `flormajor-omsk.ru`**

- [ ] **Step 2: Создаёт A-запись:**
  - Subdomain: `db`
  - Type: `A`
  - Value: `77.232.129.172`
  - TTL: `300` (5 минут — на случай если придётся менять)

- [ ] **Step 3: Подтвердить распространение (обычно 5–30 минут)**

Run локально:
```bash
dig +short db.flormajor-omsk.ru
```
Expected: `77.232.129.172`. Если пусто — подождать 5 минут, повторить. Если через 30 минут пусто — проверить DNS-панель.

- [ ] **Step 4: Проверить с сервера**

Run:
```bash
ssh flor-server 'dig +short db.flormajor-omsk.ru'
```
Expected: `77.232.129.172`.

---

### Task 4.2: Установить Caddy

**Files:** server `/etc/caddy/`, systemd

- [ ] **Step 1: Добавить репо Caddy и установить**

Run:
```bash
ssh flor-server 'curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/gpg.key" | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg && \
                 curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt" | sudo tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null && \
                 sudo apt-get update && \
                 sudo apt-get install -y caddy'
```
Expected: `caddy version 2.X.X`.

- [ ] **Step 2: Проверить, что Caddy запущен и enabled**

Run:
```bash
ssh flor-server 'sudo systemctl is-active caddy && sudo systemctl is-enabled caddy'
```
Expected: `active enabled`.

---

### Task 4.3: Создать Caddyfile

**Files:** server `/etc/caddy/Caddyfile`

- [ ] **Step 1: Заменить дефолтный Caddyfile**

Run:
```bash
ssh flor-server "sudo tee /etc/caddy/Caddyfile > /dev/null" <<'EOF'
db.flormajor-omsk.ru {
    reverse_proxy localhost:8000
    encode gzip

    # Защитные заголовки
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        # Удаляем server-инфо
        -Server
    }

    # Логирование 4xx/5xx (по умолчанию Caddy логирует всё, ограничиваем для retention)
    log {
        output file /var/log/caddy/db.log {
            roll_size 10mb
            roll_keep 5
            roll_keep_for 168h
        }
        format json
    }
}
EOF
```

- [ ] **Step 2: Создать директорию для логов**

Run:
```bash
ssh flor-server 'sudo mkdir -p /var/log/caddy && sudo chown caddy:caddy /var/log/caddy'
```

- [ ] **Step 3: Перезагрузить Caddy**

Run:
```bash
ssh flor-server 'sudo systemctl reload caddy'
```

- [ ] **Step 4: Проверить статус**

Run:
```bash
ssh flor-server 'sudo systemctl status caddy --no-pager | head -10'
```
Expected: `active (running)`. Если есть ошибки — `sudo journalctl -u caddy -n 50`.

> Caddy ещё не получит сертификат — Supabase не запущен, проксировать некуда. Сертификат появится при первом HTTPS-запросе после запуска Supabase в Phase 5.

---

## Phase 5 — Запуск Supabase (CHEAP § 5.3)

### Task 5.1: Скачать образы

**Files:** server Docker images

- [ ] **Step 1: Pull всех нужных образов**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && docker compose pull'
```
Expected: ~5–10 минут на скачивание (~2 ГБ).

- [ ] **Step 2: Проверить, что образы есть**

Run:
```bash
ssh flor-server 'docker images | head -20'
```
Expected: список образов supabase/* (postgres, gotrue, postgrest, storage-api, kong, etc.).

---

### Task 5.2: Поднять стек

- [ ] **Step 1: docker compose up -d (без Studio благодаря profile)**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && docker compose up -d'
```
Expected: запуск контейнеров без ошибок. Studio пропускается из-за `profiles: manual`.

- [ ] **Step 2: Подождать 60 секунд для healthcheck'ов**

Run: `sleep 60`

- [ ] **Step 3: Проверить статус всех контейнеров**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && docker compose ps'
```
Expected: все активные сервисы в статусе `running` или `Up X seconds (healthy)`. Если что-то рестартится — посмотреть логи.

- [ ] **Step 4: Проверить логи на ошибки**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && docker compose logs --tail 30 2>&1 | grep -iE "error|fatal" | head -20'
```
Expected: пусто или несущественные warnings (типа SMTP not configured — это ожидаемо).

> Известные warnings которые игнорируем:
> - `auth: SMTP not configured` — мы и не настраивали (см. spec § 3.8).
> - Что-либо про realtime/analytics/vector — они выключены.

- [ ] **Step 5: Проверить Postgres напрямую через docker exec**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && docker compose exec -T db psql -U postgres -c "select version();"'
```
Expected: вывод вида `PostgreSQL 15.X on x86_64-pc-linux-gnu...`.

---

### Task 5.3: Проверить TLS через Caddy

- [ ] **Step 1: Получить сертификат**

Run локально:
```bash
curl -sI https://db.flormajor-omsk.ru/health
```
Expected: HTTP/2 200 OK или HTTP/2 401 (Kong возвращает 401 для незаавторизованных запросов — это норма, главное что TLS отдаёт сертификат).

Если timeout / connection refused — ufw блокирует 443, или Caddy не запустился. Дебажить.

- [ ] **Step 2: Проверить сертификат Let's Encrypt**

Run:
```bash
echo | openssl s_client -servername db.flormajor-omsk.ru -connect db.flormajor-omsk.ru:443 2>/dev/null | openssl x509 -noout -issuer -dates
```
Expected:
```
issuer=C = US, O = Let's Encrypt, CN = R3 (или E1)
notBefore=...
notAfter=...
```

- [ ] **Step 3: Проверить REST endpoint Supabase**

Run:
```bash
source ~/.flormajor/secrets.env
curl -s "https://db.flormajor-omsk.ru/rest/v1/" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" | head -20
```
Expected: JSON с `swagger`/`openapi` или `{}`. Не 401 — это значит Kong принимает наш ANON_KEY.

---

## Phase 6 — Helper-скрипты (миграции перенесены в план C)

> **Изменение к исходному плану (2026-05-02 при выполнении):** миграции `supabase/migrations/0001..0028` **не применяются** к новой БД в плане A. Причина: они предполагают существующую таблицу `public.products`, которая в Supabase Cloud была создана через UI/начальный state и не покрыта миграциями в репо. На пустой новой БД `0005`, `0011`, `0015`, `0016`, `0018` падают (отсутствует `products`).
>
> **Перенос:** в плане C перед применением `0001..0028` сделать `pg_dump --schema-only --schema=public` со старой Supabase Cloud → накатить на новую БД → потом наши миграции (или вообще `pg_restore --schema-only`, миграции уже в схеме). Это проще, чем восстанавливать DDL вручную.
>
> В плане A Phase 6 ограничена созданием helper-скриптов в репо.

### Task 6.1: Создать helper-скрипты для Studio и DB-туннеля

**Files:**
- Create: `scripts/dev/flor-studio-up`, `scripts/dev/flor-studio-down`, `scripts/dev/flor-db-tunnel`, `scripts/dev/README.md`

- [ ] **Step 1: Создать директорию**

Run:
```bash
mkdir -p scripts/dev
```

- [ ] **Step 2: Создать `scripts/dev/flor-studio-up`**

```bash
cat > scripts/dev/flor-studio-up <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

HOST="flor-server"

echo "🟢 Запуск Studio на сервере..."
ssh "$HOST" 'cd /opt/supabase/docker && docker compose --profile manual up -d studio'

echo "🟢 Studio поднят. Открываю SSH-туннель на http://localhost:3000"
echo "   Логин: admin / см. ~/.flormajor/secrets.env (DASHBOARD_PASSWORD)"
echo "   Ctrl+C — закрыть туннель (Studio продолжит работу; флор-studio-down чтобы остановить)."

exec ssh -N -L 3000:localhost:3000 "$HOST"
EOF
chmod +x scripts/dev/flor-studio-up
```

- [ ] **Step 3: Создать `scripts/dev/flor-studio-down`**

```bash
cat > scripts/dev/flor-studio-down <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

HOST="flor-server"

ssh "$HOST" 'cd /opt/supabase/docker && docker compose stop studio'
echo "🔴 Studio остановлен."
EOF
chmod +x scripts/dev/flor-studio-down
```

- [ ] **Step 4: Создать `scripts/dev/flor-db-tunnel`**

```bash
cat > scripts/dev/flor-db-tunnel <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

HOST="flor-server"

echo "🟢 SSH-туннель Postgres на localhost:5432 (Ctrl+C — закрыть)"
echo "   Использовать: PGPASSWORD=\$POSTGRES_PASSWORD psql -h localhost -U postgres"
echo "   POSTGRES_PASSWORD см. в ~/.flormajor/secrets.env"

exec ssh -N -L 5432:localhost:5432 "$HOST"
EOF
chmod +x scripts/dev/flor-db-tunnel
```

- [ ] **Step 5: Создать `scripts/dev/README.md`**

```bash
cat > scripts/dev/README.md <<'EOF'
# Dev-скрипты для self-hosted Supabase

Скрипты предполагают:
- SSH-алиас `flor-server` в `~/.ssh/config` (см. план A, Task 0.3).
- Переменные окружения в `~/.flormajor/secrets.env` (см. план A, Task 3.2).

## Скрипты

- **`flor-studio-up`** — поднимает Studio на сервере и открывает SSH-туннель на `http://localhost:3000`. Studio выключается отдельной командой.
- **`flor-studio-down`** — останавливает Studio на сервере (экономит ~300 МБ RAM в простое).
- **`flor-db-tunnel`** — открывает SSH-туннель Postgres на `localhost:5432` для миграций, `psql`, `supabase gen types`.
- **`flor-backup-pull`** — стягивает свежие бэкапы из Timeweb S3 в `~/Backups/flormajor/` (offsite-копия, см. spec § 3.6).

## Зачем Studio on-demand

VM Timeweb MSK-50 имеет всего 4 ГБ RAM. Studio в простое съедает ~200–400 МБ — это 5–10% всей памяти. Постоянно держать его не нужно: товары меняются раз в неделю-месяц.

См. [`docs/superpowers/specs/2026-05-02-cheap-migration-design.md`](../../docs/superpowers/specs/2026-05-02-cheap-migration-design.md) § 4.
EOF
```

- [ ] **Step 6: Закоммитить скрипты**

```bash
git add scripts/dev/
git commit -m "feat(scripts): dev helper-скрипты для self-hosted Supabase

flor-studio-up / flor-studio-down — Studio on-demand через SSH-туннель.
flor-db-tunnel — Postgres-туннель для миграций и psql.
README с описанием зависимостей."
```

---

### Task 6.2: Залить миграции на сервер и применить

**Files:** server `/tmp/migrations/`

> **Подход:** scp всех миграций на сервер, затем `docker compose exec db psql -f` в каждой. Это проще, чем настраивать туннель и `psql` локально для одноразовой операции (туннель есть в `flor-db-tunnel` для будущих нужд, но один раз можно через docker exec).

- [ ] **Step 1: Скопировать миграции на сервер**

Run:
```bash
scp -i ~/.ssh/id_flormajor -r supabase/migrations supa@77.232.129.172:/tmp/
```
Или через алиас:
```bash
scp -r supabase/migrations flor-server:/tmp/
```
Expected: 28 файлов скопированы.

- [ ] **Step 2: Скопировать в контейнер db и применить по порядку**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && for f in /tmp/migrations/*.sql; do
  name=$(basename "$f")
  echo "=== Applying $name ==="
  docker compose exec -T db psql -U postgres -d postgres -f - < "$f" || { echo "FAIL: $name"; break; }
done'
```
Expected: 28 миграций применены без ошибок. Каждая выводит `CREATE TABLE`/`ALTER TABLE`/etc.

> Если на 0014 ругается про `supabase_realtime` (publication уже существует с этой таблицей) — нормально, это идемпотентность нашего 0027.

- [ ] **Step 3: Проверить, что таблицы созданы**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && docker compose exec -T db psql -U postgres -d postgres -c "\dt public.*"'
```
Expected: список таблиц без `leads`, без `rate_limits`, без `thanks_page_settings` (эти удалены в 0027/0028, на новой БД они и не создавались — миграции применились в правильном порядке).

Должны быть: `admin_users`, `audit_log`, `categories`, `contact_info`, `features`, `footer_config`, `hero_settings`, `landing_section_styles`, `nav_items`, `product_images`, `product_page_settings`, `products`, `site_settings`, `social_links`, `theme_settings`, `typography_settings`, `catalog_page_settings`.

- [ ] **Step 4: Удалить миграции с сервера (cleanup)**

Run:
```bash
ssh flor-server 'rm -rf /tmp/migrations'
```

---

## Phase 7 — Бэкапы (CHEAP § 11, spec § 3.6)

### Task 7.1: ⚠️ Владелец создаёт Timeweb Cloud Storage бакет

> **БЛОКЕР для Phase 7.** Если бакет уже создан — пропустить.

- [ ] **Step 1: Владелец заходит в кабинет Timeweb Cloud → Cloud Storage**

- [ ] **Step 2: Создаёт бакет:**
  - Имя: `flor-backups`
  - Регион: тот же что и VM (MSK)
  - Доступ: приватный

- [ ] **Step 3: Создаёт сервисного пользователя с правами на этот бакет, получает:**
  - `access_key`
  - `secret_key`
  - `endpoint URL` (например `https://s3.timeweb.cloud`)

- [ ] **Step 4: Передаёт креды Claude через `/tmp/tw_cr/s3.md` на локальной машине**

Формат:
```
S3_ENDPOINT: https://s3.timeweb.cloud
S3_ACCESS_KEY: ...
S3_SECRET_KEY: ...
S3_BUCKET: flor-backups
```

---

### Task 7.2: Установить rclone на сервере + настроить remote

**Files:** server `~/.config/rclone/rclone.conf` (под supa)

- [ ] **Step 1: Установить rclone**

Run:
```bash
ssh flor-server 'sudo apt-get install -y rclone'
```

- [ ] **Step 2: Прочитать креды Timeweb S3 локально**

Run:
```bash
cat /tmp/tw_cr/s3.md
```

- [ ] **Step 3: Настроить rclone remote через файл (не интерактивно)**

```bash
S3_ENDPOINT=$(grep '^S3_ENDPOINT:' /tmp/tw_cr/s3.md | awk '{print $2}')
S3_ACCESS_KEY=$(grep '^S3_ACCESS_KEY:' /tmp/tw_cr/s3.md | awk '{print $2}')
S3_SECRET_KEY=$(grep '^S3_SECRET_KEY:' /tmp/tw_cr/s3.md | awk '{print $2}')

ssh flor-server "mkdir -p ~/.config/rclone && cat > ~/.config/rclone/rclone.conf" <<EOF
[timeweb-s3]
type = s3
provider = Other
access_key_id = ${S3_ACCESS_KEY}
secret_access_key = ${S3_SECRET_KEY}
endpoint = ${S3_ENDPOINT}
acl = private
EOF

ssh flor-server 'chmod 600 ~/.config/rclone/rclone.conf'
```

- [ ] **Step 4: Проверить, что rclone видит бакет**

Run:
```bash
ssh flor-server 'rclone lsd timeweb-s3:'
```
Expected: список бакетов, среди которых `flor-backups`.

---

### Task 7.3: Создать `/opt/backup/backup.sh`

**Files:** server `/opt/backup/backup.sh`

- [ ] **Step 1: Создать директорию**

Run:
```bash
ssh flor-server 'sudo mkdir -p /opt/backup && sudo chown supa:supa /opt/backup'
```

- [ ] **Step 2: Создать скрипт**

Run:
```bash
ssh flor-server "cat > /opt/backup/backup.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

DATE=$(date -u +%Y%m%d-%H%M%S)
BACKUP_DIR=/opt/backup/work
mkdir -p "$BACKUP_DIR"

# 1. Postgres dump (через docker exec, без буферизации в памяти контейнера)
docker compose -f /opt/supabase/docker/docker-compose.yml exec -T db \
  pg_dump -U postgres -Fc postgres > "$BACKUP_DIR/db-$DATE.dump"

# 2. Storage (file backend) — tarball
tar -czf "$BACKUP_DIR/storage-$DATE.tar.gz" \
  -C /opt/supabase/docker/volumes/storage .

# 3. Залить в Timeweb S3 через rclone
rclone copy "$BACKUP_DIR" timeweb-s3:flor-backups/ --progress

# 4. Ротация: удалить файлы в S3 старше 14 дней
rclone delete --min-age 14d timeweb-s3:flor-backups/

# 5. Очистить локальные файлы старше суток
find "$BACKUP_DIR" -mtime +1 -delete

echo "[$(date -u)] Backup successful"
EOF

ssh flor-server 'chmod +x /opt/backup/backup.sh'
```

- [ ] **Step 3: Прогнать вручную для проверки**

Run:
```bash
ssh flor-server '/opt/backup/backup.sh 2>&1 | tail -20'
```
Expected: видим `Transferred:` строки от rclone, в конце `Backup successful`.

- [ ] **Step 4: Проверить, что файлы появились в S3**

Run:
```bash
ssh flor-server 'rclone ls timeweb-s3:flor-backups/'
```
Expected: видим `db-YYYYMMDD-HHMMSS.dump` и `storage-YYYYMMDD-HHMMSS.tar.gz`.

---

### Task 7.4: Cron каждые 6 часов + лог

**Files:** server `/etc/cron.d/flor-backup`, `/var/log/flor-backup.log`

- [ ] **Step 1: Создать лог-файл с правильными правами**

Run:
```bash
ssh flor-server 'sudo touch /var/log/flor-backup.log && sudo chown supa:supa /var/log/flor-backup.log'
```

- [ ] **Step 2: Создать cron-запись**

Run:
```bash
ssh flor-server 'sudo tee /etc/cron.d/flor-backup > /dev/null' <<'EOF'
# FlorMajor — Postgres + storage backup каждые 6 часов в Timeweb S3
# Запускается под supa (NOPASSWD sudo, доступ к docker через группу).
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

0 */6 * * * supa /opt/backup/backup.sh >> /var/log/flor-backup.log 2>&1
EOF
```

- [ ] **Step 3: Проверить, что cron подхватил**

Run:
```bash
ssh flor-server 'sudo systemctl reload cron && cat /etc/cron.d/flor-backup'
```

> Cron в Ubuntu по умолчанию активен. Reload не обязателен (cron перечитывает /etc/cron.d/ автоматически), но безопасен.

---

### Task 7.5: Создать локальный `flor-backup-pull` скрипт

**Files:** Create: `scripts/dev/flor-backup-pull`

- [ ] **Step 1: Создать скрипт**

```bash
cat > scripts/dev/flor-backup-pull <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

# Стянуть свежие бэкапы из Timeweb S3 в ~/Backups/flormajor/
# Запускать раз в неделю как offsite-копия (см. spec § 3.6).
#
# Требует rclone и настроенный remote 'timeweb-s3' в ~/.config/rclone/rclone.conf
# (на локальной машине, отдельно от сервера).

LOCAL_DIR="${HOME}/Backups/flormajor"
mkdir -p "$LOCAL_DIR"

echo "🟢 Стягиваю бэкапы Flormajor из Timeweb S3 в $LOCAL_DIR..."
rclone copy timeweb-s3:flor-backups "$LOCAL_DIR" --progress --max-age 14d

echo "✅ Готово. Содержимое:"
ls -lah "$LOCAL_DIR" | tail -20
EOF
chmod +x scripts/dev/flor-backup-pull
```

- [ ] **Step 2: Закоммитить вместе с остальными dev-скриптами (если ещё не сделано)**

```bash
git add scripts/dev/flor-backup-pull
git commit -m "feat(scripts): flor-backup-pull для offsite-копии бэкапов на ноут"
```

> **Локальная настройка rclone** (вне репо, делается владельцем один раз):
> Скопировать `/tmp/tw_cr/s3.md` креды в `~/.config/rclone/rclone.conf` локально с тем же именем remote `timeweb-s3`. Аналогично серверной настройке (Task 7.2).

---

## Phase 8 — Финальная проверка

### Task 8.1: Полный смок-тест стека

- [ ] **Step 1: Все контейнеры running**

Run:
```bash
ssh flor-server 'cd /opt/supabase/docker && docker compose ps'
```
Expected: 7 контейнеров up: `db`, `kong`, `auth`, `rest`, `storage`, `meta`, `imgproxy`.

- [ ] **Step 2: Памяти достаточно**

Run:
```bash
ssh flor-server 'free -h'
```
Expected: использовано ≤ 2.5 ГБ из 4 ГБ. Swap ~0%. Если used > 3 ГБ — проблема, искать в `docker stats`.

- [ ] **Step 3: docker stats — кто сколько ест**

Run:
```bash
ssh flor-server 'docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}"'
```
Expected: Postgres ~300-500 МБ, Studio (если запущен) ~200-300 МБ, остальные < 100 МБ.

- [ ] **Step 4: Проверить REST**

Run локально:
```bash
source ~/.flormajor/secrets.env
curl -sI "https://db.flormajor-omsk.ru/rest/v1/products?select=id&limit=1" \
  -H "apikey: ${ANON_KEY}"
```
Expected: 200 OK или 401 (если RLS блокирует — это правильное поведение, но 200 значит что Kong + REST + Postgres работают).

- [ ] **Step 5: Проверить Studio через туннель**

```bash
./scripts/dev/flor-studio-up &
sleep 15
curl -sI http://localhost:3000/ | head -3
# Останавливаем туннель и Studio
pkill -f "ssh -N -L 3000"
./scripts/dev/flor-studio-down
```
Expected: 200 OK или 401 (basicauth).

---

### Task 8.2: Создать тестового админа в новой БД

**Files:** server БД через docker exec

> Без SMTP signup отключен — создаём админа через прямой SQL и Studio API.

- [ ] **Step 1: Решить пароль для тестового админа**

```bash
TEST_ADMIN_EMAIL="test@flormajor-omsk.ru"
TEST_ADMIN_PASS=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
echo "TEST ADMIN: $TEST_ADMIN_EMAIL / $TEST_ADMIN_PASS"
echo "TEST_ADMIN_EMAIL=${TEST_ADMIN_EMAIL}" >> ~/.flormajor/secrets.env
echo "TEST_ADMIN_PASS=${TEST_ADMIN_PASS}" >> ~/.flormajor/secrets.env
```

- [ ] **Step 2: Создать пользователя через SQL (минуя GoTrue API из-за отсутствия SMTP)**

Run:
```bash
source ~/.flormajor/secrets.env
ssh flor-server "cd /opt/supabase/docker && docker compose exec -T db psql -U postgres -d postgres" <<SQL
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated', 'authenticated',
  '${TEST_ADMIN_EMAIL}',
  crypt('${TEST_ADMIN_PASS}', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(), now(),
  '', '', '', ''
)
RETURNING id;
SQL
```
Expected: одна строка с UUID.

- [ ] **Step 3: Запомнить UUID, добавить в admin_users**

```bash
ssh flor-server "cd /opt/supabase/docker && docker compose exec -T db psql -U postgres -d postgres -c \"
INSERT INTO public.admin_users (user_id, role)
SELECT id, 'owner' FROM auth.users WHERE email = '${TEST_ADMIN_EMAIL}';
\""
```

- [ ] **Step 4: Тест: получить токен через GoTrue API**

Run:
```bash
source ~/.flormajor/secrets.env
curl -s "https://db.flormajor-omsk.ru/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_ADMIN_EMAIL}\",\"password\":\"${TEST_ADMIN_PASS}\"}" | head -50
```
Expected: JSON с `access_token`, `refresh_token`, `user.id`. Это значит auth-flow работает.

> Это тестовый админ — в плане C при cutover создаётся реальный админ владельцем (или мигрирует с Cloud).

---

### Task 8.3: Проверить безопасность

- [ ] **Step 1: ufw active**

Run:
```bash
ssh flor-server 'sudo ufw status'
```
Expected: `Status: active`, открыты только 22/80/443.

- [ ] **Step 2: fail2ban active**

Run:
```bash
ssh flor-server 'sudo fail2ban-client status'
```
Expected: `Number of jail: 1`, `Jail list: sshd`.

- [ ] **Step 3: SSH password disabled**

Run локально:
```bash
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o BatchMode=yes flor-server 'whoami' 2>&1 | head -3
```
Expected: `Permission denied (publickey)` или похожее. Пароли запрещены.

- [ ] **Step 4: Root login disabled**

Run:
```bash
ssh -o BatchMode=yes -o PubkeyAuthentication=no -o PreferredAuthentications=password flor-server-root 'whoami' 2>&1 | head -3
```
Expected: `Permission denied`. Пароль для root тоже не работает.

- [ ] **Step 5: Postgres порт 5432 НЕ доступен снаружи**

Run локально:
```bash
nc -zv 77.232.129.172 5432 2>&1 | head -3
```
Expected: `Connection refused` или timeout. Если connect — ufw где-то протекает.

- [ ] **Step 6: Studio порт 3000 НЕ доступен снаружи**

Run:
```bash
nc -zv 77.232.129.172 3000 2>&1 | head -3
```
Expected: `Connection refused` или timeout.

---

### Task 8.4: Финальный чек-лист готовности к плану C

Серверный стек готов к плану C, если:

- [ ] `docker compose ps` — 7 сервисов running, 0 рестартов за последние 10 минут.
- [ ] `https://db.flormajor-omsk.ru/health` — 200 OK через TLS Let's Encrypt.
- [ ] Миграции `0001..0028` применены к новой БД, таблицы соответствуют (см. Task 6.2 Step 3).
- [ ] Тестовый админ может логиниться через GoTrue (см. Task 8.2 Step 4).
- [ ] Бэкап-скрипт прогнан вручную минимум один раз, файлы в Timeweb S3 (см. Task 7.3).
- [ ] Cron-запись активна (см. Task 7.4).
- [ ] Hardening полный: ufw active, fail2ban active, SSH без паролей, без root.
- [ ] Локальные helper-скрипты `flor-studio-up/down`, `flor-db-tunnel`, `flor-backup-pull` работают.
- [ ] `~/.flormajor/secrets.env` содержит все секреты (chmod 600, не в git).

---

## Definition of Done (для всего плана A)

- [ ] Сервер `77.232.129.172` залогинивается только через SSH-ключ под `supa`.
- [ ] Self-hosted Supabase работает: `db`, `kong`, `auth`, `rest`, `storage`, `meta`, `imgproxy`. Studio выключен по умолчанию.
- [ ] HTTPS на `db.flormajor-omsk.ru` через Caddy + Let's Encrypt.
- [ ] Миграции `0001..0028` применены к новой пустой БД.
- [ ] Тестовый админ создан, может залогиниться (но это тестовый — реальные данные в плане C).
- [ ] Бэкапы в Timeweb S3 каждые 6 часов с retention 14 дней.
- [ ] Локальные helper-скрипты в `scripts/dev/` запушены в репо.
- [ ] PR в main создан и смержен (план A — только инфра + dev-скрипты, без правок приложения).

---

## Что НЕ делается в этом плане

- **НЕ переносятся данные с Supabase Cloud.** Это план C (cutover): дамп `pg_dump --data-only` старой БД, restore в новую, `rclone copy` стораджа, замена env в Onreza.
- **НЕ применяются миграции в коде приложения** — план B (уже смержен).
- **НЕ настраивается реальный пользователь-админ владельцу.** Тестовый админ — для проверки работоспособности; реального создаём в плане C.
- **НЕ настраивается мониторинг (Prometheus/Grafana).** Это будущее улучшение, не нужно для MVP.
- **НЕ настраивается WAL-G/PITR.** На нашем масштабе хватает `pg_dump` каждые 6 часов (см. spec § 3.6).
- **НЕ настраивается offsite-зеркало бэкапов в Selectel.** Локальный pull на ноут (`flor-backup-pull`) уже даёт offsite (см. spec).
