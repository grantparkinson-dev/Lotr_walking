/**
 * Journey Route Data
 * Defines the path from Hobbiton to Mount Doom with waypoints
 *
 * Coordinates are in percentages (0-100) relative to the map image
 * These should be calibrated to match your specific map image
 */

const JourneyRoute = {
    // Total journey distance in miles (matches spreadsheet)
    totalMiles: 1800,

    // Steps per mile (average walking)
    stepsPerMile: 2000,

    // Total steps for the complete journey
    get totalSteps() {
        return this.totalMiles * this.stepsPerMile;
    },

    /**
     * Waypoints along the journey
     * Each waypoint has:
     * - name: Location name
     * - x, y: Percentage coordinates on the map (0-100)
     * - miles: Cumulative miles from start to this point
     * - description: Brief lore description
     */
    waypoints: [
    {
        name: 'Hobbiton',
        x: 35.42,
        y: 24.75,
        miles: 0,
        description: 'The peaceful home of hobbits in the Shire, where the journey begins.'
    },
    {
        name: 'Bree',
        x: 42.30,
        y: 25.79,
        miles: 135,
        description: 'A village of Men where hobbits first meet Strider at the Prancing Pony.'
    },
    {
        name: 'Weathertop',
        x: 45.45,
        y: 26.24,
        miles: 240,
        description: 'The ancient watchtower where Frodo was wounded by the Witch-king.'
    },
    {
        name: 'Rivendell',
        x: 51.00,
        y: 25.61,
        miles: 458,
        description: 'The Last Homely House, realm of Elrond where the Fellowship was formed.'
    },
    {
        name: 'Hollin Ridge',
        x: 51.70,
        y: 33.01,
        miles: 690,
        description: 'The ancient land of the Elves, now empty and silent beneath the mountains.'
    },
    {
        name: 'West Gate of Moria',
        x: 50.91,
        y: 36.09,
        miles: 798,
        description: 'The Doors of Durin, entrance to the ancient dwarf kingdom of Khazad-dum.'
    },
    {
        name: 'Exit of Moria',
        x: 52.55,
        y: 36.62,
        miles: 840,
        description: 'The eastern gate, where the Fellowship escaped after facing the Balrog.'
    },
    {
        name: 'Lothlórien',
        x: 54.79,
        y: 37.36,
        miles: 920,
        description: 'The Golden Wood, realm of Galadriel and Celeborn.'
    },
    {
        name: 'Argonath',
        x: 57.90,
        y: 48.90,
        miles: 1309,
        description: 'The Pillars of the Kings, great statues guarding the northern entrance to Gondor.'
    },
    {
        name: 'Dead Marshes',
        x: 63.61,
        y: 50.00,
        miles: 1433,
        description: 'The haunted marshland lit by ghostly lights of the fallen.'
    },
    {
        name: 'Black Gate',
        x: 66.14,
        y: 51.55,
        miles: 1474,
        description: 'The Morannon, the great gate of Mordor guarded by the towers of the Teeth.'
    },
    {
        name: 'Morgul Road',
        x: 64.69,
        y: 61.87,
        miles: 1576,
        description: 'The road leading to Minas Morgul, the Tower of Black Sorcery.'
    },
    {
        name: 'Cirith Ungol',
        x: 67.00,
        y: 62.16,
        miles: 1634,
        description: 'The Pass of the Spider, guarded by the ancient terror Shelob.'
    },
    {
        name: 'Mount Doom',
        x: 70.50,
        y: 58.09,
        miles: 1800,
        description: 'Orodruin, the Mountain of Fire where the One Ring was forged and must be destroyed.'
    }
],

    /**
     * Get the waypoint at or before a given mile marker
     * @param {number} miles - Current miles traveled
     * @returns {Object} The current waypoint
     */
    getCurrentWaypoint(miles) {
        for (let i = this.waypoints.length - 1; i >= 0; i--) {
            if (miles >= this.waypoints[i].miles) {
                return this.waypoints[i];
            }
        }
        return this.waypoints[0];
    },

    /**
     * Get the next waypoint after the current miles
     * @param {number} miles - Current miles traveled
     * @returns {Object|null} The next waypoint or null if at the end
     */
    getNextWaypoint(miles) {
        for (const waypoint of this.waypoints) {
            if (waypoint.miles > miles) {
                return waypoint;
            }
        }
        return null;
    },

    /**
     * Calculate percentage progress through the journey
     * @param {number} steps - Current step count
     * @returns {number} Progress as percentage (0-100)
     */
    getProgressPercent(steps) {
        const percent = (steps / this.totalSteps) * 100;
        return Math.min(100, Math.max(0, percent));
    },

    /**
     * Convert steps to miles
     * @param {number} steps - Step count
     * @returns {number} Miles walked
     */
    stepsToMiles(steps) {
        return steps / this.stepsPerMile;
    },

    /**
     * Get position on the path for a given progress percentage
     * Interpolates between waypoints
     * @param {number} percent - Progress percentage (0-100)
     * @returns {{x: number, y: number}} Position as percentages
     */
    getPositionAtPercent(percent) {
        const miles = (percent / 100) * this.totalMiles;

        // Find the two waypoints we're between
        let prevWaypoint = this.waypoints[0];
        let nextWaypoint = this.waypoints[1];

        for (let i = 0; i < this.waypoints.length - 1; i++) {
            if (miles >= this.waypoints[i].miles && miles < this.waypoints[i + 1].miles) {
                prevWaypoint = this.waypoints[i];
                nextWaypoint = this.waypoints[i + 1];
                break;
            }
        }

        // If past the last waypoint
        if (miles >= this.waypoints[this.waypoints.length - 1].miles) {
            return {
                x: this.waypoints[this.waypoints.length - 1].x,
                y: this.waypoints[this.waypoints.length - 1].y
            };
        }

        // Interpolate between waypoints
        const segmentLength = nextWaypoint.miles - prevWaypoint.miles;
        const segmentProgress = (miles - prevWaypoint.miles) / segmentLength;

        return {
            x: prevWaypoint.x + (nextWaypoint.x - prevWaypoint.x) * segmentProgress,
            y: prevWaypoint.y + (nextWaypoint.y - prevWaypoint.y) * segmentProgress
        };
    }
};
