import { getContactInfo, getSiteSettings } from "@/lib/site-data"

export const revalidate = 60

export default async function MaintenancePage() {
  const [settings, contact] = await Promise.all([getSiteSettings(), getContactInfo()])

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-lg text-center space-y-4">
        <h1 className="font-heading text-4xl">{settings.site_name}</h1>
        <p className="text-lg">Сайт временно недоступен — мы скоро вернёмся.</p>
        {contact.phone_primary && (
          <p className="text-muted-foreground">
            Вы можете позвонить нам:{" "}
            <a
              href={`tel:${contact.phone_primary.replace(/[^\d+]/g, "")}`}
              className="text-primary hover:underline"
            >
              {contact.phone_primary}
            </a>
          </p>
        )}
      </div>
    </main>
  )
}
