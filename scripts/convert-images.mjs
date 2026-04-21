import { readdir, stat } from "node:fs/promises";
import { join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const MAX_WIDTH = 1600;
const QUALITY = 80;

const here = fileURLToPath(new URL(".", import.meta.url));
const assetsDir = join(here, "..", "src", "assets");

const files = (await readdir(assetsDir)).filter((f) => /\.(jpe?g|png)$/i.test(f));

if (files.length === 0) {
  console.log(`No images found in ${assetsDir}`);
  process.exit(0);
}

let totalIn = 0;
let totalOut = 0;

for (const file of files) {
  const srcPath = join(assetsDir, file);
  const { name } = parse(file);
  const outPath = join(assetsDir, `${name}.webp`);

  const srcStat = await stat(srcPath);
  await sharp(srcPath)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(outPath);
  const outStat = await stat(outPath);

  totalIn += srcStat.size;
  totalOut += outStat.size;
  const pct = ((1 - outStat.size / srcStat.size) * 100).toFixed(1);
  console.log(
    `${file.padEnd(40)} ${fmt(srcStat.size)} → ${fmt(outStat.size)}  (-${pct}%)`
  );
}

console.log("─".repeat(70));
console.log(
  `Total: ${fmt(totalIn)} → ${fmt(totalOut)}  (-${((1 - totalOut / totalIn) * 100).toFixed(1)}%)`
);

function fmt(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}
