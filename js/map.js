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
    tooltip: null,

    // Track if full image is loaded
    fullImageLoaded: false,

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

        // Create tooltip element
        this.createTooltip();

        // Set up with placeholder first, then lazy load full image
        const fullSrc = this.mapImage.dataset.src;

        // Wait for placeholder to load first
        if (this.mapImage.complete && this.mapImage.naturalWidth > 0) {
            this.setupMapWithPlaceholder(fullSrc);
        } else {
            this.mapImage.addEventListener('load', () => this.setupMapWithPlaceholder(fullSrc));
            this.mapImage.addEventListener('error', () => this.setupMapWithPlaceholder(fullSrc));
        }
    },

    /**
     * Set up map with placeholder, then load full image
     */
    setupMapWithPlaceholder(fullSrc) {
        // Use known dimensions for the full image to set up the map correctly
        // This ensures path/landmarks are positioned correctly even before full image loads
        this.imageWidth = 7680;
        this.imageHeight = 4386;

        // Set up SVG with full image dimensions
        this.svg.setAttribute('viewBox', `0 0 ${this.imageWidth} ${this.imageHeight}`);
        this.svg.setAttribute('width', this.imageWidth);
        this.svg.setAttribute('height', this.imageHeight);

        // Draw path and landmarks immediately
        this.drawJourneyPath();
        this.drawLandmarks();
        this.setupControls();

        // Center on journey
        setTimeout(() => this.centerOnJourney(), 100);

        // Now lazy load the full resolution image
        if (fullSrc) {
            this.lazyLoadFullImage(fullSrc);
        }
    },

    /**
     * Lazy load the full resolution image
     */
    lazyLoadFullImage(src) {
        const fullImage = new Image();

        fullImage.onload = () => {
            this.mapImage.src = src;
            this.fullImageLoaded = true;
            this.mapImage.classList.add('loaded');
        };

        fullImage.src = src;
    },

    /**
     * Create the tooltip element
     */
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'landmark-tooltip';
        this.tooltip.innerHTML = `
            <div class="landmark-tooltip-name"></div>
            <div class="landmark-tooltip-desc"></div>
            <div class="landmark-tooltip-miles"></div>
        `;
        document.body.appendChild(this.tooltip);
    },

    /**
     * Show tooltip for a landmark
     */
    showTooltip(waypoint, event) {
        const nameEl = this.tooltip.querySelector('.landmark-tooltip-name');
        const descEl = this.tooltip.querySelector('.landmark-tooltip-desc');
        const milesEl = this.tooltip.querySelector('.landmark-tooltip-miles');

        nameEl.textContent = waypoint.name;
        descEl.textContent = waypoint.description;
        milesEl.textContent = `Mile ${waypoint.miles} of ${JourneyRoute.totalMiles}`;

        // Position tooltip near cursor
        const x = event.clientX + 15;
        const y = event.clientY + 15;

        // Keep tooltip on screen
        const rect = this.tooltip.getBoundingClientRect();
        const maxX = window.innerWidth - 300;
        const maxY = window.innerHeight - 150;

        this.tooltip.style.left = Math.min(x, maxX) + 'px';
        this.tooltip.style.top = Math.min(y, maxY) + 'px';

        this.tooltip.classList.add('visible');
    },

    /**
     * Hide tooltip
     */
    hideTooltip() {
        this.tooltip.classList.remove('visible');
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

        // Touch support with pinch zoom
        let lastTouchDistance = 0;
        let touchCenterX = 0;
        let touchCenterY = 0;

        this.viewport.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.dragStartX = e.touches[0].clientX;
                this.dragStartY = e.touches[0].clientY;
                this.lastPanX = this.panX;
                this.lastPanY = this.panY;
            } else if (e.touches.length === 2) {
                // Prevent default browser zoom
                e.preventDefault();
                this.isDragging = false;
                lastTouchDistance = this.getTouchDistance(e.touches);

                // Calculate center point between two touches
                const rect = this.viewport.getBoundingClientRect();
                touchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
                touchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
            }
        }, { passive: false });

        this.viewport.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && this.isDragging) {
                e.preventDefault();
                const dx = e.touches[0].clientX - this.dragStartX;
                const dy = e.touches[0].clientY - this.dragStartY;
                this.panX = this.lastPanX + dx;
                this.panY = this.lastPanY + dy;
                this.applyTransform();
            } else if (e.touches.length === 2) {
                e.preventDefault();
                const distance = this.getTouchDistance(e.touches);
                const delta = distance / lastTouchDistance;

                // Zoom at the center point between touches
                this.zoomAt(touchCenterX, touchCenterY, delta);

                lastTouchDistance = distance;

                // Update center point for smooth zooming
                const rect = this.viewport.getBoundingClientRect();
                touchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
                touchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
            }
        }, { passive: false });

        this.viewport.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                this.isDragging = false;
            } else if (e.touches.length === 1) {
                // Switching from pinch to pan
                this.isDragging = true;
                this.dragStartX = e.touches[0].clientX;
                this.dragStartY = e.touches[0].clientY;
                this.lastPanX = this.panX;
                this.lastPanY = this.panY;
            }
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
     * Center on the walker's current position
     */
    centerOnWalker(miles) {
        const rect = this.viewport.getBoundingClientRect();
        const isMobile = rect.width < 768;

        // Get walker's position along the path
        const percent = (miles / JourneyRoute.totalMiles) * 100;
        const position = JourneyRoute.getPositionAtPercent(percent);

        const x = (position.x / 100) * this.imageWidth;
        const y = (position.y / 100) * this.imageHeight;

        // Zoom level - balanced for viewing context
        const zoomMultiplier = isMobile ? 0.5 : 0.8;
        this.zoom = zoomMultiplier;

        // Center on walker position
        this.panX = rect.width / 2 - x * this.zoom;
        this.panY = rect.height / 2 - y * this.zoom;

        this.applyTransform();
    },

    /**
     * Center on the journey path with a nice zoom level
     */
    centerOnJourney() {
        const rect = this.viewport.getBoundingClientRect();
        const isMobile = rect.width < 768;

        // Calculate bounding box of journey waypoints
        const waypoints = JourneyRoute.waypoints;
        let minX = 100, maxX = 0, minY = 100, maxY = 0;

        waypoints.forEach(wp => {
            minX = Math.min(minX, wp.x);
            maxX = Math.max(maxX, wp.x);
            minY = Math.min(minY, wp.y);
            maxY = Math.max(maxY, wp.y);
        });

        // Add padding - less on mobile to zoom in more
        const padding = isMobile ? 2 : 3;
        minX = Math.max(0, minX - padding);
        maxX = Math.min(100, maxX + padding);
        minY = Math.max(0, minY - padding);
        maxY = Math.min(100, maxY + padding);

        // Convert to pixels
        const boxX = (minX / 100) * this.imageWidth;
        const boxY = (minY / 100) * this.imageHeight;
        const boxWidth = ((maxX - minX) / 100) * this.imageWidth;
        const boxHeight = ((maxY - minY) / 100) * this.imageHeight;

        // Calculate zoom to fit journey path
        const scaleX = rect.width / boxWidth;
        const scaleY = rect.height / boxHeight;
        const zoomMultiplier = isMobile ? 0.8 : 1.0;
        this.zoom = Math.min(scaleX, scaleY) * zoomMultiplier;

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
            group.setAttribute('data-index', index);

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

            group.appendChild(glowRing);
            group.appendChild(circle);
            group.appendChild(innerCircle);

            // Add hover events for tooltip
            group.addEventListener('mouseenter', (e) => {
                this.showTooltip(waypoint, e);
            });

            group.addEventListener('mousemove', (e) => {
                this.showTooltip(waypoint, e);
            });

            group.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });

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

            // Hobbit PNG image
            const iconSize = 50;
            const hobbit = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            hobbit.setAttribute('href', 'assets/hobbit.png');
            hobbit.setAttribute('width', iconSize);
            hobbit.setAttribute('height', iconSize);
            hobbit.setAttribute('x', -iconSize / 2);
            hobbit.setAttribute('y', -iconSize);
            hobbit.setAttribute('class', `walker-icon walker-${index + 1}`);
            hobbit.setAttribute('preserveAspectRatio', 'xMidYMid meet');

            group.appendChild(hobbit);
            this.walkersGroup.appendChild(group);
        });
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
     * Calculate the path length up to a given mile marker
     * This accounts for the curved path between waypoints
     */
    getPathLengthAtMiles(miles) {
        const waypoints = JourneyRoute.waypoints;

        // Find which segment we're in
        let prevWaypoint = waypoints[0];
        let nextWaypoint = waypoints[1];
        let segmentIndex = 0;

        for (let i = 0; i < waypoints.length - 1; i++) {
            if (miles >= waypoints[i].miles && miles < waypoints[i + 1].miles) {
                prevWaypoint = waypoints[i];
                nextWaypoint = waypoints[i + 1];
                segmentIndex = i;
                break;
            }
            if (miles >= waypoints[waypoints.length - 1].miles) {
                // Past the last waypoint
                return this.pathLength;
            }
        }

        // Calculate what fraction of this segment has been traveled
        const segmentMiles = nextWaypoint.miles - prevWaypoint.miles;
        const milesIntoSegment = miles - prevWaypoint.miles;
        const segmentProgress = milesIntoSegment / segmentMiles;

        // Calculate path length for complete segments
        // Each segment is roughly equal in the SVG path
        const segmentCount = waypoints.length - 1;
        const avgSegmentLength = this.pathLength / segmentCount;

        const completedSegmentsLength = segmentIndex * avgSegmentLength;
        const currentSegmentLength = segmentProgress * avgSegmentLength;

        return completedSegmentsLength + currentSegmentLength;
    },

    /**
     * Update trail progress
     */
    updateTrail(walkers) {
        if (!this.journeyPath || !this.pathLength) return;

        const maxMiles = Math.max(...walkers.map(w => w.miles || JourneyRoute.stepsToMiles(w.steps)));
        const traveledLength = this.getPathLengthAtMiles(maxMiles);

        this.journeyPath.style.strokeDashoffset = this.pathLength - traveledLength;

        // Update landmark reached status
        this.updateLandmarkStatus(maxMiles);
    },

    // Track if this is the first update (for initial centering)
    hasInitialCentered: false,

    /**
     * Update all map elements
     */
    update(walkers) {
        if (this.walkersGroup.children.length === 0) {
            this.createWalkerIcons(walkers);
        }

        this.updateWalkerPositions(walkers);
        this.updateTrail(walkers);

        // Center on walker position on first load
        if (!this.hasInitialCentered && walkers.length > 0) {
            const maxMiles = Math.max(...walkers.map(w => w.miles || 0));
            if (maxMiles > 0) {
                this.centerOnWalker(maxMiles);
                this.hasInitialCentered = true;
            }
        }
    }
};
