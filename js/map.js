/**
 * Map Rendering Module
 * Handles SVG overlay, path drawing, walker positioning, and zoom/pan
 */

const MapRenderer = {
    svg: null,
    pathGroup: null,
    landmarksGroup: null,
    walkersGroup: null,
    journeyPath: null,
    pathLength: 0,

    // Zoom and pan state
    zoom: 1,
    panX: 0,
    panY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    lastPanX: 0,
    lastPanY: 0,

    // Map dimensions
    imageWidth: 0,
    imageHeight: 0,

    // DOM elements
    viewport: null,
    wrapper: null,
    mapImage: null,

    /**
     * Initialize the map renderer
     */
    init() {
        this.svg = document.getElementById('mapOverlay');
        this.pathGroup = document.getElementById('journeyPath');
        this.landmarksGroup = document.getElementById('landmarks');
        this.walkersGroup = document.getElementById('walkers');
        this.viewport = document.getElementById('mapViewport');
        this.wrapper = document.getElementById('mapWrapper');
        this.mapImage = document.getElementById('mapImage');

        // Wait for map image to load
        if (this.mapImage.complete) {
            this.setupMap();
        } else {
            this.mapImage.addEventListener('load', () => this.setupMap());
        }
    },

    /**
     * Set up map after image loads
     */
    setupMap() {
        this.imageWidth = this.mapImage.naturalWidth;
        this.imageHeight = this.mapImage.naturalHeight;

        console.log('=== Setting up Map ===');
        console.log('Map dimensions:', this.imageWidth, 'x', this.imageHeight);

        // Set up SVG
        this.svg.setAttribute('viewBox', `0 0 ${this.imageWidth} ${this.imageHeight}`);
        this.svg.setAttribute('width', this.imageWidth);
        this.svg.setAttribute('height', this.imageHeight);

        // Draw path and landmarks
        this.drawJourneyPath();
        this.drawLandmarks();

        // Set up controls
        this.setupControls();

        // Center on journey with nice default zoom
        setTimeout(() => this.centerOnJourney(), 100);

        console.log('Map setup complete');
    },

    /**
     * Set up zoom and pan controls
     */
    setupControls() {
        // Zoom buttons
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
        document.getElementById('zoomFit').addEventListener('click', () => this.fitToView());
        document.getElementById('zoomReset').addEventListener('click', () => this.centerOnJourney());

        // Mouse wheel zoom
        this.viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.viewport.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const delta = e.deltaY > 0 ? 0.85 : 1.15;
            this.zoomAt(mouseX, mouseY, delta);
        }, { passive: false });

        // Pan with mouse drag
        this.viewport.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.isDragging = true;
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY;
                this.lastPanX = this.panX;
                this.lastPanY = this.panY;
                this.viewport.style.cursor = 'grabbing';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const dx = e.clientX - this.dragStartX;
                const dy = e.clientY - this.dragStartY;
                this.panX = this.lastPanX + dx;
                this.panY = this.lastPanY + dy;
                this.applyTransform();
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.viewport.style.cursor = 'grab';
            }
        });

        // Touch support
        let lastTouchDistance = 0;
        this.viewport.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.dragStartX = e.touches[0].clientX;
                this.dragStartY = e.touches[0].clientY;
                this.lastPanX = this.panX;
                this.lastPanY = this.panY;
            } else if (e.touches.length === 2) {
                lastTouchDistance = this.getTouchDistance(e.touches);
            }
        }, { passive: true });

        this.viewport.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && this.isDragging) {
                const dx = e.touches[0].clientX - this.dragStartX;
                const dy = e.touches[0].clientY - this.dragStartY;
                this.panX = this.lastPanX + dx;
                this.panY = this.lastPanY + dy;
                this.applyTransform();
            } else if (e.touches.length === 2) {
                const distance = this.getTouchDistance(e.touches);
                const delta = distance / lastTouchDistance;
                lastTouchDistance = distance;
                this.zoomBy(delta);
            }
        }, { passive: true });

        this.viewport.addEventListener('touchend', () => {
            this.isDragging = false;
        });

        // Hide hint after first interaction
        const hint = document.getElementById('mapHint');
        ['wheel', 'mousedown', 'touchstart'].forEach(event => {
            this.viewport.addEventListener(event, () => {
                hint.classList.add('hidden');
            }, { once: true });
        });
    },

    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Apply current transform to map wrapper
     */
    applyTransform() {
        this.wrapper.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    },

    /**
     * Zoom in
     */
    zoomIn() {
        this.zoomBy(1.3);
    },

    /**
     * Zoom out
     */
    zoomOut() {
        this.zoomBy(0.7);
    },

    /**
     * Zoom by a factor
     */
    zoomBy(factor) {
        const rect = this.viewport.getBoundingClientRect();
        this.zoomAt(rect.width / 2, rect.height / 2, factor);
    },

    /**
     * Zoom at a specific point
     */
    zoomAt(viewX, viewY, factor) {
        const oldZoom = this.zoom;
        this.zoom = Math.max(0.1, Math.min(3, this.zoom * factor));

        // Adjust pan to zoom toward mouse position
        const zoomRatio = this.zoom / oldZoom;
        this.panX = viewX - (viewX - this.panX) * zoomRatio;
        this.panY = viewY - (viewY - this.panY) * zoomRatio;

        this.applyTransform();
    },

    /**
     * Fit entire map to view
     */
    fitToView() {
        const rect = this.viewport.getBoundingClientRect();
        const scaleX = rect.width / this.imageWidth;
        const scaleY = rect.height / this.imageHeight;
        this.zoom = Math.min(scaleX, scaleY) * 0.95;

        // Center the map
        this.panX = (rect.width - this.imageWidth * this.zoom) / 2;
        this.panY = (rect.height - this.imageHeight * this.zoom) / 2;

        this.applyTransform();
    },

    /**
     * Center on the journey path with a nice zoom level
     */
    centerOnJourney() {
        const rect = this.viewport.getBoundingClientRect();

        // Calculate bounding box of journey waypoints
        const waypoints = JourneyRoute.waypoints;
        let minX = 100, maxX = 0, minY = 100, maxY = 0;

        waypoints.forEach(wp => {
            minX = Math.min(minX, wp.x);
            maxX = Math.max(maxX, wp.x);
            minY = Math.min(minY, wp.y);
            maxY = Math.max(maxY, wp.y);
        });

        // Add padding
        const padding = 5;
        minX = Math.max(0, minX - padding);
        maxX = Math.min(100, maxX + padding);
        minY = Math.max(0, minY - padding);
        maxY = Math.min(100, maxY + padding);

        // Convert to pixels
        const boxX = (minX / 100) * this.imageWidth;
        const boxY = (minY / 100) * this.imageHeight;
        const boxWidth = ((maxX - minX) / 100) * this.imageWidth;
        const boxHeight = ((maxY - minY) / 100) * this.imageHeight;

        // Calculate zoom to fit journey - zoom in closer for better view
        const scaleX = rect.width / boxWidth;
        const scaleY = rect.height / boxHeight;
        this.zoom = Math.min(scaleX, scaleY) * 1.4;

        // Center on journey
        const centerX = boxX + boxWidth / 2;
        const centerY = boxY + boxHeight / 2;
        this.panX = rect.width / 2 - centerX * this.zoom;
        this.panY = rect.height / 2 - centerY * this.zoom;

        this.applyTransform();
    },

    /**
     * Draw the journey path
     */
    drawJourneyPath() {
        const points = JourneyRoute.waypoints.map(wp => ({
            x: (wp.x / 100) * this.imageWidth,
            y: (wp.y / 100) * this.imageHeight
        }));

        const pathData = this.createSmoothPath(points);

        // Background path
        const bgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        bgPath.setAttribute('d', pathData);
        bgPath.setAttribute('class', 'journey-path-bg');
        this.pathGroup.appendChild(bgPath);

        // Traveled path
        this.journeyPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.journeyPath.setAttribute('d', pathData);
        this.journeyPath.setAttribute('class', 'journey-path-traveled');
        this.pathGroup.appendChild(this.journeyPath);

        this.pathLength = this.journeyPath.getTotalLength();
        this.journeyPath.style.strokeDasharray = this.pathLength;
        this.journeyPath.style.strokeDashoffset = this.pathLength;

        console.log('Path length:', this.pathLength);
    },

    /**
     * Create smooth curved path through points
     */
    createSmoothPath(points) {
        if (points.length < 2) return '';

        let path = `M ${points[0].x} ${points[0].y}`;

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i === 0 ? i : i - 1];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2 >= points.length ? i + 1 : i + 2];

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }

        return path;
    },

    /**
     * Draw landmark markers with glow effects
     */
    drawLandmarks() {
        JourneyRoute.waypoints.forEach((waypoint, index) => {
            const x = (waypoint.x / 100) * this.imageWidth;
            const y = (waypoint.y / 100) * this.imageHeight;

            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('class', 'landmark-marker');
            group.setAttribute('data-miles', waypoint.miles);
            group.setAttribute('data-name', waypoint.name);

            // Outer glow ring
            const glowRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            glowRing.setAttribute('cx', x);
            glowRing.setAttribute('cy', y);
            glowRing.setAttribute('r', 20);
            glowRing.setAttribute('fill', 'url(#landmarkGlow)');
            glowRing.setAttribute('class', 'landmark-glow-ring');

            // Main dot
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', 12);
            circle.setAttribute('class', 'landmark-dot');

            // Inner highlight
            const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            innerCircle.setAttribute('cx', x - 3);
            innerCircle.setAttribute('cy', y - 3);
            innerCircle.setAttribute('r', 4);
            innerCircle.setAttribute('fill', 'rgba(255, 255, 255, 0.4)');
            innerCircle.setAttribute('class', 'landmark-highlight');

            // Label with background
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', y - 22);
            text.setAttribute('class', 'landmark-label');
            text.textContent = waypoint.name;

            group.appendChild(glowRing);
            group.appendChild(circle);
            group.appendChild(innerCircle);
            group.appendChild(text);
            this.landmarksGroup.appendChild(group);
        });
    },

    /**
     * Update landmarks to show which ones have been reached
     */
    updateLandmarkStatus(miles) {
        const markers = this.landmarksGroup.querySelectorAll('.landmark-marker');
        markers.forEach(marker => {
            const landmarkMiles = parseFloat(marker.getAttribute('data-miles'));
            if (miles >= landmarkMiles) {
                marker.classList.add('landmark-reached');
            } else {
                marker.classList.remove('landmark-reached');
            }
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

            // Glow effect
            const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            glow.setAttribute('r', 25);
            glow.setAttribute('class', 'walker-glow');
            glow.setAttribute('fill', index === 0 ? 'rgba(74, 144, 164, 0.4)' : 'rgba(164, 74, 108, 0.4)');

            // Hobbit silhouette
            const hobbit = this.createHobbitSVG(index);

            group.appendChild(glow);
            group.appendChild(hobbit);
            this.walkersGroup.appendChild(group);
        });
    },

    /**
     * Create hobbit silhouette SVG
     */
    createHobbitSVG(index) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', `walker-icon walker-${index + 1}`);
        group.setAttribute('transform', 'translate(-12, -24) scale(0.8)');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M 15 8 C 15 4, 12 0, 8 0 C 4 0, 1 4, 1 8 C 1 11, 3 14, 6 15 L 4 35 L 0 35 L 0 38 L 6 38 L 8 25 L 10 38 L 16 38 L 16 35 L 12 35 L 10 15 C 13 14, 15 11, 15 8 Z');

        const stick = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        stick.setAttribute('d', 'M 16 10 L 22 38');
        stick.setAttribute('stroke', index === 0 ? '#4a90a4' : '#a44a6c');
        stick.setAttribute('stroke-width', '2');
        stick.setAttribute('stroke-linecap', 'round');
        stick.setAttribute('fill', 'none');

        group.appendChild(stick);
        group.appendChild(path);

        return group;
    },

    /**
     * Update walker positions
     */
    updateWalkerPositions(walkers) {
        walkers.forEach((walker, index) => {
            const group = this.walkersGroup.querySelector(`.walker-${index + 1}`);
            if (!group) return;

            const miles = walker.miles || JourneyRoute.stepsToMiles(walker.steps);
            const percent = (miles / JourneyRoute.totalMiles) * 100;
            const position = JourneyRoute.getPositionAtPercent(percent);

            const x = (position.x / 100) * this.imageWidth;
            const y = (position.y / 100) * this.imageHeight;

            group.style.transform = `translate(${x}px, ${y}px)`;
        });
    },

    /**
     * Update trail progress
     */
    updateTrail(walkers) {
        console.log('=== Updating Trail ===');

        if (!this.journeyPath || !this.pathLength) {
            console.log('Trail update skipped');
            return;
        }

        const maxMiles = Math.max(...walkers.map(w => w.miles || JourneyRoute.stepsToMiles(w.steps)));
        const maxPercent = (maxMiles / JourneyRoute.totalMiles) * 100;
        const traveledLength = (maxPercent / 100) * this.pathLength;

        console.log('Max miles:', maxMiles, 'Percent:', maxPercent.toFixed(1) + '%');

        this.journeyPath.style.strokeDashoffset = this.pathLength - traveledLength;

        // Update landmark reached status
        this.updateLandmarkStatus(maxMiles);
    },

    /**
     * Update all map elements
     */
    update(walkers) {
        if (this.walkersGroup.children.length === 0) {
            this.createWalkerIcons(walkers);
        }

        this.updateWalkerPositions(walkers);
        this.updateTrail(walkers);
    }
};
