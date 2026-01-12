/**
 * Google Sheets Integration
 * Fetches step data from a public Google Sheet with multiple tabs
 */

const SheetsAPI = {
    // Your Google Sheet ID
    SHEET_ID: '1_zWBYfuWloRJn3K2T1hkWDjxS8sDm7I5',

    // Configuration for each walker's sheet tab
    // Update names and gid values to match your sheet tabs
    // To add the second person later, uncomment the second line and add their gid
    walkers: [
        { name: 'Joely', gid: '72948048' },
        // { name: 'Kylie', gid: 'THEIR_GID_HERE' },  // Uncomment and add Kylie's sheet gid when ready
    ],

    /**
     * Fetches progress for all walkers
     * @returns {Promise<Array<{name: string, miles: number, steps: number}>>}
     */
    async fetchProgress() {
        const results = [];

        for (const walker of this.walkers) {
            try {
                const data = await this.fetchSheet(walker.gid);
                results.push({
                    name: walker.name,
                    miles: data.totalMiles,
                    steps: Math.round(data.totalMiles * 2000) // Convert miles to steps
                });
            } catch (error) {
                console.error(`Failed to fetch data for ${walker.name}:`, error);
            }
        }

        return results;
    },

    /**
     * Fetches and parses a single sheet tab
     * @param {string} gid - The sheet tab ID
     * @returns {Promise<{totalMiles: number}>}
     */
    async fetchSheet(gid) {
        const url = `https://docs.google.com/spreadsheets/d/${this.SHEET_ID}/export?format=csv&gid=${gid}`;
        console.log('Fetching URL:', url);

        const response = await fetch(url);
        console.log('Response status:', response.status);

        if (!response.ok) {
            throw new Error(`Failed to fetch sheet: ${response.status}`);
        }

        const csvText = await response.text();
        console.log('CSV text (first 1000 chars):', csvText.substring(0, 1000));

        const result = this.parseWalkToMordorCSV(csvText);
        console.log('Parsed result:', result);
        return result;
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
        console.log('Total lines:', lines.length);

        // Find the header row that contains "Total" as a column header
        // This row typically comes after "WALK TO MORDOR CHALLENGE"
        let totalColumnIndex = -1;
        let dataStartRow = -1;

        for (let i = 0; i < lines.length; i++) {
            const columns = this.parseCSVLine(lines[i]);

            // Look for a row that has "Total" as a header (usually after Date, Challenge, Steps, Miles)
            // The header row typically has: Date, Challenge, Steps, Miles, Total
            const totalIdx = columns.findIndex((col, idx) =>
                col.toLowerCase().trim() === 'total' && idx >= 3
            );

            if (totalIdx !== -1) {
                totalColumnIndex = totalIdx;
                dataStartRow = i + 1;
                console.log(`Found "Total" column at index ${totalIdx} on row ${i}`);
                console.log('Header row:', columns);
                break;
            }
        }

        if (totalColumnIndex === -1) {
            console.error('Could not find Total column header');
            return { totalMiles: 0 };
        }

        // Now find the last row with a valid total value
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

        console.log('Last total found:', lastTotal);
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
        return this.SHEET_ID !== 'YOUR_SHEET_ID_HERE' &&
               this.SHEET_ID.length > 10 &&
               this.walkers.some(w => w.gid !== '0' || w.gid !== '');
    }
};

// For demo/testing when no sheet is configured
const DemoData = {
    getWalkers() {
        return [
            { name: 'Rosie', miles: 813.8, steps: 1627600 },
            { name: 'Lily', miles: 650.0, steps: 1300000 }
        ];
    }
};
