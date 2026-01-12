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
        // Restore saved walker selection
        const savedWalker = SheetsAPI.getSavedWalker();
        SheetsAPI.setSelectedWalker(savedWalker);
        this.updateToggleUI(savedWalker);

        // Set up toggle buttons
        this.setupToggle();

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
     * Set up walker toggle buttons
     */
    setupToggle() {
        const toggleBtns = document.querySelectorAll('.toggle-btn');
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const walkerId = btn.dataset.walker;
                if (walkerId === SheetsAPI.selectedWalker) return;

                // Update selection
                SheetsAPI.setSelectedWalker(walkerId);
                this.updateToggleUI(walkerId);

                // Clear existing walker icons and reset centering flag
                MapRenderer.walkersGroup.innerHTML = '';
                MapRenderer.hasInitialCentered = false;
                await this.loadData();
            });
        });
    },

    /**
     * Update toggle button active state
     */
    updateToggleUI(activeWalker) {
        const toggleBtns = document.querySelectorAll('.toggle-btn');
        toggleBtns.forEach(btn => {
            if (btn.dataset.walker === activeWalker) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    /**
     * Load data from Google Sheets or demo data
     */
    async loadData() {
        try {
            if (SheetsAPI.isConfigured()) {
                this.walkers = await SheetsAPI.fetchProgress();
            } else {
                this.walkers = DemoData.getWalkers();
            }

            this.updateUI();
            MapRenderer.update(this.walkers);
            this.updateLastUpdated();

        } catch (error) {
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
            // Use miles directly if available, otherwise calculate from steps
            const miles = walker.miles || JourneyRoute.stepsToMiles(walker.steps);
            const percent = (miles / JourneyRoute.totalMiles) * 100;
            const currentLocation = JourneyRoute.getCurrentWaypoint(miles);
            const nextLocation = JourneyRoute.getNextWaypoint(miles);

            const card = document.createElement('div');
            card.className = 'walker-card';
            card.innerHTML = `
                <div class="walker-card-header">
                    <div class="walker-avatar walker-${index + 1}">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 2C9 7 4 9 4 14c0 4 3.5 8 8 8s8-4 8-8c0-5-5-7-8-12z" fill="currentColor" opacity="0.3"/>
                            <path d="M12 3c-2.5 4.5-6.5 6-6.5 10.5c0 3.5 3 6.5 6.5 6.5s6.5-3 6.5-6.5c0-4.5-4-6-6.5-10.5z" fill="none" stroke="currentColor" stroke-width="1.5"/>
                            <path d="M12 7v11M9 12c1.5 1 4.5 1 6 0M9.5 15.5c1.2.8 3.8.8 5 0" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
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
        const furthestWalker = this.walkers.reduce((max, walker) => {
            const walkerMiles = walker.miles || JourneyRoute.stepsToMiles(walker.steps);
            const maxMiles = max.miles || JourneyRoute.stepsToMiles(max.steps);
            return walkerMiles > maxMiles ? walker : max;
        });

        const miles = furthestWalker.miles || JourneyRoute.stepsToMiles(furthestWalker.steps);
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
