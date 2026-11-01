import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Archive,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  Copy,
  ExternalLink,
  Film,
  Layers,
  List,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Tv,
  X,
  AlertCircle,
  Clock,
} from 'lucide-react';
import './style.css';

type Media = {
  title?: string;
  year?: number;
  ids: { trakt?: number; tmdb?: number; imdb?: string; slug?: string };
  type: 'movie' | 'show';
  rating?: number;
  listed_at?: string;
  rated_at?: string;
  movie?: any;
  show?: any;
};

type TraktList = {
  name: string;
  description?: string;
  privacy: string;
  item_count: number;
  ids: { trakt: number; slug: string };
  updated_at?: string;
};

type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

const API = 'http://127.0.0.1:8787/api';

async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(API + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const d = await r.json();
  if (!r.ok) {
    throw new Error(d.error || `Request failed (${r.status})`);
  }
  return d;
}

function App() {
  const [connected, setConnected] = useState(false);
  const [device, setDevice] = useState<any>(null);
  const [tab, setTab] = useState<'watchlist' | 'ratings' | 'lists'>('watchlist');
  const [kind, setKind] = useState<'movies' | 'shows'>('movies');
  const [watchlist, setWatchlist] = useState<{ movies: any[]; shows: any[] }>({
    movies: [],
    shows: [],
  });
  const [ratings, setRatings] = useState<{ movies: any[]; shows: any[] }>({
    movies: [],
    shows: [],
  });
  const [lists, setLists] = useState<TraktList[]>([]);
  const [activeList, setActiveList] = useState<TraktList | null>(null);
  const [activeListItems, setActiveListItems] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const [selected, setSelected] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title-asc' | 'title-desc' | 'year-desc' | 'year-asc' | 'rating-desc'>('title-asc');
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Bulk action state
  const [action, setAction] = useState<'rate' | 'unrate' | 'add' | 'remove'>('rate');
  const [targetRating, setTargetRating] = useState(8);
  const [targetListId, setTargetListId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Device auth polling helpers
  const [pollCountdown, setPollCountdown] = useState<number | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const pollTimerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshStatus = async () => {
    try {
      const s = await api<any>('/auth/status');
      setConnected(s.connected);
      if (s.connected) {
        await refreshLibrary();
      }
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const refreshLibrary = async () => {
    setBusy(true);
    try {
      const [w, r, l] = await Promise.all([
        api<any>('/library/watchlist'),
        api<any>('/library/ratings'),
        api<any>('/library/lists'),
      ]);
      setWatchlist(w || { movies: [], shows: [] });
      setRatings(r || { movies: [], shows: [] });
      setLists(Array.isArray(l) ? l : []);
      setSelected([]);
      addToast('Library synchronized with Trakt', 'success');
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Fetch list items when activeList changes
  useEffect(() => {
    if (!activeList) {
      setActiveListItems([]);
      return;
    }
    const loadItems = async () => {
      setListLoading(true);
      try {
        const id = activeList.ids?.trakt || activeList.ids?.slug;
        const items = await api<any[]>(`/library/list/${encodeURIComponent(String(id))}`);
        setActiveListItems(Array.isArray(items) ? items : []);
        setSelected([]);
      } catch (e: any) {
        addToast(e.message, 'error');
      } finally {
        setListLoading(false);
      }
    };
    loadItems();
  }, [activeList]);

  // Auth Device Flow
  const startAuth = async () => {
    setBusy(true);
    try {
      const d = await api('/auth/device/start', { method: 'POST' });
      setDevice(d);
      addToast('Device code generated. Complete authorization on Trakt.', 'info');
      startPollingLoop(d.interval || 6);
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const startPollingLoop = (intervalSec: number) => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setPollCountdown(intervalSec);
    countdownIntervalRef.current = setInterval(() => {
      setPollCountdown((prev) => (prev && prev > 1 ? prev - 1 : intervalSec));
    }, 1000);

    const poll = async () => {
      try {
        const d = await api<any>('/auth/device/poll', { method: 'POST' });
        if (d.connected) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          setConnected(true);
          setDevice(null);
          setPollCountdown(null);
          addToast('🎉 Trakt account connected successfully!', 'success');
          await refreshLibrary();
        } else if (d.pending) {
          const nextInterval = d.interval || intervalSec;
          setPollCountdown(nextInterval);
          pollTimerRef.current = setTimeout(poll, nextInterval * 1000);
        }
      } catch (e: any) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setPollCountdown(null);
        addToast(e.message, 'error');
      }
    };

    pollTimerRef.current = setTimeout(poll, intervalSec * 1000);
  };

  const manualPoll = async () => {
    try {
      setBusy(true);
      const d = await api<any>('/auth/device/poll', { method: 'POST' });
      if (d.connected) {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setConnected(true);
        setDevice(null);
        setPollCountdown(null);
        addToast('Trakt account connected!', 'success');
        await refreshLibrary();
      } else {
        addToast('Still waiting for approval on Trakt...', 'info');
      }
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect your Trakt account from this machine?')) return;
    try {
      await api('/auth/disconnect', { method: 'POST' });
      setConnected(false);
      setDevice(null);
      setWatchlist({ movies: [], shows: [] });
      setRatings({ movies: [], shows: [] });
      setLists([]);
      setSelected([]);
      addToast('Disconnected from Trakt.', 'info');
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const copyUserCode = () => {
    if (!device?.user_code) return;
    navigator.clipboard.writeText(device.user_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2200);
    addToast('Code copied to clipboard!', 'info');
  };

  // Raw dataset resolution
  const rawList: Media[] = useMemo(() => {
    if (tab === 'watchlist') {
      const src = watchlist[kind] || [];
      return src.map((x: any) => ({
        ...x,
        type: kind === 'movies' ? 'movie' : 'show',
      }));
    }
    if (tab === 'ratings') {
      const src = ratings[kind] || [];
      return src.map((x: any) => ({
        ...x,
        type: kind === 'movies' ? 'movie' : 'show',
      }));
    }
    if (tab === 'lists' && activeList) {
      return activeListItems
        .filter((item: any) => {
          if (kind === 'movies') return item.type === 'movie' || Boolean(item.movie);
          return item.type === 'show' || Boolean(item.show);
        })
        .map((item: any) => ({
          ...item,
          type: kind === 'movies' ? 'movie' : 'show',
        }));
    }
    return [];
  }, [tab, kind, watchlist, ratings, activeList, activeListItems]);

  // Normalized filtered and sorted list
  const filteredList = useMemo(() => {
    let result = rawList.map((x) => ({
      ...x,
      title: x.title || x.movie?.title || x.show?.title || 'Untitled',
      year: x.year || x.movie?.year || x.show?.year,
      ids: x.ids || x.movie?.ids || x.show?.ids || {},
      rating: x.rating || (x as any).user_rating,
      listed_at: x.listed_at,
      rated_at: x.rated_at,
    }));

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (x) =>
          x.title.toLowerCase().includes(q) ||
          (x.year && String(x.year).includes(q))
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'year-desc':
          return (b.year || 0) - (a.year || 0);
        case 'year-asc':
          return (a.year || 0) - (b.year || 0);
        case 'rating-desc':
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [rawList, query, sortBy]);

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const ids = filteredList
      .map((x) => x.ids.trakt)
      .filter((id): id is number => Boolean(id));
    setSelected(ids);
  };

  const clearSelection = () => setSelected([]);

  const selectedItems = useMemo(() => {
    return filteredList.filter((x) => selected.includes(x.ids.trakt || -1));
  }, [filteredList, selected]);

  // Execute bulk action
  const executeAction = async () => {
    if (!selectedItems.length) return;
    setBusy(true);
    setModalOpen(false);

    try {
      const items = selectedItems.map((x) => ({ ids: x.ids }));

      if (action === 'rate') {
        await api('/actions/ratings', {
          method: 'POST',
          body: JSON.stringify({ type: kind, items, rating: targetRating }),
        });
        addToast(
          `Successfully rated ${items.length} ${kind} with ${targetRating}/10`,
          'success'
        );
      } else if (action === 'unrate') {
        await api('/actions/ratings/remove', {
          method: 'POST',
          body: JSON.stringify({ [kind]: items }),
        });
        addToast(`Removed ratings from ${items.length} ${kind}`, 'success');
      } else if (action === 'add') {
        if (!targetListId) throw new Error('Please select a target custom list.');
        await api('/actions/list/add', {
          method: 'POST',
          body: JSON.stringify({ listId: targetListId, type: kind, items }),
        });
        addToast(`Added ${items.length} ${kind} to list`, 'success');
      } else if (action === 'remove') {
        const listId = activeList ? String(activeList.ids.trakt) : targetListId;
        if (!listId) throw new Error('Please select a custom list to remove from.');
        await api('/actions/list/remove', {
          method: 'POST',
          body: JSON.stringify({ listId, type: kind, items }),
        });
        addToast(`Removed ${items.length} ${kind} from list`, 'success');
      }

      await refreshLibrary();
      if (activeList) {
        // Refresh active list contents
        const id = activeList.ids?.trakt || activeList.ids?.slug;
        const updated = await api<any[]>(`/library/list/${encodeURIComponent(String(id))}`);
        setActiveListItems(Array.isArray(updated) ? updated : []);
      }
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const downloadBackup = async () => {
    setBusy(true);
    try {
      const r = await fetch(API + '/backup');
      if (!r.ok) throw new Error('Backup download failed');
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `trakt-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      addToast('Full Trakt library backup downloaded!', 'success');
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  // Action description generator
  const getActionSummary = () => {
    const count = selectedItems.length;
    const itemWord = `${count} ${count === 1 ? (kind === 'movies' ? 'movie' : 'show') : kind}`;
    if (action === 'rate') {
      return `Rate ${itemWord} as ${targetRating}/10 (${
        targetRating >= 9
          ? 'Masterpiece'
          : targetRating >= 7
          ? 'Recommended'
          : targetRating >= 5
          ? 'Average'
          : 'Disliked'
      })`;
    }
    if (action === 'unrate') {
      return `Remove ratings completely from ${itemWord}`;
    }
    if (action === 'add') {
      const listName = lists.find((l) => String(l.ids.trakt) === targetListId)?.name || 'Custom List';
      return `Add ${itemWord} to "${listName}"`;
    }
    if (action === 'remove') {
      const listName = activeList
        ? activeList.name
        : lists.find((l) => String(l.ids.trakt) === targetListId)?.name || 'Custom List';
      return `Remove ${itemWord} from "${listName}"`;
    }
    return '';
  };

  const watchlistMovieCount = watchlist.movies?.length || 0;
  const watchlistShowCount = watchlist.shows?.length || 0;
  const ratingsMovieCount = ratings.movies?.length || 0;
  const ratingsShowCount = ratings.shows?.length || 0;
  const totalListsCount = lists.length;

  return (
    <div className="app-container">
      {/* Background ambient lighting glow */}
      <div className="ambient-glow" />

      {/* Sidebar Navigation */}
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <div className="brand-logo">
            <Clapperboard size={22} strokeWidth={2.2} />
          </div>
          <div className="brand-meta">
            <span className="brand-name">Trakt Bulk</span>
            <span className="brand-badge">PRO WORKSPACE</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-title">COLLECTIONS</div>
          <button
            className={`nav-item ${tab === 'watchlist' ? 'active' : ''}`}
            onClick={() => {
              setTab('watchlist');
              setActiveList(null);
              setSelected([]);
            }}
          >
            <Film size={18} />
            <span className="nav-label">Watchlist</span>
            <span className="nav-count">
              {watchlistMovieCount + watchlistShowCount}
            </span>
          </button>

          <button
            className={`nav-item ${tab === 'ratings' ? 'active' : ''}`}
            onClick={() => {
              setTab('ratings');
              setActiveList(null);
              setSelected([]);
            }}
          >
            <Star size={18} />
            <span className="nav-label">Ratings</span>
            <span className="nav-count">
              {ratingsMovieCount + ratingsShowCount}
            </span>
          </button>

          <button
            className={`nav-item ${tab === 'lists' ? 'active' : ''}`}
            onClick={() => {
              setTab('lists');
              setSelected([]);
            }}
          >
            <List size={18} />
            <span className="nav-label">Custom Lists</span>
            <span className="nav-count">{totalListsCount}</span>
          </button>
        </nav>

        {/* Sidebar Footer Info */}
        <div className="sidebar-footer">
          <div className="local-privacy-pill">
            <ShieldCheck size={16} className="text-emerald" />
            <div>
              <strong>100% Local-First</strong>
              <small>Credentials stay in your machine</small>
            </div>
          </div>
          <a
            href="https://trakt.tv"
            target="_blank"
            rel="noreferrer"
            className="docs-link"
          >
            Trakt API Explorer <ExternalLink size={12} />
          </a>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="app-main">
        {/* Top Header Bar */}
        <header className="main-header">
          <div className="header-breadcrumbs">
            <span className="header-subtitle">MEDIA MANAGEMENT</span>
            <h1 className="header-title">
              {tab === 'watchlist' && 'Watchlist Library'}
              {tab === 'ratings' && 'Your Ratings'}
              {tab === 'lists' && (activeList ? activeList.name : 'Custom Lists')}
            </h1>
          </div>

          <div className="header-actions">
            <div className={`status-indicator ${connected ? 'online' : 'offline'}`}>
              <span className="status-dot" />
              <span>{connected ? 'Connected' : 'Disconnected'}</span>
            </div>

            {connected && (
              <>
                <button
                  className="btn btn-secondary icon-only"
                  onClick={refreshLibrary}
                  disabled={busy}
                  title="Synchronize with Trakt"
                >
                  <RefreshCw size={16} className={busy ? 'animate-spin' : ''} />
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={downloadBackup}
                  disabled={busy}
                  title="Export all data to JSON"
                >
                  <Archive size={15} />
                  <span>Backup</span>
                </button>

                <button
                  className="btn btn-danger-ghost icon-only"
                  onClick={disconnect}
                  title="Disconnect Trakt Account"
                >
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>
        </header>

        {/* Content Body */}
        {!connected ? (
          /* Connect / Device Authorization Hero */
          <div className="connect-wrapper">
            <div className="connect-card">
              <div className="connect-brand-aura">
                <div className="connect-icon-box">
                  <Clapperboard size={36} strokeWidth={2} />
                </div>
              </div>

              <h2>Connect your Trakt Account</h2>
              <p>
                Manage watchlists, bulk apply ratings, and organize custom lists without tedious clicking. 
                Uses Trakt’s secure Device Authentication.
              </p>

              {!device ? (
                <div className="connect-action-area">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={startAuth}
                    disabled={busy}
                  >
                    {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    <span>Connect with Trakt</span>
                  </button>
                  <small className="connect-hint">
                    No password required · Fast OAuth device handshake
                  </small>
                </div>
              ) : (
                <div className="device-verification-flow">
                  <div className="code-display-card">
                    <span className="code-instruction">Enter this code on Trakt:</span>
                    <div className="code-row">
                      <span className="user-code-pill">{device.user_code}</span>
                      <button
                        className="btn btn-secondary btn-copy"
                        onClick={copyUserCode}
                        title="Copy code"
                      >
                        {codeCopied ? <Check size={16} className="text-emerald" /> : <Copy size={16} />}
                        <span>{codeCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="auth-step-guide">
                    <div className="step-item">
                      <span className="step-num">1</span>
                      <span>Copy your user code above</span>
                    </div>
                    <div className="step-item">
                      <span className="step-num">2</span>
                      <span>Click below to open the activation page</span>
                    </div>
                    <div className="step-item">
                      <span className="step-num">3</span>
                      <span>Paste code and click "Authorize"</span>
                    </div>
                  </div>

                  <div className="device-buttons">
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={() => window.open(device.verification_url, '_blank')}
                    >
                      <span>Authorize on Trakt</span>
                      <ExternalLink size={16} />
                    </button>

                    <button
                      className="btn btn-secondary"
                      onClick={manualPoll}
                      disabled={busy}
                    >
                      <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
                      <span>
                        {pollCountdown
                          ? `Checking in ${pollCountdown}s...`
                          : "I've Authorized"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : tab === 'lists' && !activeList ? (
          /* Custom Lists Grid */
          <div className="lists-view-container">
            <div className="lists-header-row">
              <div>
                <h2>Your Custom Lists</h2>
                <p>Click any list to inspect items or run batch operations.</p>
              </div>
            </div>

            {lists.length === 0 ? (
              <div className="empty-state-card">
                <List size={36} />
                <h3>No custom lists found</h3>
                <p>Create lists on Trakt to manage them here in bulk.</p>
              </div>
            ) : (
              <div className="lists-grid">
                {lists.map((l) => (
                  <div
                    key={l.ids.trakt || l.name}
                    className="list-card"
                    onClick={() => setActiveList(l)}
                  >
                    <div className="list-card-top">
                      <div className="list-icon-badge">
                        <Layers size={18} />
                      </div>
                      <span className={`privacy-badge ${l.privacy || 'private'}`}>
                        {l.privacy || 'private'}
                      </span>
                    </div>
                    <h3 className="list-title">{l.name}</h3>
                    {l.description && (
                      <p className="list-desc">{l.description}</p>
                    )}
                    <div className="list-card-footer">
                      <span>{l.item_count ?? 0} items</span>
                      <ChevronRight size={16} className="chevron" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Library Data Table (Watchlist, Ratings, or Active List Items) */
          <div className="library-content">
            {/* Active List Banner if inside a list */}
            {tab === 'lists' && activeList && (
              <div className="active-list-banner">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveList(null)}
                >
                  ← Back to all lists
                </button>
                <div>
                  <strong>{activeList.name}</strong>
                  <span className="active-list-count">
                    ({filteredList.length} items shown)
                  </span>
                </div>
              </div>
            )}

            {/* Controls Toolbar */}
            <div className="library-toolbar">
              {/* Media Type Segmented Pills */}
              <div className="segmented-tabs">
                <button
                  className={`segment-btn ${kind === 'movies' ? 'active' : ''}`}
                  onClick={() => {
                    setKind('movies');
                    setSelected([]);
                  }}
                >
                  <Film size={15} />
                  <span>Movies</span>
                  <span className="segment-count">
                    {tab === 'watchlist'
                      ? watchlistMovieCount
                      : tab === 'ratings'
                      ? ratingsMovieCount
                      : ''}
                  </span>
                </button>

                <button
                  className={`segment-btn ${kind === 'shows' ? 'active' : ''}`}
                  onClick={() => {
                    setKind('shows');
                    setSelected([]);
                  }}
                >
                  <Tv size={15} />
                  <span>TV Shows</span>
                  <span className="segment-count">
                    {tab === 'watchlist'
                      ? watchlistShowCount
                      : tab === 'ratings'
                      ? ratingsShowCount
                      : ''}
                  </span>
                </button>
              </div>

              {/* Instant Search Bar */}
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Filter by title or year..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button className="clear-search" onClick={() => setQuery('')}>
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="sort-box">
                <ArrowUpDown size={15} className="sort-icon" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="title-asc">Title (A → Z)</option>
                  <option value="title-desc">Title (Z → A)</option>
                  <option value="year-desc">Year (Newest)</option>
                  <option value="year-asc">Year (Oldest)</option>
                  {tab === 'ratings' && (
                    <option value="rating-desc">Rating (Highest)</option>
                  )}
                </select>
              </div>
            </div>

            {/* Media Table Card */}
            <div className="table-container-card">
              <div className="table-header-row">
                <div className="col-checkbox">
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={
                      filteredList.length > 0 &&
                      selected.length === filteredList.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) selectAllFiltered();
                      else clearSelection();
                    }}
                  />
                </div>
                <div className="col-title">Title & Media</div>
                <div className="col-year">Release</div>
                <div className="col-extra">
                  {tab === 'ratings' ? 'Rating' : 'Added Date'}
                </div>
                <div className="col-ids">Trakt ID</div>
              </div>

              {listLoading ? (
                <div className="table-loading-state">
                  <Loader2 size={28} className="animate-spin text-accent" />
                  <span>Loading list contents...</span>
                </div>
              ) : filteredList.length === 0 ? (
                <div className="table-empty-state">
                  <Film size={34} />
                  <h4>No {kind} found</h4>
                  <p>
                    {query
                      ? `No items matching "${query}"`
                      : 'Your collection is empty or not yet synchronized.'}
                  </p>
                </div>
              ) : (
                <div className="table-body">
                  {filteredList.map((item) => {
                    const traktId = item.ids.trakt;
                    const isChecked = traktId ? selected.includes(traktId) : false;

                    return (
                      <div
                        key={traktId || item.title}
                        className={`table-row ${isChecked ? 'selected-row' : ''}`}
                        onClick={() => traktId && toggleSelect(traktId)}
                      >
                        <div
                          className="col-checkbox"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="custom-checkbox"
                            checked={isChecked}
                            onChange={() => traktId && toggleSelect(traktId)}
                          />
                        </div>

                        <div className="col-title title-cell">
                          <div
                            className={`media-type-avatar ${
                              item.type === 'movie' ? 'avatar-movie' : 'avatar-show'
                            }`}
                          >
                            {item.type === 'movie' ? (
                              <Film size={16} />
                            ) : (
                              <Tv size={16} />
                            )}
                          </div>
                          <div className="title-text-group">
                            <span className="media-title">{item.title}</span>
                            <span className="media-sub">
                              {item.type === 'movie' ? 'Movie' : 'TV Series'}
                              {item.ids.imdb ? ` · IMDb: ${item.ids.imdb}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="col-year">
                          <span className="year-pill">{item.year || '—'}</span>
                        </div>

                        <div className="col-extra">
                          {tab === 'ratings' && item.rating ? (
                            <div className="rating-pill">
                              <Star size={13} className="star-gold" fill="currentColor" />
                              <strong>{item.rating}</strong>
                              <span className="max-rating">/10</span>
                            </div>
                          ) : item.listed_at ? (
                            <div className="date-display">
                              <Clock size={13} className="text-muted" />
                              <span>
                                {new Date(item.listed_at).toLocaleDateString(
                                  undefined,
                                  {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  }
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </div>

                        <div className="col-ids">
                          <span className="id-badge">
                            {traktId ? `#${traktId}` : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Bulk Command Bar */}
        {selected.length > 0 && (
          <div className="floating-action-bar">
            <div className="action-bar-content">
              <div className="selection-badge">
                <span className="badge-count">{selected.length}</span>
                <span>selected</span>
              </div>

              <div className="action-selector-group">
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as any)}
                  className="action-select"
                >
                  <option value="rate">⭐ Set Rating</option>
                  <option value="unrate">🗑️ Remove Rating</option>
                  <option value="add">➕ Add to Custom List</option>
                  <option value="remove">➖ Remove from Custom List</option>
                </select>

                {action === 'rate' && (
                  <div className="rating-control">
                    <select
                      value={targetRating}
                      onChange={(e) => setTargetRating(Number(e.target.value))}
                      className="rating-select"
                    >
                      {Array.from({ length: 10 }, (_, i) => 10 - i).map((score) => (
                        <option key={score} value={score}>
                          {score}/10 {score === 10 ? '★ Masterpiece' : score >= 8 ? '★ Great' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(action === 'add' || action === 'remove') && !activeList && (
                  <select
                    value={targetListId}
                    onChange={(e) => setTargetListId(e.target.value)}
                    className="list-select"
                  >
                    <option value="">Select target list...</option>
                    {lists.map((l) => (
                      <option key={l.ids.trakt} value={l.ids.trakt}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="action-buttons-group">
                <button
                  className="btn btn-primary btn-apply"
                  onClick={() => setModalOpen(true)}
                  disabled={busy}
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>Review & Apply</span>
                </button>

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={clearSelection}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* In-App Confirmation Modal */}
        {modalOpen && (
          <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-area">
                  <span className="modal-badge">CONFIRM BATCH OPERATION</span>
                  <h3>Review Changes</h3>
                </div>
                <button
                  className="btn-close-modal"
                  onClick={() => setModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div className="action-highlight-box">
                  <div className="highlight-icon">
                    {action === 'rate' && <Star size={22} className="star-gold" fill="currentColor" />}
                    {action === 'unrate' && <Trash2 size={22} className="text-danger" />}
                    {action === 'add' && <Plus size={22} className="text-accent" />}
                    {action === 'remove' && <Trash2 size={22} className="text-danger" />}
                  </div>
                  <div>
                    <strong>{getActionSummary()}</strong>
                    <p>This action will sync directly with your Trakt cloud account.</p>
                  </div>
                </div>

                <div className="modal-item-list">
                  <span className="list-preview-title">
                    Affected Items ({selectedItems.length}):
                  </span>
                  <div className="preview-scroll-area">
                    {selectedItems.map((item) => (
                      <div key={item.ids.trakt} className="preview-item-row">
                        <span className="preview-item-bullet">•</span>
                        <strong className="preview-item-title">{item.title}</strong>
                        {item.year && (
                          <span className="preview-item-year">({item.year})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={executeAction}
                  disabled={busy}
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>Execute Changes</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Toast Notifications */}
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast-card toast-${t.type}`}>
              {t.type === 'success' && <CheckCircle2 size={18} className="toast-icon text-emerald" />}
              {t.type === 'error' && <AlertCircle size={18} className="toast-icon text-danger" />}
              {t.type === 'info' && <Sparkles size={18} className="toast-icon text-accent" />}
              <span className="toast-msg">{t.message}</span>
              <button
                className="toast-close"
                onClick={() => removeToast(t.id)}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
