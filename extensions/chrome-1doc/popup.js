import { hubOrigin } from './hub-url.js';
const get = (id) => document.getElementById(id);
let captured;
let downloadLinks = [];
const status = (message) => {
  get('status').textContent = message;
};
const saved = await chrome.storage.local.get(['hubUrl', 'token', 'lastResult']);
get('hubUrl').value = saved.hubUrl || 'http://localhost:5173';
get('token').value = saved.token || '';
get('config').open = !saved.token;
if (saved.lastResult) {
  get('last').href = saved.lastResult.url;
  get('last').hidden = false;
}
get('settings').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const hubUrl = hubOrigin(get('hubUrl').value);
    const token = get('token').value.trim();
    if (!(await chrome.permissions.request({ origins: [`${hubUrl}/*`] })))
      throw new Error('Acesso ao Hub não autorizado.');
    const response = await fetch(`${hubUrl}/api/extension/session`, {
      credentials: 'omit',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error('Chave inválida, expirada ou sem permissão para demandas.');
    await chrome.storage.local.set({ hubUrl, token });
    status(`Conectado como ${data.name}.`);
    get('config').open = false;
  } catch (error) {
    status(error.message);
  }
});
get('disconnect').addEventListener('click', async () => {
  await chrome.storage.local.remove(['token', 'lastResult']);
  get('token').value = '';
  get('last').hidden = true;
  status('Desconectado. Para invalidar a chave, revogue-a em Meu perfil.');
});
get('collect').addEventListener('click', async () => {
  get('collect').disabled = true;
  captured = undefined;
  get('preview').hidden = true;
  status('Coletando documento e despachos…');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['collector.js'] });
    const [{ result: collected }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const payload = globalThis.ugbCollectOneDoc();
        return { payload, downloadLinks: globalThis.ugbOneDocDownloadLinks?.() || [] };
      },
    });
    const { payload } = collected;
    downloadLinks = collected.downloadLinks;
    const result = await chrome.runtime.sendMessage({ type: 'LOOKUP_1DOC', payload });
    if (!result.ok) throw new Error(result.error);
    captured = payload;
    get('summary').textContent =
      `${payload.documentType} ${payload.number}\n${payload.title}\n${payload.dispatches.length} despachos carregados.`;
    get('kind').value = result.data.demand?.kind || 'SUPORTE';
    get('save').textContent = result.data.exists ? 'Atualizar demanda' : 'Salvar demanda';
    get('preview').hidden = false;
    status(payload.warnings.join('\n'));
  } catch (error) {
    status(error.message || 'Falha ao coletar.');
  } finally {
    get('collect').disabled = false;
  }
});
get('save').addEventListener('click', async () => {
  if (!captured) return;
  get('save').disabled = true;
  get('collect').disabled = true;
  try {
    const result = await chrome.runtime.sendMessage({
      type: 'IMPORT_1DOC',
      payload: { ...captured, kind: get('kind').value },
      downloadLinks,
    });
    if (!result.ok) throw new Error(result.error);
    status(
      `Demanda ${result.data.created ? 'salva' : 'atualizada'}. ${result.data.dispatches} despachos preservados.\n${(result.data.warnings || []).join('\n')}`,
    );
    get('save').textContent = 'Atualizar demanda';
  } catch (error) {
    status(error.message || 'Falha ao salvar.');
  } finally {
    get('save').disabled = false;
    get('collect').disabled = false;
  }
});
