const get = (id) => document.getElementById(id);
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
    const url = new URL(get('hubUrl').value);
    if (
      url.username ||
      url.password ||
      (url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
    )
      throw new Error('Use HTTPS ou o endereço local do Hub.');
    const hubUrl = url.origin;
    const token = get('token').value.trim();
    if (
      url.protocol === 'https:' &&
      !(await chrome.permissions.request({ origins: [`${url.origin}/*`] }))
    )
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
  status('Coletando documento e despachos…');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['collector.js'] });
    const [{ result: payload }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => globalThis.ugbCollectOneDoc(),
    });
    status(
      `${payload.documentType} ${payload.number}\n${payload.dispatches.length} despachos carregados. Enviando ao Hub…`,
    );
    const result = await chrome.runtime.sendMessage({ type: 'IMPORT_1DOC', payload });
    if (!result.ok) throw new Error(result.error);
    status(
      `Demanda ${result.data.created ? 'criada' : 'atualizada'}. ${result.data.dispatches} despachos preservados.\n${payload.warnings.join('\n')}`,
    );
  } catch (error) {
    status(error.message || 'Falha ao coletar.');
  } finally {
    get('collect').disabled = false;
  }
});
