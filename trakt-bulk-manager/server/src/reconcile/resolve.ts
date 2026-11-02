import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TraktApi } from "./client.js";
import type { MovieRow, Resolution, ShowRow, TraktRef, TraktState } from "./types.js";

export type Overrides = Record<string, { imdb?: string; tmdb?: number; trakt?: number }>;

export type Resolver = {
  movie(row: MovieRow): Promise<Resolution>;
  show(row: ShowRow): Promise<Resolution>;
  save(): Promise<void>;
};

export const normTitle = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");

const yearOk = (a?: number | null, b?: number | null, tol = 1) =>
  a == null || b == null || Math.abs(a - b) <= tol;

const refOf = (m: any): TraktRef => ({
  trakt: m.ids.trakt,
  imdb: m.ids.imdb || undefined,
  tmdb: m.ids.tmdb || undefined,
  title: m.title,
  year: m.year ?? undefined,
});

const describe = (m: any) => `${m.title} (${m.year ?? "?"}) trakt:${m.ids?.trakt}`;

export const overrideKey = (title: string, year: number | null) =>
  `${normTitle(title)}|${year ?? ""}`;

export async function createResolver(
  api: TraktApi,
  state: TraktState,
  dataDir: string,
  log: (m: string) => void = () => {},
): Promise<Resolver> {
  const cacheFile = path.join(dataDir, "reconcile-cache.json");
  const overrideFile = path.join(dataDir, "reconcile-overrides.json");
  let cache: Record<string, any> = {};
  let overrides: Overrides = {};
  try {
    cache = JSON.parse(await readFile(cacheFile, "utf8"));
  } catch {}
  try {
    overrides = JSON.parse(await readFile(overrideFile, "utf8"));
  } catch {}
  let dirty = false;

  async function cached(key: string, fetcher: () => Promise<any>) {
    if (key in cache) return cache[key];
    const value = await fetcher();
    cache[key] = value;
    dirty = true;
    return value;
  }

  const search = (path: string, key: string) =>
    cached(key, async () => {
      log(`Lookup ${key}`);
      const res = await api.get(path);
      return Array.isArray(res) ? res : [];
    });

  async function byId(kind: "movie" | "show", idType: string, id: string | number) {
    const res = await search(`/search/${idType}/${encodeURIComponent(String(id))}?type=${kind}`, `${idType}:${id}:${kind}`);
    return res.find((r: any) => r[kind])?.[kind];
  }

  async function bySearch(kind: "movie" | "show", title: string, year: number | null): Promise<Resolution> {
    const q = encodeURIComponent(title);
    const results: any[] = await search(
      `/search/${kind}?query=${q}${year ? `&years=${year - 1}-${year + 1}` : ""}`,
      `search:${kind}:${title}|${year ?? ""}`,
    );
    const items = results.map((r) => r[kind]).filter(Boolean);
    const exact = items.filter((m) => normTitle(m.title) === normTitle(title) && yearOk(m.year, year, 1));
    const best =
      exact.length === 1
        ? exact[0]
        : exact.filter((m) => m.year === year).length === 1
          ? exact.find((m) => m.year === year)
          : null;
    if (best) return { ok: true, ref: refOf(best), via: "title+year search" };
    return {
      ok: false,
      reason: exact.length > 1 ? "ambiguous title/year match" : "no exact title/year match on Trakt",
      candidates: items.slice(0, 3).map(describe),
    };
  }

  async function viaOverride(kind: "movie" | "show", title: string, year: number | null, imdb?: string) {
    const o = overrides[overrideKey(title, year)] || (imdb ? overrides[imdb] : undefined);
    if (!o) return null;
    const m = o.imdb
      ? await byId(kind, "imdb", o.imdb)
      : o.tmdb
        ? await byId(kind, "tmdb", o.tmdb)
        : o.trakt
          ? await byId(kind, "trakt", o.trakt)
          : null;
    return m ? ({ ok: true, ref: refOf(m), via: "manual override" } as Resolution) : null;
  }

  return {
    async movie(row) {
      const override = await viaOverride("movie", row.title, row.year, row.imdb);
      if (override) return override;

      if (row.imdb) {
        const known = state.movieByImdb.get(row.imdb);
        if (known && yearOk(known.year, row.year)) return { ok: true, ref: known, via: "imdb (on Trakt)" };
        if (!known) {
          const m = await byId("movie", "imdb", row.imdb);
          if (m && yearOk(m.year, row.year)) return { ok: true, ref: refOf(m), via: "imdb lookup" };
        }
      }
      const fallback = await bySearch("movie", row.title, row.year);
      if (fallback.ok && row.imdb) {
        return { ...fallback, via: `title+year search (imdb ${row.imdb} disagrees on year/title)` };
      }
      return fallback;
    },

    async show(row) {
      const override = await viaOverride("show", row.title, row.year);
      if (override) return override;
      return bySearch("show", row.title, row.year);
    },

    async save() {
      if (!dirty) return;
      await mkdir(dataDir, { recursive: true, mode: 0o700 });
      await writeFile(cacheFile, JSON.stringify(cache), { mode: 0o600 });
      dirty = false;
    },
  };
}
