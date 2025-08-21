export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export type HeaderMap = Record<string, string>
export type QueryMap = Record<string, string | number | boolean>

export interface RestRequestInit {
  readonly name?: string
  readonly method: HttpMethod
  readonly url: string // plná URL (MVP bez env)
  readonly headers?: HeaderMap
  readonly body?: string // MVP: raw string/JSON
  readonly query?: QueryMap // MVP: jednoduché ?a=1&b=2
}

export class RestRequest {
  readonly name?: string
  readonly method: HttpMethod
  readonly url: string
  readonly headers: HeaderMap
  readonly body?: string
  readonly query?: QueryMap

  constructor(init: RestRequestInit) {
    this.name = init.name
    this.method = init.method
    this.url = init.url
    this.headers = { ...(init.headers ?? {}) }
    this.body = init.body
    this.query = init.query ? { ...init.query } : undefined

    if (!this.url || !/^https?:\/\//i.test(this.url))
      throw new Error('RestRequest: url musi byt absolutna (http/https)')
  }

  with(overrides: Partial<RestRequestInit>): RestRequest {
    return new RestRequest({
      name: overrides.name ?? this.name,
      method: overrides.method ?? this.method,
      url: overrides.url ?? this.url,
      headers: { ...this.headers, ...(overrides.headers ?? {}) },
      body: overrides.body ?? this.body,
      query: overrides.query ?? this.query,
    })
  }
}
