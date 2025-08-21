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
  async send(req: RestRequest): Promise<RestResponse> {
    const url = this.buildUrl(req.url, req.query)
    const started = Date.now()

    const res = await fetch(url, {
      method: req.method,
      headers: req.headers,
      body: this.shouldHaveBody(req.method) ? req.body : undefined,
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
}
