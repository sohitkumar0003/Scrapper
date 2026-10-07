import React, { useState, useMemo } from 'react';
import { 
  Table, Download, ExternalLink, Star, Phone, Globe, 
  MapPin, Search, Filter, Trash2, Copy, Check 
} from 'lucide-react';

export default function ResultsTable({ 
  data = [], 
  onExportCsv, 
  onExportJson, 
  onOpenExportModal, 
  onClearData, 
  isScraping 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortField, setSortField] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc');
  const [copied, setCopied] = useState(false);

  // Extract unique categories for filtering
  const categories = useMemo(() => {
    const set = new Set();
    data.forEach(item => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [data]);

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = 
        !searchQuery ||
        (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.address && item.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.phone && item.phone.includes(searchQuery)) ||
        (item.keyword && item.keyword.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = !selectedCategory || item.category === selectedCategory;

      return matchesSearch && matchesCat;
    }).sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      return sortOrder === 'asc' 
        ? String(valA).localeCompare(String(valB)) 
        : String(valB).localeCompare(String(valA));
    });
  }, [data, searchQuery, selectedCategory, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleCopyClipboard = () => {
    if (data.length === 0) return;
    const headers = ["Title", "Category", "Rating", "Review Count", "Phone", "Email", "Website", "Address"].join('\t');
    const rows = filteredData.map(d => [
      d.title || '',
      d.category || '',
      d.rating || '',
      d.reviewCount || '',
      d.phone || '',
      d.email || '',
      d.website || '',
      d.address || ''
    ].join('\t')).join('\n');

    navigator.clipboard.writeText(`${headers}\n${rows}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <h2 className="card-title" style={{ margin: 0 }}>
          <Table size={20} color="var(--color-primary)" />
          <span>Extracted Results ({filteredData.length})</span>
        </h2>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleCopyClipboard} disabled={data.length === 0}>
            {copied ? <Check size={16} color="var(--color-success)" /> : <Copy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy Table'}</span>
          </button>

          <button className="btn btn-secondary" onClick={onOpenExportModal} disabled={data.length === 0}>
            <Filter size={16} />
            <span>Customize CSV</span>
          </button>

          <button className="btn btn-primary" onClick={onExportCsv} disabled={data.length === 0}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>

          <button className="btn btn-secondary" onClick={onExportJson} disabled={data.length === 0}>
            <Download size={16} />
            <span>JSON</span>
          </button>

          <button className="btn btn-danger" onClick={onClearData} disabled={data.length === 0 || isScraping} title="Clear results">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, address, phone, keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.4rem' }}
          />
        </div>

        {categories.length > 0 && (
          <select
            className="form-select"
            style={{ width: '200px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table Container */}
      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('title')} style={{ cursor: 'pointer' }}>
                Business Name {sortField === 'title' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>
                Category {sortField === 'category' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('rating')} style={{ cursor: 'pointer' }}>
                Rating {sortField === 'rating' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('reviewCount')} style={{ cursor: 'pointer' }}>
                Reviews {sortField === 'reviewCount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th>Phone</th>
              <th>Email</th>
              <th>Website</th>
              <th>Address</th>
              <th>Maps</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  {data.length === 0 ? (
                    <div>
                      <MapPin size={36} color="var(--text-dim)" style={{ marginBottom: '0.5rem' }} />
                      <p>No places extracted yet. Enter a keyword above and click <strong>Start Extraction</strong>.</p>
                    </div>
                  ) : (
                    <p>No listings match your search filter.</p>
                  )}
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr key={index}>
                  <td>
                    <div className="place-title-cell">
                      <span>{item.title}</span>
                      {item.keyword && <span className="place-keyword">Keyword: {item.keyword}</span>}
                    </div>
                  </td>
                  <td>
                    {item.category ? (
                      <span className="badge badge-category">{item.category}</span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>—</span>
                    )}
                  </td>
                  <td>
                    {typeof item.rating === 'number' ? (
                      <span className="badge badge-rating">
                        <Star size={12} fill="#fbbf24" /> {item.rating}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>—</span>
                    )}
                  </td>
                  <td>
                    {item.reviewCount ? (
                      <span>{item.reviewCount.toLocaleString()}</span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>—</span>
                    )}
                  </td>
                  <td className="single-line-cell">
                    {item.phone ? (
                      <span className="mono-cell">{item.phone}</span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>N/A</span>
                    )}
                  </td>
                  <td className="single-line-cell">
                    {item.email ? (
                      <a href={`mailto:${item.email}`} className="link-out mono-cell" title={item.email}>
                        {item.email}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>N/A</span>
                    )}
                  </td>
                  <td className="single-line-cell">
                    {item.website ? (
                      <a href={item.website} target="_blank" rel="noreferrer" className="link-out">
                        <Globe size={13} />
                        <span>Visit</span>
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>N/A</span>
                    )}
                  </td>
                  <td className="single-line-cell address-cell" title={item.address}>
                    {item.address || <span style={{ color: 'var(--text-dim)' }}>N/A</span>}
                  </td>
                  <td>
                    {item.googleMapsUrl && (
                      <a href={item.googleMapsUrl} target="_blank" rel="noreferrer" className="link-out" title="Open Google Maps">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
