import { TriangleAlert } from 'lucide-react'
import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { VERSION_INFO } from '@/app/version'
import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher'
import { Logo } from '@/shared/ui/Logo'
import { Button } from '@/shared/ui/components/button'
import { Callout, CalloutIcon, CalloutText } from '@/shared/ui/components/callout'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/shared/ui/components/dialog'
import { GitHubIcon } from '@/shared/ui/icons'

export type OpenMode = 'first-visit' | 'manual'

export interface WelcomeModalProps {
  isOpen: boolean
  mode: OpenMode
  onAccept: () => void
  trigger?: React.ReactNode
}

export function WelcomeModal({ isOpen, mode, onAccept, trigger }: WelcomeModalProps): React.JSX.Element {
  const { t } = useTranslation('welcome')
  const isFirstVisit = mode === 'first-visit'

  const handleOpenChange = (open: boolean): void => {
    if (!isFirstVisit && !open) {
      onAccept()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        aria-describedby={undefined}
        className="h-full max-h-[90vh] max-w-[90vw] overflow-y-auto"
        onEscapeKeyDown={e => {
          if (isFirstVisit) e.preventDefault()
        }}
        onPointerDownOutside={e => {
          if (isFirstVisit) e.preventDefault()
        }}
        onInteractOutside={e => {
          if (isFirstVisit) e.preventDefault()
        }}
        showCloseButton={!isFirstVisit}
      >
        <div className="flex flex-col gap-4">
          <DialogTitle>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Logo />
              </div>
              <div className="flex items-center gap-2 pr-5">
                <LanguageSwitcher size="lg" />
              </div>
            </div>
          </DialogTitle>

          <div className="mt--2 flex flex-col gap-3 p-0">
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
              <Button size="lg" onClick={onAccept} className="w-full">
                {t($ => $.continueButton)}
              </Button>
              {isFirstVisit && <span className="flex items-center text-sm">{t($ => $.reviewInfo)}</span>}
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
      </DialogContent>
    </Dialog>
  )
}
