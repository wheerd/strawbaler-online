import { ExternalLink, Play } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface LazyYouTubeEmbedProps {
  videoId: string
}

export function LazyYouTubeEmbed({ videoId }: LazyYouTubeEmbedProps): React.JSX.Element {
  const { t } = useTranslation('welcome')
  const [isLoaded, setIsLoaded] = useState(false)

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
  const videoTitle = t($ => $.showcaseVideo.videoTitle)

  if (isLoaded) {
    return (
      <iframe
        className="aspect-video w-full rounded-lg"
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
        title={videoTitle}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => {
          setIsLoaded(true)
        }}
        className="group relative aspect-video w-full overflow-hidden rounded-lg bg-black"
        aria-label={t($ => $.showcaseVideo.playVideo)}
      >
        <img
          src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
          alt={videoTitle}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-10 bg-black/30 transition-colors group-hover:bg-black/40">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-110">
            <Play className="h-8 w-8 text-gray-900" fill="currentColor" />
          </div>
          <span className="text-sm text-white">
            {t($ => $.showcaseVideo.watchOnYouTube)}{' '}
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 underline hover:text-gray-700"
            >
              YouTube
              <ExternalLink className="h-3 w-3" />
            </a>
          </span>
        </div>
      </button>
    </div>
  )
}
