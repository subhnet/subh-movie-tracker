import type { Resolver } from "./resolve.js";
import {
  APPLICABLE,
  type Action,
  CATEGORIES,
  type Category,
  type ExportData,
  type Issue,
  type MovieRow,
  type Report,
  type Resolution,
  type ShowRow,
  type SourceTotals,
  type TraktRef,
  type TraktState,
} from "./types.js";

const DAY = 86_400_000;
export const DATE_TOLERANCE_DAYS = 1;

const dayNum = (iso: string) => {
  const d = new Date(iso);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY);
};

export function hasNearbyEvent(events: string[], date: string) {
  const target = dayNum(`${date}T00:00:00Z`);
  return events.some((e) => Math.abs(dayNum(e) - target) <= DATE_TOLERANCE_DAYS);
}

// Fixed midday time keeps the Trakt-displayed date stable across timezones and reruns idempotent.
export const watchedAtFor = (date: string) => `${date}T12:00:00.000Z`;

const progressAction = (trakt: number, target: number): Action => ({
  endpoint: "progress",
  type: "shows",
  item: { ids: { trakt }, target },
});

const emptyTotals = (): SourceTotals => ({ rows: 0, ok: 0, needsAction: 0, manual: 0 });

export async function buildReport(
  data: ExportData,
  state: TraktState,
  resolver: Pick<Resolver, "movie" | "show">,
  dir: string,
  log: (m: string) => void = () => {},
): Promise<Report> {
  const issues: Issue[] = [];
  const totals = { watched: emptyTotals(), want: emptyTotals(), shows: emptyTotals() };

  const eventsByTrakt = new Map<number, { id: number; watchedAt: string }[]>();
  for (const e of state.movieHistory) {
    const list = eventsByTrakt.get(e.trakt) ?? [];
    list.push(e);
    eventsByTrakt.set(e.trakt, list);
  }
  const replacedFor = new Set<number>();

  function record(source: "watched" | "want" | "shows", rowIssues: Issue[], manual = false) {
    const t = totals[source];
    t.rows++;
    if (manual) t.manual++;
    else if (rowIssues.some((i) => APPLICABLE.includes(i.category))) t.needsAction++;
    else t.ok++;
    issues.push(...rowIssues);
  }

  const unresolvedIssue = (
    source: "watched" | "want" | "shows",
    kind: "movie" | "show",
    row: { title: string; year: number | null; imdb?: string },
    res: Extract<Resolution, { ok: false }>,
    must: string,
  ): Issue => ({
    category: "unresolved",
    source,
    kind,
    title: row.title,
    year: row.year,
    imdb: row.imdb || undefined,
    must,
    traktValue: "",
    note: `${res.reason}${res.candidates.length ? `; candidates: ${res.candidates.join(" | ")}` : ""}`,
  });

  // --- Movies: watched ---
  log(`Resolving ${data.watched.length} watched movies`);
  const watchedResolved: { row: MovieRow; res: Resolution }[] = [];
  for (const row of data.watched) watchedResolved.push({ row, res: await resolver.movie(row) });

  const ratingRow = new Map<number, MovieRow>();
  for (const { row, res } of watchedResolved) {
    if (!res.ok || row.rating == null) continue;
    const cur = ratingRow.get(res.ref.trakt);
    if (!cur || row.date >= cur.date) ratingRow.set(res.ref.trakt, row);
  }
  const mustWatchedKeys = new Set<number>();
  const mustDates = new Map<number, string[]>();
  for (const { row, res } of watchedResolved) {
    if (!res.ok || !row.date) continue;
    mustDates.set(res.ref.trakt, [...(mustDates.get(res.ref.trakt) ?? []), row.date]);
  }

  for (const { row, res } of watchedResolved) {
    const must = `${row.rating ?? "–"}/10 on ${row.date || "?"}`;
    if (!res.ok) {
      record("watched", [unresolvedIssue("watched", "movie", row, res, must)], true);
      continue;
    }
    if (!row.date) {
      record(
        "watched",
        [unresolvedIssue("watched", "movie", row, { ok: false, reason: "invalid watched date", candidates: [] }, must)],
        true,
      );
      continue;
    }
    const ref = res.ref;
    mustWatchedKeys.add(ref.trakt);
    const base = {
      source: "watched" as const,
      kind: "movie" as const,
      title: row.title,
      year: row.year,
      imdb: ref.imdb,
      trakt: ref.trakt,
      must,
      note: res.via.startsWith("title+year") ? `matched via ${res.via}` : undefined,
    };
    const rowIssues: Issue[] = [];

    const events = eventsByTrakt.get(ref.trakt) ?? [];
    if (!hasNearbyEvent(events.map((e) => e.watchedAt), row.date)) {
      const add = { ids: { trakt: ref.trakt }, watched_at: watchedAtFor(row.date) };
      const traktValue = events.length
        ? `watched on ${events.map((e) => e.watchedAt.slice(0, 10)).join(", ")}`
        : state.watchedMovies.has(ref.trakt)
          ? "watched (no dated history)"
          : "not watched";

      if (events.length === 0) {
        rowIssues.push({
          ...base,
          category: state.watchedMovies.has(ref.trakt) ? "date-missing" : "missing-watched",
          traktValue,
          action: { endpoint: "history", type: "movies", item: add },
        });
      } else {
        // Replace bulk-import placeholder watches; leave genuinely dated ones for manual review.
        const own = mustDates.get(ref.trakt) ?? [];
        const stale = events.filter(
          (e) =>
            state.placeholderDays.has(e.watchedAt.slice(0, 10)) &&
            !own.some((d) => hasNearbyEvent([e.watchedAt], d)),
        );
        if (stale.length) {
          const first = !replacedFor.has(ref.trakt);
          replacedFor.add(ref.trakt);
          rowIssues.push({
            ...base,
            category: "date-missing",
            traktValue,
            note: first ? "Replaces the placeholder-dated watch" : undefined,
            action: {
              endpoint: "history",
              type: "movies",
              item: add,
              removeHistoryIds: first ? stale.map((e) => e.id) : undefined,
            },
          });
        } else {
          rowIssues.push({
            ...base,
            category: "date-conflict",
            traktValue,
            note: "Report only: Trakt has a different, non-placeholder watch date",
          });
        }
      }
    }

    if (row.rating != null && ratingRow.get(ref.trakt) === row) {
      const have = state.movieRatings.get(ref.trakt);
      if (have !== row.rating) {
        const others = new Set(
          watchedResolved
            .filter((x) => x.res.ok && x.res.ref.trakt === ref.trakt && x.row.rating != null)
            .map((x) => x.row.rating),
        );
        rowIssues.push({
          ...base,
          category: have == null ? "missing-rating" : "rating-mismatch",
          traktValue: have == null ? "not rated" : `${have}/10`,
          note: others.size > 1 ? "Must has several ratings for this movie; using the latest watch" : base.note,
          action: {
            endpoint: "ratings",
            type: "movies",
            item: { ids: { trakt: ref.trakt }, rating: row.rating, rated_at: watchedAtFor(row.date) },
          },
        });
      }
    }
    record("watched", rowIssues);
  }

  // --- Movies: want ---
  log(`Resolving ${data.want.length} want-to-watch movies`);
  const wantKeys = new Set<number>();
  for (const row of data.want) {
    const res = await resolver.movie(row);
    const must = `want (added ${row.date || "?"})`;
    if (!res.ok) {
      record("want", [unresolvedIssue("want", "movie", row, res, must)], true);
      continue;
    }
    const ref: TraktRef = res.ref;
    wantKeys.add(ref.trakt);
    const covered =
      mustWatchedKeys.has(ref.trakt) ||
      state.watchedMovies.has(ref.trakt) ||
      state.movieWatchlist.has(ref.trakt);
    record(
      "want",
      covered
        ? []
        : [
            {
              source: "want",
              kind: "movie",
              title: row.title,
              year: row.year,
              imdb: ref.imdb,
              trakt: ref.trakt,
              category: "missing-watchlist",
              must,
              traktValue: "not on watchlist",
              note: res.via.startsWith("title+year") ? `matched via ${res.via}` : undefined,
              action: { endpoint: "watchlist", type: "movies", item: { ids: { trakt: ref.trakt } } },
            },
          ],
    );
  }

  // --- Shows ---
  log(`Resolving ${data.shows.length} shows`);
  for (const row of data.shows) {
    const must = `${row.status}, ${row.episodesWatched}/${row.episodeCount} eps${row.rating ? `, ${row.rating}/10` : ""}`;
    const res = await resolver.show(row);
    if (!res.ok) {
      record("shows", [unresolvedIssue("shows", "show", row, res, must)], true);
      continue;
    }
    const ref = res.ref;
    const traktEps = state.watchedShows.get(ref.trakt) ?? 0;
    const onWatchlist = state.showWatchlist.has(ref.trakt);
    const base = {
      source: "shows" as const,
      kind: "show" as const,
      title: row.title,
      year: row.year,
      imdb: ref.imdb,
      trakt: ref.trakt,
      must,
    };
    const rowIssues: Issue[] = [];

    if (row.status === "want" || row.status === "watching") {
      if (traktEps === 0 && !onWatchlist) {
        rowIssues.push({
          ...base,
          category: "missing-watchlist",
          traktValue: "not on watchlist",
          action: { endpoint: "watchlist", type: "shows", item: { ids: { trakt: ref.trakt } } },
        });
      }
      if (row.status === "watching" && traktEps < row.episodesWatched) {
        rowIssues.push({
          ...base,
          category: "show-behind",
          traktValue: `${traktEps} eps watched`,
          note: "Marks the first unwatched episodes (in order) as watched, up to Must's count",
          action: progressAction(ref.trakt, row.episodesWatched),
        });
      }
    } else if (traktEps === 0) {
      rowIssues.push({
        ...base,
        category: "missing-show-watched",
        traktValue: "not watched",
        note: "Marks all episodes watched at their release dates",
        action: {
          endpoint: "history",
          type: "shows",
          item: { ids: { trakt: ref.trakt }, watched_at: "released" },
        },
      });
    } else if (traktEps < row.episodesWatched) {
      rowIssues.push({
        ...base,
        category: "show-partial",
        traktValue: `${traktEps} eps watched`,
        note: "Marks the first unwatched episodes (in order) as watched, up to Must's count",
        action: progressAction(ref.trakt, row.episodesWatched),
      });
    }

    if (row.rating != null) {
      const have = state.showRatings.get(ref.trakt);
      if (have !== row.rating) {
        rowIssues.push({
          ...base,
          category: have == null ? "missing-rating" : "rating-mismatch",
          traktValue: have == null ? "not rated" : `${have}/10`,
          action: {
            endpoint: "ratings",
            type: "shows",
            item: { ids: { trakt: ref.trakt }, rating: row.rating, rated_at: row.modifiedAt || undefined },
          },
        });
      }
    }
    record("shows", rowIssues);
  }

  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  issues.forEach((i) => counts[i.category]++);

  return {
    generatedAt: new Date().toISOString(),
    dir,
    totals,
    counts,
    traktOnly: {
      watchedMovies: [...state.watchedMovies].filter((id) => !mustWatchedKeys.has(id)).length,
      watchlistMovies: [...state.movieWatchlist].filter((id) => !wantKeys.has(id)).length,
      ratedMovies: [...state.movieRatings.keys()].filter((id) => !mustWatchedKeys.has(id)).length,
    },
    issues,
  };
}
