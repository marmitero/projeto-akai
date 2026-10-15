import './style.css';
import { LocalSession, createLocalSnapshot, systemClock } from './local/session.js';
import { SaveRepository, SaveConflictError } from './persistence/repository.js';
import { createGame } from './game/create-game.js';
import type { Screen } from '@akai/shared';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('APP_ROOT_MISSING');
root.innerHTML = `<header><p class="eyebrow">PROJETO AKAI</p><h1>Fundação técnica</h1><p>Fase 1 · ambiente local de desenvolvimento</p></header>
<section class="status"><strong>Perfil local de teste</strong><p>Sem combate, mineração ou compras nesta etapa.</p><p id="save-status" role="status" aria-live="polite">Abrindo salvamento…</p></section>
<div id="game" role="img" aria-label="Área reservada para integração visual na Fase 2"></div>
<section class="actions"><button id="save" disabled>Salvar perfil local</button><button id="recover" hidden>Restaurar cópia anterior</button><p id="session-info"></p></section>
<nav aria-label="Destinos da futura interface"><button data-screen="battle">Batalha</button><button data-screen="mine">Mina</button><button data-screen="production">Produção</button></nav>
<footer>Base de navegação e persistência. A interface final será integrada com sprites.</footer>`;
const status = document.querySelector<HTMLElement>('#save-status')!;
const info = document.querySelector<HTMLElement>('#session-info')!;
const saveButton = document.querySelector<HTMLButtonElement>('#save')!;
const recoverButton = document.querySelector<HTMLButtonElement>('#recover')!;

async function boot(): Promise<void> {
  if ((import.meta.env.VITE_GAME_MODE ?? 'local') !== 'local') {
    status.textContent = 'Modo online indisponível. Nenhum perfil local será usado como conta online.';
    return;
  }
  let repository: SaveRepository | undefined;
  let snapshot = createLocalSnapshot(Date.now());
  let writable = true;
  try {
    repository = await SaveRepository.open(indexedDB);
    const result = await repository.load();
    if (result.status === 'loaded') { snapshot = result.snapshot; status.textContent = 'Perfil local carregado.'; }
    else if (result.status === 'empty') status.textContent = 'Novo perfil local. Nenhum recurso concedido.';
    else if (result.status === 'backup-available') {
      snapshot = result.snapshot; writable = false; recoverButton.hidden = false;
      status.textContent = 'Save atual inválido. Prévia da cópia anterior; confirme a restauração para salvar.';
    } else {
      writable = false;
      status.textContent = result.status === 'unsupported' ? 'Save de versão incompatível preservado. Gravação bloqueada.' : 'Save inválido preservado. Gravação bloqueada; nenhum dado foi apagado.';
    }
  } catch { writable = false; status.textContent = 'Armazenamento indisponível. Sessão temporária, sem salvamento.'; }
  const session = new LocalSession(systemClock, snapshot);
  const unsubscribe = session.subscribe(state => {
    info.textContent = `Destino: ${state.screen} · sessão ativa: ${Math.floor(state.activeMs / 1000)}s · geração do save: ${state.generation}`;
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-screen]')) button.setAttribute('aria-current', String(button.dataset['screen'] === state.screen));
  });
  const game = createGame(document.querySelector<HTMLElement>('#game')!, session);
  saveButton.disabled = !writable;
  let saving = false;
  async function persist(): Promise<void> {
    if (!repository || !writable || saving) return;
    saving = true; saveButton.disabled = true;
    try {
      const current = session.getSnapshot(); current.savedAt = Date.now();
      const generation = await repository.save(current); session.acknowledgeSave(generation);
      status.textContent = 'Perfil salvo neste navegador. Recursos continuam zerados nesta fase.';
    } catch (error) {
      writable = false;
      status.textContent = error instanceof SaveConflictError ? 'Outro perfil/aba gravou uma versão mais recente. Recarregue antes de salvar.' : 'Falha de salvamento. Dados anteriores preservados; recarregue para tentar novamente.';
    } finally { saving = false; saveButton.disabled = !writable; }
  }
  const onSave = (): void => { void persist(); };
  saveButton.addEventListener('click', onSave);
  const onRecover = (): void => {
    recoverButton.disabled = true;
    void repository?.restoreBackup().then(() => location.reload()).catch(() => { status.textContent = 'Restauração não concluída; dados preservados. Recarregue para tentar novamente.'; recoverButton.disabled = false; });
  };
  recoverButton.addEventListener('click', onRecover);
  const navigators: Array<() => void> = [];
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-screen]')) {
    const handler = (): void => session.selectScreen(button.dataset['screen'] as Screen);
    button.addEventListener('click', handler); navigators.push(() => button.removeEventListener('click', handler));
  }
  const tick = window.setInterval(() => session.tick(), 1000);
  const autosave = window.setInterval(onSave, 15_000);
  const visibility = (): void => { if (document.hidden) { session.suspend(); onSave(); } else session.resume(); };
  document.addEventListener('visibilitychange', visibility);
  const cleanup = (): void => {
    clearInterval(tick); clearInterval(autosave); document.removeEventListener('visibilitychange', visibility);
    saveButton.removeEventListener('click', onSave); recoverButton.removeEventListener('click', onRecover);
    navigators.forEach(remove => remove()); unsubscribe(); session.dispose(); repository?.close(); game.destroy(true);
  };
  if (document.hidden) session.suspend();
  import.meta.hot?.dispose(cleanup);
}
void boot().catch(() => { status.textContent = 'Falha ao iniciar a fundação local. Recarregue para tentar novamente.'; saveButton.disabled = true; });
