(() => {
  function mount() {
    if (
      !document.querySelector('.page-header-ver') ||
      document.getElementById('ugb-ti-hub-collector')
    )
      return false;
    const host = document.createElement('div');
    host.id = 'ugb-ti-hub-collector';
    host.style.cssText = 'position:fixed;right:24px;bottom:80px;z-index:2147483646;';
    const root = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent =
      ':host{all:initial;font-family:system-ui,sans-serif}button{cursor:pointer;border:0;border-radius:8px;padding:12px;background:#102c3a;color:#fff;font:600 13px system-ui}button:disabled{opacity:.5}button:focus-visible,select:focus-visible{outline:3px solid #b58a50;outline-offset:2px}.panel{position:absolute;right:0;bottom:55px;width:min(340px,calc(100vw - 48px));box-sizing:border-box;padding:18px;border:1px solid #d7dcda;border-radius:12px;background:#f7f7f4;color:#102c3a;box-shadow:0 8px 30px #0003;max-height:70vh;overflow:auto}.panel[hidden]{display:none}h2{font-size:17px;margin:0 0 12px}p{white-space:pre-wrap;font-size:12px;line-height:1.5}label{display:grid;gap:6px;font-size:12px;margin:12px 0}select{padding:10px;border:1px solid #d7dcda;border-radius:6px;background:white;color:#102c3a}header{display:flex;align-items:center;justify-content:space-between;gap:10px}.close{background:transparent;color:#102c3a;padding:6px}.save{width:100%;margin-top:10px}';
    const trigger = document.createElement('button');
    trigger.textContent = 'UGB · TI Hub';
    trigger.setAttribute('aria-expanded', 'false');
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Salvar ou atualizar demanda no TI Hub');
    const header = document.createElement('header'),
      title = document.createElement('h2');
    title.textContent = 'Coletar para o TI Hub';
    const close = document.createElement('button');
    close.textContent = '×';
    close.className = 'close';
    close.setAttribute('aria-label', 'Fechar coleta');
    header.append(title, close);
    const summary = document.createElement('p'),
      notice = document.createElement('p');
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    const collect = document.createElement('button');
    collect.textContent = 'Coletar documento';
    const label = document.createElement('label');
    label.textContent = 'Classificação no Hub';
    label.hidden = true;
    const kind = document.createElement('select');
    for (const [value, text] of [
      ['SUPORTE', 'Suporte'],
      ['AQUISICAO', 'Aquisição'],
      ['OUTRA', 'Outra'],
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      kind.append(option);
    }
    label.append(kind);
    const save = document.createElement('button');
    save.className = 'save';
    save.hidden = true;
    save.textContent = 'Salvar demanda';
    panel.append(header, summary, collect, label, save, notice);
    style.textContent += '[hidden]{display:none!important}';
    root.append(style, panel, trigger);
    document.documentElement.append(host);
    let captured;
    const hide = () => {
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus();
    };
    trigger.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      trigger.setAttribute('aria-expanded', String(!panel.hidden));
      if (!panel.hidden) collect.focus();
    });
    close.addEventListener('click', hide);
    panel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hide();
    });
    collect.addEventListener('click', async () => {
      captured = undefined;
      collect.disabled = true;
      save.hidden = true;
      label.hidden = true;
      notice.textContent = 'Coletando documento e despachos…';
      try {
        const payload = globalThis.ugbCollectOneDoc();
        const result = await chrome.runtime.sendMessage({ type: 'LOOKUP_1DOC', payload });
        if (!result.ok) throw new Error(result.error);
        captured = payload;
        summary.textContent = `${payload.documentType} ${payload.number}\n${payload.title}\n${payload.dispatches.length} despachos carregados.`;
        kind.value = result.data.demand?.kind || 'SUPORTE';
        save.textContent = result.data.exists ? 'Atualizar demanda' : 'Salvar demanda';
        save.hidden = false;
        label.hidden = false;
        notice.textContent = payload.warnings.join('\n');
      } catch (error) {
        notice.textContent = error.message || 'Falha ao coletar. Recarregue a extensão e a página.';
      } finally {
        collect.disabled = false;
      }
    });
    save.addEventListener('click', async () => {
      if (!captured) return;
      save.disabled = true;
      collect.disabled = true;
      notice.textContent = 'Salvando no Hub…';
      try {
        const result = await chrome.runtime.sendMessage({
          type: 'IMPORT_1DOC',
          payload: { ...captured, kind: kind.value },
        });
        if (!result.ok) throw new Error(result.error);
        save.textContent = 'Atualizar demanda';
        notice.textContent = `Demanda ${result.data.created ? 'salva' : 'atualizada'}. ${result.data.dispatches} despachos preservados.`;
      } catch (error) {
        notice.textContent = error.message || 'Falha ao salvar.';
      } finally {
        save.disabled = false;
        collect.disabled = false;
      }
    });
    return true;
  }
  if (!mount()) {
    const observer = new MutationObserver(() => {
      if (mount()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
