import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const supportedExtensions = new Set([".md", ".mdx"]);
const ignoredDirectories = new Set([".git", "node_modules"]);
const linkPatterns = [
  /!?\[[^\]]*\]\(([^)]+)\)/g,
  /^\s*\[[^\]]+\]:\s*(\S+)/gm,
];

function collectDocuments(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirectories.has(entry.name)) return [];
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) return collectDocuments(absolutePath);
    return supportedExtensions.has(extname(entry.name).toLowerCase())
      ? [absolutePath]
      : [];
  });
}

function extractTarget(rawValue) {
  const value = rawValue.trim();
  if (value.startsWith("<")) {
    const closingBracket = value.indexOf(">");
    return closingBracket === -1 ? value : value.slice(1, closingBracket);
  }
  return value.split(/\s+["']/u, 1)[0];
}

function isExternal(target) {
  return (
    target.startsWith("mailto:") ||
    target.startsWith("tel:") ||
    /^[a-z][a-z0-9+.-]*:/iu.test(target)
  );
}

function headingSlug(rawHeading) {
  return rawHeading
    .replace(/!\[([^\]]*)\]\([^)]+\)/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .replace(/<[^>]+>/gu, "")
    .replace(/[`*_~]/gu, "")
    .trim()
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/gu, "-");
}

function collectAnchors(documentPath) {
  const anchors = new Set();
  const slugCounts = new Map();
  let fenceMarker;

  for (const line of readFileSync(documentPath, "utf8").split(/\r?\n/gu)) {
    const fence = line.match(/^\s*(`{3,}|~{3,})/u)?.[1];
    if (fence) {
      if (!fenceMarker) fenceMarker = fence[0];
      else if (fence[0] === fenceMarker) fenceMarker = undefined;
      continue;
    }
    if (fenceMarker) continue;

    for (const match of line.matchAll(/\bid=["']([^"']+)["']/giu)) {
      anchors.add(match[1]);
    }

    const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/u)?.[1];
    if (!heading) continue;

    const baseSlug = headingSlug(heading);
    if (!baseSlug) continue;
    const duplicateCount = slugCounts.get(baseSlug) ?? 0;
    const slug = duplicateCount === 0 ? baseSlug : `${baseSlug}-${duplicateCount}`;
    slugCounts.set(baseSlug, duplicateCount + 1);
    anchors.add(slug);
  }

  return anchors;
}

const anchorsByDocument = new Map();

function hasAnchor(documentPath, fragment) {
  if (!anchorsByDocument.has(documentPath)) {
    anchorsByDocument.set(documentPath, collectAnchors(documentPath));
  }
  return anchorsByDocument.get(documentPath).has(fragment);
}

const failures = [];

for (const documentPath of collectDocuments(repositoryRoot)) {
  const content = readFileSync(documentPath, "utf8");
  for (const pattern of linkPatterns) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      const target = extractTarget(match[1]);
      if (!target || isExternal(target)) continue;

      const hashIndex = target.indexOf("#");
      const targetWithoutFragment = hashIndex === -1
        ? target
        : target.slice(0, hashIndex);
      const pathWithoutQuery = targetWithoutFragment.split("?", 1)[0];
      const pathWithoutFragment = pathWithoutQuery || documentPath;
      const rawFragment = hashIndex === -1 ? "" : target.slice(hashIndex + 1);

      let decodedPath;
      let decodedFragment;
      try {
        decodedPath = decodeURIComponent(pathWithoutFragment);
        decodedFragment = decodeURIComponent(rawFragment);
      } catch {
        failures.push(`${documentPath}: invalid encoded path ${target}`);
        continue;
      }

      const resolvedTarget = pathWithoutQuery
        ? decodedPath.startsWith("/")
          ? resolve(repositoryRoot, `.${decodedPath}`)
          : resolve(dirname(documentPath), decodedPath)
        : documentPath;

      if (!existsSync(resolvedTarget)) {
        failures.push(`${documentPath}: missing ${target}`);
        continue;
      }

      if (
        decodedFragment &&
        supportedExtensions.has(extname(resolvedTarget).toLowerCase()) &&
        !hasAnchor(resolvedTarget, decodedFragment)
      ) {
        failures.push(`${documentPath}: missing anchor #${decodedFragment} in ${target}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Broken internal documentation links:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("All internal documentation links are valid.");
