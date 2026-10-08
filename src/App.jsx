import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SearchForm from './components/SearchForm';
import LiveProgress from './components/LiveProgress';
import AnalyticsCards from './components/AnalyticsCards';
import ResultsTable from './components/ResultsTable';
import ExportModal from './components/ExportModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '')
  || (import.meta.env.DEV ? '' : null);

const apiUrl = (path) => `${API_BASE_URL}/api/${path}`;

export default function App() {
  const [results, setResults] = useState([]);
  const [isScraping, setIsScraping] = useState(false);
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [logs, setLogs] = useState([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Fetch initial results & listen to SSE real-time stream
  useEffect(() => {
    if (!API_BASE_URL) {
      return undefined;
    }

    // Initial fetch of any existing results
    fetch(apiUrl('results'))
      .then(res => {
        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.data) setResults(data.data);
        if (typeof data.isScraping === 'boolean') setIsScraping(data.isScraping);
      })
      .catch(err => {
        setLogs(prev => [...prev, { message: `Backend unavailable: ${err.message}`, level: 'error' }]);
      });

    // Establish SSE stream
    const eventSource = new EventSource(apiUrl('scrape/stream'));

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'status') {
          setIsScraping(data.isScraping);
        } else if (data.type === 'job_started') {
          setIsScraping(true);
          setLogs(prev => [...prev, { message: `🚀 Starting scrape job for ${data.totalKeywords} keyword(s)`, level: 'info' }]);
        } else if (data.type === 'keyword_start') {
          setCurrentKeyword(data.keyword);
          setLogs(prev => [...prev, { message: `▶ Keyword [${data.keywordIndex}/${data.totalKeywords}]: "${data.keyword}"`, level: 'info' }]);
        } else if (data.type === 'place') {
          setResults(prev => {
            // Prevent duplicates
            if (prev.some(p => p.googleMapsUrl === data.place.googleMapsUrl)) return prev;
            return [...prev, data.place];
          });
          if (data.maxResults && data.scrapedCount) {
            setProgressPercent(Math.round((data.scrapedCount / data.maxResults) * 100));
          }
        } else if (data.type === 'update') {
          setResults(prev => prev.map(p => p.googleMapsUrl === data.place.googleMapsUrl ? data.place : p));
        } else if (data.type === 'log') {
          setLogs(prev => [...prev, { message: data.message, level: data.level || 'info' }]);
        } else if (data.type === 'job_completed') {
          setIsScraping(false);
          setCurrentKeyword('');
          setProgressPercent(100);
          setLogs(prev => [...prev, { message: `🎉 Scraping finished. Total collected: ${data.totalItems} places.`, level: 'info' }]);
        } else if (data.type === 'cleared') {
          setResults([]);
          setLogs([]);
        }
      } catch (err) {
        console.error('SSE JSON error:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setLogs(prev => [...prev, { message: 'Lost connection to the scraper backend.', level: 'error' }]);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleStartScrape = async (config) => {
    try {
      setLogs([{ message: 'Submitting scrape request...', level: 'info' }]);
      setResults([]);
      setCurrentKeyword('');
      setProgressPercent(0);
      setIsScraping(true);

      if (!API_BASE_URL) {
        throw new Error('Scraping requires a deployed API. Set the VITE_API_BASE_URL GitHub Actions repository variable and redeploy.');
      }

      const res = await fetch(apiUrl('scrape'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start scraper');
      }
    } catch (err) {
      setIsScraping(false);
      setLogs(prev => [...prev, { message: `❌ ${err.message}`, level: 'error' }]);
    }
  };

  const handleStopScrape = async () => {
    try {
      if (!API_BASE_URL) {
        throw new Error('Scraper API is not configured.');
      }
      await fetch(apiUrl('stop'), { method: 'POST' });
      setLogs(prev => [...prev, { message: 'Sending stop request...', level: 'warn' }]);
    } catch (err) {
      setLogs(prev => [...prev, { message: `❌ ${err.message}`, level: 'error' }]);
    }
  };

  const handleClearData = async () => {
    try {
      if (!API_BASE_URL) {
        throw new Error('Scraper API is not configured.');
      }
      const res = await fetch(apiUrl('clear'), { method: 'POST' });
      if (!res.ok) {
        throw new Error(`Failed to clear results (HTTP ${res.status}).`);
      }
      setResults([]);
    } catch (err) {
      setLogs(prev => [...prev, { message: `❌ ${err.message}`, level: 'error' }]);
    }
  };

  const handleExportCsv = (selectedFields = null) => {
    if (!API_BASE_URL) {
      setLogs(prev => [...prev, { message: '❌ Scraper API is not configured.', level: 'error' }]);
      return;
    }
    let url = apiUrl('export/csv');
    if (selectedFields && Array.isArray(selectedFields)) {
      url += `?fields=${encodeURIComponent(selectedFields.join(','))}`;
    }
    window.location.href = url;
  };

  const handleExportJson = () => {
    if (!API_BASE_URL) {
      setLogs(prev => [...prev, { message: '❌ Scraper API is not configured.', level: 'error' }]);
      return;
    }
    window.location.href = apiUrl('export/json');
  };

  return (
    <div className="app-container">
      <Header isScraping={isScraping} totalItems={results.length} />

      {!API_BASE_URL && (
        <div className="backend-notice" role="status">
          GitHub Pages hosts this dashboard only. To enable scraping, deploy the API and set the
          <code> VITE_API_BASE_URL </code> GitHub Actions repository variable to its HTTPS URL, then redeploy.
        </div>
      )}

      <div className="dashboard-grid">
        {/* Left Column: Form Controls & Live Monitor */}
        <div>
          <SearchForm
            onStartScrape={handleStartScrape}
            onStopScrape={handleStopScrape}
            isScraping={isScraping}
          />
        </div>

        {/* Right Column: Analytics, Live Terminal Feed, Results Table */}
        <div>
          <LiveProgress
            isScraping={isScraping}
            currentKeyword={currentKeyword}
            progressPercent={progressPercent}
            logs={logs}
          />

          <AnalyticsCards data={results} />

          <ResultsTable
            data={results}
            onExportCsv={() => handleExportCsv()}
            onExportJson={handleExportJson}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onClearData={handleClearData}
            isScraping={isScraping}
          />
        </div>
      </div>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirmExport={handleExportCsv}
      />
    </div>
  );
}
