/* Runs only when the user clicks Coletar. No page scripts or hidden inputs are read. */
globalThis.ugbCollectOneDoc = function collectOneDoc() {
  const doc = document;
  const pageUrl = new URL(location.href);
  if (pageUrl.protocol !== 'https:' || !pageUrl.hostname.endsWith('.1doc.com.br'))
    throw new Error('Abra um documento no 1Doc antes de coletar.');
  // Signed download URLs stay in the extension's memory, outside the saved payload.
  const downloadLinks = [];
  globalThis.ugbOneDocDownloadLinks = () => downloadLinks;
  const clean = (value) =>
    (value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n\n')
      .trim();
  function text(node) {
    if (!node) return '';
    const copy = node.cloneNode(true);
    copy
      .querySelectorAll(
        'script,style,noscript,input,select,textarea,button,.dropdown-menu,.btn-group,.quem_leu,.conteudo_quote',
      )
      .forEach((e) => e.remove());
    copy.querySelectorAll('br').forEach((e) => e.replaceWith('\n'));
    copy.querySelectorAll('p,div,tr,li,h4').forEach((e) => e.append('\n'));
    return clean(copy.textContent);
  }
  const one = (root, selector) => root?.querySelector(selector);
  const all = (root, selector) => [...(root?.querySelectorAll(selector) || [])];
  const unique = (values) => [...new Set(values.filter(Boolean))];
  function safeUrl(value) {
    if (!value || value.startsWith('#')) return '';
    try {
      const url = new URL(value, pageUrl);
      if (url.protocol !== 'https:' || url.username || url.password) return '';
      url.hash = '';
      for (const key of [...url.searchParams.keys()])
        if (
          /token|senha|password|session|csrf|auth|^x-amz-|^signature$|^expires$|^awsaccesskeyid$/i.test(
            key,
          )
        )
          url.searchParams.delete(key);
      return url.href;
    } catch {
      return '';
    }
  }
  function participants(root) {
    return all(root, '.media[data-id_usuario],.media[data-id_pessoa]').map((e) => ({
      name:
        clean(one(e, '.media-heading [data-content]')?.getAttribute('data-content')) ||
        text(one(e, '.media-heading')),
      department: one(e, '.badge_env')?.getAttribute('title') || text(one(e, '.badge_env')),
      role: text(one(e, '.media-text')),
      sourceId: e.getAttribute('data-id_usuario') || e.getAttribute('data-id_pessoa') || '',
    }));
  }
  function fields(root) {
    return all(root, '.cp')
      .map((e) => {
        const labelNode = one(e, '[for],label');
        const label = clean(text(labelNode)).replace(/[*:]$/g, '').trim();
        const value =
          clean(labelNode?.getAttribute('data-valor')) ||
          clean(text(e).replace(text(labelNode), '').replace(/^:\s*/, ''));
        return {
          label:
            label || e.className.split(' ').find((c) => c.startsWith('cp_')) || 'Campo adicional',
          value,
        };
      })
      .filter((f) => f.value);
  }
  function attachments(root) {
    function downloadUrl(value) {
      const url = safeUrl(value);
      if (url) downloadLinks.push({ url, downloadUrl: new URL(value, pageUrl).href });
      return url;
    }
    const found = all(
      root,
      '.subemission_anexos a[href],.anexos a[href],.emissao_anexos a[href],a[download],.texto_original a[href]',
    ).map((a) => ({
      name: text(a) || a.getAttribute('download') || a.getAttribute('title') || 'Link',
      url: downloadUrl(a.getAttribute('href')),
      kind: a.closest('.texto_original') ? 'link' : 'file',
      details: a.getAttribute('title') || '',
    }));
    for (const img of all(root, '.texto_original img[src],.emissao_conteudo img[src]'))
      found.push({
        name: img.getAttribute('alt') || 'Imagem do documento',
        url: downloadUrl(img.getAttribute('src')),
        kind: 'image',
        details: '',
      });
    return [...new Map(found.filter((a) => a.url).map((a) => [a.url, a])).values()];
  }
  const header = one(doc, '.page-header-ver');
  const identity = one(header, '.emission_infos_item_atual') || one(header, 'h2');
  const print = one(header, '[data-documento][data-id_emissao]');
  const number =
    text(one(identity, '.nd_num')) || (print?.getAttribute('data-num') || '').replace(/^e-/, '');
  const documentType = text(one(identity, '.nd')) || print?.getAttribute('data-documento') || '';
  const sourceId =
    print?.getAttribute('data-id_emissao') ||
    one(header, '[data-id_emissao]')?.getAttribute('data-id_emissao') ||
    number;
  const original = all(doc, '.emissao_conteudo').find(
    (e) => !e.closest('.despachos,.timeline_conteudo,.despacho'),
  );
  if (!header || !number || !documentType || !original)
    throw new Error(
      'Documento não reconhecido. Abra a página de leitura com o conteúdo original carregado.',
    );
  const originalScope = original.closest('.emissao_corpo') || original;
  const sidebar = one(doc, '.well-header');
  const externalLink = all(header, 'a[href]').find((a) =>
    (a.getAttribute('href') || '').includes('codigo='),
  );
  const rootPeople = participants(sidebar);
  const dispatches = [];
  const seen = new Set();
  for (const node of all(doc, '.despachos .timeline_conteudo[data-ie],.despachos table.despacho')) {
    const entry = node.closest('.timeline_conteudo') || node;
    const id =
      entry.getAttribute('data-ie') ||
      one(entry, '.celula_despacho')?.getAttribute('data-ie') ||
      entry.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const people = participants(entry);
    const contentNode =
      one(entry, '.emissao_conteudo .texto_original') || one(entry, '.emissao_conteudo');
    const dateNode = one(entry, '.despacho_data[title]') || one(entry, '.despacho_data');
    const entryTitle = text(one(entry, '.rf_header strong')) || `Despacho ${dispatches.length + 1}`;
    const ordinal = entryTitle.match(/(\d+)\s*-\s*[\d.]+\/\d{4}/);
    dispatches.push({
      sourceId: id,
      sequence: ordinal ? Number(ordinal[1]) : dispatches.length + 1,
      title: entryTitle,
      author: people[0]?.name || text(one(entry, '.rf_de')),
      dateLabel: dateNode?.getAttribute('title') || text(dateNode),
      content: text(contentNode),
      participants: people,
      recipients: unique([text(one(entry, '.rf_para')), text(one(entry, '.rf_cc'))]),
      attachments: attachments(entry),
      fields: fields(entry),
      status: text(one(entry, '.despacho_data .label')),
      signature: text(one(entry, '.emissao_assinatura')),
      mentions: unique(all(entry, '.mention').map(text)),
      context: text(entry),
    });
  }
  for (const key of [...pageUrl.searchParams.keys()])
    if (!['pg', 'itd', 'id', 'id_emissao', 'hash', 'codigo', 's'].includes(key))
      pageUrl.searchParams.delete(key);
  pageUrl.hash = '';
  const statuses = all(header, 'small.situacao_geral')
    .map(text)
    .filter((t) => !/^Situação geral/i.test(t));
  const subject = text(one(doc, '.tit_assunto'));
  return {
    collectorVersion: '1.0.0',
    source: '1doc',
    sourceUrl: pageUrl.href,
    sourceId,
    number,
    documentType,
    title: subject || `${documentType} ${number}`,
    description: text(one(original, '.texto_original') || original),
    requester: rootPeople[0]?.name || '',
    sourceStatus: statuses.join(' · ') || text(one(identity, '.label')),
    capturedAt: new Date().toISOString(),
    externalUrl: safeUrl(externalLink?.getAttribute('href') || ''),
    externalCode: text(externalLink),
    openedAt: text(one(sidebar, '.horario')),
    participants: rootPeople,
    departments: unique(all(sidebar, '.badge_env').map((e) => e.getAttribute('title') || text(e))),
    tags: unique([
      ...all(header, '.emissao_marcadores .label,.emissao_marcadores .badge').map(text),
      ...all(doc, '#marcadores_ids option:checked').map(text),
    ]),
    fields: fields(originalScope),
    attachments: attachments(originalScope),
    signature: text(one(original, '.emissao_assinatura')),
    dispatches,
    warnings: [
      'Captura dos despachos carregados no documento. Carregue ou expanda os demais antes de coletar novamente.',
      ...dispatches
        .filter((d) => !d.content)
        .map((d) => `${d.title}: conteúdo não carregado; coletado somente o cabeçalho.`),
    ],
  };
};
