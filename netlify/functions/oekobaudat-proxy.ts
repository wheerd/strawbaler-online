import type { Config, Context } from '@netlify/functions'

const OEKOBAUDAT_BASE = 'https://oekobaudat.de/OEKOBAU.DAT'

const allowedOrigins = [
  'http://localhost:5173',
  'https://strawbuild.app',
  'https://development--strawbuild.netlify.app'
]

export default async (req: Request, context: Context) => {
  const url = new URL(req.url)
  const proxyPath = url.pathname.replace('/api/oekobaudat-proxy/', '')
  const targetUrl = `${OEKOBAUDAT_BASE}/${proxyPath}${url.search}`

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        Accept: 'application/json'
      }
    })

    const body = await response.text()

    const requestOrigin = req.headers.get('origin') ?? ''
    const corsOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : context.site.url

    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: 'Proxy error', message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

export const config: Config = {
  path: '/api/oekobaudat-proxy/*'
}
