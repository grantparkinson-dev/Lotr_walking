console.log('[sheets.js] Script loaded');

/**
 * Google Sheets Integration
 * Fetches step data from a public Google Sheet with multiple tabs
 */

const SheetsAPI = {
    // Configuration for each walker's sheet
    // Using direct published CSV URLs (File -> Share -> Publish to web -> CSV)
    walkerConfigs: {
        joely: {
            name: 'Joely',
            csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQvJLPuO1QDECi8Qxf95e0VslciqamZTaypJeP_vWPKD0BrGJ8UEbb6xMXjeu8Hqw/pub?output=csv'
        },
        kylie: {
            name: 'Kylie',
            csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTImu1nQsgkEnhMDrkirMmmkothjWvqCAq4Ev4WsPp11qVW7IveO0kJEWJM5mvIM6KpeSEBtIdGSyxv/pub?output=csv'
        },
    },

    // Currently selected walker (default to joely)
    selectedWalker: 'joely',

    /**
     * Set the selected walker
     * @param {string} walkerId - 'joely' or 'kylie'
     */
    setSelectedWalker(walkerId) {
        if (this.walkerConfigs[walkerId]) {
            this.selectedWalker = walkerId;
            localStorage.setItem('selectedWalker', walkerId);
        }
    },

    /**
     * Get the saved walker selection from localStorage
     * @returns {string}
     */
    getSavedWalker() {
        return localStorage.getItem('selectedWalker') || 'joely';
    },

    /**
     * Save walker data to localStorage
     */
    saveToCache(walkerId, data) {
        const cacheKey = `walkerData_${walkerId}`;
        const cacheData = {
            ...data,
            cachedAt: new Date().toISOString()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log(`[Cache] Saved ${walkerId} data:`, cacheData);
    },

    /**
     * Load walker data from localStorage
     */
    loadFromCache(walkerId) {
        const cacheKey = `walkerData_${walkerId}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const data = JSON.parse(cached);
            console.log(`[Cache] Loaded ${walkerId} data from cache:`, data);
            return data;
        }
        console.log(`[Cache] No cached data for ${walkerId}`);
        return null;
    },

    /**
     * Fetches progress for ALL walkers (for 3D view showing both)
     * @returns {Promise<Array<{name: string, miles: number, steps: number}>>}
     */
    async fetchAllProgress() {
        const results = [];

        for (const walkerId of Object.keys(this.walkerConfigs)) {
            const walker = this.walkerConfigs[walkerId];
            console.log(`[Fetch] Fetching ${walkerId}...`);

            try {
                const data = await this.fetchFromUrl(walker.csvUrl);
                if (data.totalMiles > 0) {
                    const walkerData = {
                        name: walker.name,
                        miles: data.totalMiles,
                        steps: Math.round(data.totalMiles * 2000)
                    };
                    results.push(walkerData);
                    this.saveToCache(walkerId, walkerData);
                    console.log(`[Fetch] Success! ${walker.name}: ${data.totalMiles} miles`);
                } else {
                    // Try cache
                    const cached = this.loadFromCache(walkerId);
                    if (cached) results.push(cached);
                }
            } catch (error) {
                console.warn(`[Fetch] Failed for ${walker.name}:`, error.message);
                const cached = this.loadFromCache(walkerId);
                if (cached) results.push(cached);
            }
        }

        return results;
    },

    /**
     * Fetches progress for the selected walker
     * @returns {Promise<Array<{name: string, miles: number, steps: number}>>}
     */
    async fetchProgress() {
        const results = [];
        const walker = this.walkerConfigs[this.selectedWalker];
        const walkerId = this.selectedWalker;

        console.log(`[Fetch] Starting fetch for ${walkerId}...`);
        console.log(`[Fetch] URL: ${walker?.csvUrl}`);

        if (!walker || !walker.csvUrl) {
            console.error(`[Fetch] No config found for walker: ${walkerId}`);
            return this.getFromCacheOrEmpty(walkerId, walker?.name);
        }

        try {
            const data = await this.fetchFromUrl(walker.csvUrl);
            console.log(`[Fetch] Parsed data:`, data);

            if (data.totalMiles > 0) {
                const walkerData = {
                    name: walker.name,
                    miles: data.totalMiles,
                    steps: Math.round(data.totalMiles * 2000)
                };
                results.push(walkerData);
                // Cache successful fetch
                this.saveToCache(walkerId, walkerData);
                console.log(`[Fetch] Success! ${walker.name}: ${data.totalMiles} miles`);
            } else {
                console.warn(`[Fetch] Got 0 miles, falling back to cache`);
                return this.getFromCacheOrEmpty(walkerId, walker.name);
            }
        } catch (error) {
            console.error(`[Fetch] Failed for ${walker.name}:`, error);
            return this.getFromCacheOrEmpty(walkerId, walker.name);
        }

        return results;
    },

    /**
     * Get cached data or return empty array
     */
    getFromCacheOrEmpty(walkerId, walkerName) {
        const cached = this.loadFromCache(walkerId);
        if (cached) {
            console.log(`[Fetch] Using cached data for ${walkerName}`);
            return [cached];
        }
        console.warn(`[Fetch] No cached data available for ${walkerName}`);
        return [];
    },

    /**
     * Fetches and parses CSV from a direct URL
     * @param {string} url - The published CSV URL
     * @returns {Promise<{totalMiles: number}>}
     */
    async fetchFromUrl(url) {
        // Add cache-busting parameter to ensure fresh data
        const cacheBuster = `_cb=${Date.now()}`;
        const separator = url.includes('?') ? '&' : '?';
        let fetchUrl = `${url}${separator}${cacheBuster}`;

        console.log(`[Fetch] Attempting direct fetch: ${fetchUrl}`);

        // Try direct fetch first
        let response;
        try {
            response = await fetch(fetchUrl);
            console.log(`[Fetch] Direct fetch response status: ${response.status}`);
        } catch (e) {
            // If CORS error, try with a proxy
            console.log(`[Fetch] Direct fetch failed with error:`, e.message);
            console.log(`[Fetch] Trying CORS proxy...`);
            fetchUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            response = await fetch(fetchUrl);
            console.log(`[Fetch] Proxy fetch response status: ${response.status}`);
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch sheet: ${response.status}`);
        }

        const csvText = await response.text();
        console.log(`[Fetch] CSV text length: ${csvText.length} chars`);
        console.log(`[Fetch] CSV first 500 chars:`, csvText.substring(0, 500));

        return this.parseWalkToMordorCSV(csvText);
    },

    /**
     * Parses the Walk to Mordor spreadsheet format
     * The sheet has a config section at the top, then a header row with "Total",
     * followed by daily data rows. We need the last value in the Total column.
     * @param {string} csvText
     * @returns {{totalMiles: number}}
     */
    parseWalkToMordorCSV(csvText) {
        const lines = csvText.trim().split('\n');
        console.log(`[Parse] Total lines: ${lines.length}`);

        // Find the header row that contains "Total" as a column header
        let totalColumnIndex = -1;
        let dataStartRow = -1;

        for (let i = 0; i < lines.length; i++) {
            const columns = this.parseCSVLine(lines[i]);
            const totalIdx = columns.findIndex((col, idx) =>
                col.toLowerCase().trim() === 'total' && idx >= 3
            );

            if (totalIdx !== -1) {
                totalColumnIndex = totalIdx;
                dataStartRow = i + 1;
                console.log(`[Parse] Found "Total" header at row ${i}, column ${totalIdx}`);
                console.log(`[Parse] Header row:`, columns);
                break;
            }
        }

        if (totalColumnIndex === -1) {
            console.error(`[Parse] Could not find "Total" column header!`);
            console.log(`[Parse] First 10 lines:`);
            lines.slice(0, 10).forEach((line, i) => {
                console.log(`  Line ${i}:`, this.parseCSVLine(line));
            });
            return { totalMiles: 0 };
        }

        // Find the last row with a valid total value
        let lastTotal = 0;
        let lastValidRow = -1;

        for (let i = dataStartRow; i < lines.length; i++) {
            const columns = this.parseCSVLine(lines[i]);
            if (columns.length > totalColumnIndex) {
                const value = parseFloat(columns[totalColumnIndex]);
                if (!isNaN(value) && value > 0) {
                    lastTotal = value;
                    lastValidRow = i;
                }
            }
        }

        console.log(`[Parse] Last valid total: ${lastTotal} (row ${lastValidRow})`);
        return { totalMiles: lastTotal };
    },

    /**
     * Parse a CSV line handling quoted values
     * @param {string} line
     * @returns {string[]}
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());

        return result;
    },

    /**
     * Validates the sheet URL is configured
     * @returns {boolean}
     */
    isConfigured() {
        const walker = this.walkerConfigs[this.selectedWalker];
        return walker &&
               walker.csvUrl &&
               walker.csvUrl.includes('docs.google.com');
    }
};

// For demo/testing when no sheet is configured or fetch fails
const DemoData = {
    // Hardcoded walker data as fallback
    hardcodedWalkers: {
        joely: { name: 'Joely', miles: 843.7, steps: 1687400 },
        kylie: { name: 'Kylie', miles: 571.3, steps: 1142600 }
    },

    getWalkers() {
        const selectedWalker = SheetsAPI.selectedWalker;
        if (selectedWalker === 'kylie') {
            return [this.hardcodedWalkers.kylie];
        }
        return [this.hardcodedWalkers.joely];
    },

    // Get both walkers for views that show everyone
    getAllWalkers() {
        return [
            this.hardcodedWalkers.joely,
            this.hardcodedWalkers.kylie
        ];
    }
};
