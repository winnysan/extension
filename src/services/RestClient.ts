import { Environment } from '../core/Environment'
import { RestRequest } from '../core/Http'

export interface RestResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  bodyText: string
  timeMs: number
  url: string
}

export class RestClient {
  async send(req: RestRequest, env?: Environment): Promise<RestResponse> {
    // 1 aplikuje environment ak je
    const finalReq = env ? this.applyEnvironment(req, env) : req

    // 2 postavi URL a odosle
    const url = this.buildUrl(finalReq.url, finalReq.query)

    this.assertAbsoluteHttpUrl(url)

    const started = Date.now()

    const res = await fetch(url, {
      method: finalReq.method,
      headers: finalReq.headers,
      body: this.shouldHaveBody(finalReq.method) ? finalReq.body : undefined,
    })

    const bodyText = await res.text()
    const timeMs = Date.now() - started

    // normalizacia headerov
    const headers: Record<string, string> = {}
    res.headers.forEach((value, key) => (headers[key] = value))

    return {
      status: res.status,
      statusText: res.statusText,
      headers,
      bodyText,
      timeMs,
      url,
    }
  }

  private shouldHaveBody(method: string): boolean {
    return !['GET', 'HEAD'].includes(method.toUpperCase())
  }

  private buildUrl(base: string, query?: Record<string, string | number | boolean>): string {
    if (!query || Object.keys(query).length === 0) return base

    const url = new URL(base)
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value))
    }

    return url.toString()
  }

  private interpolateString(input: string, env: Environment): string {
    // nahradi {{var}} hodnotou z env, nezname necha nedotknute
    return input.replace(/{{\s*([\w.-]+)\s*}}/g, (_, key: string) => {
      const value = env.get(key)
      return value !== undefined ? value : `{{${key}}}`
    })
  }

  private assertAbsoluteHttpUrl(url: string): void {
    try {
      const parsed = new URL(url)
      if (!/^https?:$/.test(parsed.protocol)) throw new Error('len http/https su podporovane')
    } catch (err) {
      throw new Error(`Neplatna absolutna URL: ${url}`)
    }
  }

  private applyEnvironment(req: RestRequest, env: Environment): RestRequest {
    // URL
    const url = this.interpolateString(req.url, env)

    // Headers
    const headers: Record<string, string> = {}
    for (const [key, value] of Object.entries(req.headers ?? {})) {
      headers[key] = this.interpolateString(value, env)
    }

    // Query
    let query: Record<string, string | number | boolean> | undefined = undefined
    if (req.query) {
      query = {}
      for (const [key, value] of Object.entries(req.query)) {
        const string = String(value)
        query[key] = this.interpolateString(string, env)
      }
    }

    // Body (raw string)
    const body = typeof req.body === 'string' ? this.interpolateString(req.body, env) : req.body

    return req.with({ url, headers, query, body })
  }
}
