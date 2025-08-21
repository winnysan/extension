import * as vscode from 'vscode'
import { Environment } from './core/Environment'
import { HttpMethod, RestRequest } from './core/Http'
import { RestClient } from './services/RestClient'

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.openRestView', () => {
      const panel = vscode.window.createWebviewPanel('restClient', 'REST Klient', vscode.ViewColumn.One, {
        enableScripts: true,
      })

      panel.webview.html = getWebviewContent(panel.webview)

      panel.webview.onDidReceiveMessage(async msg => {
        if (msg.type === 'sendRequest') {
          try {
            const client = new RestClient()

            const env = new Environment('DEV', {
              base: 'https://httpbin.org',
              token: 'dev-token-123',
              query: 'rest-client',
            })

            const req = new RestRequest({
              method: msg.payload.method as HttpMethod,
              url: msg.payload.url,
              headers: msg.payload.headers,
              body: msg.payload.body,
            })

            const res = await client.send(req, env)
            panel.webview.postMessage({ type: 'response', payload: res })
          } catch (err: any) {
            panel.webview.postMessage({ type: 'response', payload: { error: err.message } })
          }
        }
      })
    }),
  )
}

export function deactivate() {
  //
}

function getWebviewContent(webview: vscode.Webview): string {
  const nonce = makeNonce()
  const csp = webview.cspSource

  return /* html */ `<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; img-src ${csp} https: data:; style-src ${csp} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>REST Klient</title>
  <style>
    :root { --gap: 12px; --border:#2a2a2a22; --muted:#777; }
    html, body { height: 100%; }
    body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; display: flex; height: 100%; }
    .col { flex: 1; box-sizing: border-box; padding: var(--gap); overflow: auto; border-right: 1px solid var(--border); }
    .col:last-child { border-right: none; }
    h2 { margin: 4px 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
    label { display: block; font-size: 12px; color: var(--muted); margin: 10px 0 4px; }
    input, select, textarea { width: 100%; box-sizing: border-box; font: 13px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; }
    input, select { padding: 8px; }
    textarea { padding: 8px; min-height: 140px; resize: vertical; }
    .row { display: flex; gap: var(--gap); }
    .row > * { flex: 1; }
    .btn { margin-top: 12px; padding: 8px 12px; font-size: 13px; cursor: pointer; }
    .meta { font-size: 12px; color: var(--muted); margin: 6px 0 10px; }
    .pill { display:inline-block; padding:2px 8px; border:1px solid var(--border); border-radius:999px; margin-right:6px; }
    .respbox { border: 1px solid var(--border); padding: 8px; border-radius: 6px; background: transparent; }
    pre { white-space: pre-wrap; word-break: break-word; margin: 0; }
    details { border: 1px solid var(--border); border-radius: 6px; padding: 6px; }
    details + details { margin-top: 8px; }
    summary { cursor: pointer; user-select: none; }
  </style>
</head>
<body>
  <!-- ĽAVO: REQUEST -->
  <div class="col">
    <h2>Request</h2>

    <label>URL</label>
    <input id="url" value="https://httpbin.org/get" />

    <div class="row">
      <div>
        <label>Method</label>
        <select id="method">
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>PATCH</option>
          <option>DELETE</option>
          <option>HEAD</option>
          <option>OPTIONS</option>
        </select>
      </div>
      <div>
        <label>Query (JSON)</label>
        <input id="query" placeholder='{"q":"rest"}' />
      </div>
    </div>

    <label>Headers (JSON)</label>
    <textarea id="headers">{ "Accept": "application/json" }</textarea>

    <label>Body (raw)</label>
    <textarea id="body"></textarea>

    <button class="btn" id="send">Send</button>
    <div class="meta"><span class="pill" id="meta"></span></div>
  </div>

  <!-- PRAVO: RESPONSE -->
  <div class="col">
    <h2>Response</h2>
    <div id="resp" class="respbox">Žiadna odpoveď zatiaľ…</div>
    <div style="margin-top:12px;" id="respHeaders"></div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    const $ = (id) => document.getElementById(id);

    $('send').addEventListener('click', () => {
      const url = $('url').value.trim();
      const method = $('method').value;
      const body = $('body').value;

      let headers = {};
      let query = undefined;

      try { headers = JSON.parse($('headers').value || '{}'); }
      catch (e) { return showResp({ error: 'Headers musia byť validný JSON' }); }

      const qVal = $('query').value.trim();
      if (qVal) {
        try { query = JSON.parse(qVal); }
        catch (e) { return showResp({ error: 'Query musí byť validný JSON' }); }
      }

      vscode.postMessage({ type: 'sendRequest', payload: { url, method, headers, body, query } });
      $('meta').textContent = 'Sending…';
    });

    window.addEventListener('message', (ev) => {
      const msg = ev.data;
      if (msg.type === 'response') {
        const res = msg.payload;
        if (res.error) {
          $('meta').textContent = 'Error';
          $('resp').innerHTML = '<pre>⛔ ' + escapeHtml(res.error) + '</pre>';
          $('respHeaders').innerHTML = '';
          return;
        }

        $('meta').textContent = res.status + ' ' + res.statusText + ' • ' + res.timeMs + ' ms';

        // Body pretty print (ak je to JSON)
        let body = res.bodyText;
        try { body = JSON.stringify(JSON.parse(res.bodyText), null, 2); } catch {}
        $('resp').innerHTML = '<pre>' + escapeHtml(body) + '</pre>';

        // Headers render
        const h = res.headers || {};
        const list = Object.keys(h).sort().map(k => '<div><code>' + escapeHtml(k) + ':</code> ' + escapeHtml(String(h[k])) + '</div>').join('');
        $('respHeaders').innerHTML = '<details open><summary>Headers</summary>' + list + '</details>';
      }
    });

    function escapeHtml(s) {
      return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
    }
  </script>
</body>
</html>`
}

function makeNonce(): string {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) text += possible.charAt(Math.floor(Math.random() * possible.length))
  return text
}
