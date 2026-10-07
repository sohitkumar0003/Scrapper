import React from 'react';
import { MapPin, Sparkles, Server, Terminal } from 'lucide-react';

export default function Header({ isScraping, totalItems }) {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-icon">
          <MapPin size={24} />
        </div>
        <div>
          <div className="brand-row">
            <h1 className="brand-title">MapScraper Pro</h1>
            <span className="brand-tag">v1.0</span>
          </div>
          <p className="brand-subtitle">
            Google Maps Keyword Extractor & CSV Data Exporter
          </p>
        </div>
      </div>

      <div className="header-actions">
        <div className={`status-pill ${isScraping ? 'live' : 'ready'}`}>
          <span className="status-dot" />
          <Sparkles size={13} />
          {isScraping ? 'Scraping Live...' : 'Ready'}
        </div>
        <div className="meta-pill">
          <Server size={14} />
          <span>{totalItems} items collected</span>
        </div>
      </div>
    </header>
  );
}
