import { TriangleAlert } from 'lucide-react'
import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { VERSION_INFO } from '@/app/version'
import { Callout, CalloutIcon, CalloutText } from '@/shared/ui/components/callout'
import { GitHubIcon } from '@/shared/ui/icons'

import { LazyYouTubeEmbed } from './LazyYouTubeEmbed'

export function WelcomePage(): React.JSX.Element {
  const { t } = useTranslation('welcome')

  return (
    <div data-testid="welcome-page" className="flex h-full w-full flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
        <div className="flex flex-col gap-4">
          <span>{t($ => $.introduction)}</span>

          <div className="flex flex-col gap-3">
            <h3 className="font-semibold">{t($ => $.showcaseVideo.title)}</h3>
            <LazyYouTubeEmbed videoId="x1O7Q2uZu0s" />
          </div>

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

          <div className="text-sm text-gray-500">
            <span className="font-medium">{t($ => $.olderDemos.title)}:</span>{' '}
            <a
              className="underline"
              href="https://www.youtube.com/watch?v=oe9VnhEW0JE"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t($ => $.olderDemos.demo01)}
            </a>
            {' · '}
            <a
              className="underline"
              href="https://www.youtube.com/watch?v=7Ed09YNGSn8"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t($ => $.olderDemos.demo02)}
            </a>
          </div>

          <div className="flex flex-col items-center gap-2">
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
                  components={{ privacyLink: <Link to="/privacy" className="underline" /> }}
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
