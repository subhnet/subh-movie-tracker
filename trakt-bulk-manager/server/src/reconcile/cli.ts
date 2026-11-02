import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createTraktApi } from "./client.js";
import { APPLICABLE, applyReconcile, previewReconcile, writeReportFiles, type Category } from "./index.js";

const API = "https://api.trakt.tv";
const DATA_DIR = path.resolve(process.cwd(), ".data");
const TOKEN_FILE = path.join(DATA_DIR, "tokens.json");
const CLIENT_ID = process.env.TRAKT_CLIENT_ID || "";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const i = args.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i < 0) return undefined;
  return args[i].includes("=") ? args[i].split("=").slice(1).join("=") : args[i + 1];
};

async function loadToken() {
  let tokens: any;
  try {
    tokens = JSON.parse(await readFile(TOKEN_FILE, "utf8"));
  } catch {
    throw new Error("No Trakt token. Run the app (npm run dev) and click Connect Trakt first.");
  }
  if (Date.now() / 1000 > tokens.created_at + tokens.expires_in - 90) {
    const body: Record<string, string> = {
      refresh_token: tokens.refresh_token,
      client_id: CLIENT_ID,
      grant_type: "refresh_token",
    };
    if (process.env.TRAKT_CLIENT_SECRET) body.client_secret = process.env.TRAKT_CLIENT_SECRET;
    const res = await fetch(`${API}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "trakt-api-version": "2", "trakt-api-key": CLIENT_ID },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Trakt session expired. Reconnect in the app.");
    tokens = await res.json();
    await writeFile(TOKEN_FILE, JSON.stringify(tokens), { mode: 0o600 });
  }
  return tokens.access_token as string;
}

async function main() {
  if (!CLIENT_ID) throw new Error("Add TRAKT_CLIENT_ID to server/.env first.");
  if (flag("help")) {
    console.log(`Usage: npm --workspace server run reconcile -- [--dir ../../exports_2] [--apply] [--only=a,b] [--limit=N]
  --apply   write to Trakt (default is a dry run)
  --only    comma list of: ${APPLICABLE.join(", ")}
  --limit   max items per category (use for a small first run)`);
    return;
  }
  const dir = path.resolve(process.cwd(), value("dir") ?? "../../exports_2");
  const token = await loadToken();
  const api = createTraktApi({ clientId: CLIENT_ID, getToken: () => token });
  const log = (m: string) => console.error(`· ${m}`);

  const base = { api, dir, dataDir: DATA_DIR, log };
  const only = value("only")?.split(",").filter(Boolean) as Category[] | undefined;
  const categories = only ?? APPLICABLE;
  const bad = categories.filter((c) => !APPLICABLE.includes(c));
  if (bad.length) throw new Error(`Not applicable: ${bad.join(", ")}`);

  let report;
  if (flag("apply")) {
    const limit = value("limit") ? Number(value("limit")) : undefined;
    const out = await applyReconcile({ ...base, categories, limit });
    report = out.report;
    console.log(`Pre-apply snapshot: ${out.snapshot}`);
    console.table(out.results.map((r) => ({ ...r, notFound: r.notFound.length })));
    out.results.forEach((r) => r.notFound.length && console.log(`not_found (${r.category}):`, JSON.stringify(r.notFound)));
  } else {
    report = (await previewReconcile(base)).report;
  }

  console.log("\nSource totals:");
  console.table(report.totals);
  console.log("Issues by category:");
  console.table(report.counts);
  console.log("On Trakt but not in export (never deleted):", report.traktOnly);
  console.log(`Report: ${await writeReportFiles(DATA_DIR, report)}`);
  if (flag("apply")) console.log("Re-run without --apply to verify nothing is left.");
  else if (APPLICABLE.some((c) => report.counts[c])) console.log("Dry run only. Re-run with --apply to sync.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
