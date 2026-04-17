#!/usr/bin/env -S npx tsx
/**
 * Генерирует TypeScript-типы для Supabase.
 * Запуск: pnpm run types:generate
 *
 * Требует переменные окружения:
 *  - SUPABASE_PROJECT_REF  — идентификатор проекта
 *  - SUPABASE_ACCESS_TOKEN — токен доступа (для supabase CLI)
 */
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const projectRef = process.env.SUPABASE_PROJECT_REF
if (!projectRef) {
  console.error('[generate-types] SUPABASE_PROJECT_REF не задан')
  process.exit(1)
}

const target = resolve(process.cwd(), 'lib/database.types.ts')
const cmd = `npx supabase gen types typescript --project-id ${projectRef} --schema public`

try {
  const output = execSync(cmd, { encoding: 'utf8' })
  writeFileSync(target, output, 'utf8')
  console.log(`[generate-types] типы сохранены: ${target}`)
} catch (error) {
  console.error('[generate-types] ошибка генерации', error)
  process.exit(1)
}
