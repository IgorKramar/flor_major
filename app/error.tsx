"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[app] render error", error)
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-lg text-center space-y-4">
        <h1 className="font-heading text-4xl">Что-то пошло не так</h1>
        <p className="text-muted-foreground">
          Мы уже знаем о проблеме и работаем над ней.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium uppercase tracking-wide text-xs hover:bg-primary/90 transition-all"
        >
          Попробовать снова
        </button>
      </div>
    </main>
  )
}
