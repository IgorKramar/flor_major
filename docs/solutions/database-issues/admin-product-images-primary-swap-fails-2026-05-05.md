---
title: "Save fails with Postgres 23505 when swapping primary product image in one save"
date: 2026-05-05
category: docs/solutions/database-issues
module: admin/products
problem_type: database_issue
component: database
symptoms:
  - "Toast \"Ошибка сохранения\" when user removes existing primary photo and uploads a replacement in the same save"
  - "Postgres error 23505 (unique_violation), constraint product_images_one_primary_per_product"
  - "Workaround: split into two saves (delete + Save, then upload + Save)"
  - "Bug never surfaces on single-photo edits, pure reorders, or non-primary additions"
root_cause: logic_error
resolution_type: code_fix
severity: high
tags:
  - supabase
  - postgres
  - partial-unique-index
  - product-images
  - is-primary
  - syncimages
  - admin-panel
related_components:
  - admin_products_modal
  - supabase_storage
---

# Save fails with Postgres 23505 when swapping primary product image in one save

## Problem

In the admin product editor (`app/admin/products/page.tsx`), saving a product where the user removed the existing primary photo AND uploaded a replacement primary photo in the same save attempt failed with a generic toast "Ошибка сохранения". The bug lived in `syncImages()`, which mutated `product_images` rows in an order that briefly held two `is_primary=true` rows for the same product — violating the partial unique index that enforces "one primary per product".

## Symptoms

- User flow: in admin product modal, delete the current primary photo, upload a new photo (which auto-becomes primary), click Save.
- Toast: "Ошибка сохранения"; product not updated.
- Server response surfaced Postgres error code `23505` (unique_violation), constraint `product_images_one_primary_per_product` (partial unique on `(product_id) WHERE is_primary`).
- User workaround: save twice — first delete the old primary, save; then add the new photo, save again. With the two operations split across saves, only one `is_primary=true` row exists at any moment, so the index is satisfied.
- Did not surface during single-photo edits or pure reorders, because no second `is_primary=true` row was ever attempted.

## What Didn't Work

The original `syncImages` used a single loop through the desired images:

- For each desired image: if it has an `id` matching an existing row → `UPDATE` it with the final `is_primary` value. Otherwise → `INSERT` it with the final `is_primary` value.
- After the loop, compute orphans (`existingIds \ keepIds`) and `DELETE` them, then call `storage.remove()` to clean blobs.

Why it seemed reasonable: it's the most natural "diff and apply" shape, mirrors the desired state in one pass, and worked for every scenario except the one where two rows briefly carried `is_primary=true`. The partial unique index `WHERE is_primary` only checks rows where the predicate is true, so for non-primary edits nothing fired.

Why it failed: when the user removes the old primary AND adds a new primary in the same save, the loop runs `INSERT ... is_primary=true` while the soon-to-be-deleted old primary row is still alive (DELETE is the last step). The partial unique index sees two rows satisfying its `WHERE is_primary` predicate for the same `product_id` and rejects the INSERT with 23505.

Considered but not pursued:

- **Wrap everything in a Postgres transaction via an RPC PL/pgSQL stored procedure.** Truly atomic, but overkill for a small magazin (~20 products) and adds a server-side function to maintain. Reserved as the escape hatch if cross-row atomicity guarantees become necessary.
- **`SET CONSTRAINTS ... DEFERRED`.** Doesn't apply: in Postgres, partial unique indexes are not deferrable — only declared `UNIQUE` / `PRIMARY KEY` constraints created with `DEFERRABLE` can be deferred, and a `CREATE UNIQUE INDEX ... WHERE` predicate isn't a deferrable constraint at all.
- **One-line patch: `UPDATE old.is_primary = false` first.** Close to the right idea but doesn't generalize — it ignores reorder-among-existing and replace-by-id-collision scenarios. The full reordering below covers all scenarios uniformly.

## Solution

Rewrite `syncImages` so the operation order guarantees the partial unique index predicate's truth set never exceeds one row in flight. Five steps, in order:

1. **Clear `is_primary=false` on every surviving existing row** (`UPDATE ... WHERE id IN keepIds`). Frees the partial unique index for this product.
2. **DELETE orphan rows** (existing rows not in the desired set), then `storage.remove()` for their blob paths. Preserves the orphan-cleanup behavior introduced in PR #12.
3. **UPDATE existing rows for every field except `is_primary`** (`url`, `alt`, `sort_order`). Safe because step 1 already zeroed primary on all of them.
4. **INSERT new rows with `is_primary=false`.** Track inserted ids in a `Map<NormalizedImage, number>` keyed by the source object reference (not by `url` or any value field, which may collide after edits).
5. **One final UPDATE setting `is_primary=true` on the chosen row.** Resolve the id by checking whether the desired primary is an existing row (use `primaryDesired.id`) or a freshly inserted one (look it up in the Map).

The Map-by-reference trick (step 4 → step 5): keying by the normalized image object itself sidesteps the need for a synthetic correlation id. We already hold the same object reference in `primaryDesired`, so `insertedIdByImage.get(primaryDesired)` returns the row id without any string/url comparison.

The auto-promote behavior is preserved: a `hasPrimary` check keeps the existing rule that when no image is flagged primary, the first one (`idx === 0`) is promoted.

Concrete code in `app/admin/products/page.tsx` (after fix):

```typescript
async function syncImages(productId: number, images: ProductImageInput[]) {
  const { data: existing } = await supabase
    .from('product_images')
    .select('id, url')
    .eq('product_id', productId)
  const existingRows = existing ?? []
  const existingIds = new Set(existingRows.map((row) => row.id))

  const hasPrimary = images.some((img) => img.is_primary)
  const normalized = images.map((img, idx) => ({
    id: img.id,
    url: img.url,
    alt: img.alt ?? null,
    sort_order: idx,
    is_primary: img.is_primary || (!hasPrimary && idx === 0),
  }))

  const toUpdate = normalized.filter((img) => img.id != null && existingIds.has(img.id))
  const toInsert = normalized.filter((img) => img.id == null || !existingIds.has(img.id))
  const keepIds = new Set(toUpdate.map((img) => img.id as number))
  const toDelete = Array.from(existingIds).filter((id) => !keepIds.has(id))

  // Step 1: clear is_primary on all surviving existing rows
  if (toUpdate.length > 0) {
    const { error } = await supabase.from('product_images')
      .update({ is_primary: false })
      .in('id', Array.from(keepIds))
    if (error) throw error
  }

  // Step 2: DELETE orphans + Storage cleanup (preserved from PR #12)
  if (toDelete.length > 0) {
    const { error } = await supabase.from('product_images')
      .delete().in('id', toDelete)
    if (error) throw error
    // ... storage.from('media').remove(orphanPaths) ...
  }

  // Step 3: UPDATE existing — fields except is_primary
  for (const img of toUpdate) {
    const { error } = await supabase.from('product_images')
      .update({ url: img.url, alt: img.alt, sort_order: img.sort_order })
      .eq('id', img.id as number)
    if (error) throw error
  }

  // Step 4: INSERT new rows with is_primary=false
  const insertedIdByImage = new Map<typeof normalized[number], number>()
  for (const img of toInsert) {
    const { data: inserted, error } = await supabase.from('product_images')
      .insert({ product_id: productId, url: img.url, alt: img.alt,
                sort_order: img.sort_order, is_primary: false })
      .select('id').single()
    if (error) throw error
    if (inserted?.id) insertedIdByImage.set(img, inserted.id)
  }

  // Step 5: one final UPDATE to set is_primary=true on the chosen row
  const primaryDesired = normalized.find((img) => img.is_primary)
  if (primaryDesired) {
    const primaryId = primaryDesired.id != null && existingIds.has(primaryDesired.id)
      ? primaryDesired.id
      : insertedIdByImage.get(primaryDesired)
    if (primaryId != null) {
      const { error } = await supabase.from('product_images')
        .update({ is_primary: true }).eq('id', primaryId)
      if (error) throw error
    }
  }
}
```

Database constraint (in migrations under `db/migrations/`):

```
"product_images_one_primary_per_product"  UNIQUE, btree (product_id) WHERE is_primary
```

## Why This Works

Key insight: the partial unique index only constrains rows whose `is_primary` is `true`. If at every in-flight moment there is at most one such row per `product_id`, the constraint is trivially satisfied no matter how many INSERT/UPDATE/DELETE statements we issue.

Step 1 reduces the count of `is_primary=true` rows for this product to zero. Steps 2-4 only ever insert or update rows with `is_primary=false`, so the count stays at zero. Step 5 raises the count back to exactly one (a single targeted UPDATE on a chosen id). The predicate's truth set goes 1 (or N) → 0 → 0 → 0 → 1. Never two.

**Atomicity caveat:** `supabase-js` has no client-side transactions, so the five steps are independent HTTP round-trips. Between step 1 and step 5 the product is briefly without any primary image. This is acceptable because:

- The rendering layer already falls back: `is_primary ?? first row by sort_order ?? legacy image_url`, so the storefront never shows nothing.
- The window is sub-second on a save click; no other user-facing surface mutates `is_primary` concurrently.
- A failed save mid-sequence leaves the product without a primary, but the next successful save (or the fallback) repairs it. For the magazin's scale this is the right trade vs. an RPC.

If atomicity ever matters (concurrent admins, audit, multi-table invariants), wrap steps 1-5 in a PL/pgSQL RPC.

## Prevention

- **Partial unique index discipline.** When mutating rows guarded by a partial unique index (`UNIQUE (...) WHERE predicate`), explicitly plan the operation order so the predicate's truth set never exceeds the allowed cardinality at any in-flight moment. Treat the predicate's truth set as a tracked invariant, not an afterthought.
- **"Clear all → set new" beats "set new → clear old"** for any reorderable collection of "primary"/"default"/"active"-flagged children. Same shape applies to default address, default payment method, default variant, etc. — favor demote-then-promote.
- **Prefer narrow UPDATEs for the constrained column.** Don't bundle the constrained boolean (`is_primary`) into the same UPDATE that edits unrelated fields. Separating them makes ordering explicit and reviewable.
- **Use Supabase RPC PL/pgSQL only when client-side ordering is genuinely insufficient** — concurrent writers, audit requirements, multi-table invariants. For a single-admin small catalog, the cost of brief inconsistency is lower than the cost of maintaining an RPC.
- **Partial unique indexes are not deferrable in Postgres.** If a constraint must hold transiently as a deferred check, redeclare it as a `UNIQUE` constraint with a discriminator column, or use a CHECK + trigger pattern. Don't reach for `SET CONSTRAINTS DEFERRED` on a partial index — it won't apply.
- **Smoke test the exact bug shape.** A vitest-style test driving `syncImages` through the failing scenario would have caught this in CI. The test pattern generalizes to any future "swap the flagged child" feature:

```typescript
import { describe, it, expect } from 'vitest'

describe('syncImages — primary swap in one save', () => {
  it('removes old primary and adds new primary without 23505', async () => {
    const productId = 1
    // seed: one existing primary row id=10
    await syncImages(productId, [
      { id: 10, url: 'old.jpg', alt: null, is_primary: true },
    ])
    // user removes id=10 and uploads a new primary in one go
    await expect(
      syncImages(productId, [
        { url: 'new.jpg', alt: null, is_primary: true },
      ])
    ).resolves.not.toThrow()
    // assert exactly one is_primary=true row, and it points at new.jpg
  })
})
```

## Related Issues

- PR #17 — this fix (`fix/admin-product-images-sync-order`, merged 2026-05-05).
- PR #12 — added `supabase.storage.from('media').remove(paths)` after `product_images.delete()`. Preserved as Step 2 of the new ordering. Cross-reference when describing storage cleanup behavior.
- PR #14 — admin top-bar cleanup; same file (`app/admin/products/page.tsx`) but unrelated to the bug.
- (auto memory) `feedback_supabase_storage_file_layout.md` — Storage stores objects as `path/<version-uuid>` directories. Same module (`admin/products` + Supabase Storage), unrelated cause; flagged as cross-reference for anyone digging into product_images storage interactions.
- (session history) The diagnosis and fix arc was a single-session effort (session `a5c9ecd3`, 2026-05-02 to 2026-05-05). The constraint root cause was identified directly on first investigation (no prior failed approaches recorded); the inline 5-step structure with comments was an explicit choice to make the invariant self-documenting in the diff.
