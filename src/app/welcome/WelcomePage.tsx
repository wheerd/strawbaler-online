import { TriangleAlert } from 'lucide-react'
import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import { VERSION_INFO } from '@/app/version'
import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher'
import { Logo } from '@/shared/ui/Logo'
import { Button } from '@/shared/ui/components/button'
import { Callout, CalloutIcon, CalloutText } from '@/shared/ui/components/callout'
import { GitHubIcon } from '@/shared/ui/icons'

export function WelcomePage(): React.JSX.Element {
  const { t } = useTranslation('welcome')
  const navigate = useNavigate()

  const handleContinue = () => {
    navigate('/editor')
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher size="lg" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span>{t($ => $.introduction)}</span>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">{t($ => $.keyFeatures.title)}</h3>
              <div className="text-sm">
                <ul className="m-0 list-disc pl-6">
                  {(
                    t($ => $.keyFeatures.items, {
                      returnObjects: true
                    }) as string[]
                  ).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">{t($ => $.plannedFeatures.title)}</h3>
              <div className="text-sm">
                <ul className="m-0 list-disc pl-6">
                  {(
                    t($ => $.plannedFeatures.items, {
                      returnObjects: true
                    }) as string[]
                  ).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">{t($ => $.demoVideo.title)}</h3>
              <span className="text-base">{t($ => $.demoVideo.description)}</span>
              <div className="flex flex-row items-center gap-4">
                <a
                  className="font-bold underline"
                  href="https://www.youtube.com/watch?v=oe9VnhEW0JE"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t($ => $.demoVideo.demo01)}
                </a>
                <a
                  className="font-bold underline"
                  href="https://www.youtube.com/watch?v=7Ed09YNGSn8"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t($ => $.demoVideo.demo02)}
                </a>
              </div>
              <h3 className="font-semibold">{t($ => $.dataStorage.title)}</h3>
              <div className="text-sm">
                {t($ => $.dataStorage.description)}
                <ul className="mt-2 pl-6">
                  {(
                    t($ => $.dataStorage.items, {
                      returnObjects: true
                    }) as string[]
                  ).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
              <span className="text-base">{t($ => $.dataStorage.privacy)}</span>
            </div>

            <Callout color="orange" variant="soft">
              <CalloutIcon>
                <TriangleAlert />
              </CalloutIcon>
              <CalloutText>
                <span className="flex flex-col gap-2">
                  <span className="font-bold">{t($ => $.disclaimer.title)}</span>
                  <span>{t($ => $.disclaimer.intro)}</span>
                  <span className="ml-4 flex flex-col gap-0">
                    {(
                      t($ => $.disclaimer.items, {
                        returnObjects: true
                      }) as string[]
                    ).map((item, index) => (
                      <span key={index}>{index === 3 ? <strong>{item}</strong> : item}</span>
                    ))}
                  </span>
                </span>
              </CalloutText>
            </Callout>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Button size="lg" onClick={handleContinue} className="w-full">
              {t($ => $.continueButton)}
            </Button>
            <span className="flex items-center text-sm">{t($ => $.reviewInfo)}</span>
            <div className="mt-2 flex flex-col items-center gap-1">
              <span className="flex items-center text-sm">
                {t($ => $.version, {
                  version: VERSION_INFO.version
                })}
              </span>
              <div className="flex items-center justify-center gap-2">
                <GitHubIcon width="14" height="14" />
                <a
                  className="text-sm"
                  href="https://github.com/wheerd/strawbuild-studio"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t($ => $.viewOnGitHub)}
                </a>
              </div>
              <span className="text-sm">
                <Trans
                  t={t}
                  i18nKey={$ => $.privacyLink}
                  components={{ link: <Link to="/privacy" className="underline" /> }}
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
