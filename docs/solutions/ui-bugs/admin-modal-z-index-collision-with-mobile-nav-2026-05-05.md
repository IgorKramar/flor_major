---
title: "Admin modals hidden behind mobile nav-bar due to z-index collision"
date: 2026-05-05
category: docs/solutions/ui-bugs
module: admin/shell
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - "Sticky-bottom buttons in admin modals (Save, Cancel) clipped behind mobile bottom nav-bar"
  - "Visible only on mobile viewport (lg:hidden); desktop unaffected"
  - "User had to scroll harder or close mobile nav sheet to reach buttons"
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags:
  - tailwind
  - z-index
  - admin-panel
  - modal
  - mobile-ui
  - layering
related_components:
  - admin_products_modal
  - admin_categories_modal
  - admin_sidebar
---

# Admin modals hidden behind mobile nav-bar due to z-index collision

## Problem

Six admin modals (`fixed inset-0 z-50`) were visually clipped at the bottom by the mobile bottom navigation bar (`fixed bottom-0 z-50` in `components/admin/sidebar.tsx`). When the user opened a modal on mobile, the sticky Save/Cancel buttons were partially or fully obscured by the tab-bar. User had to scroll harder or close the mobile sheet to reach the buttons.

## Symptoms

- On mobile (`lg:hidden`), opening any admin modal showed sticky-bottom action bar covered by tab-bar with «Обзор / Товары / Категории / Hero / Ещё».
- Reproducible across all 6 modals: products, categories, footer, navigation, features, users.
- Desktop (`lg:` breakpoint and up) — fine; sidebar replaces mobile nav-bar.
- Confirmed in user-supplied screenshot from product-creation modal.

## Solution

Bumped overlay z-index from `z-50` to `z-60` in 6 modal files:

```
app/admin/{footer,products,navigation,features,users,categories}/page.tsx
```

Diff:

```diff
- <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
+ <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
```

Mobile nav-bar (`components/admin/sidebar.tsx`) stays at `z-50`. The mobile sheet «Ещё» in the same file was already at `z-60` for the same reason — the fix aligns all overlay-class elements.

## Why This Works

When two `position: fixed` elements have the same `z-index`, the one **later in the DOM tree** wins. In `components/admin/admin-shell.tsx` the modal renders inside `<main>`, and `<AdminMobileNav>` renders **after** `<main>`. So at `z-50` vs `z-50`, the nav-bar always covered the modal's sticky-bottom buttons.

By raising overlays to `z-60`, modals strictly out-rank both the mobile nav-bar and the sidebar. The visual stacking layer now matches the conceptual layer:

```
overlay slot (z-60):  modal overlays + mobile sheet «Ещё»
base slot    (z-50):  sidebar + mobile nav-bar
```

## Prevention

- **Reserve z-index slots by layer purpose, not by file.** Treat `z-50` as the base navigation slot and `z-60` as the overlay slot. Document this convention in a single place (e.g., a comment block in `components/admin/admin-shell.tsx`, or a short `docs/conventions/z-index-layers.md`) so future modals don't reach for `z-50` and silently regress this fix.
- **Never rely on DOM order when z-indexes collide.** When two `fixed` siblings have equal z, the winner is implicit and order-dependent — any layout refactor (extracting a portal, hoisting a wrapper) can flip it silently. Make the layer hierarchy explicit in numbers.
- **Manual mobile smoke before merge.** A 30-second open-modal-on-iPhone-DevTools check would have caught this. Worth a checklist item for any admin-modal PR.

## Related Issues

- PR #16 — this fix (`fix/admin-modal-z-index`, merged 2026-05-05).
- PR #15 — sticky-safe layout for inline admin pages (`pb-[calc(5rem+env(safe-area-inset-bottom))]` + `min-h-[100dvh]`). Same overall theme (mobile UX clipping by nav-bar) but different mechanism: insufficient `padding-bottom`, not z-index. The two PRs cover complementary cases.
- `app/admin/login/page.tsx` is exempt — no nav-bar is shown on the login screen.
