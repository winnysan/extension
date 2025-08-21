import * as vscode from 'vscode'
import { HttpMethod, RestRequest } from './core/Http'
import { RestClient } from './services/RestClient'

export function activate(context: vscode.ExtensionContext) {
  // Zobrazenie po spusteni rozsirenia
  vscode.window.showInformationMessage('Ahoj')

  const disposable = vscode.commands.registerCommand('extension.test', async () => {
    try {
      const client = new RestClient()
      const req = new RestRequest({
        name: 'Sample GET',
        method: HttpMethod.GET,
        url: 'https://httpbin.org/get',
        headers: { Accept: 'application/json' },
        query: { demo: true, q: 'rest-client' },
      })

      const res = await client.send(req)

      const snippet = res.bodyText.length > 400 ? res.bodyText.slice(0, 400) + '…' : res.bodyText
      vscode.window.showInformationMessage(`GET ${res.url}\n${res.status} (${res.timeMs} ms)\n\n${snippet}`)
    } catch (err: any) {
      vscode.window.showErrorMessage(`Request zlyhal: ${err?.message ?? String(err)}`)
    }
  })

  context.subscriptions.push(disposable)
}

export function deactivate() {
  //
}
