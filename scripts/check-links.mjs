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
    target.startsWith("#") ||
    target.startsWith("mailto:") ||
    target.startsWith("tel:") ||
    /^[a-z][a-z0-9+.-]*:/iu.test(target)
  );
}

const failures = [];

for (const documentPath of collectDocuments(repositoryRoot)) {
  const content = readFileSync(documentPath, "utf8");
  for (const pattern of linkPatterns) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      const target = extractTarget(match[1]);
      if (!target || isExternal(target)) continue;

      const pathWithoutFragment = target.split(/[?#]/u, 1)[0];
      if (!pathWithoutFragment) continue;

      let decodedPath;
      try {
        decodedPath = decodeURIComponent(pathWithoutFragment);
      } catch {
        failures.push(`${documentPath}: invalid encoded path ${target}`);
        continue;
      }

      const resolvedTarget = decodedPath.startsWith("/")
        ? resolve(repositoryRoot, `.${decodedPath}`)
        : resolve(dirname(documentPath), decodedPath);

      if (!existsSync(resolvedTarget)) {
        failures.push(`${documentPath}: missing ${target}`);
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
