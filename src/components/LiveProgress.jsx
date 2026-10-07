import React from 'react';
import { Activity, Terminal, CheckCircle, AlertTriangle } from 'lucide-react';

export default function LiveProgress({ isScraping, currentKeyword, progressPercent, logs = [] }) {
  if (!isScraping && logs.length === 0) {
    return null;
  }

  return (
    <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} color="var(--color-primary)" />
          <span>{isScraping ? 'Live Scraping Status' : 'Scraping Completed'}</span>
        </h3>
        {isScraping && (
          <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: '600' }}>
            {currentKeyword ? `Scraping: ${currentKeyword}` : 'Initializing browser...'}
          </span>
        )}
      </div>

      {isScraping && (
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }} />
        </div>
      )}

      {logs.length > 0 && (
        <div className="log-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>
            <Terminal size={12} />
            <span>Terminal Live Feed</span>
          </div>
          {logs.slice(-8).map((log, index) => (
            <div key={index} className={`log-line ${log.level || 'info'}`}>
              &gt; {log.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
