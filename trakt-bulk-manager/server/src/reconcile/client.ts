const API = "https://api.trakt.tv";
const USER_AGENT = "TraktBulkManager/1.0 (https://github.com/trakt-bulk-manager)";

export type TraktApi = {
  get(pathname: string): Promise<any>;
  getAll(pathname: string, pageSize?: number): Promise<any[]>;
  post(pathname: string, body: unknown): Promise<any>;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Trakt allows ~1000 GET / 5 min and 1 write / second.
const GET_GAP_MS = 500;
const POST_GAP_MS = 1100;

export function createTraktApi(opts: {
  clientId: string;
  getToken: () => string | undefined;
}): TraktApi {
  let nextAt = 0;

  async function call(pathname: string, init: RequestInit, gap: number) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const wait = nextAt - Date.now();
      if (wait > 0) await sleep(wait);
      nextAt = Date.now() + gap;

      const token = opts.getToken();
      if (!token) throw new Error("Connect your Trakt account first.");
      const response = await fetch(`${API}${pathname}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "trakt-api-version": "2",
          "trakt-api-key": opts.clientId,
          "User-Agent": USER_AGENT,
          Authorization: `Bearer ${token}`,
        },
      });

      // 420/429 are Trakt/Cloudflare rate limits; back off and retry.
      if ([420, 429].includes(response.status) || response.status >= 500) {
        const retryAfter = Number(response.headers.get("retry-after")) || 5 * 2 ** attempt;
        await sleep(retryAfter * 1000);
        continue;
      }
      const text = await response.text();
      let data: any = {};
      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            `Trakt returned non-JSON (HTTP ${response.status}) for ${pathname}: ${text.slice(0, 200)}`,
          );
        }
      }
      if (!response.ok) {
        throw new Error(
          data.error_description || data.error || `Trakt API error (${response.status}) for ${pathname}`,
        );
      }
      return { data, response };
    }
    throw new Error(`Trakt kept rate-limiting/failing for ${pathname}`);
  }

  return {
    async get(pathname) {
      return (await call(pathname, {}, GET_GAP_MS)).data;
    },
    async getAll(pathname, pageSize = 100) {
      const all: any[] = [];
      for (let page = 1; page <= 1000; page++) {
        const sep = pathname.includes("?") ? "&" : "?";
        const { data, response } = await call(
          `${pathname}${sep}page=${page}&limit=${pageSize}`,
          {},
          GET_GAP_MS,
        );
        if (!Array.isArray(data)) return data;
        all.push(...data);
        const pages = Number(response.headers.get("x-pagination-page-count")) || 0;
        if (data.length === 0 || (pages ? page >= pages : data.length < pageSize)) break;
      }
      return all;
    },
    async post(pathname, body) {
      return (await call(pathname, { method: "POST", body: JSON.stringify(body) }, POST_GAP_MS)).data;
    },
  };
}
