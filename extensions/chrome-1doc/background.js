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
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (
    sender.id !== chrome.runtime.id ||
    sender.url !== chrome.runtime.getURL('popup.html') ||
    message?.type !== 'IMPORT_1DOC'
  )
    return;
  importDocument(message.payload)
    .then((data) => reply({ ok: true, data }))
    .catch((error) => reply({ ok: false, error: error.message }));
  return true;
});
