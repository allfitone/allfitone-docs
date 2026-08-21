import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const storiesPath = resolve(repositoryRoot, "products/studio/USER_STORIES.md");
const traceabilityPath = resolve(
  repositoryRoot,
  "platform/database/refactor/03_PROPOSED_DESIGN/V1_HU_DATABASE_TRACEABILITY_MATRIX.md",
);

function linesOutsideFences(content) {
  const result = [];
  let fenceMarker;

  for (const line of content.split(/\r?\n/gu)) {
    const fence = line.match(/^\s*(`{3,}|~{3,})/u)?.[1];
    if (fence) {
      if (!fenceMarker) fenceMarker = fence[0];
      else if (fence[0] === fenceMarker) fenceMarker = undefined;
      continue;
    }
    if (!fenceMarker) result.push(line);
  }

  return result;
}

const storyLines = linesOutsideFences(readFileSync(storiesPath, "utf8"));
const storyIds = new Set();
for (const line of storyLines) {
  const id = line.match(/^### (HU-STUDIO-\d{3}) — /u)?.[1];
  if (!id) continue;
  if (storyIds.has(id)) throw new Error(`Historia duplicada: ${id}`);
  storyIds.add(id);
}

const graphHeading = storyLines.indexOf("## 6. Grafo de dependencias");
if (graphHeading === -1) throw new Error("Falta la sección 6 de dependencias");

const graph = new Map();
for (const line of storyLines.slice(graphHeading + 1)) {
  if (line === "---") break;
  const row = line.match(/^\| `(HU-STUDIO-\d{3})` \| (.+) \|$/u);
  if (!row) continue;

  const [, id, dependencyCell] = row;
  if (graph.has(id)) throw new Error(`Fila de dependencia duplicada: ${id}`);

  const dependencies = dependencyCell === "—"
    ? []
    : [...dependencyCell.matchAll(/`(HU-STUDIO-\d{3})`/gu)].map(
      (match) => match[1],
    );
  const normalizedCell = dependencyCell
    .replace(/`HU-STUDIO-\d{3}`/gu, "")
    .replace(/[\s,]/gu, "");
  if (dependencyCell !== "—" && (dependencies.length === 0 || normalizedCell)) {
    throw new Error(`Celda de dependencias inválida para ${id}: ${dependencyCell}`);
  }
  if (new Set(dependencies).size !== dependencies.length) {
    throw new Error(`Dependencia repetida en ${id}`);
  }
  graph.set(id, dependencies);
}

const failures = [];
for (const id of storyIds) {
  if (!graph.has(id)) failures.push(`Falta ${id} en el grafo`);
}
for (const [id, dependencies] of graph) {
  if (!storyIds.has(id)) failures.push(`El grafo contiene una historia inexistente: ${id}`);
  for (const dependency of dependencies) {
    if (!storyIds.has(dependency)) failures.push(`${id} depende de un ID inexistente: ${dependency}`);
    if (dependency === id) failures.push(`${id} depende de sí misma`);
  }
}

const visitState = new Map();
const path = [];
function visit(id) {
  const state = visitState.get(id);
  if (state === "done") return;
  if (state === "visiting") {
    const cycleStart = path.indexOf(id);
    failures.push(`Ciclo: ${[...path.slice(cycleStart), id].join(" → ")}`);
    return;
  }

  visitState.set(id, "visiting");
  path.push(id);
  for (const dependency of graph.get(id) ?? []) visit(dependency);
  path.pop();
  visitState.set(id, "done");
}
for (const id of storyIds) visit(id);

const statuses = new Map();
const traceabilityLines = linesOutsideFences(readFileSync(traceabilityPath, "utf8"));
for (const line of traceabilityLines) {
  const row = line.match(
    /^\| `(HU-STUDIO-\d{3}) — [^`]+` \| `[^`]+` \| `(included_v1|client_only_v1|deferred)` \|/u,
  );
  if (row) statuses.set(row[1], row[2]);
}
for (const id of storyIds) {
  if (!statuses.has(id)) failures.push(`Falta clasificación V1 para ${id}`);
}
for (const [id, dependencies] of graph) {
  if (statuses.get(id) === "deferred") continue;
  for (const dependency of dependencies) {
    if (statuses.get(dependency) === "deferred") {
      failures.push(`${id} (${statuses.get(id)}) depende de ${dependency} (deferred)`);
    }
  }
}

if (failures.length > 0) {
  console.error("Grafo de dependencias de Studio inválido:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const edgeCount = [...graph.values()].reduce(
  (total, dependencies) => total + dependencies.length,
  0,
);
const rootCount = [...graph.values()].filter((dependencies) => dependencies.length === 0).length;
console.log(
  `Grafo de Studio válido: ${storyIds.size} historias, ${edgeCount} dependencias directas, ${rootCount} raíces.`,
);
