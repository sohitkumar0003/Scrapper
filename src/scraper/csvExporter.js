/**
 * Utility for converting Google Maps scraped place objects to standard CSV format.
 * Includes UTF-8 BOM byte marker so Excel displays international characters correctly.
 */

const DEFAULT_FIELDS = [
  { label: 'Title / Name', key: 'title' },
  { label: 'Category', key: 'category' },
  { label: 'Rating', key: 'rating' },
  { label: 'Review Count', key: 'reviewCount' },
  { label: 'Address', key: 'address' },
  { label: 'Phone Number', key: 'phone' },
  { label: 'Email', key: 'email' },
  { label: 'Website', key: 'website' },
  { label: 'Status / Hours', key: 'status' },
  { label: 'Latitude', key: 'latitude' },
  { label: 'Longitude', key: 'longitude' },
  { label: 'Search Keyword', key: 'keyword' },
  { label: 'Google Maps Link', key: 'googleMapsUrl' },
  { label: 'Plus Code', key: 'plusCode' }
];

/**
 * Escapes a field for CSV according to RFC 4180 rules.
 */
function escapeCsvCell(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  // If string contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Converts array of place objects to CSV string.
 * @param {Array<Object>} items - Array of scraped place records
 * @param {Array<string>} [selectedKeys] - Optional array of keys to include
 * @returns {string} CSV formatted string with UTF-8 BOM
 */
function convertToCSV(items = [], selectedKeys = null) {
  if (!items || !items.length) {
    return '\uFEFF';
  }

  const fields = selectedKeys 
    ? DEFAULT_FIELDS.filter(f => selectedKeys.includes(f.key))
    : DEFAULT_FIELDS;

  // Header row
  const headers = fields.map(f => escapeCsvCell(f.label)).join(',');
  
  // Data rows
  const rows = items.map(item => {
    return fields.map(f => {
      const value = item[f.key];
      return escapeCsvCell(value !== undefined ? value : '');
    }).join(',');
  });

  // UTF-8 BOM (\uFEFF) ensures Microsoft Excel opens unicode text properly
  return '\uFEFF' + [headers, ...rows].join('\r\n');
}

module.exports = {
  convertToCSV,
  DEFAULT_FIELDS
};
