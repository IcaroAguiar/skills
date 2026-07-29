import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, extname, isAbsolute, join, relative, resolve } from "node:path";
import { slugify } from "./html.mjs";

function collectSectionAssets(report) {
  return (report.sections || [])
    .filter((section) => ["screenshots"].includes(section.component))
    .flatMap((section) => section.items || []);
}

function assertInsideInputDirectory(source, inputDir, declaredSrc) {
  const relativeSource = relative(inputDir, source);
  if (relativeSource.startsWith("..") || relativeSource === "" || isAbsolute(relativeSource)) {
    throw new Error(`Asset source must stay inside the report input directory: ${declaredSrc}`);
  }
}

function assertInsideDirectory(target, directory, message) {
  const relativeTarget = relative(directory, target);
  if (relativeTarget.startsWith("..") || relativeTarget === "" || isAbsolute(relativeTarget)) {
    throw new Error(message);
  }
}

function assertLocalAssetSource(src) {
  const normalized = String(src).trim().toLowerCase();
  if (/^(https?:)?\/\//i.test(normalized) || normalized.startsWith("data:")) {
    throw new Error(`Remote or inline media is not allowed by default: ${src}`);
  }
}

function safeAssetName(asset, source) {
  if (asset.name) {
    if (basename(asset.name) !== asset.name || asset.name.includes("..")) {
      throw new Error(`Asset output name must be a plain file name: ${asset.name}`);
    }
    return asset.name;
  }
  return `${slugify(asset.title || asset.caption || asset.alt || "asset")}${extname(source)}`;
}

export function copyAssets(report, inputDir, outputDir) {
  const assets = [...(report.assets || []), ...(report.screenshots || []), ...collectSectionAssets(report)];
  if (!assets.length) return;

  const assetsDir = join(outputDir, "assets");
  mkdirSync(assetsDir, { recursive: true });

  for (const asset of assets) {
    if (!asset.src) continue;
    assertLocalAssetSource(asset.src);
    const source = isAbsolute(asset.src) ? asset.src : resolve(inputDir, asset.src);
    if (!existsSync(source)) continue;
    assertInsideInputDirectory(source, inputDir, asset.src);

    const name = safeAssetName(asset, source);
    const dest = join(assetsDir, name);
    assertInsideDirectory(dest, assetsDir, `Asset destination must stay inside the generated assets directory: ${asset.name || name}`);
    copyFileSync(source, dest);
    asset.outputSrc = `./assets/${name}`;
  }
}
