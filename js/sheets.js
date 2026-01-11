/**
 * Google Sheets Integration
 * Fetches step data from a public Google Sheet
 */

const SheetsAPI = {
    // Replace with your actual Google Sheet ID
    // The sheet must be published to web or shared as "Anyone with the link can view"
    SHEET_ID: 'YOUR_SHEET_ID_HERE',

    /**
     * Fetches and parses CSV data from Google Sheets
     * @returns {Promise<Array<{name: string, steps: number, date: string}>>}
     */
    async fetchProgress() {
        const url = `https://docs.google.com/spreadsheets/d/${this.SHEET_ID}/export?format=csv`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch sheet: ${response.status}`);
            }

            const csvText = await response.text();
            return this.parseCSV(csvText);
        } catch (error) {
            console.error('Error fetching Google Sheet:', error);
            throw error;
        }
    },

    /**
     * Parses CSV text into an array of walker objects
     * Expected format: Name,Steps,Date (with header row)
     * @param {string} csvText
     * @returns {Array<{name: string, steps: number, date: string}>}
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');

        // Skip header row
        const dataRows = lines.slice(1);

        return dataRows.map(line => {
            // Handle CSV parsing (basic - doesn't handle quoted commas)
            const columns = line.split(',').map(col => col.trim());

            return {
                name: columns[0] || 'Unknown',
                steps: parseInt(columns[1], 10) || 0,
                date: columns[2] || new Date().toISOString().split('T')[0]
            };
        }).filter(walker => walker.name && walker.name !== 'Unknown');
    },

    /**
     * Validates the sheet ID is configured
     * @returns {boolean}
     */
    isConfigured() {
        return this.SHEET_ID !== 'YOUR_SHEET_ID_HERE' && this.SHEET_ID.length > 10;
    }
};

// For demo/testing when no sheet is configured
const DemoData = {
    getWalkers() {
        return [
            {
                name: 'Rosie',
                steps: 458000,
                date: '2025-01-11'
            },
            {
                name: 'Lily',
                steps: 392000,
                date: '2025-01-11'
            }
        ];
    }
};
