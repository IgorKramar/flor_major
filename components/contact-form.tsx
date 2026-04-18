"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { submitLead, type SubmitLeadState } from "@/app/actions/submit-lead"

const INITIAL_STATE: SubmitLeadState = { success: false, message: "" }

interface ContactFormProps {
  thanksActive?: boolean
}

export function ContactForm({ thanksActive = false }: ContactFormProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(submitLead, INITIAL_STATE)
  const [touched, setTouched] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!state.success) return
    formRef.current?.reset()
    if (thanksActive) {
      router.push('/thanks')
    }
  }, [state.success, thanksActive, router])

  const fieldError = (key: string) => state.fieldErrors?.[key]

  return (
    <form
      ref={formRef}
      action={formAction}
      className="bg-card p-5 sm:p-7 md:p-10 rounded-2xl shadow-xl shadow-black/8"
      aria-label="Форма обратной связи"
    >
      <div className="space-y-4 sm:space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Ваше имя <span className="text-destructive">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Как к вам обращаться?"
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 border-border bg-background focus:border-primary focus:bg-card focus:shadow-[0_0_0_4px_rgba(200,159,159,0.2)] outline-none transition-all text-sm sm:text-base"
            aria-required="true"
            aria-invalid={!!fieldError("name") || undefined}
          />
          {fieldError("name") && (
            <p className="mt-1 text-xs text-destructive">{fieldError("name")}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-2">
            Телефон <span className="text-destructive">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            placeholder="+7 (___) ___-__-__"
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 border-border bg-background focus:border-primary focus:bg-card focus:shadow-[0_0_0_4px_rgba(200,159,159,0.2)] outline-none transition-all text-sm sm:text-base"
            aria-required="true"
            aria-invalid={!!fieldError("phone") || undefined}
          />
          {fieldError("phone") && (
            <p className="mt-1 text-xs text-destructive">{fieldError("phone")}</p>
          )}
        </div>

        <div>
          <label htmlFor="interest" className="block text-sm font-medium mb-2">
            Что вас интересует?
          </label>
          <input
            id="interest"
            name="interest"
            type="text"
            placeholder="Например: букет на 8 марта"
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 border-border bg-background focus:border-primary focus:bg-card focus:shadow-[0_0_0_4px_rgba(200,159,159,0.2)] outline-none transition-all text-sm sm:text-base"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2">
            Сообщение
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            placeholder="Детали заказа, бюджет, пожелания..."
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 border-border bg-background focus:border-primary focus:bg-card focus:shadow-[0_0_0_4px_rgba(200,159,159,0.2)] outline-none transition-all resize-y text-sm sm:text-base"
          />
        </div>

        {state.message && touched && (
          <div
            className={cn(
              "p-3 rounded-lg text-sm",
              state.success
                ? "bg-secondary/20 text-secondary"
                : "bg-destructive/10 text-destructive"
            )}
            role="alert"
          >
            {state.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          onClick={() => setTouched(true)}
          className="w-full py-3 sm:py-3.5 bg-primary text-primary-foreground rounded-full font-medium uppercase tracking-wide text-xs hover:bg-primary/90 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Spinner className="w-4 h-4" />
              <span>Отправка...</span>
            </>
          ) : (
            "Отправить заявку"
          )}
        </button>
      </div>
    </form>
  )
}
