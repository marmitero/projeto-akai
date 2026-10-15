import Phaser from "phaser";
import type { Screen } from "@akai/shared";
import { assets, type AssetKey } from "../assets/catalog.js";
export interface VisualGame {
  hitMine(): boolean;
  previewDefeat(): boolean;
  setOverlay(open: boolean): void;
  setReducedMotion(reduced: boolean): void;
  destroy(): void;
}
export interface VisualOptions {
  screen: Screen;
  onReady(): void;
  onError(): void;
}
const WIDTH = 384,
  HEIGHT = 300;
export function createGame(
  parent: HTMLElement,
  options: VisualOptions,
): VisualGame & { setScreen(screen: Screen): void } {
  let scene: VisualScene | undefined;
  let screen = options.screen,
    overlay = false,
    reducedMotion = false;
  const failed = new Set<string>();
  class VisualScene extends Phaser.Scene {
    private groups = new Map<Screen, Phaser.GameObjects.Container>();
    private hero!: Phaser.GameObjects.Sprite;
    private enemies: Phaser.GameObjects.Sprite[] = [];
    private torches: Phaser.GameObjects.Sprite[] = [];
    private impacts: Phaser.GameObjects.Sprite[] = [];
    private attackAt = 0;
    private count = 0;
    private defeatUntil = 0;
    constructor() {
      super("akai-visual");
    }
    preload(): void {
      this.load.on("loaderror", (file: { key: string }) => {
        failed.add(file.key);
      });
      for (const key of [
        "heroIdle",
        "heroDead",
        "skeletonDead",
        "heroAttack",
        "skeletonIdle",
        "skeletonAttack",
      ] as const)
        this.load.spritesheet(key, assets[key], {
          frameWidth: 160,
          frameHeight: 128,
        });
      this.load.spritesheet("torch", assets.torch, {
        frameWidth: 32,
        frameHeight: 32,
      });
      this.load.spritesheet("dust", assets.dust, {
        frameWidth: 32,
        frameHeight: 32,
      });
      for (const key of [
        "grass",
        "rockTop",
        "rockFill",
        "rockSide",
        "ironNode",
        "coalNode",
        "goldNode",
        "jadeNode",
        "sky",
        "hills",
        "castle",
        "forestFar",
        "forestMiddle",
        "forestNear",
      ] as const)
        this.load.image(key, assets[key]);
    }
    create(): void {
      scene = this;
      if (failed.size) {
        parent.dataset["loadStatus"] = "error";
        options.onError();
        return;
      }
      for (const [key, texture, frames, fps] of [
        ["hero-idle", "heroIdle", 4, 10],
        ["hero-dead", "heroDead", 8, 10],
        ["enemy-dead", "skeletonDead", 4, 10],
        ["hero-attack", "heroAttack", 8, 10],
        ["enemy-idle", "skeletonIdle", 4, 8],
        ["enemy-attack", "skeletonAttack", 8, 10],
        ["torch-loop", "torch", 6, 9],
        ["dust-impact", "dust", 12, 24],
      ] as const)
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(texture, {
            start: 0,
            end: frames - 1,
          }),
          frameRate: fps,
          repeat: key.endsWith("idle") || key === "torch-loop" ? -1 : 0,
        });
      this.groups.set("battle", this.add.container());
      this.groups.set("mine", this.add.container());
      this.groups.set("production", this.add.container());
      this.buildBattle();
      this.buildMine();
      this.buildProduction();
      this.applyState();
      parent.dataset["loadStatus"] = "ready";
      parent.dataset["textureCount"] = String(
        this.textures.getTextureKeys().length,
      );
      parent.dataset["animationCount"] = String(
        [
          "hero-idle",
          "hero-dead",
          "enemy-dead",
          "hero-attack",
          "enemy-idle",
          "enemy-attack",
          "torch-loop",
          "dust-impact",
        ].filter((key) => this.anims.exists(key)).length,
      );
      options.onReady();
    }
    private image(
      group: Screen,
      x: number,
      y: number,
      key: AssetKey,
      scale = 1,
    ): Phaser.GameObjects.Image {
      const image = this.add.image(x, y, key).setScale(scale);
      this.groups.get(group)!.add(image);
      return image;
    }
    private floor(group: Screen, texture: AssetKey, y: number): void {
      const floor = this.add
        .tileSprite(WIDTH / 2, y, WIDTH, HEIGHT - y, texture)
        .setOrigin(0.5, 0)
        .setTileScale(2);
      this.groups.get(group)!.add(floor);
    }
    private actor(
      x: number,
      scale: number,
      enemy: boolean,
    ): Phaser.GameObjects.Sprite {
      const sprite = this.add
        .sprite(x, 240, enemy ? "skeletonIdle" : "heroIdle")
        .setOrigin(0.5, 112 / 128)
        .setScale(scale)
        .setFlipX(enemy);
      sprite.play(enemy ? "enemy-idle" : "hero-idle");
      sprite.on(
        "animationcomplete",
        (animation: Phaser.Animations.Animation) => {
          if (animation.key.endsWith("dead")) {
            if (!enemy) parent.dataset["defeatComplete"] = "true";
            return;
          }
          if (!sprite.scene) return;
          sprite.play(enemy ? "enemy-idle" : "hero-idle");
          if (reducedMotion) sprite.anims.pause();
        },
      );
      this.groups.get("battle")!.add(sprite);
      return sprite;
    }
    private buildBattle(): void {
      for (const key of [
        "sky",
        "hills",
        "castle",
        "forestFar",
        "forestMiddle",
        "forestNear",
      ] as const)
        this.image("battle", WIDTH / 2, 120, key, 240 / 346);
      this.floor("battle", "grass", 238);
      this.hero = this.actor(83, 2, false);
      this.enemies = [
        this.actor(242, 1.55, true),
        this.actor(296, 1.5, true),
        this.actor(344, 1.45, true),
      ];
    }
    private cavern(group: "mine" | "production"): void {
      this.floor(group, "rockFill", 0);
      const ground = this.add
        .tileSprite(WIDTH / 2, 228, WIDTH, HEIGHT - 228, "rockFill")
        .setOrigin(0.5, 0)
        .setTileScale(2);
      const edge = this.add
        .tileSprite(WIDTH / 2, 228, WIDTH, 24, "rockTop")
        .setOrigin(0.5, 0)
        .setTileScale(2);
      this.groups.get(group)!.add([ground, edge]);
      for (const [x, flip] of [
        [0, false],
        [WIDTH - 32, true],
      ] as const) {
        const wall = this.add
          .tileSprite(x, 0, 32, 228, "rockSide")
          .setOrigin(0, 0)
          .setTileScale(2)
          .setFlipX(flip);
        this.groups.get(group)!.add(wall);
      }
      for (const x of [43, 341]) {
        const torch = this.add
          .sprite(x, 126, "torch")
          .setScale(2)
          .play("torch-loop");
        this.torches.push(torch);
        this.groups.get(group)!.add(torch);
      }
    }
    private buildMine(): void {
      this.cavern("mine");
      this.image("mine", 192, 190, "ironNode", 6);
      this.image("mine", 66, 216, "coalNode", 2);
      this.image("mine", 310, 216, "goldNode", 2);
      for (let n = 0; n < 6; n++) {
        const impact = this.add
          .sprite(192, 173, "dust")
          .setScale(3)
          .setVisible(false)
          .setActive(false);
        impact.on("animationcomplete", () =>
          impact.setVisible(false).setActive(false),
        );
        this.impacts.push(impact);
        this.groups.get("mine")!.add(impact);
      }
    }
    private buildProduction(): void {
      this.cavern("production");
      for (const [x, key] of [
        [86, "coalNode"],
        [192, "goldNode"],
        [298, "jadeNode"],
      ] as const)
        this.image("production", x, 202, key, 4);
    }
    applyState(): void {
      if (!this.groups.size) return;
      parent.dataset["visibleScreen"] = screen;
      parent.dataset["textureCount"] = String(
        this.textures.getTextureKeys().length,
      );
      parent.dataset["objectCount"] = String(
        [...this.groups.values()].reduce(
          (sum, group) => sum + group.list.length,
          0,
        ),
      );
      for (const [key, group] of this.groups) group.setVisible(key === screen);
      const paused = overlay || document.hidden || reducedMotion;
      for (const sprite of [this.hero, ...this.enemies, ...this.torches]) {
        const relevant =
          sprite === this.hero || this.enemies.includes(sprite)
            ? screen === "battle"
            : (screen === "mine" || screen === "production") &&
              sprite.parentContainer?.visible;
        if (paused || !relevant) sprite.anims.pause();
        else sprite.anims.resume();
      }
      if (overlay || screen !== "mine" || reducedMotion || document.hidden)
        for (const impact of this.impacts) {
          impact.anims.stop();
          impact.setVisible(false).setActive(false);
        }
    }
    hit(): boolean {
      if (screen !== "mine" || overlay || document.hidden || failed.size)
        return false;
      this.count++;
      parent.dataset["impactCount"] = String(this.count);
      if (reducedMotion) return true;
      const free = this.impacts.find((s) => !s.active);
      if (free) free.setActive(true).setVisible(true).play("dust-impact");
      return true;
    }
    defeat(): boolean {
      if (
        !this.hero ||
        screen !== "battle" ||
        overlay ||
        document.hidden ||
        failed.size
      )
        return false;
      this.defeatUntil = this.time.now + 2400;
      parent.dataset["defeatComplete"] = "false";
      this.hero.play("hero-dead");
      for (const enemy of this.enemies) enemy.play("enemy-dead");
      if (reducedMotion) {
        parent.dataset["defeatComplete"] = "true";
        this.hero.anims.stop();
        this.hero.setTexture("heroDead", 7);
        for (const enemy of this.enemies) {
          enemy.anims.stop();
          enemy.setTexture("skeletonDead", 3);
        }
      }
      parent.dataset["defeatPreview"] = String(
        Number(parent.dataset["defeatPreview"] ?? 0) + 1,
      );
      return true;
    }
    update(time: number): void {
      if (!this.hero || overlay || document.hidden || screen !== "battle")
        return;
      if (this.defeatUntil > time) return;
      if (this.defeatUntil) {
        this.defeatUntil = 0;
        this.hero.play("hero-idle");
        this.enemies.forEach((enemy) => enemy.play("enemy-idle"));
        this.applyState();
        this.attackAt = time + 1200;
      }
      if (reducedMotion) return;
      if (time >= this.attackAt) {
        this.attackAt = time + 2400;
        this.hero.play("hero-attack");
        this.enemies[0]?.play("enemy-attack");
      }
    }
  }
  const visibility = (): void => scene?.applyState();
  document.addEventListener("visibilitychange", visibility);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: "#19151c",
    pixelArt: true,
    roundPixels: true,
    scene: [VisualScene],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
    banner: false,
  });
  return {
    setScreen(next) {
      screen = next;
      scene?.applyState();
    },
    hitMine() {
      return scene?.hit() ?? false;
    },
    previewDefeat() {
      return scene?.defeat() ?? false;
    },
    setOverlay(open) {
      overlay = open;
      scene?.applyState();
    },
    setReducedMotion(reduced) {
      reducedMotion = reduced;
      parent.dataset["reducedMotion"] = String(reduced);
      scene?.applyState();
    },
    destroy() {
      document.removeEventListener("visibilitychange", visibility);
      game.destroy(true);
      scene = undefined;
    },
  };
}
