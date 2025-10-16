import type { PluginOption, ResolvedConfig } from 'vite'

export function nonBlockingStylesPlugin(): PluginOption {
  let resolvedConfig: ResolvedConfig | null = null

  return {
    name: 'non-blocking-styles',
    enforce: 'post',
    configResolved(config) {
      resolvedConfig = config
    },
    transformIndexHtml(html: string) {
      if (resolvedConfig?.command !== 'build') {
        return html
      }

      return html.replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/g, (_match, href: string) =>
        [
          `<link rel="preload" href="${href}" as="style" crossorigin>`,
          `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'">`,
          `<noscript><link rel="stylesheet" href="${href}" crossorigin></noscript>`
        ].join('')
      )
    }
  }
}
