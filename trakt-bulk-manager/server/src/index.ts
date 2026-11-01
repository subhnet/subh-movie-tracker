import "dotenv/config";
import express from "express";
import cors from "cors";
import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const app = express();

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

app.use(
  cors({
    origin(origin, callback) {
      // Allow local frontend origins and requests without an Origin header.
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
  }),
);

app.use(express.json({ limit: "2mb" }));
const PORT = Number(process.env.PORT || 8787);
const CLIENT_ID = process.env.TRAKT_CLIENT_ID || "";
const API = "https://api.trakt.tv";
const DATA_DIR = path.resolve(process.cwd(), ".data");
const TOKEN_FILE = path.join(DATA_DIR, "tokens.json");
const STATE_FILE = path.join(DATA_DIR, "device-session.json");

type TokenSet = {
  access_token: string;
  refresh_token: string;
  created_at: number;
  expires_in: number;
  token_type: string;
  scope?: string;
};
let tokens: TokenSet | null = null;
let deviceSession: any = null;

async function loadLocalState() {
  await mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
  try {
    tokens = JSON.parse(await readFile(TOKEN_FILE, "utf8"));
  } catch {
    tokens = null;
  }
  try {
    deviceSession = JSON.parse(await readFile(STATE_FILE, "utf8"));
  } catch {
    deviceSession = null;
  }
}
async function saveTokens(value: TokenSet | null) {
  tokens = value;
  if (value) {
    await writeFile(TOKEN_FILE, JSON.stringify(value, null, 2), {
      mode: 0o600,
    });
    await chmod(TOKEN_FILE, 0o600);
  } else {
    try {
      await writeFile(TOKEN_FILE, "{}", { mode: 0o600 });
    } catch {}
  }
}
async function saveDeviceSession(value: any) {
  deviceSession = value;
  if (value)
    await writeFile(STATE_FILE, JSON.stringify(value), { mode: 0o600 });
  else {
    try {
      await writeFile(STATE_FILE, "{}", { mode: 0o600 });
    } catch {}
  }
}

const USER_AGENT = "TraktBulkManager/1.0 (https://github.com/trakt-bulk-manager)";

function getTraktHeaders(initHeaders?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "trakt-api-version": "2",
    "trakt-api-key": CLIENT_ID,
    "User-Agent": USER_AGENT,
  };

  if (tokens?.access_token) {
    headers["Authorization"] = `Bearer ${tokens.access_token}`;
  }

  if (initHeaders) {
    if (initHeaders instanceof Headers) {
      initHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(initHeaders)) {
      for (const [key, value] of initHeaders) {
        headers[key] = value;
      }
    } else {
      Object.assign(headers, initHeaders);
    }
  }

  return headers;
}

async function parseTraktResponse(response: Response) {
  const text = await response.text();

  if (!text || !text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    const contentType = response.headers.get("content-type") || "";
    if (response.status === 403) {
      throw new Error(
        `Trakt API request blocked (HTTP 403 Forbidden). Cloudflare or Trakt rejected the request. Please check your TRAKT_CLIENT_ID in server/.env.`,
      );
    }
    if (response.status === 429) {
      throw new Error(
        `Trakt API rate limit reached (HTTP 429). Please wait before retrying.`,
      );
    }
    if (response.status >= 500) {
      throw new Error(
        `Trakt service unavailable (HTTP ${response.status}). Trakt servers may be experiencing downtime.`,
      );
    }
    throw new Error(
      `Trakt returned non-JSON response. ` +
        `HTTP ${response.status}, ` +
        `Content-Type: ${contentType}, ` +
        `Body: ${text.slice(0, 300)}`,
    );
  }
}

function requireClient() {
  if (!CLIENT_ID) throw new Error("Add TRAKT_CLIENT_ID to server/.env first.");
}
async function trakt(pathname: string, init: RequestInit = {}) {
  if (!tokens?.access_token)
    throw new Error("Connect your Trakt account first.");
  const response = await fetch(`${API}${pathname}`, {
    ...init,
    headers: getTraktHeaders(init.headers),
  });
  const data = await parseTraktResponse(response);
  if (!response.ok) {
    const errorMsg =
      data.error_description ||
      data.error ||
      `Trakt API error (${response.status})`;
    throw new Error(errorMsg);
  }
  return data;
}
async function traktAll(pathname: string, pageSize = 100) {
  const all: any[] = [];
  for (let page = 1; page <= 1000; page++) {
    const separator = pathname.includes("?") ? "&" : "?";
    const batch = await trakt(
      `${pathname}${separator}page=${page}&limit=${pageSize}`,
    );
    if (!Array.isArray(batch)) return batch;
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return all;
}
async function refreshIfNeeded() {
  if (!tokens) return;
  const expired =
    Date.now() / 1000 > tokens.created_at + tokens.expires_in - 90;
  if (!expired) return;
  const body: Record<string, string> = {
    refresh_token: tokens.refresh_token,
    client_id: CLIENT_ID,
    grant_type: "refresh_token",
  };
  if (process.env.TRAKT_CLIENT_SECRET) {
    body.client_secret = process.env.TRAKT_CLIENT_SECRET;
  }
  const response = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: getTraktHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parseTraktResponse(response);
  if (!response.ok) {
    await saveTokens(null);
    throw new Error("Trakt session expired. Please connect again.");
  }
  await saveTokens(data as TokenSet);
}
app.use("/api", async (_req, _res, next) => {
  try {
    await refreshIfNeeded();
    next();
  } catch (e) {
    next(e);
  }
});

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, app: "Trakt Bulk Manager", version: "0.1.0" }),
);
app.get("/api/auth/status", (_req, res) =>
  res.json({
    connected: Boolean(tokens?.access_token),
    expiresAt: tokens ? tokens.created_at + tokens.expires_in : null,
  }),
);
app.post("/api/auth/device/start", async (_req, res, next) => {
  try {
    requireClient();
    const response = await fetch(`${API}/oauth/device/code`, {
      method: "POST",
      headers: getTraktHeaders(),
      body: JSON.stringify({ client_id: CLIENT_ID }),
    });

    const data = await parseTraktResponse(response);

    if (!response.ok) {
      throw new Error(
        data.error_description ||
          data.error ||
          `Failed to get device code (${response.status})`,
      );
    }
    await saveDeviceSession({ ...data, startedAt: Date.now() });
    res.json({
      user_code: data.user_code,
      verification_url: data.verification_url,
      expires_in: data.expires_in,
      interval: data.interval,
    });
  } catch (e) {
    next(e);
  }
});
app.post("/api/auth/device/poll", async (_req, res, next) => {
  try {
    requireClient();
    if (!deviceSession)
      return res
        .status(400)
        .json({ error: "Start the connection process first." });
    if (
      Date.now() >
      deviceSession.startedAt + deviceSession.expires_in * 1000
    ) {
      await saveDeviceSession(null);
      return res
        .status(410)
        .json({ error: "Device code expired. Start again." });
    }
    const body: Record<string, string> = {
      code: deviceSession.device_code,
      client_id: CLIENT_ID,
    };
    if (process.env.TRAKT_CLIENT_SECRET) {
      body.client_secret = process.env.TRAKT_CLIENT_SECRET;
    }
    const response = await fetch(`${API}/oauth/device/token`, {
      method: "POST",
      headers: getTraktHeaders(),
      body: JSON.stringify(body),
    });

    // Trakt Device Auth status codes:
    // 200: Success
    // 400: Pending - user has not approved yet (Trakt returns empty body)
    // 429: Slow down - polling too quickly
    // 404: Not found or expired code
    // 410: Expired code or deactivated account
    // 418: Denied by user
    if (response.status === 400) {
      return res.json({
        pending: true,
        interval: deviceSession.interval || 5,
      });
    }
    if (response.status === 429) {
      return res.json({
        pending: true,
        interval: (deviceSession.interval || 5) + 5,
      });
    }
    if (response.status === 404) {
      await saveDeviceSession(null);
      return res
        .status(404)
        .json({ error: "Device code not found or expired. Please start again." });
    }
    if (response.status === 410) {
      await saveDeviceSession(null);
      return res
        .status(410)
        .json({ error: "Device code expired. Please start again." });
    }
    if (response.status === 418) {
      await saveDeviceSession(null);
      return res
        .status(403)
        .json({ error: "Authorization was denied on Trakt." });
    }

    const data = await parseTraktResponse(response);

    if (!response.ok)
      throw new Error(
        data.error_description ||
          data.error ||
          "Could not complete Trakt authorization.",
      );
    await saveTokens(data as TokenSet);
    await saveDeviceSession(null);
    res.json({ connected: true });
  } catch (e) {
    next(e);
  }
});
app.post("/api/auth/disconnect", async (_req, res) => {
  await saveTokens(null);
  await saveDeviceSession(null);
  res.json({ ok: true });
});

app.get("/api/library/watchlist", async (_req, res, next) => {
  try {
    const [movies, shows] = await Promise.all([
      trakt("/sync/watchlist/movies"),
      trakt("/sync/watchlist/shows"),
    ]);
    res.json({ movies, shows });
  } catch (e) {
    next(e);
  }
});
app.get("/api/library/ratings", async (_req, res, next) => {
  try {
    res.json(await trakt("/sync/ratings"));
  } catch (e) {
    next(e);
  }
});
app.get("/api/library/lists", async (_req, res, next) => {
  try {
    res.json(await trakt("/users/me/lists"));
  } catch (e) {
    next(e);
  }
});
app.get("/api/library/list/:id", async (req, res, next) => {
  try {
    res.json(
      await trakt(`/users/me/lists/${encodeURIComponent(req.params.id)}/items`),
    );
  } catch (e) {
    next(e);
  }
});

const itemSchema = z.object({
  ids: z
    .object({
      trakt: z.number().int().positive().optional(),
      tmdb: z.number().int().positive().optional(),
      imdb: z.string().optional(),
    })
    .refine(
      (x) => Boolean(x.trakt || x.tmdb || x.imdb),
      "Each item needs a Trakt, TMDB, or IMDb ID",
    ),
});
const bulkSchema = z.object({
  type: z.enum(["movies", "shows"]),
  items: z.array(itemSchema).min(1).max(100),
  rating: z.number().int().min(1).max(10),
});
app.post("/api/actions/ratings", async (req, res, next) => {
  try {
    const parsed = bulkSchema.parse(req.body);
    const payload = {
      [parsed.type]: parsed.items.map((x) => ({ ids: x.ids })),
      rating: parsed.rating,
    };
    const result = await trakt("/sync/ratings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});
app.post("/api/actions/ratings/remove", async (req, res, next) => {
  try {
    const parsed = z
      .object({
        movies: z.array(itemSchema).optional(),
        shows: z.array(itemSchema).optional(),
      })
      .refine((x) => (x.movies?.length || 0) + (x.shows?.length || 0) > 0)
      .parse(req.body);
    res.json(
      await trakt("/sync/ratings/remove", {
        method: "POST",
        body: JSON.stringify(parsed),
      }),
    );
  } catch (e) {
    next(e);
  }
});
const listActionSchema = z.object({
  listId: z.string().min(1),
  type: z.enum(["movies", "shows"]),
  items: z.array(itemSchema).min(1).max(100),
});
app.post("/api/actions/list/add", async (req, res, next) => {
  try {
    const p = listActionSchema.parse(req.body);
    res.json(
      await trakt(`/users/me/lists/${encodeURIComponent(p.listId)}/items`, {
        method: "POST",
        body: JSON.stringify({
          [p.type]: p.items.map((x) => ({ ids: x.ids })),
        }),
      }),
    );
  } catch (e) {
    next(e);
  }
});
app.post("/api/actions/list/remove", async (req, res, next) => {
  try {
    const p = listActionSchema.parse(req.body);
    res.json(
      await trakt(
        `/users/me/lists/${encodeURIComponent(p.listId)}/items/remove`,
        {
          method: "POST",
          body: JSON.stringify({
            [p.type]: p.items.map((x) => ({ ids: x.ids })),
          }),
        },
      ),
    );
  } catch (e) {
    next(e);
  }
});

app.get("/api/backup", async (_req, res, next) => {
  try {
    const [
      watchlistMovies,
      watchlistShows,
      ratings,
      lists,
      historyMovies,
      historyShows,
    ] = await Promise.all([
      traktAll("/sync/watchlist/movies"),
      traktAll("/sync/watchlist/shows"),
      traktAll("/sync/ratings"),
      traktAll("/users/me/lists"),
      traktAll("/sync/history/movies"),
      traktAll("/sync/history/shows"),
    ]);
    const listsWithItems = await Promise.all(
      (lists as any[]).map(async (list: any) => ({
        ...list,
        items: await traktAll(
          `/users/me/lists/${encodeURIComponent(String(list.ids?.trakt ?? list.id))}/items`,
        ),
      })),
    );
    const backup = {
      app: "Trakt Bulk Manager",
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      watchlist: { movies: watchlistMovies, shows: watchlistShows },
      ratings,
      history: { movies: historyMovies, shows: historyShows },
      lists: listsWithItems,
    };
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=trakt-backup-${new Date().toISOString().slice(0, 10)}.json`,
    );
    res.json(backup);
  } catch (e) {
    next(e);
  }
});

app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const message = err instanceof Error ? err.message : "Unexpected error";
    res.status(400).json({ error: message });
  },
);
loadLocalState().then(() =>
  app.listen(PORT, "127.0.0.1", () =>
    console.log(`Local API listening on http://127.0.0.1:${PORT}`),
  ),
);
