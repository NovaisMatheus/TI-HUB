async function importDocument(payload) {
  const { hubUrl = 'http://localhost:5173', token } = await chrome.storage.local.get([
    'hubUrl',
    'token',
  ]);
  if (!token) throw new Error('Configure a chave da extensão no TI Hub → Meu perfil.');
  const response = await fetch(`${hubUrl}/api/imports/1doc`, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.message === 'string' ? data.message : `Falha ao importar (${response.status}).`,
    );
  const url = new URL(data.href, hubUrl);
  if (url.origin !== new URL(hubUrl).origin || !url.pathname.startsWith('/demands/'))
    throw new Error('Resposta inválida do Hub.');
  await chrome.storage.local.set({
    lastResult: {
      url: url.href,
      created: data.created,
      dispatches: data.dispatches,
      at: new Date().toISOString(),
    },
  });
  await chrome.tabs.create({ url: url.href });
  return data;
}
async function lookupDocument(payload) {
  const { hubUrl = 'http://localhost:5173', token } = await chrome.storage.local.get([
    'hubUrl',
    'token',
  ]);
  if (!token) throw new Error('Configure a chave da extensão no TI Hub → Meu perfil.');
  const query = new URLSearchParams({ sourceUrl: payload.sourceUrl, sourceId: payload.sourceId });
  const response = await fetch(`${hubUrl}/api/extension/demand?${query}`, {
    credentials: 'omit',
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      'Não foi possível verificar se a demanda já existe. Verifique a conexão e a chave.',
    );
  return response.json();
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  let contentSender = false;
  try {
    const url = new URL(sender.url);
    contentSender =
      sender.frameId === 0 &&
      typeof sender.tab?.id === 'number' &&
      url.protocol === 'https:' &&
      url.hostname.endsWith('.1doc.com.br');
  } catch {
    /* Not a content-script sender. */
  }
  if (
    sender.id !== chrome.runtime.id ||
    (sender.url !== chrome.runtime.getURL('popup.html') && !contentSender) ||
    !['IMPORT_1DOC', 'LOOKUP_1DOC'].includes(message?.type)
  )
    return;
  (message.type === 'LOOKUP_1DOC'
    ? lookupDocument(message.payload)
    : importDocument(message.payload)
  )
    .then((data) => reply({ ok: true, data }))
    .catch((error) => reply({ ok: false, error: error.message }));
  return true;
});
