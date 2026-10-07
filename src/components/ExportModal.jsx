import React, { useState } from 'react';
import { X, Download, CheckSquare, Square } from 'lucide-react';

const ALL_FIELDS = [
  { label: 'Title / Business Name', key: 'title' },
  { label: 'Category', key: 'category' },
  { label: 'Rating', key: 'rating' },
  { label: 'Review Count', key: 'reviewCount' },
  { label: 'Phone Number', key: 'phone' },
  { label: 'Email', key: 'email' },
  { label: 'Website', key: 'website' },
  { label: 'Address', key: 'address' },
  { label: 'Status / Hours', key: 'status' },
  { label: 'Latitude', key: 'latitude' },
  { label: 'Longitude', key: 'longitude' },
  { label: 'Search Keyword', key: 'keyword' },
  { label: 'Google Maps Link', key: 'googleMapsUrl' },
  { label: 'Plus Code', key: 'plusCode' }
];

export default function ExportModal({ isOpen, onClose, onConfirmExport }) {
  const [selectedKeys, setSelectedKeys] = useState(ALL_FIELDS.map(f => f.key));

  if (!isOpen) return null;

  const toggleField = (key) => {
    setSelectedKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => setSelectedKeys(ALL_FIELDS.map(f => f.key));
  const deselectAll = () => setSelectedKeys([]);

  const handleExport = () => {
    onConfirmExport(selectedKeys);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Customize CSV Export Fields</h3>
          <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Select which data columns you want to include in your exported CSV file.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', margin: '0.75rem 0' }}>
          <button type="button" className="chip" onClick={selectAll}>
            <CheckSquare size={12} /> Select All
          </button>
          <button type="button" className="chip" onClick={deselectAll}>
            <Square size={12} /> Deselect All
          </button>
        </div>

        <div className="field-checkbox-grid">
          {ALL_FIELDS.map(field => (
            <label key={field.key} className="checkbox-label">
              <input
                type="checkbox"
                checked={selectedKeys.includes(field.key)}
                onChange={() => toggleField(field.key)}
              />
              <span>{field.label}</span>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleExport} disabled={selectedKeys.length === 0}>
            <Download size={16} />
            <span>Download CSV ({selectedKeys.length} columns)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
