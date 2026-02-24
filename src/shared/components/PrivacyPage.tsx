import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher'
import { Logo } from '@/shared/components/Logo'

const PRIVACY_EMAIL = 'contact@strawbuild.app'

export function PrivacyPage(): React.JSX.Element {
  const { t } = useTranslation('privacy')

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <Link to="/" className="text-muted-foreground text-sm hover:underline">
          {t($ => $.backLink)}
        </Link>
        <LanguageSwitcher size="sm" />
      </div>

      <div className="mb-8 flex items-center gap-3">
        <Logo iconSize={50} compact />
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">{t($ => $.title)}</h1>

          <p className="text-muted-foreground text-sm">{t($ => $.lastUpdated)}</p>
        </div>
      </div>
      <div className="flex flex-col gap-8">
        <section>
          <h2 className="mb-2 text-lg font-semibold">{t($ => $.controller.title)}</h2>
          <p className="text-muted-foreground">{t($ => $.controller.name)}</p>
          <p className="text-muted-foreground">{t($ => $.controller.contact, { email: PRIVACY_EMAIL })}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">{t($ => $.dataCollected.title)}</h2>
          <ul className="text-muted-foreground list-inside list-disc space-y-1">
            <li>{t($ => $.dataCollected.accountData)}</li>
            <li>{t($ => $.dataCollected.projectData)}</li>
            <li>{t($ => $.dataCollected.noPayment)}</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">{t($ => $.purpose.title)}</h2>
          <ul className="text-muted-foreground list-inside list-disc space-y-1">
            <li>{t($ => $.purpose.provide)}</li>
            <li>{t($ => $.purpose.store)}</li>
            <li>{t($ => $.purpose.email)}</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">{t($ => $.storage.title)}</h2>
          <p className="text-muted-foreground mb-2">{t($ => $.storage.intro)}</p>
          <ul className="text-muted-foreground list-inside list-disc space-y-1">
            <li>{t($ => $.storage.local)}</li>
            <li>{t($ => $.storage.supabase)}</li>
            <li>{t($ => $.storage.resend)}</li>
            <li>{t($ => $.storage.netlify)}</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">{t($ => $.thirdParty.title)}</h2>
          <p className="text-muted-foreground mb-2">{t($ => $.thirdParty.intro)}</p>
          <ul className="text-muted-foreground list-inside list-disc space-y-1">
            <li>{t($ => $.thirdParty.supabase)}</li>
            <li>{t($ => $.thirdParty.resend)}</li>
            <li>{t($ => $.thirdParty.netlify)}</li>
          </ul>
          <p className="text-muted-foreground mt-2">{t($ => $.thirdParty.note)}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">{t($ => $.retention.title)}</h2>
          <p className="text-muted-foreground">{t($ => $.retention.content)}</p>
          <p className="text-muted-foreground">{t($ => $.retention.deletion, { email: PRIVACY_EMAIL })}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">{t($ => $.rights.title)}</h2>
          <p className="text-muted-foreground mb-2">{t($ => $.rights.intro)}</p>
          <ul className="text-muted-foreground list-inside list-disc space-y-1">
            <li>{t($ => $.rights.access)}</li>
            <li>{t($ => $.rights.rectification)}</li>
            <li>{t($ => $.rights.erasure)}</li>
            <li>{t($ => $.rights.portability)}</li>
          </ul>
          <p className="text-muted-foreground mt-2">{t($ => $.rights.contact, { email: PRIVACY_EMAIL })}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">{t($ => $.security.title)}</h2>
          <ul className="text-muted-foreground list-inside list-disc space-y-1">
            <li>{t($ => $.security.hashed)}</li>
            <li>{t($ => $.security.https)}</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">{t($ => $.changes.title)}</h2>
          <p className="text-muted-foreground">{t($ => $.changes.content)}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">{t($ => $.contact.title)}</h2>
          <p className="text-muted-foreground">{t($ => $.contact.content, { email: PRIVACY_EMAIL })}</p>
        </section>
      </div>
    </div>
  )
}
