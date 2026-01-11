/**
 * Journey Route Data
 * Defines the path from Hobbiton to Mount Doom with waypoints
 *
 * Coordinates are in percentages (0-100) relative to the map image
 * These should be calibrated to match your specific map image
 */

const JourneyRoute = {
    // Total journey distance in miles
    totalMiles: 1779,

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
            x: 22,
            y: 35,
            miles: 0,
            description: 'The peaceful home of hobbits in the Shire, where the journey begins.'
        },
        {
            name: 'Bree',
            x: 28,
            y: 34,
            miles: 120,
            description: 'A village of Men where hobbits first meet Strider at the Prancing Pony.'
        },
        {
            name: 'Weathertop',
            x: 33,
            y: 33,
            miles: 200,
            description: 'The ancient watchtower where Frodo was wounded by the Witch-king.'
        },
        {
            name: 'Rivendell',
            x: 38,
            y: 38,
            miles: 350,
            description: 'The Last Homely House, realm of Elrond where the Fellowship was formed.'
        },
        {
            name: 'Moria Gate',
            x: 40,
            y: 48,
            miles: 470,
            description: 'The western entrance to the Mines of Moria, the ancient dwarf kingdom.'
        },
        {
            name: 'Lothlórien',
            x: 45,
            y: 52,
            miles: 570,
            description: 'The Golden Wood, realm of Galadriel and Celeborn.'
        },
        {
            name: 'Amon Hen',
            x: 50,
            y: 55,
            miles: 700,
            description: 'The Hill of the Eye, where the Fellowship was broken.'
        },
        {
            name: 'Emyn Muil',
            x: 55,
            y: 52,
            miles: 850,
            description: 'The treacherous maze of rocky hills east of the Great River.'
        },
        {
            name: 'Dead Marshes',
            x: 60,
            y: 50,
            miles: 1000,
            description: 'The haunted marshland lit by ghostly lights of the fallen.'
        },
        {
            name: 'Black Gate',
            x: 65,
            y: 48,
            miles: 1200,
            description: 'The Morannon, the great gate of Mordor guarded by the towers of the Teeth.'
        },
        {
            name: 'Minas Morgul',
            x: 68,
            y: 55,
            miles: 1400,
            description: 'The Tower of Black Sorcery, once Minas Ithil of Gondor.'
        },
        {
            name: 'Cirith Ungol',
            x: 72,
            y: 54,
            miles: 1550,
            description: 'The Pass of the Spider, guarded by the ancient terror Shelob.'
        },
        {
            name: 'Mount Doom',
            x: 78,
            y: 52,
            miles: 1779,
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
