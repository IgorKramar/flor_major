---
title: "Caddy stuck in ACME backoff after DNS swap; staging-CA fallback hides the cause"
date: 2026-05-05
category: docs/solutions/integration-issues
module: infra/caddy
problem_type: integration_issue
component: tooling
symptoms:
  - "TLS handshake error from apex right after DNS A-record was swapped to new VM"
  - "openssl s_client returns tlsv1 alert internal error (alert 80) — server has no cert for the SNI"
  - "Browser shows generic secure-connection error; HTTPS unreachable"
  - "Caddy systemd unit is active; journalctl shows ACME challenges failing to OLD IP, then ca switched to acme-staging-v02"
  - "Lock files /var/lib/caddy/.local/share/caddy/locks/issue_cert_<host>.lock left behind, preventing retry"
root_cause: async_timing
resolution_type: environment_setup
severity: high
tags:
  - caddy
  - lets-encrypt
  - acme
  - certmagic
  - dns
  - tls
  - production-cutover
  - lock-files
related_components:
  - dns_apex
  - mobile_browser_compat
---

# Caddy stuck in ACME backoff after DNS swap; staging-CA fallback hides the cause

## Problem

After swapping apex DNS `flormajor-omsk.ru` from the old hosting IP (`185.251.89.220`) to the new self-hosted VM (`77.232.129.172`), HTTPS to apex stayed broken even though Caddy was running and listening on `:443`. The browser showed a TLS handshake error. Caddy was sitting in a 6-hour ACME backoff after a long pre-cutover failure streak, and certmagic had silently switched the affected hostnames to the Let's Encrypt **staging** CA — meaning even if the next attempt succeeded, the cert wouldn't be browser-trusted.

## Symptoms

- `curl https://flormajor-omsk.ru/` → `LibreSSL: error:1404B438:SSL routines:ST_CONNECT:tlsv1 alert internal error` (alert number 80 = `internal_error` from server, meaning Caddy had no cert matching the requested SNI).
- Mobile browser showed a generic "secure connection failed" page.
- `systemctl is-active caddy` returned `active` — process was healthy.
- `journalctl -u caddy --since "1 hour ago"` showed:
  - 24+ failed ACME challenges (`tls-alpn-01` then `http-01`) all going to the OLD IP `185.251.89.220` (hostname was in Caddyfile before the DNS swap; ACME server resolved name → old IP → 404 on `/.well-known/acme-challenge/...`).
  - Final log lines included `"ca":"https://acme-staging-v02.api.letsencrypt.org/directory"` — certmagic had auto-fallback'ed to staging CA after enough production failures.
  - Last entry: `"attempt":25, "retrying_in":21600, "elapsed":64944, "max_duration":2592000` — Caddy waiting **6 hours** before next try.
- `find /var/lib/caddy/.local/share/caddy/locks -type f` showed `issue_cert_flormajor-omsk.ru.lock` and `issue_cert_www.flormajor-omsk.ru.lock`. These prevent any concurrent retry.
- `find /var/lib/caddy/.local/share/caddy/certificates/acme-v02.api.letsencrypt.org-directory/` did NOT contain entries for apex or www — production cert was never obtained.

## What Didn't Work

- **`systemctl reload caddy`** — reload re-reads the Caddyfile but **does not reset in-memory backoff state**. The reload completes, certmagic still thinks it's in a 6-hour wait, no retry attempt happens. Looks fine in `is-active`, but no progress.
- **Wait for the backoff timer to expire (6 hours)** — would eventually retry. Unacceptable for a production cutover where users see broken HTTPS right now.
- **Edit Caddyfile to force a config change (e.g., touch a comment)** — same problem: reload preserves backoff state.
- **Just delete the lock files and reload** — partial: removes the "in-progress" marker but in-memory backoff timer still blocks retry until expiry.

## Solution

Combination of two actions, in this order, on the VM:

```bash
# 1. Remove the orphaned ACME lock files
sudo rm /var/lib/caddy/.local/share/caddy/locks/issue_cert_flormajor-omsk.ru.lock \
       /var/lib/caddy/.local/share/caddy/locks/issue_cert_www.flormajor-omsk.ru.lock

# 2. Hard restart Caddy (NOT reload — restart resets in-memory state)
sudo systemctl restart caddy
```

Within ~9 seconds Caddy retried ACME, the challenge passed (DNS now points to this VM), and both apex + www certs were obtained from production CA. Verified:

```bash
echo | openssl s_client -connect flormajor-omsk.ru:443 -servername flormajor-omsk.ru 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
# subject= /CN=flormajor-omsk.ru
# issuer= /C=US/O=Let's Encrypt/CN=E7        ← E7 = Let's Encrypt production
# notAfter=Aug  1 12:52:31 2026 GMT
```

## Why This Works

The backoff lives in two places:

1. **On disk** as `issue_cert_<host>.lock` files — markers that "this hostname is currently being worked on, don't start another attempt".
2. **In memory** as a per-hostname retry timer maintained by `certmagic 0.25.2`.

`systemctl reload` doesn't touch in-memory state — Caddy keeps its job manager and timers intact. `systemctl restart` recreates the process, so the in-memory timer is gone. Removing the lock files is the second half: without that, even the fresh process won't reissue because the disk marker tells it work is "in progress" by some long-dead worker.

After both, certmagic starts the ACME flow from scratch. By that time DNS resolves to the VM, the `tls-alpn-01` challenge handshake completes successfully, the production CA issues the cert, certmagic stores it, and Caddy starts serving it for new TLS connections. No restart of any other service needed.

The certmagic auto-fallback to staging CA was a confounder: even when the new flow eventually completed, it would have grabbed a staging cert (not browser-trusted). The hard restart resets the per-hostname CA selection too, so the retry goes back to production.

## Prevention

- **Add a hostname to Caddyfile only after DNS points to the server.** This is the cleanest preventive: no wasted ACME challenges, no backoff, no fallback to staging. For cutovers this means: write the new Caddyfile block first as a draft, swap DNS, then `systemctl reload caddy`. The first ACME attempt succeeds.
- **Or use the DNS-01 challenge** (Caddy's `acme_dns` directive with a provider plugin). DNS-01 doesn't require the hostname to resolve to the server — challenge is solved by writing a TXT record. Useful when you can't sequence DNS swap before serving TLS. Requires a DNS provider with API support (reg.ru does not have this in standard plans, so wasn't an option for us).
- **Or temporarily disable auto-HTTPS** for the new hostname (`auto_https off` in the site block) until DNS is ready, then re-enable. Niche, but works.
- **Watch `"ca":"..."` in Caddy logs after first cert issuance for any new hostname.** `acme-v02.api.letsencrypt.org-directory` = production. `acme-staging-v02.api.letsencrypt.org-directory` = staging fallback (NOT browser-trusted). The fallback happens silently with no alert; visual inspection of logs is the only signal.
- **Operational checklist after any DNS swap touching Caddyfile hostnames:**
  1. `dig +short <hostname>` — confirm new IP propagated to the resolver Caddy uses.
  2. `journalctl -u caddy --since "10 minutes ago" | grep -iE "obtain|error|warn"` — look for backoff or staging-CA traces.
  3. `find /var/lib/caddy/.local/share/caddy/locks -type f` — orphan locks need to be removed.
  4. `curl -fsSL https://<hostname>/api/health` — end-to-end check.

## Related Issues

- This issue is also documented in detail in the project's technical postmortem at `~/Vaults/Inbox/2026-05-03-flormajor-postmortem.md` § 6.10 (private vault, not in repo).
- The cutover that triggered this (apex DNS swap from old hosting to self-hosted VM) is part of the broader "Plan D" infrastructure migration — see `docs/superpowers/plans/2026-05-02-app-vm-migration.md`.
- PR #15 — sticky-safe layout for inline admin pages; not directly related but completed in the same session arc as the certificate fix.
