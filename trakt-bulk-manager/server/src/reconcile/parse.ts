import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseCsv } from "./csv.js";
import type { ExportData, MovieRow, ShowRow } from "./types.js";

const toYear = (s: string) => {
  const m = /^(\d{4})/.exec(s || "");
  return m ? Number(m[1]) : null;
};

const toRating = (s: string) => {
  const n = Number(s);
  return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null;
};

export function parseMovieRows(
  text: string,
  source: "watched" | "want",
): MovieRow[] {
  return parseCsv(text).map((r, i) => ({
    source,
    line: i + 2,
    imdb: /^tt\d+$/.test(r.imdbID) ? r.imdbID : "",
    title: r.Title,
    year: toYear(r.Year),
    rating: toRating(r.Rating10),
    date: /^\d{4}-\d{2}-\d{2}$/.test(r.WatchedDate) ? r.WatchedDate : "",
  }));
}

export function parseShowRows(text: string): ShowRow[] {
  return parseCsv(text).map((r, i) => ({
    line: i + 2,
    mustId: r.ShowMustID,
    title: r.ShowTitle,
    year: toYear(r.ShowReleaseDate),
    status: (["want", "watching", "watched"].includes(r.Status)
      ? r.Status
      : r.List === "want"
        ? "want"
        : "watching") as ShowRow["status"],
    rating: toRating(r.Rating10),
    episodesWatched: Number(r.EpisodesWatched) || 0,
    episodeCount: Number(r.EpisodeCount) || 0,
    modifiedAt: r.ModifiedAt,
  }));
}

async function readOptional(file: string) {
  try {
    return await readFile(file, "utf8");
  } catch (e: any) {
    if (e?.code === "ENOENT") return "";
    throw e;
  }
}

// Files are named <user>_{watched,want,shows}.csv; the user prefix is detected.
export async function loadExports(dir: string): Promise<ExportData> {
  const files = await readdir(dir);
  const find = (suffix: string) => {
    const f = files.find((n) => n.endsWith(`_${suffix}.csv`));
    if (!f) throw new Error(`No *_${suffix}.csv found in ${dir}`);
    return path.join(dir, f);
  };
  return {
    watched: parseMovieRows(await readOptional(find("watched")), "watched"),
    want: parseMovieRows(await readOptional(find("want")), "want"),
    shows: parseShowRows(await readOptional(find("shows"))),
  };
}
