/**
 * Google Sheets Integration
 * Fetches step data from a public Google Sheet with multiple tabs
 */

const SheetsAPI = {
    // Configuration for each walker's sheet
    // Each walker can have their own spreadsheet (sheetId) and tab (gid)
    walkerConfigs: {
        joely: {
            name: 'Joely',
            sheetId: '1_zWBYfuWloRJn3K2T1hkWDjxS8sDm7I5',
            gid: '72948048'
        },
        kylie: {
            name: 'Kylie',
            sheetId: '1Fu8vpsg-EvSOX93VcfEPAAXSiq9AWsEoz4Aco8363OI',
            gid: '0'
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
     * Fetches progress for the selected walker
     * @returns {Promise<Array<{name: string, miles: number, steps: number}>>}
     */
    async fetchProgress() {
        const results = [];
        const walker = this.walkerConfigs[this.selectedWalker];

        if (!walker) return results;

        try {
            const data = await this.fetchSheet(walker.sheetId, walker.gid);
            results.push({
                name: walker.name,
                miles: data.totalMiles,
                steps: Math.round(data.totalMiles * 2000) // Convert miles to steps
            });
        } catch (error) {
            // Silently fail - will fall back to demo data
        }

        return results;
    },

    /**
     * Fetches and parses a single sheet tab
     * @param {string} sheetId - The Google Sheets ID
     * @param {string} gid - The sheet tab ID
     * @returns {Promise<{totalMiles: number}>}
     */
    async fetchSheet(sheetId, gid) {
        // Try published web format first (File -> Publish to web)
        let url = `https://docs.google.com/spreadsheets/d/${sheetId}/pub?output=csv&gid=${gid}`;
        let response = await fetch(url);

        // If that fails, try export format (Share -> Anyone with link)
        if (!response.ok) {
            url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
            response = await fetch(url);
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch sheet: ${response.status}`);
        }

        const csvText = await response.text();
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
                break;
            }
        }

        if (totalColumnIndex === -1) return { totalMiles: 0 };

        // Find the last row with a valid total value
        let lastTotal = 0;

        for (let i = dataStartRow; i < lines.length; i++) {
            const columns = this.parseCSVLine(lines[i]);
            if (columns.length > totalColumnIndex) {
                const value = parseFloat(columns[totalColumnIndex]);
                if (!isNaN(value) && value > 0) {
                    lastTotal = value;
                }
            }
        }

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
     * Validates the sheet ID is configured
     * @returns {boolean}
     */
    isConfigured() {
        const walker = this.walkerConfigs[this.selectedWalker];
        return walker &&
               walker.sheetId &&
               walker.sheetId !== 'YOUR_SHEET_ID_HERE' &&
               walker.sheetId.length > 10 &&
               walker.gid !== undefined;
    }
};

// For demo/testing when no sheet is configured
const DemoData = {
    getWalkers() {
        const selectedWalker = SheetsAPI.selectedWalker;
        if (selectedWalker === 'kylie') {
            return [
                { name: 'Kylie', miles: 571.3, steps: 1142600 }
            ];
        }
        return [
            { name: 'Joely', miles: 813.8, steps: 1627600 }
        ];
    }
};
