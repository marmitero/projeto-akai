import Phaser from 'phaser';
import type { LocalSession } from '../local/session.js';
export function createGame(parent: HTMLElement, session: LocalSession): Phaser.Game {
  class FoundationScene extends Phaser.Scene {
    constructor() { super('foundation'); }
    create(): void {
      const label = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '18px', color: '#f6ebdd', align: 'center', wordWrap: { width: 260 } }).setOrigin(0.5);
      const resize = (): void => { label.setPosition(this.scale.width / 2, this.scale.height / 2); };
      const names = { battle: 'Batalha', mine: 'Mina', production: 'Produção' };
      const off = session.subscribe(state => { label.setText([names[state.screen], '', 'Cena reservada para a Fase 2', 'Gameplay ainda não implementado']); });
      this.scale.on('resize', resize); resize();
      this.events.once('shutdown', () => { off(); this.scale.off('resize', resize); });
    }
  }
  return new Phaser.Game({ type: Phaser.AUTO, parent, backgroundColor: '#201c2e', scene: [FoundationScene],
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    audio: { noAudio: true }, banner: false });
}
