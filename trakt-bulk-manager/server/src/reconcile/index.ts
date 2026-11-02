import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { applyReport, type ApplyResult } from "./apply.js";
import type { TraktApi } from "./client.js";
import { toCsv } from "./csv.js";
import { buildReport } from "./diff.js";
import { loadExports } from "./parse.js";
import { createResolver } from "./resolve.js";
import { fetchTraktState } from "./state.js";
import type { Category, Report, TraktState } from "./types.js";

export * from "./types.js";
export { applyReport } from "./apply.js";

export type RunOptions = {
  api: TraktApi;
  dir: string;
  dataDir: string;
  log?: (m: string) => void;
};

export async function previewReconcile(
  opts: RunOptions,
): Promise<{ report: Report; state: TraktState }> {
  const log = opts.log ?? (() => {});
  const data = await loadExports(opts.dir);
  const state = await fetchTraktState(opts.api, log);
  const resolver = await createResolver(opts.api, state, opts.dataDir, log);
  try {
    const report = await buildReport(data, state, resolver, opts.dir, log);
    return { report, state };
  } finally {
    await resolver.save();
  }
}

const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

async function outDir(dataDir: string) {
  const dir = path.join(dataDir, "reconcile");
  await mkdir(dir, { recursive: true, mode: 0o700 });
  return dir;
}

// Raw copy of the Trakt data we read, so a bad apply can be reviewed/undone by hand.
export async function snapshotState(dataDir: string, state: TraktState) {
  const file = path.join(await outDir(dataDir), `pre-apply-${stamp()}.json`);
  await writeFile(file, JSON.stringify(state.raw), { mode: 0o600 });
  return file;
}

export async function writeReportFiles(dataDir: string, report: Report) {
  const dir = await outDir(dataDir);
  const base = path.join(dir, `report-${stamp()}`);
  await writeFile(`${base}.json`, JSON.stringify(report, null, 2), { mode: 0o600 });
  await writeFile(
    `${base}.csv`,
    toCsv(
      ["category", "source", "title", "year", "imdb", "trakt", "must", "traktValue", "note"],
      report.issues as unknown as Record<string, unknown>[],
    ),
    { mode: 0o600 },
  );
  return `${base}.csv`;
}

export async function applyReconcile(
  opts: RunOptions & { categories: Category[]; limit?: number },
): Promise<{ results: ApplyResult[]; snapshot: string; report: Report }> {
  const { report, state } = await previewReconcile(opts);
  const snapshot = await snapshotState(opts.dataDir, state);
  const results = await applyReport(opts.api, report, opts.categories, {
    limit: opts.limit,
    log: opts.log,
  });
  return { results, snapshot, report };
}
