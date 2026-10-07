import React from 'react';
import { Database, Star, PhoneCall, Globe } from 'lucide-react';

export default function AnalyticsCards({ data = [] }) {
  const total = data.length;

  const ratedItems = data.filter(d => typeof d.rating === 'number' && d.rating > 0);
  const avgRating = ratedItems.length > 0 
    ? (ratedItems.reduce((acc, d) => acc + d.rating, 0) / ratedItems.length).toFixed(1) 
    : 'N/A';

  const withPhone = data.filter(d => d.phone && d.phone.length > 3).length;
  const phonePercent = total > 0 ? Math.round((withPhone / total) * 100) : 0;

  const withWeb = data.filter(d => d.website && d.website.startsWith('http')).length;
  const webPercent = total > 0 ? Math.round((withWeb / total) * 100) : 0;

  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-icon">
          <Database size={20} />
        </div>
        <div>
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Listings</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
          <Star size={20} />
        </div>
        <div>
          <div className="stat-value">{avgRating} {avgRating !== 'N/A' && '★'}</div>
          <div className="stat-label">Average Rating</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
          <PhoneCall size={20} />
        </div>
        <div>
          <div className="stat-value">{phonePercent}%</div>
          <div className="stat-label">Phone Direct ({withPhone})</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
          <Globe size={20} />
        </div>
        <div>
          <div className="stat-value">{webPercent}%</div>
          <div className="stat-label">Websites ({withWeb})</div>
        </div>
      </div>
    </div>
  );
}
