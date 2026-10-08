import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SearchForm from './components/SearchForm';
import LiveProgress from './components/LiveProgress';
import AnalyticsCards from './components/AnalyticsCards';
import ResultsTable from './components/ResultsTable';
import ExportModal from './components/ExportModal';

export default function App() {
  const [results, setResults] = useState([]);
  const [isScraping, setIsScraping] = useState(false);
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [logs, setLogs] = useState([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Fetch initial results & listen to SSE real-time stream
  useEffect(() => {
    // Initial fetch of any existing results
    fetch('/api/results')
      .then(res => res.json())
      .then(data => {
        if (data.data) setResults(data.data);
        if (typeof data.isScraping === 'boolean') setIsScraping(data.isScraping);
      })
      .catch(() => {});

    // Establish SSE stream
    const eventSource = new EventSource('/api/scrape/stream');

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

      const res = await fetch('/api/scrape', {
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
      await fetch('/api/stop', { method: 'POST' });
      setLogs(prev => [...prev, { message: 'Sending stop request...', level: 'warn' }]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearData = async () => {
    try {
      await fetch('/api/clear', { method: 'POST' });
      setResults([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCsv = (selectedFields = null) => {
    let url = '/api/export/csv';
    if (selectedFields && Array.isArray(selectedFields)) {
      url += `?fields=${encodeURIComponent(selectedFields.join(','))}`;
    }
    window.location.href = url;
  };

  const handleExportJson = () => {
    window.location.href = '/api/export/json';
  };

  return (
    <div className="app-container">
      <Header isScraping={isScraping} totalItems={results.length} />

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
