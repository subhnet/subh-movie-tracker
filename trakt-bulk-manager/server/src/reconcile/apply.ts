import type { TraktApi } from "./client.js";
import { APPLICABLE, type Action, type Category, type Report } from "./types.js";

export type ApplyResult = {
  category: Category;
  sent: number;
  added: number;
  existing: number;
  removed: number;
  notFound: unknown[];
};

const CHUNK = 100;

export async function applyReport(
  api: TraktApi,
  report: Report,
  categories: Category[],
  opts: { limit?: number; log?: (m: string) => void } = {},
): Promise<ApplyResult[]> {
  const log = opts.log ?? (() => {});
  const results: ApplyResult[] = [];

  for (const category of categories) {
    if (!APPLICABLE.includes(category)) throw new Error(`Category "${category}" is report-only`);

    let actions = report.issues
      .filter((i) => i.category === category && i.action)
      .map((i) => i.action as Action);
    if (opts.limit) actions = actions.slice(0, opts.limit);

    // Same endpoint + payload twice (e.g. duplicate Must rows) must only be sent once.
    const groups = new Map<string, Map<string, Record<string, unknown>>>();
    const removeIds = new Set<number>();
    const progress = new Map<number, number>();
    for (const a of actions) {
      if (a.endpoint === "progress") {
        const id = (a.item.ids as { trakt: number }).trakt;
        progress.set(id, Math.max(progress.get(id) ?? 0, a.item.target as number));
        continue;
      }
      const gk = `${a.endpoint}:${a.type}`;
      const g = groups.get(gk) ?? new Map();
      g.set(JSON.stringify(a.item), a.item);
      groups.set(gk, g);
      a.removeHistoryIds?.forEach((id) => removeIds.add(id));
    }

    const result: ApplyResult = { category, sent: 0, added: 0, existing: 0, removed: 0, notFound: [] };

    // Per show: mark the first unwatched episodes (in order) until Must's count is reached.
    for (const [trakt, target] of progress) {
      const prog = await api.get(`/shows/${trakt}/progress/watched?specials=false&hidden=false`);
      const seasons: any[] = prog.seasons ?? [];
      const done = seasons.reduce((n, s) => n + s.episodes.filter((e: any) => e.completed).length, 0);
      let need = target - done;
      const picked: { number: number; episodes: { number: number; watched_at: string }[] }[] = [];
      for (const s of seasons) {
        const eps = s.episodes
          .filter((e: any) => !e.completed)
          .slice(0, Math.max(need, 0))
          .map((e: any) => ({ number: e.number, watched_at: "released" }));
        if (eps.length) picked.push({ number: s.number, episodes: eps });
        need -= eps.length;
      }
      if (!picked.length) continue;
      log(`POST /sync/history show ${trakt}: ${picked.reduce((n, s) => n + s.episodes.length, 0)} episodes (${category})`);
      const res = await api.post("/sync/history", { shows: [{ ids: { trakt }, seasons: picked }] });
      result.sent++;
      result.added += res.added?.episodes ?? 0;
      result.notFound.push(...(res.not_found?.episodes ?? []));
    }
    for (const [gk, items] of groups) {
      const [endpoint, type] = gk.split(":");
      const list = [...items.values()];
      for (let i = 0; i < list.length; i += CHUNK) {
        const chunk = list.slice(i, i + CHUNK);
        log(`POST /sync/${endpoint} ${type} ${i + chunk.length}/${list.length} (${category})`);
        const res = await api.post(`/sync/${endpoint}`, { [type]: chunk });
        result.sent += chunk.length;
        result.added += (res.added?.movies ?? 0) + (res.added?.shows ?? 0) + (res.added?.episodes ?? 0);
        result.existing += (res.existing?.movies ?? 0) + (res.existing?.shows ?? 0);
        const nf = res.not_found ?? {};
        result.notFound.push(...(nf.movies ?? []), ...(nf.shows ?? []));
      }
    }

    // Removal runs only after the replacement dates are in, so a failure never loses a watch.
    const ids = [...removeIds];
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      log(`POST /sync/history/remove ${i + chunk.length}/${ids.length} (${category})`);
      const res = await api.post("/sync/history/remove", { ids: chunk });
      result.removed += (res.deleted?.movies ?? 0) + (res.deleted?.episodes ?? 0);
    }
    results.push(result);
  }
  return results;
}
