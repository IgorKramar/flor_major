# Минимальный legal-сценарий: self-host Supabase на Timeweb Cloud + Onreza

> Самый дешёвый вариант с соблюдением 152-ФЗ: ~1 100 ₽/мес доп. к текущему. Срок установки 2–3 рабочих дня.
>
> Связанные документы:
> - [`overview.md`](overview.md) — общая логика миграции (Сценарий B: без формы лидов)
> - [`../audit/2026-05-audit.md`](../audit/2026-05-audit.md) — баги, которые удобно закрыть в этом же спринте

## 0. Что получится в итоге

```
                Internet
                   │
         ┌─────────┴──────────┐
         │                    │
    flormajor-omsk.ru    db.flormajor-omsk.ru
         │                    │
    ┌────▼────┐          ┌────▼─────────────────────┐
    │ Onreza  │          │ Timeweb Cloud MSK-50     │
    │ Next.js │ ───────▶ │ Caddy → Kong → Supabase  │
    │ (как    │  PostgREST│   ├─ Postgres           │
    │ сейчас) │  GoTrue   │   ├─ GoTrue (Auth)      │
    │         │  Storage  │   ├─ Realtime           │
    │         │  Realtime │   ├─ PostgREST          │
    │         │           │   ├─ Storage API        │
    │         │           │   ├─ Studio (за VPN)    │
    │         │           │   └─ imgproxy           │
    └─────────┘           └──────────────────────────┘
                                       │
                                       │ pg_dump + media → backup
                                       ▼
                              Selectel Object Storage
                                  (10 ГБ, ~50 ₽/мес)
```

**Затраты:**
- Timeweb Cloud MSK-50 (2 × 3.3 ГГц, 4 ГБ, 50 ГБ NVMe, gigabit, public IP) — **1 062 ₽/мес**
- Selectel Object Storage (бэкапы) — **~50–100 ₽/мес**
- Onreza — без изменений
- **Итого доп.: ~1 100–1 200 ₽/мес**

---

## 1. Чек-лист (общий)

- [ ] **Шаг 1.** Заказать VM в Timeweb (MSK-50), Ubuntu 22.04 LTS.
- [ ] **Шаг 2.** Базовый hardening сервера.
- [ ] **Шаг 3.** Установить Docker + Compose.
- [ ] **Шаг 4.** Клонировать Supabase docker-репо, сгенерировать свои ключи.
- [ ] **Шаг 5.** Настроить Caddy как reverse proxy с auto-TLS.
- [ ] **Шаг 6.** Прописать DNS-записи (`db`, `studio`).
- [ ] **Шаг 7.** Поднять стек, проверить эндпоинты.
- [ ] **Шаг 8.** Применить миграции `supabase/migrations/0001..0026`.
- [ ] **Шаг 9.** Применить новую миграцию `0027_remove_leads.sql` (Сценарий B).
- [ ] **Шаг 10.** Создать админа и пересоздать данные (или импортировать дамп с Supabase Cloud).
- [ ] **Шаг 11.** Перенести Storage (`rclone copy`).
- [ ] **Шаг 12.** Настроить ежедневный бэкап в Selectel S3.
- [ ] **Шаг 13.** В Onreza заменить env: `NEXT_PUBLIC_SUPABASE_URL` и ключи.
- [ ] **Шаг 14.** Удалить публичную форму лидов в коде ФлорМажора (Сценарий B).
- [ ] **Шаг 15.** Cutover: maintenance → DNS-переключение → smoke-тест → выкл. maintenance.

---

## 2. Заказ VM в Timeweb

1. Регистрация на <https://timeweb.cloud> (как ИП/ЮЛ — для актов).
2. **Cloud Servers → Конфигурация → MSK 50** (Москва).
3. ОС: **Ubuntu 22.04 LTS**.
4. SSH-ключ: добавить публичный ключ (предварительно `ssh-keygen -t ed25519` локально).
5. Дополнительно: включить «Автобэкапы» если доступно бесплатно (или уточнить цену; обычно ~10–20% от тарифа). Если платные — отказаться, у нас будут свои.
6. После создания получить IPv4. Записать.

---

## 3. Hardening сервера

```bash
ssh root@<TIMEWEB_IP>

# Обновить систему
apt update && apt upgrade -y
apt install -y ufw fail2ban unattended-upgrades curl git

# Создать non-root пользователя
adduser --disabled-password --gecos "" supa
usermod -aG sudo supa
mkdir -p /home/supa/.ssh
cp /root/.ssh/authorized_keys /home/supa/.ssh/
chown -R supa:supa /home/supa/.ssh
chmod 700 /home/supa/.ssh
chmod 600 /home/supa/.ssh/authorized_keys

# Запретить root login и пароли
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

# Файрвол
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# fail2ban для SSH
systemctl enable --now fail2ban

# Авто-обновления безопасности
dpkg-reconfigure -plow unattended-upgrades

# Дальше работаем под supa
exit
ssh supa@<TIMEWEB_IP>
```

---

## 4. Docker + Docker Compose

```bash
# Установить Docker по официальной инструкции
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Compose v2 уже идёт плагином с Docker
docker compose version
```

---

## 5. Поднять Supabase

```bash
mkdir -p /opt && cd /opt
sudo git clone --depth 1 https://github.com/supabase/supabase.git
sudo chown -R supa:supa /opt/supabase
cd /opt/supabase/docker
cp .env.example .env
```

### 5.1. Сгенерировать свои секреты

**Никогда не используй дефолтные ключи из примера** — они скомпрометированы.

```bash
# Локально (на ноуте) или прямо на сервере:
# JWT секрет (минимум 32 символа)
openssl rand -base64 48

# Postgres пароль
openssl rand -base64 24

# Studio password
openssl rand -base64 16

# Logflare API key (если используешь логи через Logflare — опционально)
openssl rand -base64 24
```

Для **ANON_KEY** и **SERVICE_ROLE_KEY** — это JWT, подписанные `JWT_SECRET`. Сгенерировать на <https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys> (вставляешь свой `JWT_SECRET` → получаешь оба JWT).

### 5.2. Заполнить `.env`

Главные параметры (остальное пока не трогаем):

```dotenv
############
# Postgres
############
POSTGRES_PASSWORD=<сгенерировано>
POSTGRES_DB=postgres
POSTGRES_PORT=5432

############
# JWT
############
JWT_SECRET=<сгенерировано>
ANON_KEY=<JWT с role=anon>
SERVICE_ROLE_KEY=<JWT с role=service_role>

############
# Site
############
SITE_URL=https://flormajor-omsk.ru
ADDITIONAL_REDIRECT_URLS=
JWT_EXPIRY=3600
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
# Auth (SMTP для писем восстановления админ-пароля)
############
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false
SMTP_ADMIN_EMAIL=admin@flormajor-omsk.ru
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=<email>
SMTP_PASS=<пароль приложения Yandex>
SMTP_SENDER_NAME=FlorMajor

############
# Storage — локально (на 50 ГБ NVMe)
############
STORAGE_BACKEND=file
FILE_SIZE_LIMIT=52428800   # 50 МБ на файл

############
# Dashboard auth (basic auth для Studio)
############
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=<сгенерировано>
```

> **Storage в Selectel S3 как альтернатива:** если хочется вынести медиа из VM, поставить `STORAGE_BACKEND=s3` и заполнить `GLOBAL_S3_*` переменные. Для старта проще файловое хранилище — занимает ~1–2 ГБ, влезает с большим запасом.

### 5.3. Поднять стек

```bash
cd /opt/supabase/docker
docker compose pull
docker compose up -d

# Проверить
docker compose ps
docker compose logs -f --tail 50
```

Ждём, пока все контейнеры станут `healthy` (1–2 минуты). Если что-то рестартится — `docker compose logs <service>`.

---

## 6. Caddy — reverse proxy с автоматическим TLS

Kong торчит на `localhost:8000` (HTTP). Снаружи нужно HTTPS.

```bash
# Установить Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

Конфиг `/etc/caddy/Caddyfile`:

```
db.flormajor-omsk.ru {
    reverse_proxy localhost:8000
    encode gzip
}

studio.flormajor-omsk.ru {
    reverse_proxy localhost:3000
    basicauth {
        admin <bcrypt_hash>
    }
    encode gzip
}
```

Хеш для basicauth:
```bash
caddy hash-password
# вводишь пароль → получаешь bcrypt-строку → вставляешь в Caddyfile
```

```bash
sudo systemctl reload caddy
sudo systemctl status caddy
```

Caddy сам получит сертификаты Let's Encrypt при первом запросе по HTTPS.

---

## 7. DNS

В DNS-провайдере домена `flormajor-omsk.ru`:
- `db` (A) → `<TIMEWEB_IP>`
- `studio` (A) → `<TIMEWEB_IP>`

Дождаться распространения (5–60 минут). Проверить:
```bash
dig +short db.flormajor-omsk.ru
curl -sI https://db.flormajor-omsk.ru/health
# должно вернуть 200 OK от Kong
```

---

## 8. Применить миграции

Локально (на машине с репо ФлорМажора):

```bash
# Установить supabase CLI если нет
npm install -g supabase

# Применить миграции напрямую через psql проще всего
export PGPASSWORD=<POSTGRES_PASSWORD>
for f in supabase/migrations/*.sql; do
  echo "Applying $f"
  psql -h db.flormajor-omsk.ru -p 5432 -U postgres -d postgres -f "$f"
done
```

> **Важно**: порт 5432 не торчит наружу из docker-compose по умолчанию (хорошо). Чтобы применять миграции снаружи, либо:
> - Открыть 5432 на короткое время через ufw (и закрыть после), используя SSH-туннель: `ssh -L 5432:localhost:5432 supa@<TIMEWEB_IP>` и выполнить `psql -h localhost`.
> - Или скопировать миграции на сервер: `scp -r supabase/migrations supa@<TIMEWEB_IP>:~/` и выполнить `docker compose exec db psql -U postgres -f /tmp/<file>.sql`.

Рекомендую **SSH-туннель** — безопаснее.

---

## 9. Новая миграция `0027_remove_leads.sql` (Сценарий B)

Создать в репо `supabase/migrations/0027_remove_leads.sql`:

```sql
-- Убираем форму лидов: таблицы, политики, публикации Realtime
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.leads;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.rate_limits CASCADE;
```

Применить тем же способом.

---

## 10. Перенос данных с Supabase Cloud

### 10.1. Контент (без `leads`, `rate_limits`, без `auth.*`, без `storage.*`)

```bash
# С локальной машины, через сетевой доступ к Supabase Cloud
pg_dump --data-only --no-owner --no-privileges \
  --schema=public \
  --exclude-table=public.leads \
  --exclude-table=public.rate_limits \
  -h <supabase-cloud-host>.supabase.co -p 5432 -U postgres -d postgres \
  -Fc -f flor-data.dump

# Восстановить в новый Postgres (через SSH-туннель)
ssh -L 5432:localhost:5432 supa@<TIMEWEB_IP> &
pg_restore --data-only --no-owner --no-privileges \
  -h localhost -p 5432 -U postgres -d postgres \
  flor-data.dump
```

### 10.2. Админ-пользователи

Проще пересоздать в Studio:
1. `https://studio.flormajor-omsk.ru` → войти.
2. Authentication → Users → Add user → email + временный пароль.
3. Public → `admin_users` → INSERT row с тем же `user_id`, role `owner`.
4. На почту приходит ссылка для смены пароля.

### 10.3. Storage (медиа товаров)

Пути картинок в БД ссылаются на бакет `media`. Перенесём файлы.

```bash
# Установить rclone локально
sudo apt install rclone
rclone config
# Добавить два remote:
#   1) supabase-cloud — S3 совместимый, endpoint Supabase Storage
#   2) flor-local — SSH/SFTP к новому серверу, путь /opt/supabase/docker/volumes/storage

# Скопировать
rclone copy supabase-cloud:media flor-local:/opt/supabase/docker/volumes/storage --progress
```

Проверить, что картинки открываются по `https://db.flormajor-omsk.ru/storage/v1/object/public/media/<path>`.

---

## 11. Бэкап в Selectel S3

### 11.1. Создать бакет

1. Регистрация в Selectel.
2. Object Storage → Создать контейнер `flor-backups` (приватный).
3. Создать сервисного пользователя с правами на этот контейнер, получить `access_key` / `secret_key`.

### 11.2. Скрипт бэкапа на сервере

```bash
sudo mkdir -p /opt/backup
sudo chown supa:supa /opt/backup
```

`/opt/backup/backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

DATE=$(date -u +%Y%m%d-%H%M%S)
BACKUP_DIR=/opt/backup/work
mkdir -p "$BACKUP_DIR"

# 1. Postgres dump
docker compose -f /opt/supabase/docker/docker-compose.yml exec -T db \
  pg_dump -U postgres -Fc postgres > "$BACKUP_DIR/db-$DATE.dump"

# 2. Storage (если локальный backend)
tar -czf "$BACKUP_DIR/storage-$DATE.tar.gz" -C /opt/supabase/docker/volumes/storage .

# 3. Залить в S3 через rclone
rclone copy "$BACKUP_DIR" selectel:flor-backups/ --progress
rclone delete --min-age 30d selectel:flor-backups/  # ретеншн 30 дней

# 4. Очистить локальные временные
find "$BACKUP_DIR" -mtime +1 -delete
```

```bash
chmod +x /opt/backup/backup.sh

# rclone config — добавить selectel S3 remote
rclone config
# Тип: s3
# Provider: Other
# endpoint: https://s3.ru-1.storage.selcloud.ru (или актуальный)
# access_key_id, secret_access_key — из Selectel

# Cron: каждый день в 04:00 МСК
crontab -e
# Добавить:
# 0 4 * * * /opt/backup/backup.sh >> /var/log/flor-backup.log 2>&1
```

Проверить вручную: `bash /opt/backup/backup.sh`. После — посмотреть, что файлы появились в Selectel.

---

## 12. Изменения в коде ФлорМажора

В отдельной ветке (`migrate-cheap-stack` например):

### 12.1. Удалить форму лидов
- `components/contact-form.tsx` — удалить
- `app/actions/submit-lead.ts` — удалить
- `app/admin/leads/` — удалить
- В `app/admin/page.tsx` убрать виджет недавних заявок и Realtime-канал на `leads`
- В `components/contact-section.tsx` (или где `<ContactForm/>` встроена) — заменить на статический блок с `tel:`/мессенджерами
- Удалить из `lib/validation/schemas.ts` лидовские схемы
- Из `next.config.mjs` / env — убрать `TELEGRAM_*` переменные

### 12.2. Применить миграцию `0027`
Положить файл, описанный в **§9**, в `supabase/migrations/`.

### 12.3. Заодно (опционально, но просится)
P0-пункты из [`../audit/2026-05-audit.md`](../audit/2026-05-audit.md):
- `components/ui/use-mobile.tsx` — починить hydration
- `components/header.tsx` — cleanup `body.overflow` на unmount
- `app/admin/products/page.tsx:295-296` — добавить `revalidateSiteCache('/catalog/${slug}')`
- `app/api/revalidate/route.ts` — try/catch
- `lib/site-data.ts` — обернуть горячие функции в `unstable_cache`
- `app/catalog/[slug]/page.tsx` — добавить `generateStaticParams`

---

## 13. Cutover

### 13.1. В Onreza
В переменных окружения проекта:
```
NEXT_PUBLIC_SUPABASE_URL=https://db.flormajor-omsk.ru
NEXT_PUBLIC_SUPABASE_ANON_KEY=<новый ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<новый SERVICE_ROLE_KEY>
```
Удалить `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `RATE_LIMIT_SALT` (форма убрана).

### 13.2. Окно maintenance
1. В **старой** Supabase Cloud Studio: `site_settings.maintenance_mode = true` — на старом сайте сразу включается заглушка (механизм есть в `proxy.ts`).
2. Финального досинка `leads` нет — таблицы уже не существует.
3. Деплой ветки `migrate-cheap-stack` в Onreza.
4. Когда новая версия живая — `site_settings.maintenance_mode = false` в **новой** Studio.

### 13.3. Smoke-тест
- [ ] Главная отдаёт контент.
- [ ] Каталог, фильтры, поиск, сортировка.
- [ ] Карточка товара, картинки.
- [ ] Контактная секция показывает телефон/мессенджеры (формы нет).
- [ ] Админка: вход новым паролем.
- [ ] Админка: правка товара → сохранение → видно на публичной части.
- [ ] Админка: загрузка нового изображения работает.
- [ ] Studio (через `studio.flormajor-omsk.ru`) доступен с basicauth.

### 13.4. После cutover
- Подождать 7 дней.
- В старой Supabase Cloud — удалить проект (или пометить read-only, потом удалить).
- В Onreza — старые env-переменные удалить.

---

## 14. Эксплуатация

### Что мониторить
- Свободное место на диске: `df -h` (не дать `/opt/supabase` уйти выше 80%).
- Состояние контейнеров: `docker compose ps` (можно повесить cron-проверку с алертом в Telegram).
- Размер бэкапов в Selectel.
- Сертификаты Let's Encrypt (Caddy сам обновляет).

### Что регулярно делать
- Обновлять Supabase: `cd /opt/supabase && git pull && cd docker && docker compose pull && docker compose up -d` — раз в 1–2 месяца.
- Тест восстановления из бэкапа: раз в квартал на тестовой VM.
- Безопасность: `apt upgrade` раз в неделю-две (unattended-upgrades делает сам, но ядро надо вручную с reboot).

### Что делать если упало
1. `docker compose logs <service>` — посмотреть, что ругается.
2. `docker compose restart <service>` — рестарт одного.
3. Если БД повредилась — восстановление из последнего дампа: `docker compose exec -T db pg_restore -U postgres -d postgres -c < последний-dump`.

---

## 15. Юридический минимум для compliance

Обязательно после миграции:
- [ ] Опубликовать **Политику обработки ПД** на `/privacy` (шаблон лежит на сайтах юристов или из госуслуг).
- [ ] Ссылку на `/privacy` в футер.
- [ ] Внутренний приказ о назначении ответственного за обработку ПД.
- [ ] Положение об обработке ПД (внутренний документ, ~3 страницы по шаблону).

**НЕ требуется** в Сценарии B:
- ❌ Уведомление РКН (нет сбора через сайт).
- ❌ Чекбокс согласия (нечего согласовывать).
- ❌ Договор оператор/обработчик с Timeweb по части посетительских ПД (их нет).
- ❌ Аттестация ФСТЭК / модель угроз.

Подробнее — в разделе 0 [`overview.md`](overview.md).

---

## 16. Откатить (если что-то пошло не так)

В течение 7 дней после cutover:
1. В Onreza — вернуть старые env (`NEXT_PUBLIC_SUPABASE_URL` на Supabase Cloud).
2. В старой Studio — `maintenance_mode = false`.
3. Откатить деплой ветки в Onreza.
4. Готово — возврат на старый стек, задержка ~5 минут.

---

## 17. Куда расти

- **Свой PaaS на K3s** — [`platform-future.md`](platform-future.md) (когда проектов будет 3+).
- **Гибрид с дачей** — [`homelab-future.md`](homelab-future.md) (когда захочется свою железяку).
- **Headless со снэпшотами** — добавить генерацию JSON в S3 после save в админке, public site читает оттуда. Снижает нагрузку на VM, делает public-сайт независимым от uptime Postgres.

Этот стек — фундамент. От него можно идти куда угодно.
