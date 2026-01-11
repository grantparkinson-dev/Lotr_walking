/**
 * Walk to Mordor - Main Application
 * Ties together all modules and manages UI state
 */

const App = {
    walkers: [],
    isLoading: true,

    /**
     * Initialize the application
     */
    async init() {
        console.log('Walk to Mordor - Initializing...');

        // Initialize map renderer
        MapRenderer.init();

        // Load walker data
        await this.loadData();

        // Hide loading overlay
        this.hideLoading();

        // Set up auto-refresh (every 5 minutes)
        setInterval(() => this.loadData(), 5 * 60 * 1000);
    },

    /**
     * Load data from Google Sheets or demo data
     */
    async loadData() {
        try {
            if (SheetsAPI.isConfigured()) {
                this.walkers = await SheetsAPI.fetchProgress();
                console.log('Loaded data from Google Sheets:', this.walkers);
            } else {
                console.log('Google Sheets not configured, using demo data');
                this.walkers = DemoData.getWalkers();
            }

            this.updateUI();
            MapRenderer.update(this.walkers);
            this.updateLastUpdated();

        } catch (error) {
            console.error('Failed to load data:', error);
            // Fall back to demo data on error
            this.walkers = DemoData.getWalkers();
            this.updateUI();
            MapRenderer.update(this.walkers);
        }
    },

    /**
     * Update all UI elements with current data
     */
    updateUI() {
        this.renderWalkerCards();
        this.updateCurrentLocation();
    },

    /**
     * Render walker stat cards
     */
    renderWalkerCards() {
        const container = document.getElementById('walkersContainer');
        container.innerHTML = '';

        this.walkers.forEach((walker, index) => {
            const miles = JourneyRoute.stepsToMiles(walker.steps);
            const percent = JourneyRoute.getProgressPercent(walker.steps);
            const currentLocation = JourneyRoute.getCurrentWaypoint(miles);
            const nextLocation = JourneyRoute.getNextWaypoint(miles);

            const card = document.createElement('div');
            card.className = 'walker-card';
            card.innerHTML = `
                <div class="walker-card-header">
                    <div class="walker-avatar walker-${index + 1}">
                        <svg viewBox="0 0 30 55">
                            <path d="M 25 10 C 25 4, 20 0, 15 0 C 10 0, 5 4, 5 10 C 5 14, 8 18, 12 20 L 8 50 L 2 50 L 2 55 L 12 55 L 15 35 L 18 55 L 28 55 L 28 50 L 22 50 L 18 20 C 22 18, 25 14, 25 10 Z" fill="currentColor"/>
                        </svg>
                    </div>
                    <span class="walker-name">${this.escapeHtml(walker.name)}</span>
                </div>
                <div class="walker-stats">
                    <div class="stat-row">
                        <span class="label">Steps</span>
                        <span class="value">${this.formatNumber(walker.steps)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="label">Miles</span>
                        <span class="value">${miles.toFixed(1)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="label">Location</span>
                        <span class="value">${currentLocation.name}</span>
                    </div>
                    ${nextLocation ? `
                    <div class="stat-row">
                        <span class="label">Next Stop</span>
                        <span class="value">${nextLocation.name}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-bar-fill walker-${index + 1}" style="width: ${percent}%"></div>
                    </div>
                    <div class="progress-text">${percent.toFixed(1)}% complete</div>
                </div>
            `;

            container.appendChild(card);
        });
    },

    /**
     * Update the current location display showing furthest progress
     */
    updateCurrentLocation() {
        const container = document.getElementById('currentLocation');

        if (this.walkers.length === 0) {
            container.innerHTML = '<p>No travelers found</p>';
            return;
        }

        // Find the walker who is furthest along
        const furthestWalker = this.walkers.reduce((max, walker) =>
            walker.steps > max.steps ? walker : max
        );

        const miles = JourneyRoute.stepsToMiles(furthestWalker.steps);
        const location = JourneyRoute.getCurrentWaypoint(miles);

        container.innerHTML = `
            <h4>Leading the Fellowship</h4>
            <p class="location-name">${this.escapeHtml(furthestWalker.name)}</p>
            <p style="font-size: 0.85rem; margin-top: 0.5rem; font-style: italic;">
                "${location.description}"
            </p>
        `;
    },

    /**
     * Update the last updated timestamp
     */
    updateLastUpdated() {
        const element = document.getElementById('updateTime');
        const now = new Date();
        element.textContent = now.toLocaleString();
    },

    /**
     * Hide the loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.add('hidden');
        this.isLoading = false;
    },

    /**
     * Format a number with commas
     */
    formatNumber(num) {
        return num.toLocaleString();
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
