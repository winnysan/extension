import * as vscode from 'vscode'

export function activate(context: vscode.ExtensionContext) {
  // Zobrazenie po spusteni rozsirenia
  vscode.window.showInformationMessage('Ahoj')

  // Zaregistrovanie prikazu do Command Palette
  const disposable = vscode.commands.registerCommand('extension.ahoj', () => {
    vscode.window.showInformationMessage('Ahoj')
  })

  context.subscriptions.push(disposable)
}

export function deactivate() {
  //
}
