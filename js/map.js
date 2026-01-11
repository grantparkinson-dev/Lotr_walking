/**
 * Map Rendering Module
 * Handles SVG overlay, path drawing, and walker positioning
 */

const MapRenderer = {
    svg: null,
    pathGroup: null,
    landmarksGroup: null,
    walkersGroup: null,
    journeyPath: null,
    pathLength: 0,

    /**
     * Initialize the map renderer
     */
    init() {
        this.svg = document.getElementById('mapOverlay');
        this.pathGroup = document.getElementById('journeyPath');
        this.landmarksGroup = document.getElementById('landmarks');
        this.walkersGroup = document.getElementById('walkers');

        // Wait for map image to load to get dimensions
        const mapImage = document.getElementById('mapImage');
        if (mapImage.complete) {
            this.setupSVG();
        } else {
            mapImage.addEventListener('load', () => this.setupSVG());
        }
    },

    /**
     * Set up SVG viewBox to match map dimensions
     */
    setupSVG() {
        const mapImage = document.getElementById('mapImage');
        const width = mapImage.naturalWidth || 1000;
        const height = mapImage.naturalHeight || 700;

        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.drawJourneyPath(width, height);
        this.drawLandmarks(width, height);
    },

    /**
     * Draw the journey path as an SVG path
     */
    drawJourneyPath(mapWidth, mapHeight) {
        // Convert waypoint percentages to actual coordinates
        const points = JourneyRoute.waypoints.map(wp => ({
            x: (wp.x / 100) * mapWidth,
            y: (wp.y / 100) * mapHeight
        }));

        // Create smooth path through waypoints using Catmull-Rom to Bezier conversion
        const pathData = this.createSmoothPath(points);

        // Background path (full route, dimmed)
        const bgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        bgPath.setAttribute('d', pathData);
        bgPath.setAttribute('class', 'journey-path-bg');
        this.pathGroup.appendChild(bgPath);

        // Foreground path (traveled portion, glowing)
        this.journeyPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.journeyPath.setAttribute('d', pathData);
        this.journeyPath.setAttribute('class', 'journey-path-traveled');
        this.pathGroup.appendChild(this.journeyPath);

        // Get total path length for animations
        this.pathLength = this.journeyPath.getTotalLength();

        // Initialize with no progress
        this.journeyPath.style.strokeDasharray = this.pathLength;
        this.journeyPath.style.strokeDashoffset = this.pathLength;
    },

    /**
     * Create a smooth curved path through points
     */
    createSmoothPath(points) {
        if (points.length < 2) return '';

        let path = `M ${points[0].x} ${points[0].y}`;

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i === 0 ? i : i - 1];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2 >= points.length ? i + 1 : i + 2];

            // Catmull-Rom to Bezier conversion
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }

        return path;
    },

    /**
     * Draw landmark markers on the map
     */
    drawLandmarks(mapWidth, mapHeight) {
        JourneyRoute.waypoints.forEach((waypoint, index) => {
            const x = (waypoint.x / 100) * mapWidth;
            const y = (waypoint.y / 100) * mapHeight;

            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('class', 'landmark-marker');
            group.setAttribute('data-name', waypoint.name);

            // Landmark dot
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', 6);
            circle.setAttribute('class', 'landmark-dot');

            // Landmark label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', y - 12);
            text.setAttribute('class', 'landmark-label');
            text.textContent = waypoint.name;

            group.appendChild(circle);
            group.appendChild(text);
            this.landmarksGroup.appendChild(group);
        });
    },

    /**
     * Create walker icons
     */
    createWalkerIcons(walkers) {
        this.walkersGroup.innerHTML = '';

        walkers.forEach((walker, index) => {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('class', `walker-group walker-${index + 1}`);
            group.setAttribute('data-name', walker.name);

            // Glow effect circle
            const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            glow.setAttribute('r', 20);
            glow.setAttribute('class', 'walker-glow');
            glow.setAttribute('fill', index === 0 ? 'rgba(74, 144, 164, 0.3)' : 'rgba(164, 74, 108, 0.3)');

            // Hobbit silhouette
            const hobbit = this.createHobbitSVG(index);

            group.appendChild(glow);
            group.appendChild(hobbit);
            this.walkersGroup.appendChild(group);
        });
    },

    /**
     * Create a hobbit silhouette SVG
     */
    createHobbitSVG(index) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', `walker-icon walker-${index + 1}`);
        group.setAttribute('transform', 'translate(-15, -30) scale(0.6)');

        // Simple hobbit silhouette path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `
            M 25 10
            C 25 4, 20 0, 15 0
            C 10 0, 5 4, 5 10
            C 5 14, 8 18, 12 20
            L 8 50
            L 2 50
            L 2 55
            L 12 55
            L 15 35
            L 18 55
            L 28 55
            L 28 50
            L 22 50
            L 18 20
            C 22 18, 25 14, 25 10
            Z
        `);

        // Walking stick
        const stick = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        stick.setAttribute('d', 'M 28 15 L 35 55');
        stick.setAttribute('stroke', index === 0 ? '#4a90a4' : '#a44a6c');
        stick.setAttribute('stroke-width', '3');
        stick.setAttribute('stroke-linecap', 'round');
        stick.setAttribute('fill', 'none');

        group.appendChild(stick);
        group.appendChild(path);

        return group;
    },

    /**
     * Update walker positions based on progress
     */
    updateWalkerPositions(walkers) {
        const mapImage = document.getElementById('mapImage');
        const mapWidth = mapImage.naturalWidth || 1000;
        const mapHeight = mapImage.naturalHeight || 700;

        walkers.forEach((walker, index) => {
            const group = this.walkersGroup.querySelector(`.walker-${index + 1}`);
            if (!group) return;

            const percent = JourneyRoute.getProgressPercent(walker.steps);
            const position = JourneyRoute.getPositionAtPercent(percent);

            const x = (position.x / 100) * mapWidth;
            const y = (position.y / 100) * mapHeight;

            group.style.transform = `translate(${x}px, ${y}px)`;
        });
    },

    /**
     * Update the glowing trail to show maximum progress
     */
    updateTrail(walkers) {
        if (!this.journeyPath || !this.pathLength) return;

        // Show trail up to the furthest walker
        const maxPercent = Math.max(...walkers.map(w => JourneyRoute.getProgressPercent(w.steps)));
        const traveledLength = (maxPercent / 100) * this.pathLength;

        this.journeyPath.style.strokeDashoffset = this.pathLength - traveledLength;
    },

    /**
     * Update all map elements with new walker data
     */
    update(walkers) {
        if (this.walkersGroup.children.length === 0) {
            this.createWalkerIcons(walkers);
        }

        this.updateWalkerPositions(walkers);
        this.updateTrail(walkers);
    }
};
