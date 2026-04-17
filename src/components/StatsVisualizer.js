// Stats Visualizer Component
// Provides bookmark statistics visualization

class StatsVisualizer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    
    this.options = {
      showCharts: true,
      showNumbers: true,
      refreshInterval: 30000, // 30 seconds
      onStatsLoaded: null,
      ...options
    };
    
    this.stats = null;
    this.charts = new Map();
    this.refreshTimer = null;
    
    this.init();
  }
  
  init() {
    this.renderLoading();
    this.loadStats();
    
    // Set up auto-refresh
    if (this.options.refreshInterval > 0) {
      this.refreshTimer = setInterval(() => {
        this.loadStats();
      }, this.options.refreshInterval);
    }
  }
  
  async loadStats() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATISTICS' });
      
      if (response.success) {
        this.stats = response.data;
        this.render();
        
        if (this.options.onStatsLoaded) {
          this.options.onStatsLoaded(this.stats);
        }
        
        return true;
      } else {
        this.renderError('Failed to load statistics');
        return false;
      }
    } catch (error) {
      this.renderError('Error loading statistics: ' + error.message);
      return false;
    }
  }
  
  render() {
    if (!this.stats) {
      this.renderEmpty();
      return;
    }
    
    let html = '';
    
    // Summary numbers
    if (this.options.showNumbers) {
      html += this.renderSummaryNumbers();
    }
    
    // Charts
    if (this.options.showCharts) {
      html += this.renderCharts();
    }
    
    // Detailed stats
    html += this.renderDetailedStats();
    
    this.container.innerHTML = html;
    
    // Initialize charts if needed
    if (this.options.showCharts) {
      this.initializeCharts();
    }
  }
  
  renderSummaryNumbers() {
    const stats = this.stats;
    
    return `
      <div class="stats-summary">
        <div class="stat-card">
          <div class="stat-icon" style="background-color: #4f46e5;">
            <i class="fas fa-bookmark"></i>
          </div>
          <div class="stat-content">
            <div class="stat-value">${stats.total || 0}</div>
            <div class="stat-label">Total Items</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon" style="background-color: #10b981;">
            <i class="fas fa-link"></i>
          </div>
          <div class="stat-content">
            <div class="stat-value">${stats.bookmarks || 0}</div>
            <div class="stat-label">Bookmarks</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon" style="background-color: #f59e0b;">
            <i class="fas fa-folder"></i>
          </div>
          <div class="stat-content">
            <div class="stat-value">${stats.folders || 0}</div>
            <div class="stat-label">Folders</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon" style="background-color: #8b5cf6;">
            <i class="fas fa-tags"></i>
          </div>
          <div class="stat-content">
            <div class="stat-value">${stats.tagDistribution?.length || 0}</div>
            <div class="stat-label">Unique Tags</div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderCharts() {
    return `
      <div class="stats-charts">
        <div class="chart-container">
          <h3>Bookmarks vs Folders</h3>
          <div class="chart" id="type-chart"></div>
        </div>
        
        <div class="chart-container">
          <h3>Top Tags</h3>
          <div class="chart" id="tags-chart"></div>
        </div>
        
        <div class="chart-container full-width">
          <h3>Bookmarks Added Over Time</h3>
          <div class="chart" id="timeline-chart"></div>
        </div>
      </div>
    `;
  }
  
  renderDetailedStats() {
    const stats = this.stats;
    
    let folderStats = '';
    if (stats.byFolder && Object.keys(stats.byFolder).length > 0) {
      const folderItems = Object.entries(stats.byFolder)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([folderId, count]) => {
          // In a real app, we would look up folder names
          return `<div class="stat-item"><span class="stat-label">Folder ${folderId}</span><span class="stat-value">${count}</span></div>`;
        })
        .join('');
      
      folderStats = `
        <div class="stat-section">
          <h3>Top Folders</h3>
          ${folderItems}
        </div>
      `;
    }
    
    let tagStats = '';
    if (stats.tagDistribution && stats.tagDistribution.length > 0) {
      const tagItems = stats.tagDistribution
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(tag => {
          return `<div class="stat-item"><span class="stat-label">${this.escapeHtml(tag.name)}</span><span class="stat-value">${tag.count}</span></div>`;
        })
        .join('');
      
      tagStats = `
        <div class="stat-section">
          <h3>Top Tags</h3>
          ${tagItems}
        </div>
      `;
    }
    
    let timelineStats = '';
    if (stats.byDate && Object.keys(stats.byDate).length > 0) {
      const dateItems = Object.entries(stats.byDate)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 6)
        .map(([month, count]) => {
          return `<div class="stat-item"><span class="stat-label">${month}</span><span class="stat-value">${count}</span></div>`;
        })
        .join('');
      
      timelineStats = `
        <div class="stat-section">
          <h3>Recent Activity</h3>
          ${dateItems}
        </div>
      `;
    }
    
    return `
      <div class="stats-details">
        ${folderStats}
        ${tagStats}
        ${timelineStats}
      </div>
    `;
  }
  
  initializeCharts() {
    // Type distribution chart (bookmarks vs folders)
    this.renderTypeChart();
    
    // Tags distribution chart
    this.renderTagsChart();
    
    // Timeline chart
    this.renderTimelineChart();
  }
  
  renderTypeChart() {
    const container = document.getElementById('type-chart');
    if (!container || !this.stats) return;
    
    const bookmarks = this.stats.bookmarks || 0;
    const folders = this.stats.folders || 0;
    const total = bookmarks + folders;
    
    if (total === 0) {
      container.innerHTML = '<div class="no-data">No data available</div>';
      return;
    }
    
    // Simple SVG pie chart
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    
    const bookmarkPercent = (bookmarks / total) * 100;
    const folderPercent = (folders / total) * 100;
    
    const bookmarkOffset = circumference * (folderPercent / 100);
    
    const svg = `
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="${radius}" fill="none" stroke="#e5e7eb" stroke-width="10"/>
        <circle cx="50" cy="50" r="${radius}" fill="none" stroke="#10b981" stroke-width="10"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${bookmarkOffset}"
                transform="rotate(-90 50 50)"/>
        <circle cx="50" cy="50" r="${radius}" fill="none" stroke="#f59e0b" stroke-width="10"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="0"
                transform="rotate(${-90 + (bookmarkPercent / 100 * 360)} 50 50)"/>
        <text x="50" y="50" text-anchor="middle" dy="0.3em" font-size="14" font-weight="bold">
          ${total}
        </text>
      </svg>
      <div class="chart-legend">
        <div class="legend-item">
          <span class="legend-color" style="background-color: #10b981;"></span>
          <span class="legend-label">Bookmarks (${bookmarkPercent.toFixed(1)}%)</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background-color: #f59e0b;"></span>
          <span class="legend-label">Folders (${folderPercent.toFixed(1)}%)</span>
        </div>
      </div>
    `;
    
    container.innerHTML = svg;
  }
  
  renderTagsChart() {
    const container = document.getElementById('tags-chart');
    if (!container || !this.stats.tagDistribution || this.stats.tagDistribution.length === 0) {
      if (container) {
        container.innerHTML = '<div class="no-data">No tags data</div>';
      }
      return;
    }
    
    const topTags = this.stats.tagDistribution
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    const maxCount = Math.max(...topTags.map(tag => tag.count));
    
    const bars = topTags.map((tag, index) => {
      const height = maxCount > 0 ? (tag.count / maxCount * 80) : 0;
      const color = this.getTagColor(tag.name);
      
      return `
        <div class="bar-container">
          <div class="bar" style="height: ${height}px; background-color: ${color};" 
               title="${this.escapeHtml(tag.name)}: ${tag.count}">
          </div>
          <div class="bar-label">${this.escapeHtml(this.truncateText(tag.name, 8))}</div>
          <div class="bar-value">${tag.count}</div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = `
      <div class="bar-chart">
        ${bars}
      </div>
    `;
  }
  
  renderTimelineChart() {
    const container = document.getElementById('timeline-chart');
    if (!container || !this.stats.byDate || Object.keys(this.stats.byDate).length === 0) {
      if (container) {
        container.innerHTML = '<div class="no-data">No timeline data</div>';
      }
      return;
    }
    
    const timelineData = Object.entries(this.stats.byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12); // Last 12 months
    
    if (timelineData.length === 0) {
      container.innerHTML = '<div class="no-data">No timeline data</div>';
      return;
    }
    
    const maxCount = Math.max(...timelineData.map(([_, count]) => count));
    
    const points = timelineData.map(([month, count], index) => {
      const x = (index / (timelineData.length - 1)) * 100;
      const y = maxCount > 0 ? 100 - (count / maxCount * 100) : 100;
      
      return `${x},${y}`;
    }).join(' ');
    
    const labels = timelineData.map(([month], index) => {
      const x = (index / (timelineData.length - 1)) * 100;
      const shortMonth = month.split('-')[1];
      
      return `
        <text x="${x}%" y="105" text-anchor="middle" font-size="10" fill="#6b7280">
          ${shortMonth}
        </text>
      `;
    }).join('');
    
    const svg = `
      <svg width="100%" height="120" viewBox="0 0 100 120">
        <polyline points="${points}" fill="none" stroke="#4f46e5" stroke-width="2"/>
        ${labels}
        ${points.split(' ').map(point => {
          const [x, y] = point.split(',').map(Number);
          return `<circle cx="${x}" cy="${y}" r="3" fill="#4f46e5"/>`;
        }).join('')}
      </svg>
    `;
    
    container.innerHTML = svg;
  }
  
  getTagColor(tagName) {
    // Simple hash-based color generation
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      '#4f46e5', '#7c3aed', '#a855f7', // Purple
      '#3b82f6', '#0ea5e9', '#06b6d4', // Blue
      '#10b981', '#22c55e', '#84cc16', // Green
      '#f59e0b', '#f97316', '#ef4444'  // Orange/Red
    ];
    
    return colors[Math.abs(hash) % colors.length];
  }
  
  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
  
  renderLoading() {
    this.container.innerHTML = `
      <div class="stats-loading">
        <i class="fas fa-chart-bar fa-spin"></i>
        <span>Loading statistics...</span>
      </div>
    `;
  }
  
  renderEmpty() {
    this.container.innerHTML = `
      <div class="stats-empty">
        <i class="fas fa-chart-bar"></i>
        <h3>No Statistics Available</h3>
        <p>Collecting bookmark statistics...</p>
      </div>
    `;
  }
  
  renderError(message) {
    this.container.innerHTML = `
      <div class="stats-error">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error Loading Statistics</h3>
        <p>${this.escapeHtml(message)}</p>
        <button class="btn-text" id="retry-stats">
          <i class="fas fa-redo"></i> Retry
        </button>
      </div>
    `;
    
    const retryBtn = document.getElementById('retry-stats');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.loadStats();
      });
    }
  }
  
  // Export statistics
  
  exportStats(format = 'json') {
    if (!this.stats) {
      throw new Error('No statistics available');
    }
    
    let exportData;
    
    switch (format) {
      case 'json':
        exportData = JSON.stringify(this.stats, null, 2);
        break;
      case 'csv':
        exportData = this.convertStatsToCSV();
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    
    return {
      data: exportData,
      filename: `bookmark-stats-${new Date().toISOString().split('T')[0]}.${format}`,
      mimeType: format === 'json' ? 'application/json' : 'text/csv'
    };
  }
  
  convertStatsToCSV() {
    const stats = this.stats;
    const rows = [];
    
    // Basic stats
    rows.push(['Statistic', 'Value']);
    rows.push(['Total Items', stats.total || 0]);
    rows.push(['Bookmarks', stats.bookmarks || 0]);
    rows.push(['Folders', stats.folders || 0]);
    rows.push(['Unique Tags', stats.tagDistribution?.length || 0]);
    
    // Tag distribution
    if (stats.tagDistribution && stats.tagDistribution.length > 0) {
      rows.push([]);
      rows.push(['Tag Distribution']);
      rows.push(['Tag', 'Count']);
      stats.tagDistribution.forEach(tag => {
        rows.push([tag.name, tag.count]);
      });
    }
    
    // Timeline
    if (stats.byDate && Object.keys(stats.byDate).length > 0) {
      rows.push([]);
      rows.push(['Timeline']);
      rows.push(['Month', 'Count']);
      Object.entries(stats.byDate).forEach(([month, count]) => {
        rows.push([month, count]);
      });
    }
    
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }
  
  downloadStats(format = 'json') {
    try {
      const exportData = this.exportStats(format);
      const blob = new Blob([exportData.data], { type: exportData.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading stats:', error);
      alert(`Error downloading statistics: ${error.message}`);
    }
  }
  
  // Utility methods
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  destroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    this.charts.clear();
    this.container.innerHTML = '';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StatsVisualizer;
}