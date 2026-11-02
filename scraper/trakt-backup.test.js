const test = require('node:test');
const assert = require('node:assert/strict');
const {
  toCsv, parseCsv, buildWatchedRows, buildWantRows, buildShowRows, shrinkProblems, createClient, serializeDump, buildDump,
} = require('./trakt-backup');

const movie = (trakt, title, year, imdb) => ({ title, year, ids: { trakt, imdb, tmdb: trakt } });

test('CSV round-trips commas, quotes and keeps the existing quoting style', () => {
  const rows = [{ title: 'I, Tonya', rating: '7', watchedDate: '2025-10-05', notes: 'say "hi"', tags: '', rewatched: 'false', year: 2017, imdb: 'tt1' }];
  const csv = toCsv(rows);
  assert.match(csv, /^title,rating,watchedDate,notes,tags,rewatched,year,imdb\n"I, Tonya",7,2025-10-05,"say ""hi""",,false,2017,tt1\n$/);
  assert.deepEqual(parseCsv(csv)[0].title, 'I, Tonya');
  assert.deepEqual(parseCsv(csv)[0].notes, 'say "hi"');
});

test('watched rows: rating, IST date, rewatch flag, ordering and notes carry-over (duplicates positional)', () => {
  const existing = [
    { title: 'Dune', notes: 'old remake note', tags: 'a' },
    { title: 'Dune', notes: 'second dune', tags: '' },
  ];
  const rows = buildWatchedRows(
    {
      watched: [
        { plays: 1, last_watched_at: '2026-10-01T20:00:00.000Z', movie: movie(1, 'Dune', 1984, 'tt1') }, // 2026-10-02 in IST
        { plays: 2, last_watched_at: '2026-10-05T12:00:00.000Z', movie: movie(2, 'Dune', 2021, 'tt2') },
        { plays: 1, last_watched_at: '2026-10-05T12:00:00.000Z', movie: movie(3, 'Alien', 1979, 'tt3') },
      ],
      ratings: [{ rating: 8, movie: movie(2, 'Dune', 2021, 'tt2') }],
    },
    existing,
    'Asia/Kolkata',
  );
  assert.deepEqual(rows.map((r) => r.imdb), ['tt3', 'tt2', 'tt1']);
  assert.equal(rows.find((r) => r.imdb === 'tt1').watchedDate, '2026-10-02');
  assert.equal(rows.find((r) => r.imdb === 'tt2').rating, '8');
  assert.equal(rows.find((r) => r.imdb === 'tt2').rewatched, 'true');
  assert.equal(rows.find((r) => r.imdb === 'tt3').rating, 'N/A');
  const dunes = rows.filter((r) => r.title === 'Dune').map((r) => r.notes);
  assert.deepEqual(dunes.sort(), ['old remake note', 'second dune']);
});

test('carry-over prefers imdb id once the CSV has one', () => {
  const rows = buildWatchedRows(
    { watched: [{ plays: 1, last_watched_at: '2026-01-01T12:00:00Z', movie: movie(1, 'X', 2000, 'tt9') }], ratings: [] },
    [{ title: 'Renamed', imdb: 'tt9', notes: 'kept', tags: 't' }],
    'UTC',
  );
  assert.equal(rows[0].notes, 'kept');
  assert.equal(rows[0].tags, 't');
});

test('want and show rows: watchlist only, shows are the union of watched and watchlist', () => {
  const wants = buildWantRows({ watchlist: [{ listed_at: '2026-01-01T00:00:00Z', movie: movie(1, 'W', 2020, 'tt1') }] }, []);
  assert.equal(wants[0].watchedDate, '');
  assert.equal(wants[0].rating, 'N/A');
  const show = (id, t) => ({ title: t, year: 2020, ids: { trakt: id, imdb: `tt${id}` } });
  const shows = buildShowRows(
    {
      watched: [{ last_watched_at: '2026-02-01T00:00:00Z', show: show(1, 'Seen') }],
      watchlist: [{ show: show(1, 'Seen') }, { show: show(2, 'Later') }],
      ratings: [{ rating: 9, show: show(1, 'Seen') }],
    },
    [],
  );
  assert.deepEqual(shows.map((s) => [s.title, s.rating]), [['Seen', '9'], ['Later', 'N/A']]);
});

test('shrinkProblems flags a big drop but not growth or an empty history', () => {
  assert.deepEqual(shrinkProblems({ watched: 700, wants: 10, shows: 5 }, { watched: 666, wants: 0, shows: 5 }), []);
  assert.equal(shrinkProblems({ watched: 100, wants: 10, shows: 5 }, { watched: 666, wants: 10, shows: 5 }).length, 1);
});

test('client paginates with the pagination header and fails clearly on a private profile', async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    const page = Number(new URL(url).searchParams.get('page'));
    return { status: 200, ok: true, headers: new Map([['x-pagination-page-count', '2']]), text: async () => JSON.stringify([{ page }]) };
  };
  const client = createClient({ clientId: 'k', username: 'me', fetchImpl, gapMs: 0 });
  assert.deepEqual(await client.getAll('history/movies'), [{ page: 1 }, { page: 2 }]);
  assert.match(urls[0], /\/users\/me\/history\/movies\?page=1&limit=\d+/);

  const forbidden = createClient({
    clientId: 'k', username: 'me', gapMs: 0,
    fetchImpl: async () => ({ status: 401, ok: false, headers: new Map(), text: async () => '' }),
  });
  await assert.rejects(forbidden.getAll('watched/movies'), /public/);
});

test('dump is deterministic and one record per line', () => {
  const m = movie(1, 'A', 2000, 'tt1');
  const data = {
    movies: { watched: [{ plays: 1, last_watched_at: '2026-01-01T00:00:00Z', movie: m }], history: [], ratings: [], watchlist: [] },
    shows: { watched: [], history: [{ id: 5, watched_at: '2026-01-01T00:00:00Z', show: m, episode: { season: 1, number: 2 } }], ratings: [], watchlist: [] },
  };
  const text = serializeDump(buildDump(data), { username: 'me', counts: { watched: 1 } });
  assert.doesNotThrow(() => JSON.parse(text));
  assert.equal(text, serializeDump(buildDump(data), { username: 'me', counts: { watched: 1 } }));
  assert.equal(JSON.parse(text).shows.history[0].episode, 2);
});
