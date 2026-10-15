import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const root = new URL("../", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("docs/art/Runtime_Asset_Manifest.json", root), "utf8"),
);
const known = new Map();
async function verify(path, hash, width, height) {
  const bytes = await readFile(new URL(path, root));
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    hash,
    `stale hash: ${path}`,
  );
  assert.equal(bytes.subarray(1, 4).toString(), "PNG", `not a PNG: ${path}`);
  if (width !== undefined)
    assert.equal(bytes.readUInt32BE(16), width, `width: ${path}`);
  if (height !== undefined)
    assert.equal(bytes.readUInt32BE(20), height, `height: ${path}`);
  known.set(path, bytes.length);
}
assert.ok(manifest.originals.length > 0, "catalog originals must be recorded");
for (const entry of manifest.originals)
  await verify(entry.path, entry.sha256, entry.width, entry.height);
for (const entry of manifest.derivatives) {
  await verify(entry.output, entry.sha256, entry.width, entry.height);
  for (const source of entry.sources) await verify(source.path, source.sha256);
  if (entry.frameWidth) {
    assert.equal(entry.width % entry.frameWidth, 0);
    assert.equal(entry.height % entry.frameHeight, 0);
    assert.ok(
      entry.frames <=
        ((entry.width / entry.frameWidth) * entry.height) / entry.frameHeight,
    );
  }
  if (entry.pivot) {
    assert.ok(
      entry.pivot[0] <= entry.frameWidth && entry.pivot[1] <= entry.frameHeight,
    );
  }
}
console.log(
  JSON.stringify({
    verifiedOriginals: manifest.originals.length,
    verifiedDerivatives: manifest.derivatives.length,
    uniqueFiles: known.size,
    sourceBytes: [...known.values()].reduce((a, b) => a + b, 0),
  }),
);
