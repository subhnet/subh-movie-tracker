import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';

type Issue = {
  category: string;
  source: 'watched' | 'want' | 'shows';
  title: string;
  year: number | null;
  imdb?: string;
  trakt?: number;
  must: string;
  traktValue: string;
  note?: string;
};

type Totals = { rows: number; ok: number; needsAction: number; manual: number };

type Report = {
  generatedAt: string;
  dir: string;
  totals: Record<'watched' | 'want' | 'shows', Totals>;
  counts: Record<string, number>;
  traktOnly: { watchedMovies: number; watchlistMovies: number; ratedMovies: number };
  issues: Issue[];
};

type ApplyResult = {
  category: string;
  sent: number;
  added: number;
  existing: number;
  removed: number;
  notFound: unknown[];
};

const CATEGORY_INFO: Record<string, { label: string; fix: string; applicable: boolean }> = {
  'missing-watched': { label: 'Movies not watched on Trakt', fix: 'Mark watched on the Must date', applicable: true },
  'date-missing': {
    label: 'Placeholder / missing watch dates',
    fix: 'Add the Must date; remove the bulk-import placeholder watch',
    applicable: true,
  },
  'missing-rating': { label: 'Ratings missing on Trakt', fix: 'Set the Must rating', applicable: true },
  'rating-mismatch': { label: 'Ratings that differ', fix: 'Overwrite with the Must rating', applicable: true },
  'missing-watchlist': { label: 'Not on Trakt watchlist', fix: 'Add to watchlist', applicable: true },
  'missing-show-watched': {
    label: 'Watched shows not marked watched',
    fix: 'Mark all episodes watched (release dates)',
    applicable: true,
  },
  'date-conflict': { label: 'Different real watch date on Trakt', fix: 'Report only', applicable: false },
  'show-partial': {
    label: 'Watched shows partly watched on Trakt',
    fix: 'Mark first unwatched episodes up to Must count (approximate, release dates)',
    applicable: true,
  },
  'show-behind': {
    label: 'Watching shows behind Must',
    fix: 'Mark first unwatched episodes up to Must count (approximate, release dates)',
    applicable: true,
  },
  unresolved: { label: 'Could not match on Trakt', fix: 'Needs manual override', applicable: false },
};
const ORDER = Object.keys(CATEGORY_INFO);
const PAGE = 50;

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function ReconcileView({
  api,
  addToast,
  onApplied,
}: {
  api: <T = any>(path: string, init?: RequestInit) => Promise<T>;
  addToast: (m: string, t?: 'success' | 'error' | 'info') => void;
  onApplied: () => void;
}) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [results, setResults] = useState<{ results: ApplyResult[]; snapshot: string } | null>(null);

  const verify = async () => {
    setLoading(true);
    try {
      const r = await api<Report>('/reconcile/preview', { method: 'POST', body: JSON.stringify({}) });
      setReport(r);
      setChosen(new Set(ORDER.filter((c) => CATEGORY_INFO[c].applicable && r.counts[c] > 0)));
      return r;
    } catch (e: any) {
      addToast(e.message, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    setApplying(true);
    try {
      const out = await api<{ results: ApplyResult[]; snapshot: string }>('/reconcile/apply', {
        method: 'POST',
        body: JSON.stringify({ categories: [...chosen], confirm: true }),
      });
      setResults(out);
      setConfirmOpen(false);
      addToast('Synced to Trakt. Re-verifying…', 'success');
      await verify();
      onApplied();
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setApplying(false);
    }
  };

  const downloadCsv = () => {
    if (!report) return;
    const cols = ['category', 'source', 'title', 'year', 'imdb', 'trakt', 'must', 'traktValue', 'note'] as const;
    const body = [cols.join(','), ...report.issues.map((i) => cols.map((c) => csvCell((i as any)[c])).join(','))];
    const url = URL.createObjectURL(new Blob([body.join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `trakt-reconcile-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggle = (c: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });

  const rows = useMemo(
    () => (open && report ? report.issues.filter((i) => i.category === open) : []),
    [open, report],
  );
  const pending = report ? ORDER.filter((c) => CATEGORY_INFO[c].applicable && report.counts[c] > 0) : [];
  const chosenCount = report ? [...chosen].reduce((n, c) => n + (report.counts[c] || 0), 0) : 0;
  const allSynced = report && pending.length === 0;

  return (
    <div className="reconcile-view">
      <div className="reconcile-intro">
        <div>
          <h2>Verify Must export against Trakt</h2>
          <p>
            Compares <code>exports_2/</code> with your live Trakt account. Nothing is deleted except bulk-import
            placeholder watch dates that are replaced by the correct Must date. A snapshot of the Trakt data is saved
            before every sync.
          </p>
        </div>
        <div className="reconcile-actions">
          {report && (
            <button className="btn btn-secondary" onClick={downloadCsv}>
              <Download size={15} />
              <span>Report CSV</span>
            </button>
          )}
          <button className="btn btn-primary" onClick={verify} disabled={loading || applying}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            <span>{report ? 'Re-verify' : 'Verify now'}</span>
          </button>
        </div>
      </div>

      {loading && <p className="reconcile-note">Reading Trakt and resolving titles. This can take a minute…</p>}

      {report && (
        <>
          <div className="reconcile-cards">
            {(['watched', 'want', 'shows'] as const).map((s) => {
              const t = report.totals[s];
              return (
                <div key={s} className="reconcile-card">
                  <span className="reconcile-card-title">
                    {s === 'watched' ? 'Watched movies' : s === 'want' ? 'Want-to-watch movies' : 'Shows'}
                  </span>
                  <strong>{t.rows}</strong>
                  <div className="reconcile-card-stats">
                    <span className="stat-ok">{t.ok} in sync</span>
                    <span className="stat-action">{t.needsAction} to sync</span>
                    <span className="stat-manual">{t.manual} manual</span>
                  </div>
                </div>
              );
            })}
          </div>

          {allSynced && (
            <div className="reconcile-banner ok">
              <CheckCircle2 size={18} />
              <span>
                Everything that can be synced automatically is on Trakt.
                {report.counts.unresolved > 0 && ' Remaining items need manual attention below.'}
              </span>
            </div>
          )}

          <div className="reconcile-table">
            {ORDER.filter((c) => report.counts[c] > 0).map((c) => {
              const info = CATEGORY_INFO[c];
              const isOpen = open === c;
              return (
                <div key={c} className="reconcile-row-group">
                  <div className="reconcile-row">
                    {info.applicable ? (
                      <input type="checkbox" checked={chosen.has(c)} onChange={() => toggle(c)} />
                    ) : (
                      <AlertCircle size={15} className="text-dim" />
                    )}
                    <button
                      className="reconcile-expand"
                      onClick={() => {
                        setOpen(isOpen ? null : c);
                        setShown(PAGE);
                      }}
                    >
                      {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      <strong>{info.label}</strong>
                      <span className="reconcile-fix">{info.fix}</span>
                    </button>
                    <span className="reconcile-count">{report.counts[c]}</span>
                  </div>
                  {isOpen && (
                    <div className="reconcile-details">
                      {rows.slice(0, shown).map((i, idx) => (
                        <div key={idx} className="reconcile-detail">
                          <strong>
                            {i.title}
                            {i.year ? ` (${i.year})` : ''}
                          </strong>
                          <span>Must: {i.must}</span>
                          {i.traktValue && <span>Trakt: {i.traktValue}</span>}
                          {i.note && <em>{i.note}</em>}
                        </div>
                      ))}
                      {rows.length > shown && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setShown(shown + 200)}>
                          Show more ({rows.length - shown} left)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="reconcile-note">
            On Trakt but not in the export (never touched): {report.traktOnly.watchedMovies} watched movies,{' '}
            {report.traktOnly.watchlistMovies} watchlist movies, {report.traktOnly.ratedMovies} rated movies.
          </p>

          {!allSynced && (
            <div className="reconcile-footer">
              <button
                className="btn btn-primary"
                disabled={!chosen.size || applying || loading}
                onClick={() => setConfirmOpen(true)}
              >
                <Check size={16} />
                <span>Sync {chosenCount} selected changes…</span>
              </button>
            </div>
          )}
        </>
      )}

      {results && (
        <div className="reconcile-results">
          <strong>Last sync</strong> (snapshot saved as <code>{results.snapshot}</code>)
          {results.results.map((r) => (
            <div key={r.category} className="reconcile-detail">
              <strong>{CATEGORY_INFO[r.category]?.label ?? r.category}</strong>
              <span>
                sent {r.sent} · added {r.added} · already there {r.existing}
                {r.removed ? ` · removed ${r.removed} placeholder watches` : ''}
              </span>
              {r.notFound.length > 0 && <em>{r.notFound.length} not found by Trakt</em>}
            </div>
          ))}
        </div>
      )}

      {confirmOpen && report && (
        <div className="modal-backdrop" onClick={() => !applying && setConfirmOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-area">
                <span className="modal-badge">CONFIRM SYNC TO TRAKT</span>
                <h3>Apply {chosenCount} changes</h3>
              </div>
              <button className="btn-close-modal" onClick={() => setConfirmOpen(false)} disabled={applying}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-item-list">
                {[...chosen].map((c) => (
                  <div key={c} className="preview-item-row">
                    <span className="preview-item-bullet">•</span>
                    <strong className="preview-item-title">
                      {report.counts[c]} × {CATEGORY_INFO[c].label}
                    </strong>
                    <span className="preview-item-year">{CATEGORY_INFO[c].fix}</span>
                  </div>
                ))}
              </div>
              <p className="reconcile-note">
                Changes are re-computed on the server and sent in rate-limited batches, so this can take a few minutes.
                Keep this tab open.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmOpen(false)} disabled={applying}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={apply} disabled={applying}>
                {applying ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>Sync to Trakt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
