export type EnvMap = Record<string, string>

export class Environment {
  readonly name: string
  readonly variables: EnvMap

  constructor(name: string, variables: EnvMap = {}) {
    this.name = name
    this.variables = variables
  }

  get(key: string): string | undefined {
    return this.variables[key]
  }

  has(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.variables, key)
  }
}
