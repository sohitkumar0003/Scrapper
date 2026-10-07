import React, { useState } from 'react';
import { Search, Play, Square, Settings, Flame, Layers } from 'lucide-react';

const PRESETS = [
  "Coffee Shops in NYC",
  "Dentists in Austin, TX",
  "Plumbers in Miami, FL",
  "Real Estate Agents in San Francisco",
  "Gyms in Chicago"
];

export default function SearchForm({ onStartScrape, onStopScrape, isScraping }) {
  const [keywordsText, setKeywordsText] = useState("Dentists in Austin, TX");
  const [maxResults, setMaxResults] = useState(15);
  const [scrollDelay, setScrollDelay] = useState(1200);
  const [headless, setHeadless] = useState(true);
  const [clearExisting, setClearExisting] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    const keywords = keywordsText
      .split(/[\n,]/)
      .map(k => k.trim())
      .filter(Boolean);

    if (keywords.length === 0) return;

    onStartScrape({
      keywords,
      maxResults: parseInt(maxResults, 10),
      scrollDelay: parseInt(scrollDelay, 10),
      headless,
      clearExisting
    });
  };

  const addPreset = (preset) => {
    if (!keywordsText.trim()) {
      setKeywordsText(preset);
    } else if (!keywordsText.includes(preset)) {
      setKeywordsText(prev => `${prev}\n${preset}`);
    }
  };

  return (
    <div className="glass-card">
      <h2 className="card-title">
        <Search size={20} color="var(--color-primary)" />
        <span>Scraper Controls</span>
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Search Keywords (One per line or comma-separated)</label>
          <textarea
            className="form-textarea"
            placeholder="e.g. Dentists in Austin, TX&#10;Italian Restaurants in Brooklyn"
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
            disabled={isScraping}
          />

          <div style={{ marginTop: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.3rem' }}>
              Quick Presets:
            </span>
            <div className="preset-chips">
              {PRESETS.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  className="chip"
                  onClick={() => addPreset(preset)}
                  disabled={isScraping}
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <label className="form-label">Max Items Per Keyword</label>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
              {maxResults} listings
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={maxResults}
            onChange={(e) => setMaxResults(e.target.value)}
            disabled={isScraping}
            style={{ width: '100%', accentColor: 'var(--color-primary)' }}
          />
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <label className="form-label">Scroll Speed Delay</label>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {scrollDelay} ms
            </span>
          </div>
          <input
            type="range"
            min="800"
            max="3000"
            step="100"
            value={scrollDelay}
            onChange={(e) => setScrollDelay(e.target.value)}
            disabled={isScraping}
            style={{ width: '100%', accentColor: 'var(--color-accent)' }}
          />
        </div>

        <div className="form-group" style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={headless}
              onChange={(e) => setHeadless(e.target.checked)}
              disabled={isScraping}
            />
            <span>Headless Mode (Silent)</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={clearExisting}
              onChange={(e) => setClearExisting(e.target.checked)}
              disabled={isScraping}
            />
            <span>Clear Old Data</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          {!isScraping ? (
            <button type="submit" className="btn btn-primary btn-block">
              <Play size={18} />
              <span>Start Extraction</span>
            </button>
          ) : (
            <button type="button" className="btn btn-danger btn-block" onClick={onStopScrape}>
              <Square size={18} />
              <span>Stop Scraping</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
