import { CommunityActionSchema, type CommunityAction, type CommunityResult, type GlobalChatSnapshot } from '@akai/shared';
import { api, ApiFailure } from '../online-session.js';
import { commandId } from '../browser-crypto.js';

/** One bounded poll while this channel is visible; no event participation side effects. */
export function createBattleGlobal(root: HTMLElement, online: boolean) {
  const status = root.querySelector<HTMLElement>('#battle-global-status')!;
  const list = root.querySelector<HTMLOListElement>('#battle-global-log')!;
  const form = root.querySelector<HTMLFormElement>('#battle-global-form')!;
  const input = root.querySelector<HTMLInputElement>('#battle-global-input')!;
  const submit = form.querySelector<HTMLButtonElement>('button')!;
  const latest = root.querySelector<HTMLButtonElement>('#battle-global-latest')!;
  let visible = false, selected = false, disposed = false, busy = false, retryAt = 0;
  let state: GlobalChatSnapshot | undefined, signature = '';
  let pending: { commandId: string; action: CommunityAction } | undefined;
  const ready = () => online && visible && selected && !document.hidden && !disposed;
  status.textContent = online ? 'Selecione Global para conversar.' : 'Entre no modo online para conversar com outros jogadores.';
  const bottom = () => { list.scrollTop = list.scrollHeight; latest.hidden = true; };
  latest.addEventListener('click', bottom);
  list.addEventListener('scroll', () => {
    if (list.scrollHeight - list.clientHeight - list.scrollTop < 16) latest.hidden = true;
  });
  function send(action: CommunityAction) {
    const parsed = CommunityActionSchema.safeParse(action);
    if (!parsed.success || pending || !state || !ready()) return false;
    pending = { commandId: commandId(), action: parsed.data };
    submit.disabled = true;
    status.textContent = 'Enviando…';
    void refresh();
    return true;
  }
  function render(next: GlobalChatSnapshot) {
    state = next;
    form.hidden = !online;
    input.disabled = !next.canChat || next.mutedUntil > Date.now();
    submit.disabled = input.disabled || !!pending;
    const nextSignature = JSON.stringify(next.messages);
    if (signature === nextSignature) return;
    const initial = signature === '';
    signature = nextSignature;
    const nearBottom = list.scrollHeight - list.clientHeight - list.scrollTop < 16;
    const oldTop = list.scrollTop;
    const anchor = Array.from(list.children).find(e => (e as HTMLElement).offsetTop + (e as HTMLElement).offsetHeight > oldTop) as HTMLElement | undefined;
    const anchorId = anchor?.dataset['messageId'], anchorTop = anchor?.offsetTop ?? 0;
    list.replaceChildren(...next.messages.map(msg => {
      const row = document.createElement('li');
      row.dataset['messageId'] = msg.id;
      const author = document.createElement('strong');
      author.textContent = `${msg.name}: `;
      const text = document.createElement('span');
      text.textContent = msg.text;
      row.append(author, text);
      if (msg.authorId !== next.accountId) {
        const actions = document.createElement('details');
        const toggle = document.createElement('summary'); toggle.textContent = 'Opções';
        actions.append(toggle);
        for (const label of ['Bloquear', 'Denunciar']) {
          const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
          b.addEventListener('click', () => {
            if (label === 'Bloquear') send({ type: 'block', accountId: msg.authorId, blocked: true });
            else {
              const reason = window.prompt('Motivo da denúncia (3 a 300 caracteres):');
              if (reason && !send({ type: 'report', messageId: msg.id, reason })) status.textContent = 'Confira o motivo (3 a 300 caracteres) e aguarde a ação pendente.';
            }
          });
          actions.append(b);
        }
        row.append(actions);
      }
      return row;
    }));
    if (initial || nearBottom) bottom();
    else {
      const retained = anchorId ? Array.from(list.children).find(e => (e as HTMLElement).dataset['messageId'] === anchorId) as HTMLElement | undefined : undefined;
      list.scrollTop = Math.max(0, oldTop + (retained ? retained.offsetTop - anchorTop : 0));
      latest.hidden = false;
    }
  }
  async function refresh() {
    if (!ready() || busy || Date.now() < retryAt) return;
    busy = true;
    try {
      // Establish identity before retrying or sending; pending belongs to this mounted session.
      const next = await api<GlobalChatSnapshot>('community/chat');
      if (disposed) return;
      if (state && state.accountId !== next.accountId) pending = undefined;
      render(next);
      let result: CommunityResult | undefined;
      if (pending) {
        result = await api<CommunityResult>('community/commands', pending);
        if (disposed) return;
        pending = undefined;
        render(await api<GlobalChatSnapshot>('community/chat'));
      }
      if (disposed) return;
      status.textContent = result?.status === 'rejected' ? `Ação recusada: ${result.code}.` : !state?.canChat ? 'Vença o andar 1 para enviar mensagens.' : (state?.mutedUntil ?? 0) > Date.now() ? 'Envio temporariamente silenciado.' : state?.messages.length ? 'Global · atualização automática' : 'Global · nenhuma mensagem ainda.';
    } catch (e) {
      if (disposed) return;
      if (e instanceof ApiFailure && [400, 401, 403, 409].includes(e.status)) {
        pending = undefined;
        status.textContent = 'Sessão indisponível ou acesso recusado. Recarregue para entrar novamente.';
        retryAt = Date.now() + 10000;
      } else {
        status.textContent = 'Reconectando… O envio pendente será tentado com o mesmo identificador.';
        retryAt = Date.now() + 2000;
      }
    } finally {
      busy = false;
      submit.disabled = !!pending || !!input.disabled;
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (send({ type: 'chat', scope: 'global', text: input.value })) input.value = '';
  });
  const resume = () => { if (ready()) void refresh(); };
  document.addEventListener('visibilitychange', resume);
  const timer = online ? setInterval(resume, 2000) : undefined;
  return {
    show(value: boolean) { visible = value; resume(); },
    select(value: boolean) { selected = value; resume(); },
    destroy() { disposed = true; clearInterval(timer); document.removeEventListener('visibilitychange', resume); },
  };
}
