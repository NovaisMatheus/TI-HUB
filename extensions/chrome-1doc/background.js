async function copyAttachments(payload, hubUrl, token, downloadLinks) {
  const attachments = [
    ...(payload.attachments || []),
    ...(payload.dispatches || []).flatMap((dispatch) => dispatch.attachments || []),
  ];
  const copied = new Map();
  payload.warnings ||= [];
  for (const attachment of attachments) {
    if (!['file', 'image'].includes(attachment.kind)) continue;
    delete attachment.fileId;
    if (copied.has(attachment.url)) {
      Object.assign(attachment, copied.get(attachment.url));
      continue;
    }
    try {
      if (copied.size >= 50)
        throw new Error('Limite de 50 arquivos por coleta; anexe os restantes no processo.');
      const url = new URL(attachment.url);
      if (url.protocol !== 'https:' || url.username || url.password)
        throw new Error('Link de arquivo inválido.');
      if (
        !url.hostname.endsWith('.1doc.com.br') &&
        !(await chrome.permissions.contains({ origins: [`${url.origin}/*`] }))
      )
        throw new Error('Download externo exige acesso ao domínio; anexe o arquivo no processo.');
      const ephemeral = downloadLinks.find((link) => link.url === attachment.url)?.downloadUrl;
      let downloadUrl = url.href;
      if (ephemeral) {
        const original = new URL(ephemeral),
          sanitized = new URL(ephemeral);
        sanitized.hash = '';
        for (const key of [...sanitized.searchParams.keys()])
          if (
            /token|senha|password|session|csrf|auth|^x-amz-|^signature$|^expires$|^awsaccesskeyid$/i.test(
              key,
            )
          )
            sanitized.searchParams.delete(key);
        if (
          sanitized.href === url.href &&
          original.protocol === 'https:' &&
          !original.username &&
          !original.password
        )
          downloadUrl = original.href;
      }
      const response = await fetch(downloadUrl, {
        credentials: 'include',
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok || /text\/html/i.test(response.headers.get('Content-Type') || ''))
        throw new Error('O 1Doc não liberou o arquivo; baixe e anexe no processo.');
      if (Number(response.headers.get('Content-Length')) > 8 * 1024 * 1024)
        throw new Error('Arquivo acima de 8 MB.');
      const reader = response.body.getReader(),
        chunks = [];
      let size = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 8 * 1024 * 1024) {
          await reader.cancel();
          throw new Error('Arquivo acima de 8 MB.');
        }
        chunks.push(part.value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const parts = [];
      for (let index = 0; index < bytes.length; index += 32768)
        parts.push(String.fromCharCode(...bytes.subarray(index, index + 32768)));
      let name = attachment.name;
      const filename = response.headers
        .get('Content-Disposition')
        ?.match(/filename="?([^";]+)/i)?.[1];
      if (!/\.[a-z0-9]{2,5}$/i.test(name)) name = filename || url.pathname.split('/').pop() || name;
      const uploaded = await fetch(`${hubUrl}/api/extension/documents`, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.slice(0, 500),
          dataBase64: globalThis.btoa(parts.join('')),
        }),
        signal: AbortSignal.timeout(45000),
      });
      const result = await uploaded.json();
      if (!uploaded.ok)
        throw new Error(
          typeof result.message === 'string' ? result.message : 'Falha ao copiar arquivo.',
        );
      Object.assign(attachment, {
        fileId: result.fileId,
        extractionStatus: result.extractionStatus,
      });
      copied.set(attachment.url, {
        fileId: result.fileId,
        extractionStatus: result.extractionStatus,
      });
      if (result.extractionStatus !== 'EXTRAIDO')
        payload.warnings.push(
          `${attachment.name}: arquivo copiado, texto ${result.extractionStatus}; confira no processo.`.slice(
            0,
            2000,
          ),
        );
    } catch (error) {
      attachment.extractionStatus = 'NAO_COPIADO';
      copied.set(attachment.url, { extractionStatus: 'NAO_COPIADO' });
      payload.warnings.push(`${attachment.name}: ${error.message}`.slice(0, 2000));
    }
  }
  payload.warnings = payload.warnings.slice(0, 100);
}
async function importDocument(payload, downloadLinks = []) {
  const { hubUrl = 'http://localhost:5173', token } = await chrome.storage.local.get([
    'hubUrl',
    'token',
  ]);
  if (!token) throw new Error('Configure a chave da extensão no TI Hub → Meu perfil.');
  await copyAttachments(payload, hubUrl, token, Array.isArray(downloadLinks) ? downloadLinks : []);
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
    : importDocument(message.payload, message.downloadLinks)
  )
    .then((data) => reply({ ok: true, data }))
    .catch((error) => reply({ ok: false, error: error.message }));
  return true;
});
