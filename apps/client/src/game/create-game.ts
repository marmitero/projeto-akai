import Phaser from "phaser";
import { heroStats, type Screen, type LocalSnapshot } from "@akai/shared";
import {
  formation,
  HERO_POSE,
  enemyPose,
  bodyGap,
  contactX,
  approachFrame,
} from "./battle-presentation.js";
import { assets, type AssetKey } from "../assets/catalog.js";
export interface VisualGame {
  hitMine(): boolean;
  setBattle(state: LocalSnapshot): void;
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
  let battleState: LocalSnapshot | undefined;
  class VisualScene extends Phaser.Scene {
    private groups = new Map<Screen, Phaser.GameObjects.Container>();
    private pet!: Phaser.GameObjects.Sprite;
    private hero!: Phaser.GameObjects.Sprite;
    private enemies: Phaser.GameObjects.Sprite[] = [];
    private torches: Phaser.GameObjects.Sprite[] = [];
    private impacts: Phaser.GameObjects.Sprite[] = [];
    private lastBattle: LocalSnapshot["battle"] | undefined;
    private count = 0;
    private battleLayers: Phaser.GameObjects.TileSprite[] = [];
    private battleGround!: Phaser.GameObjects.TileSprite;
    private targets: Array<number | null> = [];
    private arriving = false;
    private groundOffset = 0;
    private heroMaxHp = 100;
    private meleeMotions: Array<
      | { elapsed: number; from: number; contact: number; swung: boolean }
      | undefined
    > = [];
    private healthBars: Array<{
      frame: Phaser.GameObjects.Image;
      background: Phaser.GameObjects.Image;
      fill: Phaser.GameObjects.Image;
    }> = [];
    private flashes = new Map<
      Phaser.GameObjects.Sprite,
      { left: number; color: number }
    >();
    private fx: Array<{
      sprite: Phaser.GameObjects.Sprite;
      text: Phaser.GameObjects.Text;
      age: number;
      owner?: Phaser.GameObjects.Sprite;
      x: number;
      y: number;
    }> = [];

    constructor() {
      super("akai-visual");
    }
    preload(): void {
      this.load.on("loaderror", (file: { key: string }) => {
        failed.add(file.key);
      });
      for (const key of [
        "heroRun",
        "skeletonWalk",
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
      this.load.spritesheet("petIdle", assets.petIdle, {
        frameWidth: 32,
        frameHeight: 32,
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
        "healthFrame",
        "healthFill",
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
        ["pet-idle", "petIdle", 5, 8],
        ["hero-run", "heroRun", 8, 10],
        ["enemy-walk", "skeletonWalk", 6, 10],
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
          repeat:
            key.endsWith("idle") ||
            key === "hero-run" ||
            key === "enemy-walk" ||
            key === "torch-loop"
              ? -1
              : 0,
        });
      this.groups.set("battle", this.add.container());
      this.groups.set("mine", this.add.container());
      this.groups.set("production", this.add.container());
      this.buildBattle();
      this.buildMine();
      this.buildProduction();
      this.syncBattle();
      this.applyState();
      parent.dataset["loadStatus"] = "ready";
      parent.dataset["textureCount"] = String(
        this.textures.getTextureKeys().length,
      );
      parent.dataset["animationCount"] = String(
        [
          "pet-idle",
          "hero-run",
          "enemy-walk",
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
    private floor(
      group: Screen,
      texture: AssetKey,
      y: number,
    ): Phaser.GameObjects.TileSprite {
      const floor = this.add
        .tileSprite(WIDTH / 2, y, WIDTH, HEIGHT - y, texture)
        .setOrigin(0.5, 0)
        .setTileScale(2);
      this.groups.get(group)!.add(floor);
      return floor;
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
      ] as const) {
        const layer = this.add
          .tileSprite(WIDTH / 2, 120, WIDTH, 240, key)
          .setTileScale(240 / 346);
        this.groups.get("battle")!.add(layer);
        this.battleLayers.push(layer);
      }
      this.battleGround = this.floor("battle", "grass", 238);
      this.hero = this.actor(100, 2, false);
      this.pet = this.add
        .sprite(64, 242, "petIdle")
        .setOrigin(0.5, 1)
        .setScale(1.5)
        .play("pet-idle")
        .setVisible(false);
      this.groups.get("battle")!.add(this.pet);
      this.enemies = [
        this.actor(242, 1.55, true),
        this.actor(296, 1.5, true),
        this.actor(344, 1.45, true),
      ];
      for (let i = 0; i < 4; i++) {
        const frame = this.add.image(0, 0, "healthFrame"),
          background = this.add
            .image(0, 0, "healthFill")
            .setTint(0x251b2b)
            .setOrigin(0, 0.5),
          fill = this.add
            .image(0, 0, "healthFill")
            .setOrigin(0, 0.5)
            .setTint(i === 0 ? 0x8bc981 : 0xe38779);
        this.groups.get("battle")!.add([frame, background, fill]);
        this.healthBars.push({ frame, background, fill });
      }
      for (let i = 0; i < 10; i++) {
        const sprite = this.add
          .sprite(0, 0, "dust")
          .setScale(1.6)
          .setVisible(false);
        const text = this.add
          .text(0, 0, "", {
            fontFamily: "monospace",
            fontSize: "16px",
            fontStyle: "bold",
            color: "#ffe2a3",
            stroke: "#19151c",
            strokeThickness: 3,
          })
          .setOrigin(0.5, 1)
          .setVisible(false);
        sprite.on("animationcomplete", () => sprite.setVisible(false));
        this.groups.get("battle")!.add([sprite, text]);
        this.fx.push({ sprite, text, age: 1000, x: 0, y: 0 });
      }
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
      if (reducedMotion && screen === "battle")
        this.enemies.forEach((e, i) => {
          const x = this.targets[i];
          if (x !== undefined && x !== null) e.x = x;
        });
      if (overlay || document.hidden || reducedMotion || screen !== "battle") {
        this.meleeMotions.forEach((motion, i) => {
          if (!motion) return;
          const actor = this.enemies[i]!;
          actor.anims.timeScale = 1;
          const home = this.targets[i];
          if (home !== undefined && home !== null) actor.x = home;
          if (battleState?.battle.enemies[i]?.hp) actor.play("enemy-idle");
        });
        this.meleeMotions = [];
        parent.dataset["meleeMotions"] = "[]";
      }
      const paused =
        overlay ||
        document.hidden ||
        reducedMotion ||
        (screen === "battle" && battleState?.battle.paused);
      for (const sprite of [
        this.hero,
        this.pet,
        ...this.enemies,
        ...this.torches,
        ...this.fx.map((fx) => fx.sprite),
      ]) {
        const relevant =
          sprite === this.hero ||
          sprite === this.pet ||
          this.enemies.includes(sprite) ||
          this.fx.some((fx) => fx.sprite === sprite)
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
    private hitFeedback(
      actor: Phaser.GameObjects.Sprite,
      damage: number,
      hero: boolean,
      critical = false,
    ) {
      const fx = this.fx.find((f) => f.age >= 800);
      if (!fx) return;
      fx.x = actor.x + (hero ? 0 : 5);
      const stack = this.fx.filter(
        (f) => f !== fx && f.age < 800 && f.owner === actor,
      ).length;
      fx.owner = actor;
      if (stack) fx.x += (stack % 2 ? 1 : -1) * 12;
      fx.y =
        actor.y -
        Math.ceil(stack / 2) * 22 -
        (hero
          ? 104
          : enemyPose(battleState!.battle.enemies.length === 1).scale * 50);
      fx.age = 0;
      fx.text
        .setText(critical ? `CRÍTICO ${damage}` : String(damage))
        .setFontSize(critical ? 20 : 16)
        .setColor(critical ? "#fff19c" : hero ? "#ffb5b5" : "#ffe2a3")
        .setPosition(fx.x, fx.y)
        .setAlpha(1)
        .setVisible(true);
      if (!reducedMotion) {
        fx.sprite
          .setPosition(actor.x, actor.y - 45)
          .setScale(critical ? 2.5 : 1.6)
          .setTint(critical ? 0xffd45c : hero ? 0xff8c8c : 0xffe2a3)
          .setVisible(true)
          .play("dust-impact");
        actor.setTint(critical ? 0xffda54 : hero ? 0xff8989 : 0xffedb0);
        this.flashes.set(actor, {
          left: 150,
          color: critical ? 0xffda54 : hero ? 0xff8989 : 0xffedb0,
        });
      }
      if (critical) {
        parent.dataset["criticalFeedbackCount"] = String(
          Number(parent.dataset["criticalFeedbackCount"] ?? 0) + 1,
        );
        parent.dataset["lastCriticalDamage"] = String(damage);
      }
      parent.dataset["damageFeedbackCount"] = String(
        Number(parent.dataset["damageFeedbackCount"] ?? 0) + 1,
      );
    }
    private syncHealth(): void {
      if (!battleState) return;
      const b = battleState.battle;
      [this.hero, ...this.enemies].forEach((actor, i) => {
        const bar = this.healthBars[i];
        if (!bar) return;
        const hp = i === 0 ? b.heroHp : (b.enemies[i - 1]?.hp ?? 0),
          max = i === 0 ? this.heroMaxHp : (b.enemies[i - 1]?.maxHp ?? 1),
          width = i === 0 ? 40 : b.enemies.length === 1 ? 54 : 32,
          y = actor.y - 57 * actor.scaleY,
          x = actor.x - width / 2 + (width * 8) / 96,
          inner = (width * 80) / 96,
          visible = actor.visible && hp > 0;
        bar.frame
          .setPosition(actor.x, y)
          .setDisplaySize(width, 7)
          .setVisible(visible);
        bar.background
          .setPosition(x, y - 0.2)
          .setDisplaySize(inner, 2.3)
          .setVisible(visible);
        bar.fill
          .setPosition(x, y - 0.2)
          .setDisplaySize(inner * Math.max(0, Math.min(1, hp / max)), 2.3)
          .setVisible(visible);
      });
    }
    update(_time: number, delta: number): void {
      const b = battleState?.battle;
      if (!b || !this.hero || screen !== "battle" || overlay || document.hidden)
        return;
      if (b.paused) return;
      const ms = Math.min(delta, 50),
        moving = !b.paused && b.phase === "transition" && b.heroHp > 0;
      if (moving && !reducedMotion) {
        const distance = ms * 0.09;
        this.groundOffset += distance;
        this.battleGround.tilePositionX += distance / 2;
        this.battleLayers.forEach((layer, i) => {
          layer.tilePositionX +=
            (distance * [0.04, 0.1, 0.18, 0.29, 0.46, 0.7][i]!) / (240 / 346);
        });
        this.enemies.forEach((enemy, i) => {
          if (b.enemies[i]?.hp === 0) {
            enemy.x -= distance;
            enemy.setAlpha(Math.max(0, enemy.alpha - ms / 900));
          }
        });
      }
      let arriving = false;
      for (const motion of this.meleeMotions) if (motion) motion.elapsed += ms;
      const attacking = this.meleeMotions.findIndex(
        (motion) => motion && motion.elapsed >= 0 && motion.elapsed < 520,
      );
      const front = this.targets.findIndex((target) => target !== null);
      const homes = [...this.targets];
      const heroNeedsContact =
        b.heroNextAt - b.time <= 240 ||
        (b.heroStrikes > 0 && b.time - (b.heroNextAt - 1000) < 200);
      if (
        attacking >= 0 &&
        front >= 0 &&
        attacking !== front &&
        !heroNeedsContact
      )
        homes[front] = this.targets[attacking] ?? homes[front]!;
      this.enemies.forEach((enemy, i) => {
        const target = homes[i];
        if (
          target === undefined ||
          target === null ||
          !b.enemies[i] ||
          b.enemies[i]!.hp === 0
        )
          return;
        const motion = this.meleeMotions[i];
        if (motion && !reducedMotion) {
          const frame = approachFrame(
            motion.elapsed,
            motion.from,
            motion.contact,
            target,
          );
          enemy.x = frame.x;
          if (frame.phase === "attack") {
            if (!motion.swung) {
              enemy.anims.timeScale = 2.3;
              enemy.play("enemy-attack");
              motion.swung = true;
              parent.dataset["meleeAttackCount"] = String(
                Number(parent.dataset["meleeAttackCount"] ?? 0) + 1,
              );
            }
          } else if (frame.phase === "approach" || frame.phase === "return") {
            enemy.anims.timeScale = 1;
            enemy.play("enemy-walk", true);
          } else if (frame.phase === "done") {
            enemy.anims.timeScale = 1;
            enemy.play("enemy-idle");
            this.meleeMotions[i] = undefined;
          }
          return;
        }
        const offset = target - enemy.x;
        if (reducedMotion) {
          enemy.x = target;
          return;
        }
        if (!b.paused && Math.abs(offset) > 0.5) {
          arriving = true;
          enemy.x +=
            Math.sign(offset) *
            Math.min(Math.abs(offset), ms * (this.arriving ? 0.7 : 0.28));
          if (enemy.anims.currentAnim?.key !== "enemy-attack")
            enemy.play("enemy-walk", true);
        } else if (
          Math.abs(offset) <= 0.5 &&
          enemy.anims.currentAnim?.key === "enemy-walk"
        )
          enemy.play("enemy-idle");
      });
      this.arriving = arriving;
      for (const actor of [this.hero, ...this.enemies]) {
        const flash = this.flashes.get(actor);
        if (!flash || reducedMotion) {
          actor.clearTint();
          this.flashes.delete(actor);
        } else {
          flash.left -= ms;
          if (flash.left <= 0) {
            actor.clearTint();
            this.flashes.delete(actor);
          } else actor.setTint(flash.color);
        }
      }
      for (const fx of this.fx) {
        if (fx.age >= 800) continue;
        fx.age += ms;
        fx.text
          .setPosition(fx.x, fx.y - (reducedMotion ? 0 : fx.age * 0.035))
          .setAlpha(Math.max(0, 1 - fx.age / 800));
        if (fx.age >= 800) {
          fx.text.setVisible(false);
          fx.sprite.setVisible(false);
        }
      }
      parent.dataset["meleeMotions"] = JSON.stringify(
        this.meleeMotions.map((motion, i) =>
          motion
            ? {
                enemy: i,
                phase: approachFrame(
                  motion.elapsed,
                  motion.from,
                  motion.contact,
                  this.targets[i] ?? motion.from,
                ).phase,
                gap: Number(
                  bodyGap(
                    this.hero.x,
                    this.enemies[i]!.x,
                    HERO_POSE,
                    enemyPose(b.enemies.length === 1),
                  ).toFixed(1),
                ),
              }
            : null,
        ),
      );
      this.syncHealth();
      parent.dataset["parallaxOffset"] = this.groundOffset.toFixed(2);
      parent.dataset["enemyPositions"] = JSON.stringify(
        this.enemies.map((e) => Number(e.x.toFixed(1))),
      );
      parent.dataset["enemiesArriving"] = String(arriving);
    }
    syncBattle(): void {
      if (!this.hero || !battleState) return;
      this.pet.setVisible(
        battleState.rpg.petActive && battleState.rpg.petLevel > 0,
      );
      const b = battleState.battle,
        prev = this.lastBattle,
        fresh = prev?.attempt !== b.attempt;
      parent.dataset["encounter"] = `${b.attempt}:${b.floor}:${b.wave}`;
      parent.dataset["combatPhase"] = b.phase;
      const boss = b.enemies.length === 1;
      this.hero.x = 100;
      this.heroMaxHp = heroStats(battleState).hp;
      this.targets = formation(
        this.hero.x,
        b.enemies.map((e) => e.hp > 0),
        boss,
      );
      const canMove =
        screen === "battle" &&
        !overlay &&
        !document.hidden &&
        !reducedMotion &&
        !b.paused;
      if (fresh) {
        this.meleeMotions = [];
        this.arriving =
          canMove && b.phase === "fighting" && (!!prev || b.heroStrikes === 0);
        for (const fx of this.fx) {
          fx.age = 1000;
          fx.sprite.setVisible(false);
          fx.text.setVisible(false);
        }
      }
      const animate = (
        sprite: Phaser.GameObjects.Sprite,
        dead: boolean,
        wasDead: boolean,
        attack: boolean,
        enemy: boolean,
      ): void => {
        const prefix = enemy ? "enemy" : "hero";
        if (dead) {
          if (
            !wasDead &&
            !fresh &&
            !reducedMotion &&
            screen === "battle" &&
            !overlay &&
            !document.hidden
          )
            sprite.play(`${prefix}-dead`);
          else if (
            sprite.anims.currentAnim?.key !== `${prefix}-dead` ||
            reducedMotion ||
            screen !== "battle" ||
            overlay ||
            document.hidden
          ) {
            sprite.anims.stop();
            sprite.setTexture(
              enemy ? "skeletonDead" : "heroDead",
              enemy ? 3 : 7,
            );
          }
        } else if (fresh || wasDead)
          sprite.play(enemy && this.arriving ? "enemy-walk" : `${prefix}-idle`);
        else if (!enemy && b.phase === "transition")
          sprite.play("hero-run", true);
        else if (attack && !reducedMotion) sprite.play(`${prefix}-attack`);
        else if (
          !enemy &&
          prev?.phase === "transition" &&
          b.phase !== "transition"
        )
          sprite.play("hero-idle");
      };
      if (prev && !fresh && b.heroStrikes !== prev.heroStrikes) {
        const target = prev.enemies.findIndex((enemy) => enemy.hp > 0);
        if (target >= 0)
          parent.dataset["heroHitContactGap"] = String(
            bodyGap(
              this.hero.x,
              this.enemies[target]!.x,
              HERO_POSE,
              enemyPose(boss),
            ),
          );
      }
      animate(
        this.hero,
        b.heroHp === 0,
        prev?.heroHp === 0,
        b.heroStrikes !== prev?.heroStrikes,
        false,
      );
      this.enemies.forEach((sprite, i) => {
        const e = b.enemies[i],
          old = prev?.enemies[i];
        sprite.setVisible(!!e).setScale(enemyPose(boss).scale);
        if (fresh) {
          sprite.anims.timeScale = 1;
          sprite.setAlpha(1).clearTint();
          sprite.x = this.arriving
            ? WIDTH + 100 + sprite.scaleX * 80 + i * 62
            : (this.targets[i] ?? 180 + i * 58);
        } else if (reducedMotion && e && e.hp > 0)
          sprite.x = this.targets[i] ?? sprite.x;
        if (!e || e.hp === 0) {
          this.meleeMotions[i] = undefined;
          sprite.anims.timeScale = 1;
        } else if (!fresh && old && e.strikes > old.strikes && canMove) {
          this.meleeMotions[i] = {
            elapsed:
              -b.enemies.slice(0, i).filter((enemy) => enemy.hp > 0).length *
              480,
            from: sprite.x,
            contact: contactX(this.hero.x, HERO_POSE, enemyPose(boss)),
            swung: false,
          };
        }
        if (e) animate(sprite, e.hp === 0, old?.hp === 0, false, true);
      });
      if (
        prev &&
        !fresh &&
        screen === "battle" &&
        !overlay &&
        !document.hidden
      ) {
        const damage = prev.heroHp - b.heroHp;
        if (damage > 0) this.hitFeedback(this.hero, damage, true);
        const confirmed = b.hits.filter(
          (hit) => hit.strike > prev.heroStrikes && hit.attempt === b.attempt,
        );
        for (const hit of confirmed)
          this.hitFeedback(
            this.enemies[hit.target]!,
            hit.damage,
            false,
            hit.critical,
          );
        // Older server snapshots without hit records retain ordinary HP-delta feedback only.
        if (!confirmed.length)
          b.enemies.forEach((e, i) => {
            const delta = (prev.enemies[i]?.hp ?? e.hp) - e.hp;
            if (delta > 0) this.hitFeedback(this.enemies[i]!, delta, false);
          });
      }
      parent.dataset["heroX"] = String(this.hero.x);
      parent.dataset["enemyTargets"] = JSON.stringify(this.targets);
      parent.dataset["contactGap"] = String(
        bodyGap(
          this.hero.x,
          this.targets.find((x) => x !== null) ?? this.hero.x,
          HERO_POSE,
          enemyPose(boss),
        ),
      );
      parent.dataset["heroMaxHp"] = String(this.heroMaxHp);
      this.syncHealth();
      parent.dataset["healthBarCount"] = String(this.healthBars.length);
      this.lastBattle = structuredClone(b);
      this.applyState();
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
    setBattle(state) {
      battleState = state;
      scene?.syncBattle();
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
