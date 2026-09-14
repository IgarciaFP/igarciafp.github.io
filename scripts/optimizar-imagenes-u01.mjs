import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const pagePath = "ciclos/dwec/u01_es.html";
const sourcePath = "ciclos/dwec/dwec01.html";
const outputDir = "ciclos/dwec/assets/u01";

const [pageHtml, sourceHtml] = await Promise.all([
  readFile(pagePath, "utf8"),
  readFile(sourcePath, "utf8"),
]);

const sourceImages = [];
const sourceImagePattern =
  /<img\b[^>]*?\bsrc\s*=\s*(["'])([\s\S]*?)\1[^>]*>/gi;

for (const match of sourceHtml.matchAll(sourceImagePattern)) {
  sourceImages.push(match[2]);
}

const usedIndexes = [
  ...new Set(
    [...pageHtml.matchAll(/data-source-image\s*=\s*["'](\d+)["']/gi)]
      .map((match) => Number(match[1])),
  ),
].sort((a, b) => a - b);

if (usedIndexes.length === 0) {
  throw new Error("No se encontraron imágenes data-source-image en u01_es.html");
}

await mkdir(outputDir, { recursive: true });

const replacements = new Map();
let originalBytes = 0;
let optimizedBytes = 0;

function decodeDataUri(uri) {
  const match = uri.match(/^data:(image\/[^;,]+)(?:;charset=[^;,]+)?(;base64)?,([\s\S]*)$/i);
  if (!match) return null;

  const [, mimeType, base64Flag, payload] = match;
  const bytes = base64Flag
    ? Buffer.from(payload.replace(/\s/g, ""), "base64")
    : Buffer.from(decodeURIComponent(payload), "utf8");

  return { mimeType: mimeType.toLowerCase(), bytes };
}

for (const index of usedIndexes) {
  const source = sourceImages[index];
  if (!source) {
    throw new Error(`No existe la imagen fuente con índice ${index}`);
  }

  const decoded = decodeDataUri(source);
  if (!decoded) {
    replacements.set(index, { src: source });
    continue;
  }

  originalBytes += decoded.bytes.length;
  const number = String(index + 1).padStart(2, "0");
  let output;
  let extension;

  if (decoded.mimeType === "image/svg+xml") {
    output = decoded.bytes;
    extension = "svg";
  } else {
    const pipeline = sharp(decoded.bytes, { animated: true }).rotate();
    output = decoded.mimeType === "image/png"
      ? await pipeline.webp({ lossless: true, effort: 6 }).toBuffer()
      : await pipeline.webp({ quality: 84, effort: 6 }).toBuffer();
    extension = "webp";
  }

  const metadata = await sharp(output, { animated: true }).metadata();
  const filename = `ilustracion-${number}.${extension}`;
  await writeFile(path.join(outputDir, filename), output);
  optimizedBytes += output.length;

  replacements.set(index, {
    src: `assets/u01/${filename}`,
    width: metadata.width,
    height: metadata.pageHeight ?? metadata.height,
  });
}

function removeAttribute(tag, name) {
  const quotedOrBare = `(?:"[^"]*"|'[^']*'|[^\\s>]+)`;
  return tag.replace(
    new RegExp(`\\s+${name}\\s*=\\s*${quotedOrBare}`, "gi"),
    "",
  );
}

let updatedHtml = pageHtml.replace(
  /<img\b[^>]*?data-source-image\s*=\s*["'](\d+)["'][^>]*>/gi,
  (tag, rawIndex) => {
    const replacement = replacements.get(Number(rawIndex));
    if (!replacement) return tag;

    let cleaned = tag;
    for (const attribute of [
      "src",
      "data-source-image",
      "width",
      "height",
      "loading",
      "decoding",
    ]) {
      cleaned = removeAttribute(cleaned, attribute);
    }

    const dimensions =
      replacement.width && replacement.height
        ? ` width="${replacement.width}" height="${replacement.height}"`
        : "";

    return cleaned.replace(
      /\s*\/?>(\s*)$/,
      ` src="${replacement.src}"${dimensions} loading="lazy" decoding="async">`,
    );
  },
);

const loaderPattern =
  /\s*<script>\s*\(async\(\)=>\{try\{const r=await fetch\(["']dwec01\.html["']\);[\s\S]*?Could not load embedded illustrations[\s\S]*?<\/script>\s*/;

if (!loaderPattern.test(updatedHtml)) {
  throw new Error("No se encontró el cargador de dwec01.html; se cancela para no dejar una página inconsistente");
}

updatedHtml = updatedHtml.replace(loaderPattern, "\n");
await writeFile(pagePath, updatedHtml, "utf8");

const saved = originalBytes - optimizedBytes;
const percentage = originalBytes
  ? ((saved / originalBytes) * 100).toFixed(1)
  : "0.0";

console.log(`Imágenes procesadas: ${usedIndexes.length}`);
console.log(`Bytes originales: ${originalBytes}`);
console.log(`Bytes optimizados: ${optimizedBytes}`);
console.log(`Ahorro en imágenes incrustadas: ${saved} bytes (${percentage}%)`);
console.log("Eliminado el fetch de dwec01.html (26,7 MB) de u01_es.html");
