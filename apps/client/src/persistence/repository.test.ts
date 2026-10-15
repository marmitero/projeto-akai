import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect } from "vitest";
import { SaveRepository, SaveConflictError } from "./repository.js";
import { createLocalSnapshot } from "../local/session.js";
import {
  decodeSave,
  encodeSave,
  CorruptSaveError,
  UnsupportedSaveError,
} from "./codec.js";
async function writeRaw(
  factory: IDBFactory,
  key: string,
  value: unknown,
): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = factory.open("test", 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("snapshots", "readwrite");
    tx.objectStore("snapshots").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}
describe("versioned atomic local snapshots", () => {
  it("round-trips a profile and maintains a prior snapshot", async () => {
    const factory = new IDBFactory();
    const repo = await SaveRepository.open(factory, "test");
    expect(await repo.load()).toEqual({ status: "empty" });
    const snapshot = createLocalSnapshot(1000);
    expect(await repo.save(snapshot)).toBe(1);
    snapshot.generation = 1;
    snapshot.screen = "mine";
    expect(await repo.save(snapshot)).toBe(2);
    expect(await repo.load()).toMatchObject({
      status: "loaded",
      snapshot: { generation: 2, screen: "mine" },
    });
    await writeRaw(factory, "current", "{broken");
    expect(await repo.load()).toMatchObject({
      status: "backup-available",
      snapshot: { generation: 1, screen: "battle" },
    });
    await expect(repo.save(snapshot)).rejects.toThrow(CorruptSaveError);
    expect((await repo.restoreBackup()).generation).toBe(1);
    expect(await repo.load()).toMatchObject({
      status: "loaded",
      snapshot: { generation: 1 },
    });
    repo.close();
  });
  it("preserves an unknown future schema instead of replacing it with a backup", async () => {
    const factory = new IDBFactory();
    const repo = await SaveRepository.open(factory, "test");
    await repo.save(createLocalSnapshot(1000));
    const future = JSON.stringify({
      formatVersion: 1,
      payload: { schemaVersion: 99 },
    });
    await writeRaw(factory, "current", future);
    expect(await repo.load()).toEqual({ status: "unsupported" });
    await expect(repo.save(createLocalSnapshot(1000))).rejects.toThrow(
      UnsupportedSaveError,
    );
    await expect(repo.restoreBackup()).rejects.toThrow(UnsupportedSaveError);
    repo.close();
  });
  it("allows exactly one writer when two tabs race from the same generation", async () => {
    const factory = new IDBFactory();
    const a = await SaveRepository.open(factory, "test");
    const b = await SaveRepository.open(factory, "test");
    const results = await Promise.allSettled([
      a.save(createLocalSnapshot(1)),
      b.save(createLocalSnapshot(1)),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason).toBeInstanceOf(
      SaveConflictError,
    );
    expect(await a.load()).toMatchObject({
      status: "loaded",
      snapshot: { generation: 1 },
    });
    a.close();
    b.close();
  });
  it("detects damaged payloads and fails safely on unknown config/old schema", async () => {
    const raw = await encodeSave(createLocalSnapshot(100));
    const value = JSON.parse(raw) as { payload: { screen: string } };
    value.payload.screen = "mine";
    await expect(decodeSave(JSON.stringify(value))).rejects.toThrow(
      CorruptSaveError,
    );
    await expect(
      decodeSave('{"formatVersion":0,"payload":{}}'),
    ).rejects.toThrow(CorruptSaveError);
    await expect(
      decodeSave(raw.replace("local-rpg-1", "other-configuration")),
    ).rejects.toThrow(UnsupportedSaveError);
  });
});

describe("real schema1 migration", () => {
  it("verifies original checksum before migration and preserves balances/screen/generation", async () => {
    const old = {
      schemaVersion: 1,
      configVersion: "foundation-1",
      mode: "local",
      generation: 3,
      savedAt: 1234,
      profile: { id: "local-test", name: "Antigo" },
      screen: "mine",
      activeMs: 9000,
      balances: {
        coin: "3000",
        iron: "7000",
        coal: "0",
        gold: "0",
        jade: "0",
        ruby: "0",
      },
    };
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(old)),
    );
    const checksum = [...new Uint8Array(hash)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    const raw = JSON.stringify({ formatVersion: 1, payload: old, checksum });
    const migrated = await decodeSave(raw);
    expect(migrated).toMatchObject({
      schemaVersion: 3,
      configVersion: "local-rpg-1",
      generation: 3,
      screen: "mine",
      lastReconciledAt: 1234,
      balances: { iron: "7000" },
    });
    expect(await decodeSave(await encodeSave(migrated))).toEqual(migrated);
    await expect(decodeSave(raw.replace("7000", "8000"))).rejects.toThrow(
      CorruptSaveError,
    );
    const factory = new IDBFactory(),
      repo = await SaveRepository.open(factory, "test");
    await writeRaw(factory, "current", raw);
    expect(await repo.save(migrated)).toBe(4);
    await writeRaw(factory, "current", "broken");
    expect(await repo.restoreBackup()).toMatchObject({
      schemaVersion: 3,
      generation: 3,
    });
    repo.close();
  });
});

describe("real schema2 RPG migration", () => {
  it("preserves active combat/upgrades/resources, converts fractional remainder and initializes no retroactive loot", async () => {
    const { Legacy2SnapshotSchema, newLoopState } =
      await import("@akai/shared");
    const now = createLocalSnapshot(1000);
    const { rpg: _, ...base } = now;
    const old = Legacy2SnapshotSchema.parse({
      ...base,
      schemaVersion: 2,
      configVersion: "local-loop-1",
      coalRemainder: 777,
      upgrades: { attack: 5, vitality: 4, click: 3, coal: 2 },
      battle: { ...newLoopState().battle, heroHp: 42 },
    });
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(old)),
    );
    const checksum = [...new Uint8Array(hash)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    const migrated = await decodeSave(
      JSON.stringify({ formatVersion: 1, payload: old, checksum }),
    );
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.battle).toEqual(old.battle);
    expect(migrated.upgrades).toEqual(old.upgrades);
    expect(migrated.coalRemainder).toBe(31080000);
    expect(migrated.rpg.inventory).toHaveLength(0);
    expect(migrated.rpg.heroXp).toBe(0);
    expect(await decodeSave(await encodeSave(migrated))).toEqual(migrated);
  });
  it("continues a completed phase3 tower at21 while retaining its completion record", async () => {
    const { Legacy2SnapshotSchema, newLoopState } =
      await import("@akai/shared");
    const { rpg: _, ...base } = createLocalSnapshot(1000);
    const old = Legacy2SnapshotSchema.parse({
      ...base,
      schemaVersion: 2,
      configVersion: "local-loop-1",
      battle: {
        ...newLoopState().battle,
        floor: 20,
        highest: 20,
        phase: "complete",
      },
    });
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(old)),
    );
    const checksum = [...new Uint8Array(hash)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    expect(
      (
        await decodeSave(
          JSON.stringify({ formatVersion: 1, payload: old, checksum }),
        )
      ).battle,
    ).toMatchObject({ floor: 21, highest: 20, phase: "fighting" });
  });
});
