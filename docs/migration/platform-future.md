# Своя PaaS-платформа на Kubernetes (РФ)

## 0. Цель и контекст

Построить **многотенантную self-hosted PaaS-платформу** на собственных VM в РФ-ДЦ, которая закрывает функции Vercel/Heroku + Supabase Cloud для нескольких проектов одновременно. Первый тенант — «ФлорМажор», далее любые другие пет-проекты и продакшен-сайты.

**Базовые требования:**
- Полный контроль над инфраструктурой и данными (152-ФЗ).
- Push-to-deploy для приложений (как Vercel).
- Self-hosted Supabase per-project (Postgres + Auth + Realtime + Storage).
- Свой S3 (или подключение к внешнему S3 РФ-провайдера).
- Централизованное управление секретами и доменами.
- Всё под управлением Kubernetes (контейнеры, декларативный стейт, GitOps).
- Подъёмно одним инженером на 2–3 VM.

**Anti-goals:**
- Не строим Yandex/AWS — никакой авто-скейл-групп, мульти-региональности, бизнес-SLA.
- Не повторяем feature-set Vercel один-в-один (preview deployments, image optimization edge — это уже сам Next.js делает).

---

## 1. Архитектура: слои

```
┌──────────────────────────────────────────────────────────────────┐
│  Domains  *.platform.<your-domain>.ru   и   alias-домены проектов │
├──────────────────────────────────────────────────────────────────┤
│  Ingress + TLS:    Traefik  +  cert-manager (Let's Encrypt)       │
│  DNS automation:   ExternalDNS → Yandex Cloud DNS / Cloudflare    │
├──────────────────────────────────────────────────────────────────┤
│  PaaS UI / build:  Kubero (push-to-deploy, web UI, K8s-native)    │
│                  + Cloud Native Buildpacks (Paketo) для билдов    │
│  GitOps (опц.):    Argo CD                                        │
├──────────────────────────────────────────────────────────────────┤
│  Per-project namespaces:                                          │
│   ├─ flor-major/   → Next.js + own Supabase release               │
│   ├─ project-2/    → ...                                          │
│   └─ project-3/    → ...                                          │
│  Network Policies: deny-by-default между namespace                │
│  Resource Quotas, LimitRanges                                     │
├──────────────────────────────────────────────────────────────────┤
│  Shared services (namespace `platform`):                          │
│   ├─ Vault (HashiCorp) — секреты, токены                          │
│   ├─ MinIO (operator) — S3-совместимое хранилище, multi-tenant    │
│   ├─ Container Registry — Harbor (или внешний Yandex CR)          │
│   ├─ Argo CD                                                      │
│   ├─ Kubero                                                       │
│   ├─ Prometheus + Grafana + Loki + Alertmanager                   │
│   └─ Velero (бэкапы)                                              │
├──────────────────────────────────────────────────────────────────┤
│  Per-project Supabase (Helm chart):                               │
│   ├─ Postgres                                                     │
│   ├─ PostgREST                                                    │
│   ├─ GoTrue (Auth)                                                │
│   ├─ Realtime                                                     │
│   ├─ Storage API → MinIO bucket                                   │
│   └─ Studio (за VPN)                                              │
├──────────────────────────────────────────────────────────────────┤
│  Storage (PV):  Longhorn (replicated block storage, 2x replica)   │
│  Postgres backups: WAL-G → MinIO (или внешний S3)                 │
├──────────────────────────────────────────────────────────────────┤
│  Kubernetes:  K3s (lightweight, Rancher)                          │
│  Узлы: 3× VM в РФ-ДЦ (Selectel/Yandex Cloud)                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Выбор стека: компоненты и обоснование

| Слой | Решение | Альтернативы | Почему так |
|---|---|---|---|
| **Kubernetes** | **K3s** на 3 VM | kubeadm vanilla; Yandex Managed K8s; Selectel MK8s | K3s — single-binary, лёгкий, идеален для small ops; managed K8s в РФ снимает control-plane нагрузку (минус — vendor lock и +1500–3000 ₽/мес за CP) |
| **Storage (PV)** | **Longhorn** | OpenEBS, Rook-Ceph, local-path | Longhorn — распределённый блочный, 2x репликация, web UI, простой setup. Rook-Ceph мощнее, но overkill |
| **S3** | **MinIO Operator** | external Yandex/Selectel S3; SeaweedFS; Garage | MinIO даёт multi-tenant из коробки, S3-совместимый, можно репликации в external S3 для бэкапов |
| **Ingress** | **Traefik** | NGINX Ingress; Caddy; Istio | Traefik — CRD-based, авто-LE, web dashboard, нативно дружит с cert-manager и External-DNS |
| **TLS** | **cert-manager** + ACME (LE) | manual; Caddy auto | Стандарт де-факто |
| **DNS** | **External-DNS** → Yandex Cloud DNS / Cloudflare | ручное управление | Создаёт A/CNAME автоматом при создании Ingress; критично для self-service |
| **PaaS UI** | **Kubero** | Coolify (Swarm-first), CapRover, Dokku, OKD, Knative + own UI | Kubero — K8s-native Heroku-clone с web UI, push-to-deploy, поддерживает Buildpacks. Coolify v4 сейчас лучше работает на Swarm, чем на K8s |
| **Image build** | **Cloud Native Buildpacks** (Paketo) или **Kaniko** | Docker-in-Docker; BuildKit | Buildpacks автоматически распознают Next.js/Node/Python/Go без Dockerfile — это и есть «Heroku-experience». Kaniko — fallback для проектов с собственным Dockerfile |
| **Container Registry** | **Harbor** в кластере | Yandex CR; GHCR; Docker Hub | Harbor — self-hosted, с RBAC, signing, vulnerability scan; внешний Yandex CR — проще, дешевле, без ops |
| **Secrets** | **HashiCorp Vault** | Sealed Secrets; SOPS; External Secrets Operator + Yandex Lockbox | Vault — multi-project, dynamic secrets, audit trail. Для одного-двух проектов достаточно Sealed Secrets, но Vault даёт задел |
| **GitOps** | **Argo CD** | Flux | Argo CD — web UI, проще для небольших команд |
| **CI** | GitHub Actions / GitLab CI вне кластера | Tekton, Drone, Woodpecker | CI лучше держать снаружи: build → push в registry → Argo CD/Kubero подхватывает |
| **Observability** | **kube-prometheus-stack** + **Loki** + Promtail | Datadog (платный); Yandex Monitoring | OSS, всё в кластере; Yandex Monitoring можно добавить параллельно |
| **Backup** | **Velero** + **WAL-G** | restic; ad-hoc | Velero — K8s state и PV; WAL-G — PG continuous backup в S3 |
| **Supabase** | **supabase-community/supabase-kubernetes** Helm | Docker Compose + StatefulSet вручную | Готовый chart, активно поддерживается; per-project релиз |

---

## 3. Топология VM (стартовая)

| Узел | Роль | CPU/RAM/Disk | Что крутится |
|---|---|---|---|
| **node-1** | control + worker | 4 vCPU / 8 GB / 80 GB | K3s server (etcd-embed), Vault, Argo CD, Prometheus |
| **node-2** | worker | 4 vCPU / 8 GB / 80 GB | Supabase pods, Kubero, MinIO node |
| **node-3** | worker | 4 vCPU / 8 GB / 80 GB | App pods, Longhorn replica, MinIO node |

**HA-варианты:**
- **MVP (бюджет):** 1 VM (4 vCPU / 8 GB / 80 GB), всё на ней, K3s single-node, local-path storage. ~3500 ₽/мес. Минус — нет HA, downtime при апгрейде.
- **Стартовый (рекомендуется):** 3 VM как выше. ~10 500 ₽/мес. Reasonable HA, можно терять 1 ноду.
- **Прод:** 3 control + 3 worker VM, выделенный node для PG, etcd на SSD. От 25 000 ₽/мес.

**Провайдер:** Selectel дешевле, Yandex Cloud богаче в managed-сервисах (можно вынести Postgres в Yandex Managed PG отдельно от K3s — упрощает бэкапы и снимает нагрузку с кластера).

---

## 4. Multi-tenancy: как изолируются проекты

### 4.1. Изоляция

| Уровень | Механизм |
|---|---|
| Сеть | NetworkPolicy в каждом ns: deny-all + явные allow-rules. Между ns — только через ingress |
| Compute | ResourceQuota + LimitRange: лимиты CPU/RAM/PV на ns |
| RBAC | Роль project-admin внутри ns: может управлять Deployments, Services, Secrets своего ns; нет доступа к другим |
| Данные | Каждый Supabase = отдельный StatefulSet Postgres в своём ns. Отдельные anon/service ключи, JWT-секрет, RLS политики per-project |
| Секреты | Vault с path `secret/<project>/...`, ACL by AppRole. K8s Auth Method — ServiceAccount → Vault role → secrets |
| S3 | MinIO tenant per project (или один MinIO + bucket per project с IAM-политиками) |
| Домены | `*.platform.<your-domain>.ru` + alias-домены проектов; ExternalDNS управляет записями |

### 4.2. Self-service vs operator-only

На старте — **operator-only**: владелец платформы (вы) создаёт проекты через скрипт. Когда стек устаканится, можно прикрутить web-UI Kubero для self-service деплоев приложений (Supabase всё равно поднимать через Helm).

---

## 5. Дорожная карта развёртывания

### Фаза 1. VM и K3s (1–2 дня)
- [ ] Заказать 3 VM в Selectel или Yandex Cloud, Ubuntu 22.04 LTS, приватная сеть.
- [ ] Hardening: ufw (deny incoming except 22, 80, 443, 6443, 10250), fail2ban, ssh by key, no root login, unattended-upgrades.
- [ ] Установить K3s на node-1 как server, node-2/node-3 как agents (`curl -sfL https://get.k3s.io | ...`). Отключить встроенный traefik (`--disable=traefik`) — поставим свой.
- [ ] Настроить kubeconfig локально, проверить `kubectl get nodes`.

### Фаза 2. Базовая инфраструктура (2–3 дня)
- [ ] **Longhorn** через Helm: distributed block storage, 2x replica, web UI за VPN.
- [ ] **MetalLB** (если bare-metal) или Hetzner/Selectel external LB для exposing Traefik.
- [ ] **Traefik** через Helm chart с CRD provider и LE staging→prod.
- [ ] **cert-manager** + ClusterIssuer для LE (HTTP-01 или DNS-01).
- [ ] **ExternalDNS** с Yandex Cloud DNS или Cloudflare provider.
- [ ] Тест: задеплоить тестовый nginx с Ingress на `test.platform.<your-domain>.ru`, убедиться что HTTPS работает.

### Фаза 3. Платформенные сервисы (2–3 дня)
- [ ] **Vault** через Helm в namespace `vault`, raft-storage. Init, unseal, базовые ACL.
- [ ] **K8s Auth Method** для Vault: ServiceAccount каждого проекта получает свой набор секретов.
- [ ] **Vault Secrets Operator** (или External Secrets Operator) для синхронизации Vault → K8s Secrets.
- [ ] **MinIO Operator** в namespace `minio-operator`. Создать первый tenant `platform` для бэкапов.
- [ ] **kube-prometheus-stack** в namespace `monitoring`. Grafana за VPN.
- [ ] **Loki + Promtail** для логов.
- [ ] **Velero** + бэкап-таргет в MinIO `platform`.

### Фаза 4. PaaS-слой (2–3 дня)
- [ ] **Harbor** (или подключить внешний Yandex Container Registry — проще на старте).
- [ ] **Argo CD** в namespace `argocd`, web UI за VPN.
- [ ] **Kubero** в namespace `kubero`, web UI с auth, подключить к Harbor/registry, настроить Buildpacks.
- [ ] Тестовый push-to-deploy: создать demo-репозиторий с простым Next.js, подключить к Kubero, убедиться что билд → деплой → ingress работает.

### Фаза 5. Шаблон проекта и Supabase Helm (2–3 дня)
- [ ] **Helm chart `platform-tenant`** (свой) — создаёт namespace, ResourceQuota, LimitRange, NetworkPolicy, RBAC, Vault role.
- [ ] **Supabase Helm chart** (`supabase-community/supabase-kubernetes`) — параметризовать values per project: db-name, JWT-secret, anon-key, service-role-key, S3 backend coords (MinIO endpoint + per-project credentials).
- [ ] Скрипт `scripts/new-project.sh <name>`:
  1. helm install platform-tenant с именем проекта,
  2. сгенерировать секреты в Vault (`secret/<name>/supabase/*`),
  3. создать MinIO bucket + IAM,
  4. helm install supabase в namespace,
  5. зарегистрировать DNS-записи через ExternalDNS (CNAME на ingress LB),
  6. вывести готовые env для приложения (URL Supabase, ключи).
- [ ] Документировать процесс в `docs/onboarding.md`.

### Фаза 6. Перевод ФлорМажора (см. [`overview.md`](overview.md)) (3–5 дней)
- [ ] `scripts/new-project.sh flor-major`.
- [ ] Применить `supabase/migrations/0001..0026` + `0027_remove_leads.sql` в новый Postgres.
- [ ] Задеплоить Next.js через Kubero → подвязать домен `flormajor-omsk.ru`.
- [ ] Перенести данные (без `leads`) и Storage (rclone в MinIO bucket).
- [ ] Cutover.

### Фаза 7. Эксплуатация (постоянно)
- [ ] Расписание: Renovate/Dependabot для Helm chart версий.
- [ ] Тестовое восстановление из Velero раз в квартал.
- [ ] Проверка алертов Prometheus.
- [ ] Расход на рост: при появлении 4-го проекта — добавить worker-ноду.

---

## 6. Onboarding нового проекта (после готовности платформы)

Целевой workflow для проекта Y (~20 минут):

```bash
# 1. Создание тенанта
./scripts/new-project.sh project-y

# 2. Подключение репозитория к Kubero (через web UI)
#    - выбираем GitHub repo, ветку
#    - буилдпак автоматически распознаёт Next.js
#    - указываем env vars из Vault (ссылками)
#    - указываем домен projecty.ru

# 3. Если проекту нужен Supabase — он уже создан на шаге 1.
#    URL: https://db-projecty.platform.<your-domain>.ru
#    Ключи: vault kv get secret/project-y/supabase

# 4. Применяем миграции
psql "$SUPABASE_DB_URL" -f migrations/*.sql

# 5. Готово.
```

---

## 7. Безопасность и compliance (152-ФЗ)

- **Все ПД проектов хранятся в РФ-ДЦ** — выполняется выбором Selectel/Yandex для VM.
- **Vault**: единая точка хранения секретов, audit log, ротация.
- **Network Policies**: deny-by-default между namespace, явный allow только для ingress.
- **Pod Security Standards**: `restricted` для всех проектных namespace, `baseline` для платформенных.
- **TLS** на всех внешних входах (cert-manager + LE).
- **Privileged access**: SSH к нодам, kubectl с cluster-admin, Vault root, Argo CD admin — только через jump host / VPN (WireGuard в `platform`).
- **Бэкапы**: Velero K8s state раз в день + PG WAL-G continuous + бэкап Vault unseal-keys в офлайн-хранилище.
- **Логи доступа** Traefik retention 30 дней (или 7 — по политике конкретного проекта).
- **Аудит** действий в кластере: K8s audit log → Loki.

---

## 8. Бюджет (порядок)

### Минимальный (1 VM, no HA, для пет-проектов)

| Компонент | ₽/мес |
|---|---|
| 1 VM 4/8/80 в Selectel | ~3 500 |
| DNS, домены | ~200 |
| **Итого** | **~3 700** |

### Стартовый (3 VM, MVP HA, до 5–7 проектов)

| Компонент | Selectel | Yandex Cloud |
|---|---|---|
| 3 VM 4/8/80 | ~10 500 | ~15 000 |
| Доп. диски / Longhorn overhead | ~500 | ~700 |
| Backup-bucket (внешний S3) | ~200 | ~300 |
| Yandex Cloud DNS / Cloudflare | ~0 | ~200 |
| **Итого** | **~11 200** | **~16 200** |

### Прод (HA + выделенный PG)

| Компонент | Selectel |
|---|---|
| 3 control + 3 worker VM | ~25 000 |
| Managed PG (если выносить) | ~5 000 |
| **Итого** | **~30 000+** |

Сравнение: Vercel Pro $20/seat + Supabase Pro $25/проект = $45 за один проект ≈ 4 500 ₽/мес. **Точка окупаемости — 2–3 проекта на стартовой топологии.**

---

## 9. Риски и mitigation

| Риск | Вероятность | Влияние | Mitigation |
|---|---|---|---|
| K3s/etcd corruption на single control plane | Низкая | Высокое | Velero бэкап etcd ежедневно; держать готовый рекавери-плейбук |
| Longhorn потеря replica при сбое ноды | Средняя | Высокое | Replica-count 2, мониторинг disk pressure, alert на degraded volumes |
| Vault unseal keys утеряны | Низкая | Критическое | Shamir 5-of-3 split, ключи в офлайн-сейфе и у двух людей |
| Обновление K3s/Helm chart ломает прод | Средняя | Высокое | Staging-кластер (минимальный) или canary через Argo CD; не апгрейд minor через Renovate auto-merge |
| TLS expired (cert-manager пропустил renewal) | Низкая | Среднее | Alert на cert-manager metrics + резервный ClusterIssuer staging |
| Supabase Helm chart не синхронизирован с upstream Supabase Cloud | Средняя | Среднее | Закрепить версии компонентов, не гнаться за latest |
| Один тенант съедает CPU/RAM остальных | Средняя | Среднее | Жёсткие ResourceQuota + LimitRange + monitoring per-namespace |
| Kubero пропадёт как проект | Средняя | Среднее | Альтернатива: переход на Coolify (Swarm) или прямой Helm/Argo CD без UI; сами манифесты переносимы |
| RKN заблокирует Docker Hub / GHCR / GitHub | Средняя | Среднее | Зеркало образов в Harbor / Yandex CR; репо-зеркало в self-hosted Gitea |

---

## 10. Что делать прямо сейчас (next steps)

1. **Решить топологию:** MVP (1 VM) для проверки концепции или сразу стартовая (3 VM)?
2. **Решить провайдера:** Selectel (дешевле) или Yandex Cloud (зрелее, с managed-опциями про запас)?
3. **Решить про managed K8s:** self-host K3s или Yandex Managed Kubernetes (off-load control plane, минус ~3 000 ₽/мес)?
4. **Завести домен** под платформу: что-то вроде `cloud.<your-domain>.ru` — для DNS wildcard.
5. **Построить PoC** на одной VM (Фазы 1–4 в облегчённом виде, без Longhorn, с local-path) — проверить, что Kubero + Supabase Helm + Traefik действительно работают связно, прежде чем масштабировать.

После согласования — оформляем тикеты по фазам и стартуем PoC.

---

## 11. Связанные документы

- [`../audit/2026-05-audit.md`](../audit/2026-05-audit.md) — аудит кодовой базы ФлорМажор (баги, перфоманс, безопасность).
- [`cheap.md`](cheap.md) — минимальный legal-сценарий: одна VM в Timeweb + self-host Supabase в Docker Compose, ~1 100 ₽/мес. Подходит, пока проектов мало.
- [`overview.md`](overview.md) — частный план миграции ФлорМажора как первого тенанта на эту платформу (сценарий B: без формы лидов).
- [`homelab-future.md`](homelab-future.md) — гибридное расширение: дачный K3s-кластер как homelab + бэкап-партнёр для облачной платформы.
