/**
 * 3D Map Rendering Module using Three.js
 * Isometric-style flat map with billboard POI sprites
 */

const Map3D = {
    // Three.js core
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    raycaster: null,
    mouse: null,

    // Map objects
    mapPlane: null,
    pathLine: null,
    poiObjects: [],
    walkerObjects: [],

    // Loaded textures cache
    textureCache: {},
    textureLoader: null,

    // Weather systems
    rainParticles: null,
    snowParticles: null,
    lightningLight: null,
    currentWeather: 'clear',

    // Map dimensions
    mapWidth: 2000,
    mapHeight: 1142,

    // Animation
    animationId: null,

    // Tooltip element
    tooltip: null,

    // Current walker position for camera
    currentWalkerPosition: null,

    // Keyboard state for smooth movement
    keys: {
        forward: false,
        backward: false,
        left: false,
        right: false,
        zoomIn: false,
        zoomOut: false
    },
    moveSpeed: 5,
    zoomSpeed: 8,

    // Walker sprite images
    walkerImages: {
        'joely': 'assets/pois/hobbit-walker_joely-removebg-preview.png',
        'kylie': 'assets/pois/hobbit_walker-removebg-preview.png',
        '_default': null // Will use colored circle fallback
    },

    // POI image configuration
    poiImages: {
        'Mount Doom': 'assets/pois/mtdoom-removebg-preview.png',
        'Minas Tirith': 'assets/pois/ministirith-removebg-preview.png',
        'Minas Morgul': 'assets/pois/minasmorgul-removebg-preview.png',
        'Rivendell': 'assets/pois/rivendell-removebg-preview.png',
        'Lothlórien': 'assets/pois/Lothlorien-removebg-preview.png',
        'Hobbiton': 'assets/pois/Hobbiton-removebg-preview.png',
        'Black Gate': 'assets/pois/blackgate-removebg-preview.png',
        'Helm\'s Deep': 'assets/pois/helms_deep-removebg-preview.png',
        'Edoras': 'assets/pois/edoras-removebg-preview.png',
        'Isengard': 'assets/pois/isengard.png',
        'Fangorn Forest': 'assets/pois/fanghornforest-removebg-preview.png',
        'Dead Marshes': 'assets/pois/deadmarshes-removebg-preview.png',
        'Weathertop': 'assets/pois/weathertop-removebg-preview.png',
        'Argonath': 'assets/pois/argnoath-removebg-preview.png',
        'Cirith Ungol': 'assets/pois/Cirith_Ungol-removebg-preview.png',
        'Barad-dûr': 'assets/pois/barad-dur.png',
        '_mountain': 'assets/pois/mountain.png',
        '_city': 'assets/pois/city.png',
        '_forest': 'assets/pois/forest.png',
        '_water': 'assets/pois/water.png',
        '_waypoint': 'assets/pois/waypoint.png',
        '_default': 'assets/pois/default.png'
    },

    // Small billboard sizes
    poiSizes: {
        'Mount Doom': { w: 30, h: 40 },
        'Minas Tirith': { w: 30, h: 40 },
        'Minas Morgul': { w: 28, h: 34 },
        'Rivendell': { w: 28, h: 30 },
        'Lothlórien': { w: 28, h: 30 },
        'Hobbiton': { w: 24, h: 24 },
        'Black Gate': { w: 30, h: 28 },
        'Helm\'s Deep': { w: 30, h: 30 },
        'Edoras': { w: 28, h: 30 },
        'Fangorn Forest': { w: 28, h: 30 },
        'Dead Marshes': { w: 24, h: 22 },
        'Weathertop': { w: 24, h: 28 },
        'Argonath': { w: 30, h: 40 },
        'Cirith Ungol': { w: 24, h: 30 },
        'Barad-dûr': { w: 22, h: 50 },
        '_mountain': { w: 24, h: 28 },
        '_city': { w: 22, h: 24 },
        '_forest': { w: 22, h: 22 },
        '_water': { w: 18, h: 16 },
        '_waypoint': { w: 12, h: 12 },
        '_default': { w: 16, h: 16 }
    },

    // POI Lore for tooltips - what happened to Frodo & Sam here
    poiLore: {
        'Hobbiton': 'Where Frodo inherited Bag End from Bilbo and began his journey with the One Ring. Sam joined as his loyal companion.',
        'Bree': 'At the Prancing Pony inn, the hobbits met Strider (Aragorn) who became their guide. Frodo accidentally put on the Ring here.',
        'Weathertop': 'The Witch-king stabbed Frodo with a Morgul blade. Sam bravely defended his wounded master with a burning brand.',
        'Rivendell': 'Frodo recovered from his wound and the Council of Elrond formed the Fellowship. Frodo volunteered to carry the Ring to Mordor.',
        'Hollin Ridge': 'The Fellowship rested here before attempting the Redhorn Pass. Crebain spies forced them toward Moria.',
        'West Gate of Moria': 'Gandalf spoke "Mellon" to open the doors. The Watcher in the Water attacked, and they fled into darkness.',
        'Exit of Moria': 'After Gandalf fell fighting the Balrog, the Fellowship emerged grief-stricken. Sam comforted a devastated Frodo.',
        'Lothlórien': 'Lady Galadriel showed Frodo visions in her mirror. She gave him the Phial of Galadriel - "a light in dark places."',
        'Argonath': 'The Fellowship passed between the towering statues of Isildur and Anárion. The end of their united journey approached.',
        'Dead Marshes': 'Gollum led Frodo and Sam through the haunted swamp. Frodo nearly fell to the ghostly lights of fallen warriors.',
        'Black Gate': 'Frodo and Sam saw the impossible strength of Mordor\'s entrance. Gollum convinced them to take the secret path.',
        'Morgul Road': 'They witnessed the Witch-king lead his army to war. The Ring pulled toward Minas Morgul, but Sam kept Frodo moving.',
        'Cirith Ungol': 'Gollum led them to Shelob\'s lair. Sam fought the giant spider and believed Frodo dead, taking the Ring briefly.',
        'Mount Doom': 'At the Crack of Doom, Frodo claimed the Ring. Gollum bit off his finger and fell into the fire, destroying the Ring forever.',
        'Minas Tirith': 'The White City of Gondor where Gandalf brought Pippin. Later the armies gathered here before the final battle.',
        'Minas Morgul': 'The Tower of Black Sorcery, once Minas Ithil. Home of the Nazgûl, its green glow filled Frodo with dread.',
        'Helm\'s Deep': 'The fortress where Rohan made their stand against Saruman\'s army of 10,000 Uruk-hai.',
        'Edoras': 'Golden hall of Meduseld where Gandalf freed King Théoden from Saruman\'s influence.',
        'Fangorn Forest': 'Ancient forest of the Ents. Merry and Pippin met Treebeard here, leading to the march on Isengard.',
        'Emyn Muil': 'The maze of sharp rocks where Frodo and Sam captured Gollum and made him swear to guide them.',
    },

    // Detailed POI information for info panels
    poiDetailedInfo: {
        'Hobbiton': {
            region: 'The Shire',
            funFact: 'Bag End was built into the Hill by Bungo Baggins for his wife Belladonna Took, and later inherited by Bilbo and then Frodo.'
        },
        'Bree': {
            region: 'Bree-land',
            funFact: 'Bree is one of the few places where Hobbits and Men live together. The Prancing Pony has been run by the Butterbur family for generations.'
        },
        'Weathertop': {
            region: 'Arnor (ruins)',
            funFact: 'Originally called Amon Sûl, it held the chief Palantír of the North Kingdom. The tower was destroyed in 1409 of the Third Age.'
        },
        'Rivendell': {
            region: 'Eastern Eriador',
            funFact: 'Founded by Elrond in 1697 of the Second Age, Rivendell remained hidden and protected for over 6,000 years.'
        },
        'Lothlórien': {
            region: 'East of the Misty Mountains',
            funFact: 'The mallorn trees of Lothlórien were a gift from the Elves of Tol Eressëa. They only grow in this forest in Middle-earth.'
        },
        'Minas Tirith': {
            region: 'Gondor',
            funFact: 'The White City has seven levels, each wall higher than the one below. The Tower of Ecthelion rises 300 feet above the citadel.'
        },
        'Mount Doom': {
            region: 'Mordor',
            funFact: 'Sauron chose this mountain specifically because its fires were hot enough to forge the One Ring - and the only fires that could unmake it.'
        },
        'Helm\'s Deep': {
            region: 'Rohan',
            funFact: 'Named after Helm Hammerhand, a King of Rohan who took refuge here during the Long Winter and became a figure of legend.'
        },
        'Edoras': {
            region: 'Rohan',
            funFact: 'Meduseld, the Golden Hall, is so named because its roof is thatched with gold. It can be seen glittering from miles away.'
        },
        'Black Gate': {
            region: 'Mordor',
            funFact: 'The Morannon was built by Sauron in the Second Age. Its iron gates are 60 feet high and guarded by the Towers of the Teeth.'
        },
        'Dead Marshes': {
            region: 'Between Emyn Muil and Mordor',
            funFact: 'The marshes expanded to cover the graves of those who fell in the Battle of Dagorlad at the end of the Second Age.'
        },
        'Cirith Ungol': {
            region: 'Ephel Dúath (Mountains of Shadow)',
            funFact: 'Shelob is the last child of Ungoliant, the primordial spider who helped Morgoth destroy the Two Trees of Valinor.'
        },
        'Fangorn Forest': {
            region: 'Beneath the southern Misty Mountains',
            funFact: 'Treebeard is the oldest living thing in Middle-earth, having walked the forests before even the Elves awoke.'
        },
        'Argonath': {
            region: 'Northern Gondor',
            funFact: 'The statues of Isildur and Anárion are carved from the cliffs themselves and stand over 400 feet tall.'
        },
        'Minas Morgul': {
            region: 'Mordor',
            funFact: 'Once called Minas Ithil (Tower of the Moon), it was captured by the Nazgûl in 2002 of the Third Age.'
        }
    },

    /**
     * Initialize the 3D map
     */
    async init(initialWalkerData) {
        const container = document.getElementById('map3dContainer');
        if (!container) {
            console.error('3D map container not found');
            return;
        }

        this.textureLoader = new THREE.TextureLoader();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.setupScene();
        this.setupCamera(container);
        this.setupRenderer(container);
        this.setupControls();
        this.setupLights();
        this.createTooltip(container);

        await this.createMapPlane();
        this.createJourneyPath();
        await this.createPOIs();
        this.setupWeatherSystems();

        // Position camera near walker if data provided
        if (initialWalkerData && initialWalkerData.length > 0) {
            this.focusOnWalker(initialWalkerData[0]);
        }

        this.setupEventListeners(container);
        this.animate();

        window.addEventListener('resize', () => this.onWindowResize());
    },

    /**
     * Create tooltip element
     */
    createTooltip(container) {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'map3d-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            background: rgba(20, 15, 10, 0.95);
            border: 2px solid #c9a227;
            border-radius: 8px;
            padding: 12px 16px;
            color: #f4e4bc;
            font-family: 'Segoe UI', sans-serif;
            font-size: 13px;
            max-width: 300px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 1000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        `;
        container.appendChild(this.tooltip);

        // Create info panel for clicks
        this.infoPanel = document.createElement('div');
        this.infoPanel.className = 'map3d-info-panel';
        this.infoPanel.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(145deg, rgba(30, 25, 18, 0.98), rgba(20, 15, 10, 0.98));
            border: 3px solid #d4af37;
            border-radius: 12px;
            padding: 0;
            color: #f4e4bc;
            font-family: 'Crimson Text', Georgia, serif;
            max-width: 420px;
            min-width: 320px;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s, visibility 0.3s;
            z-index: 2000;
            box-shadow: 0 8px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,215,0,0.1);
            overflow: hidden;
        `;
        container.appendChild(this.infoPanel);

        // Close panel when clicking outside
        container.addEventListener('click', (e) => {
            if (!this.infoPanel.contains(e.target) && this.infoPanel.style.opacity === '1') {
                // Don't close immediately if we just opened it
                if (!this._justOpened) {
                    this.closeInfoPanel();
                }
            }
            this._justOpened = false;
        });
    },

    /**
     * Show info panel for POI
     */
    showPoiInfoPanel(name) {
        const waypoint = JourneyRoute.waypoints.find(w => w.name === name);
        const lore = this.poiLore[name] || 'A mysterious location along the journey.';
        const detailedInfo = this.poiDetailedInfo[name] || {};

        const miles = waypoint ? waypoint.miles : '???';
        const description = waypoint ? waypoint.description : detailedInfo.description || '';

        this.infoPanel.innerHTML = `
            <div style="background: linear-gradient(90deg, #d4af37, #b8962e, #d4af37); padding: 16px 20px; border-bottom: 1px solid #8b7355;">
                <h2 style="margin: 0; color: #1a1209; font-family: 'Cinzel', serif; font-size: 24px; text-shadow: 1px 1px 0 rgba(255,255,255,0.3);">${name}</h2>
            </div>
            <div style="padding: 20px;">
                <div style="display: flex; gap: 20px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(212,175,55,0.3);">
                    <div style="text-align: center;">
                        <div style="font-size: 28px; color: #ffd700; font-weight: bold;">${miles}</div>
                        <div style="font-size: 12px; color: #999; text-transform: uppercase;">Miles from Shire</div>
                    </div>
                    ${detailedInfo.region ? `
                    <div style="text-align: center;">
                        <div style="font-size: 16px; color: #c9a227;">${detailedInfo.region}</div>
                        <div style="font-size: 12px; color: #999; text-transform: uppercase;">Region</div>
                    </div>
                    ` : ''}
                </div>
                <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; font-style: italic; color: #ccc;">"${description}"</p>
                <div style="background: rgba(0,0,0,0.3); padding: 14px; border-radius: 8px; border-left: 3px solid #d4af37;">
                    <h4 style="margin: 0 0 8px 0; color: #ffd700; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">The Story</h4>
                    <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #e8dcc8;">${lore}</p>
                </div>
                ${detailedInfo.funFact ? `
                <div style="margin-top: 14px; padding: 12px; background: rgba(212,175,55,0.1); border-radius: 6px;">
                    <span style="color: #d4af37; font-weight: bold;">Did you know?</span>
                    <span style="color: #ccc;"> ${detailedInfo.funFact}</span>
                </div>
                ` : ''}
            </div>
            <button onclick="Map3D.closeInfoPanel()" style="
                position: absolute;
                top: 12px;
                right: 12px;
                background: rgba(0,0,0,0.5);
                border: 1px solid #666;
                color: #ccc;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            " onmouseover="this.style.background='rgba(200,50,50,0.8)';this.style.color='#fff';" onmouseout="this.style.background='rgba(0,0,0,0.5)';this.style.color='#ccc';">✕</button>
        `;

        this.infoPanel.style.opacity = '1';
        this.infoPanel.style.visibility = 'visible';
        this._justOpened = true;
    },

    /**
     * Show info panel for walker
     */
    showWalkerInfoPanel(walkerData) {
        const progressPercent = walkerData.percent.toFixed(1);
        const currentLocation = walkerData.currentLocation;
        const nextLocation = walkerData.nextLocation;
        const milesRemaining = (JourneyRoute.totalMiles - walkerData.miles).toFixed(1);
        const color = walkerData.name === 'Joely' ? '#7dffb3' : '#ff7eb3';
        const borderColor = walkerData.name === 'Joely' ? '#00cc66' : '#cc3366';

        this.infoPanel.innerHTML = `
            <div style="background: linear-gradient(90deg, ${borderColor}, ${color}, ${borderColor}); padding: 16px 20px; border-bottom: 1px solid #8b7355;">
                <h2 style="margin: 0; color: #1a1209; font-family: 'Cinzel', serif; font-size: 24px; text-shadow: 1px 1px 0 rgba(255,255,255,0.3);">${walkerData.name}</h2>
                <div style="font-size: 12px; color: #333; margin-top: 4px;">Fellowship Member</div>
            </div>
            <div style="padding: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                    <div style="text-align: center; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px;">
                        <div style="font-size: 32px; color: ${color}; font-weight: bold;">${walkerData.steps.toLocaleString()}</div>
                        <div style="font-size: 12px; color: #999; text-transform: uppercase;">Total Steps</div>
                    </div>
                    <div style="text-align: center; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px;">
                        <div style="font-size: 32px; color: ${color}; font-weight: bold;">${walkerData.miles.toFixed(1)}</div>
                        <div style="font-size: 12px; color: #999; text-transform: uppercase;">Miles Walked</div>
                    </div>
                </div>

                <div style="background: rgba(0,0,0,0.2); border-radius: 8px; padding: 4px; margin-bottom: 16px;">
                    <div style="background: linear-gradient(90deg, ${borderColor}, ${color}); height: 24px; border-radius: 6px; width: ${progressPercent}%; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; font-size: 12px; font-weight: bold; color: #1a1209;">${progressPercent}%</div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div style="padding: 12px; background: rgba(212,175,55,0.1); border-radius: 8px; border-left: 3px solid #d4af37;">
                        <div style="font-size: 11px; color: #999; text-transform: uppercase; margin-bottom: 4px;">Current Location</div>
                        <div style="font-size: 15px; color: #ffd700;">${currentLocation}</div>
                    </div>
                    <div style="padding: 12px; background: rgba(212,175,55,0.1); border-radius: 8px; border-left: 3px solid #d4af37;">
                        <div style="font-size: 11px; color: #999; text-transform: uppercase; margin-bottom: 4px;">Next Destination</div>
                        <div style="font-size: 15px; color: #ffd700;">${nextLocation}</div>
                    </div>
                </div>

                <div style="margin-top: 16px; text-align: center; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px;">
                    <span style="color: #999;">Only </span>
                    <span style="color: ${color}; font-size: 20px; font-weight: bold;">${milesRemaining}</span>
                    <span style="color: #999;"> miles to Mount Doom!</span>
                </div>
            </div>
            <button onclick="Map3D.closeInfoPanel()" style="
                position: absolute;
                top: 12px;
                right: 12px;
                background: rgba(0,0,0,0.5);
                border: 1px solid #666;
                color: #ccc;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            " onmouseover="this.style.background='rgba(200,50,50,0.8)';this.style.color='#fff';" onmouseout="this.style.background='rgba(0,0,0,0.5)';this.style.color='#ccc';">✕</button>
        `;

        this.infoPanel.style.opacity = '1';
        this.infoPanel.style.visibility = 'visible';
        this._justOpened = true;
    },

    /**
     * Close info panel
     */
    closeInfoPanel() {
        this.infoPanel.style.opacity = '0';
        this.infoPanel.style.visibility = 'hidden';
    },

    /**
     * Set up event listeners for interaction
     */
    setupEventListeners(container) {
        container.addEventListener('mousemove', (e) => this.onMouseMove(e, container));
        container.addEventListener('click', (e) => this.onMouseClick(e, container));

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Navigation button controls
        this.setupNavButtons();
    },

    /**
     * Set up navigation button click handlers
     */
    setupNavButtons() {
        // Jump to location buttons
        document.querySelectorAll('[data-location]').forEach(btn => {
            btn.addEventListener('click', () => {
                const location = btn.dataset.location;
                this.jumpToLocation(location);
            });
        });

        // D-pad movement buttons
        document.querySelectorAll('[data-dir]').forEach(btn => {
            btn.addEventListener('mousedown', () => {
                const dir = btn.dataset.dir;
                if (dir === 'up') this.keys.forward = true;
                if (dir === 'down') this.keys.backward = true;
                if (dir === 'left') this.keys.left = true;
                if (dir === 'right') this.keys.right = true;
            });
            btn.addEventListener('mouseup', () => {
                this.keys.forward = false;
                this.keys.backward = false;
                this.keys.left = false;
                this.keys.right = false;
            });
            btn.addEventListener('mouseleave', () => {
                this.keys.forward = false;
                this.keys.backward = false;
                this.keys.left = false;
                this.keys.right = false;
            });
        });

        // Zoom buttons
        document.querySelectorAll('[data-zoom]').forEach(btn => {
            btn.addEventListener('mousedown', () => {
                if (btn.dataset.zoom === 'in') this.keys.zoomIn = true;
                if (btn.dataset.zoom === 'out') this.keys.zoomOut = true;
            });
            btn.addEventListener('mouseup', () => {
                this.keys.zoomIn = false;
                this.keys.zoomOut = false;
            });
            btn.addEventListener('mouseleave', () => {
                this.keys.zoomIn = false;
                this.keys.zoomOut = false;
            });
        });

        // Reset view button
        const resetBtn = document.getElementById('resetView3D');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetView());
        }
    },

    /**
     * Handle keydown for movement
     */
    onKeyDown(e) {
        // Don't capture if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                this.keys.forward = true;
                e.preventDefault();
                break;
            case 's':
            case 'arrowdown':
                this.keys.backward = true;
                e.preventDefault();
                break;
            case 'a':
            case 'arrowleft':
                this.keys.left = true;
                e.preventDefault();
                break;
            case 'd':
            case 'arrowright':
                this.keys.right = true;
                e.preventDefault();
                break;
            case 'q':
            case '=':
            case '+':
                this.keys.zoomIn = true;
                e.preventDefault();
                break;
            case 'e':
            case '-':
                this.keys.zoomOut = true;
                e.preventDefault();
                break;
            case 'r':
                this.resetView();
                e.preventDefault();
                break;
            case 'h':
                this.jumpToLocation('hobbiton');
                e.preventDefault();
                break;
            case 'f':
                this.jumpToLocation('walker');
                e.preventDefault();
                break;
            case 'm':
                this.jumpToLocation('mountdoom');
                e.preventDefault();
                break;
        }
    },

    /**
     * Handle keyup for movement
     */
    onKeyUp(e) {
        switch (e.key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                this.keys.forward = false;
                break;
            case 's':
            case 'arrowdown':
                this.keys.backward = false;
                break;
            case 'a':
            case 'arrowleft':
                this.keys.left = false;
                break;
            case 'd':
            case 'arrowright':
                this.keys.right = false;
                break;
            case 'q':
            case '=':
            case '+':
                this.keys.zoomIn = false;
                break;
            case 'e':
            case '-':
                this.keys.zoomOut = false;
                break;
        }
    },

    /**
     * Process keyboard movement each frame
     */
    processKeyboardMovement() {
        if (!this.controls || !this.camera) return;

        const target = this.controls.target;
        const camera = this.camera;

        // Calculate distance-based speed scaling
        // When zoomed in (close), speed is lower; when zoomed out (far), speed is higher
        const distance = camera.position.distanceTo(target);
        const minDist = this.controls.minDistance || 150;
        const maxDist = this.controls.maxDistance || 2000;

        // Scale factor: 0.1 at min distance, 1.0 at max distance
        const scaleFactor = 0.1 + 0.9 * ((distance - minDist) / (maxDist - minDist));
        const currentMoveSpeed = this.moveSpeed * scaleFactor;
        const currentZoomSpeed = this.zoomSpeed * scaleFactor;

        // Get camera direction (ignoring Y)
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();

        // Get perpendicular direction for strafing
        const right = new THREE.Vector3();
        right.crossVectors(direction, new THREE.Vector3(0, 1, 0));

        // Apply movement
        if (this.keys.forward) {
            target.add(direction.clone().multiplyScalar(currentMoveSpeed));
            camera.position.add(direction.clone().multiplyScalar(currentMoveSpeed));
        }
        if (this.keys.backward) {
            target.sub(direction.clone().multiplyScalar(currentMoveSpeed));
            camera.position.sub(direction.clone().multiplyScalar(currentMoveSpeed));
        }
        if (this.keys.left) {
            target.sub(right.clone().multiplyScalar(currentMoveSpeed));
            camera.position.sub(right.clone().multiplyScalar(currentMoveSpeed));
        }
        if (this.keys.right) {
            target.add(right.clone().multiplyScalar(currentMoveSpeed));
            camera.position.add(right.clone().multiplyScalar(currentMoveSpeed));
        }

        // Apply zoom
        if (this.keys.zoomIn) {
            const zoomDir = new THREE.Vector3().subVectors(target, camera.position).normalize();
            camera.position.add(zoomDir.multiplyScalar(currentZoomSpeed));
        }
        if (this.keys.zoomOut) {
            const zoomDir = new THREE.Vector3().subVectors(target, camera.position).normalize();
            camera.position.sub(zoomDir.multiplyScalar(currentZoomSpeed));
        }
    },

    /**
     * Jump to a named location
     */
    jumpToLocation(location) {
        let targetX, targetZ;

        switch (location) {
            case 'hobbiton':
                const hobbiton = JourneyRoute.waypoints.find(w => w.name === 'Hobbiton');
                if (hobbiton) {
                    const pos = this.mapToWorld(hobbiton.x, hobbiton.y);
                    targetX = pos.x;
                    targetZ = pos.z;
                }
                break;
            case 'mountdoom':
                const doom = JourneyRoute.waypoints.find(w => w.name === 'Mount Doom');
                if (doom) {
                    const pos = this.mapToWorld(doom.x, doom.y);
                    targetX = pos.x;
                    targetZ = pos.z;
                }
                break;
            case 'walker':
                if (this.currentWalkerPosition) {
                    targetX = this.currentWalkerPosition.x;
                    targetZ = this.currentWalkerPosition.z;
                }
                break;
            default:
                // Try to find by waypoint name
                const wp = JourneyRoute.waypoints.find(w => w.name.toLowerCase().includes(location.toLowerCase()));
                if (wp) {
                    const pos = this.mapToWorld(wp.x, wp.y);
                    targetX = pos.x;
                    targetZ = pos.z;
                }
        }

        if (targetX !== undefined && targetZ !== undefined) {
            // Navigation buttons use wider view, walker gets closer
            const closeUp = (location === 'walker');
            this.smoothFocusOn(targetX, targetZ, closeUp);
        }
    },

    /**
     * Reset camera to default overview position
     */
    resetView() {
        this.camera.position.set(0, 800, 600);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    },

    /**
     * Handle mouse move for tooltips
     */
    onMouseMove(event, container) {
        const rect = container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Check walkers first (they're on top)
        const walkerSprites = this.walkerObjects.filter(o => o.isSprite && o.userData.isWalker);
        const walkerIntersects = this.raycaster.intersectObjects(walkerSprites);

        if (walkerIntersects.length > 0) {
            const walker = walkerIntersects[0].object.userData;
            const color = walker.name === 'Joely' ? '#00ff88' : '#ff4488';

            this.tooltip.innerHTML = `
                <strong style="color: ${color}; font-size: 16px;">${walker.name}</strong>
                <div style="margin-top: 10px; line-height: 1.6;">
                    <div><span style="color: #999;">Steps:</span> <strong>${walker.steps.toLocaleString()}</strong></div>
                    <div><span style="color: #999;">Miles:</span> <strong>${walker.miles.toFixed(1)}</strong></div>
                    <div><span style="color: #999;">Progress:</span> <strong>${walker.percent.toFixed(1)}%</strong></div>
                    <div style="margin-top: 8px; border-top: 1px solid #444; padding-top: 8px;">
                        <div><span style="color: #999;">At:</span> ${walker.currentLocation}</div>
                        <div><span style="color: #999;">Next:</span> ${walker.nextLocation}</div>
                    </div>
                </div>
            `;
            this.tooltip.style.opacity = '1';
            this.tooltip.style.left = (event.clientX - rect.left + 15) + 'px';
            this.tooltip.style.top = (event.clientY - rect.top + 15) + 'px';

            this.keepTooltipInBounds(rect, event);
            return;
        }

        // Check POIs
        const intersects = this.raycaster.intersectObjects(this.poiObjects.filter(o => o.isSprite && !o.userData.isLabel));

        if (intersects.length > 0) {
            const poi = intersects[0].object;
            const name = poi.userData.name;
            const lore = this.poiLore[name] || `A location along the journey to Mount Doom.`;

            this.tooltip.innerHTML = `<strong style="color: #ffd700; font-size: 15px;">${name}</strong><br><br>${lore}`;
            this.tooltip.style.opacity = '1';
            this.tooltip.style.left = (event.clientX - rect.left + 15) + 'px';
            this.tooltip.style.top = (event.clientY - rect.top + 15) + 'px';

            this.keepTooltipInBounds(rect, event);
        } else {
            this.tooltip.style.opacity = '0';
        }
    },

    /**
     * Keep tooltip within container bounds
     */
    keepTooltipInBounds(rect, event) {
        const tooltipRect = this.tooltip.getBoundingClientRect();
        if (tooltipRect.right > rect.right) {
            this.tooltip.style.left = (event.clientX - rect.left - tooltipRect.width - 15) + 'px';
        }
        if (tooltipRect.bottom > rect.bottom) {
            this.tooltip.style.top = (event.clientY - rect.top - tooltipRect.height - 15) + 'px';
        }
    },

    /**
     * Handle click to focus on POI or walker and show info panel
     */
    onMouseClick(event, container) {
        // Don't process if clicking on info panel
        if (this.infoPanel && this.infoPanel.contains(event.target)) {
            return;
        }

        const rect = container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Check walkers first
        const walkerSprites = this.walkerObjects.filter(o => o.isSprite && o.userData.isWalker);
        const walkerIntersects = this.raycaster.intersectObjects(walkerSprites);

        if (walkerIntersects.length > 0) {
            const walker = walkerIntersects[0].object;
            this.smoothFocusOn(walker.position.x, walker.position.z, true);
            this.showWalkerInfoPanel(walker.userData);
            return;
        }

        // Check POIs (exclude labels)
        const poiSprites = this.poiObjects.filter(o => o.isSprite && !o.userData.isLabel);
        const intersects = this.raycaster.intersectObjects(poiSprites);

        if (intersects.length > 0) {
            const poi = intersects[0].object;
            const name = poi.userData.name;
            this.smoothFocusOn(poi.position.x, poi.position.z, true);
            this.showPoiInfoPanel(name);
        }
    },

    /**
     * Focus camera on a specific walker
     */
    focusOnWalker(walker) {
        const miles = walker.miles || JourneyRoute.stepsToMiles(walker.steps || 0);
        const percent = Math.min(miles / JourneyRoute.totalMiles, 1);
        const point = this.pathCurve.getPointAt(percent);

        this.currentWalkerPosition = point;

        // Position camera near walker with offset
        this.camera.position.set(point.x + 200, 400, point.z + 300);
        this.controls.target.set(point.x, 0, point.z);
        this.controls.update();
    },

    /**
     * Smoothly animate camera to focus on position
     */
    smoothFocusOn(x, z, closeUp = true) {
        // Close up view for POI clicks, further out for navigation
        const offsetX = closeUp ? 80 : 150;
        const offsetY = closeUp ? 180 : 300;
        const offsetZ = closeUp ? 120 : 200;

        const targetPos = { x: x + offsetX, y: offsetY, z: z + offsetZ };
        const startPos = {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z
        };
        const startTarget = this.controls.target.clone();
        const endTarget = new THREE.Vector3(x, 0, z);

        let progress = 0;
        const animate = () => {
            progress += 0.025;
            if (progress >= 1) {
                // Snap to final position
                this.camera.position.set(targetPos.x, targetPos.y, targetPos.z);
                this.controls.target.copy(endTarget);
                this.controls.update();
                return;
            }

            const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic

            this.camera.position.x = startPos.x + (targetPos.x - startPos.x) * eased;
            this.camera.position.y = startPos.y + (targetPos.y - startPos.y) * eased;
            this.camera.position.z = startPos.z + (targetPos.z - startPos.z) * eased;

            this.controls.target.lerpVectors(startTarget, endTarget, eased);

            requestAnimationFrame(animate);
        };
        animate();
    },

    /**
     * Set up the Three.js scene
     */
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1209);
    },

    /**
     * Set up camera
     */
    setupCamera(container) {
        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 10000);
        this.camera.position.set(0, 600, 500);
        this.camera.lookAt(0, 0, 0);
    },

    /**
     * Set up WebGL renderer
     */
    setupRenderer(container) {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
    },

    /**
     * Set up orbit controls with better navigation
     */
    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.minDistance = 150;
        this.controls.maxDistance = 2000;
        this.controls.minPolarAngle = 0.3;
        this.controls.maxPolarAngle = Math.PI / 2.2;
        this.controls.enablePan = true;
        this.controls.panSpeed = 1.2;
        this.controls.rotateSpeed = 0.8;
        this.controls.zoomSpeed = 1.5;

        // Smooth keyboard controls
        this.controls.keys = {
            LEFT: 'ArrowLeft',
            UP: 'ArrowUp',
            RIGHT: 'ArrowRight',
            BOTTOM: 'ArrowDown'
        };
        this.controls.keyPanSpeed = 25;
    },

    /**
     * Set up scene lighting
     */
    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffd7a0, 0.8);
        sunLight.position.set(500, 1000, 500);
        sunLight.castShadow = true;
        this.scene.add(sunLight);
        this.sunLight = sunLight;

        const fillLight = new THREE.DirectionalLight(0x4a6fa5, 0.3);
        fillLight.position.set(-500, 300, -500);
        this.scene.add(fillLight);

        // Lightning light (hidden by default)
        this.lightningLight = new THREE.PointLight(0xffffff, 0, 3000);
        this.lightningLight.position.set(0, 800, 0);
        this.scene.add(this.lightningLight);
    },

    /**
     * Create flat map plane with texture
     */
    async createMapPlane() {
        return new Promise((resolve) => {
            this.textureLoader.load('assets/map.webp', (texture) => {
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;

                const geometry = new THREE.PlaneGeometry(this.mapWidth, this.mapHeight);
                const material = new THREE.MeshStandardMaterial({
                    map: texture,
                    roughness: 0.9,
                    metalness: 0.1,
                    side: THREE.FrontSide
                });

                this.mapPlane = new THREE.Mesh(geometry, material);
                this.mapPlane.rotation.x = -Math.PI / 2;
                this.mapPlane.receiveShadow = true;
                this.scene.add(this.mapPlane);

                resolve();
            });
        });
    },

    /**
     * Convert map percentage coords to 3D world coords
     */
    mapToWorld(xPercent, yPercent) {
        const x = ((xPercent - 50) / 100) * this.mapWidth;
        const z = ((yPercent - 50) / 100) * this.mapHeight;
        return { x, z };
    },

    /**
     * Create the journey path
     */
    createJourneyPath() {
        const points = JourneyRoute.waypoints.map(wp => {
            const pos = this.mapToWorld(wp.x, wp.y);
            return new THREE.Vector3(pos.x, 3, pos.z);
        });

        const curve = new THREE.CatmullRomCurve3(points);

        const tubeGeometry = new THREE.TubeGeometry(curve, 200, 1.5, 8, false);
        const tubeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            emissive: 0xffa500,
            emissiveIntensity: 0.4,
            roughness: 0.3,
            metalness: 0.7
        });

        this.pathLine = new THREE.Mesh(tubeGeometry, tubeMaterial);
        this.scene.add(this.pathLine);

        this.pathCurve = curve;
    },

    /**
     * Load a texture with caching
     */
    loadTexture(url) {
        return new Promise((resolve) => {
            if (this.textureCache[url]) {
                resolve(this.textureCache[url]);
                return;
            }

            this.textureLoader.load(
                url,
                (texture) => {
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    this.textureCache[url] = texture;
                    resolve(texture);
                },
                undefined,
                () => resolve(null)
            );
        });
    },

    /**
     * Get the image URL for a POI
     */
    getPoiImageUrl(name, type) {
        if (this.poiImages[name]) return this.poiImages[name];
        if (this.poiImages['_' + type]) return this.poiImages['_' + type];
        return this.poiImages['_default'];
    },

    /**
     * Get the size for a POI billboard
     */
    getPoiSize(name, type) {
        if (this.poiSizes[name]) return this.poiSizes[name];
        if (this.poiSizes['_' + type]) return this.poiSizes['_' + type];
        return this.poiSizes['_default'];
    },

    /**
     * Create a text label sprite
     */
    createTextSprite(text, options = {}) {
        const {
            fontSize = 28,
            fontFamily = 'Arial, sans-serif',
            fontWeight = 'bold',
            color = '#ffffff',
            strokeColor = '#000000',
            strokeWidth = 5,
            padding = 10,
            backgroundColor = 'rgba(15, 12, 8, 0.92)',
            borderColor = '#d4af37',
            borderWidth = 2,
            maxWidth = 280,
            shadowColor = 'rgba(0,0,0,0.5)',
            shadowBlur = 8
        } = options;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set font to measure text
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        const metrics = ctx.measureText(text);
        const textWidth = Math.min(metrics.width, maxWidth);

        // Set canvas size with padding and shadow space
        const extraSpace = shadowBlur * 2;
        canvas.width = textWidth + padding * 2 + borderWidth * 2 + extraSpace;
        canvas.height = fontSize + padding * 2 + borderWidth * 2 + extraSpace;

        const offsetX = extraSpace / 2;
        const offsetY = extraSpace / 2;

        // Shadow
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Background with rounded corners
        ctx.fillStyle = backgroundColor;
        ctx.beginPath();
        ctx.roundRect(offsetX + borderWidth / 2, offsetY + borderWidth / 2,
                      canvas.width - extraSpace - borderWidth,
                      canvas.height - extraSpace - borderWidth, 8);
        ctx.fill();

        // Reset shadow for border
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.stroke();

        // Inner glow line
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(offsetX + borderWidth + 2, offsetY + borderWidth + 2,
                      canvas.width - extraSpace - borderWidth * 2 - 4,
                      canvas.height - extraSpace - borderWidth * 2 - 4, 6);
        ctx.stroke();

        // Text with stroke
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Text shadow
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        // Stroke for visibility
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.strokeText(text, centerX, centerY);

        // Fill
        ctx.fillStyle = color;
        ctx.fillText(text, centerX, centerY);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            depthWrite: false
        });

        const sprite = new THREE.Sprite(material);

        // Base scale - larger for better visibility
        const baseScaleX = canvas.width / 6;
        const baseScaleY = canvas.height / 6;
        sprite.scale.set(baseScaleX, baseScaleY, 1);

        // Store base scale for dynamic scaling
        sprite.userData.baseScaleX = baseScaleX;
        sprite.userData.baseScaleY = baseScaleY;
        sprite.userData.isLabel = true;

        return sprite;
    },

    /**
     * Create 3D POI billboards
     */
    async createPOIs() {
        for (const wp of JourneyRoute.waypoints) {
            await this.createBillboard(wp.x, wp.y, wp.name, 'waypoint');
        }

        if (JourneyRoute.landmarks) {
            for (const lm of JourneyRoute.landmarks) {
                await this.createBillboard(lm.x, lm.y, lm.name, lm.type);
            }
        }
    },

    /**
     * Create a billboard sprite for a POI
     */
    async createBillboard(xPercent, yPercent, name, type) {
        const pos = this.mapToWorld(xPercent, yPercent);
        const imageUrl = this.getPoiImageUrl(name, type);
        const size = this.getPoiSize(name, type);

        const texture = await this.loadTexture(imageUrl);

        let material;
        if (texture) {
            material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.1
            });
        } else {
            material = this.createFallbackMaterial(name, type);
        }

        const sprite = new THREE.Sprite(material);
        sprite.position.set(pos.x, size.h / 2 + 3, pos.z);
        sprite.scale.set(size.w, size.h, 1);
        sprite.userData = { name, type, baseY: size.h / 2 + 3 };

        this.poiObjects.push(sprite);
        this.scene.add(sprite);

        // Add text label above POI
        const label = this.createTextSprite(name, {
            fontSize: type === 'waypoint' ? 32 : 36,
            padding: 12,
            backgroundColor: 'rgba(20, 16, 10, 0.95)',
            borderColor: '#d4af37',
            color: '#ffeaa7',
            strokeWidth: 5,
            shadowBlur: 8
        });
        label.position.set(pos.x, size.h + 25, pos.z);
        label.userData.parentName = name;
        this.poiObjects.push(label);
        this.scene.add(label);

        this.addGroundMarker(pos.x, pos.z, name, type);
    },

    /**
     * Create fallback material
     */
    createFallbackMaterial(name, type) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        const colors = {
            mountain: '#5c5c5c',
            city: '#d4c4a8',
            forest: '#228b22',
            water: '#4169e1',
            waypoint: '#ffd700'
        };
        const color = colors[type] || '#888888';

        ctx.fillStyle = color;
        ctx.beginPath();
        if (type === 'mountain') {
            ctx.moveTo(64, 10);
            ctx.lineTo(118, 118);
            ctx.lineTo(10, 118);
            ctx.closePath();
        } else if (type === 'city') {
            ctx.fillRect(44, 40, 40, 78);
            ctx.fillRect(54, 20, 20, 30);
        } else if (type === 'forest') {
            ctx.moveTo(64, 10);
            ctx.lineTo(100, 70);
            ctx.lineTo(28, 70);
            ctx.closePath();
            ctx.fill();
            ctx.fillRect(54, 70, 20, 48);
        } else {
            ctx.arc(64, 64, 50, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        return new THREE.SpriteMaterial({ map: texture, transparent: true });
    },

    /**
     * Add a ground marker
     */
    addGroundMarker(x, z, name, type) {
        const colors = {
            mountain: 0x5c5c5c,
            city: 0xffd700,
            forest: 0x228b22,
            water: 0x4169e1,
            waypoint: 0xffd700
        };
        const color = colors[type] || 0xffd700;

        const ringGeometry = new THREE.RingGeometry(5, 8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 1, z);
        ring.userData = { name, type, isGroundMarker: true };
        this.poiObjects.push(ring);
        this.scene.add(ring);
    },

    /**
     * Set up weather particle systems
     */
    setupWeatherSystems() {
        this.setupRain();
        this.setupSnow();
    },

    /**
     * Create dramatic rain system
     */
    setupRain() {
        const particleCount = 8000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * this.mapWidth * 2;
            positions[i * 3 + 1] = Math.random() * 600;
            positions[i * 3 + 2] = (Math.random() - 0.5) * this.mapHeight * 2;
            velocities[i] = 8 + Math.random() * 8;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));

        const material = new THREE.PointsMaterial({
            color: 0x6699cc,
            size: 3,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });

        this.rainParticles = new THREE.Points(geometry, material);
        this.rainParticles.visible = false;
        this.scene.add(this.rainParticles);
    },

    /**
     * Create dramatic snow system
     */
    setupSnow() {
        const particleCount = 5000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount);
        const sizes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * this.mapWidth * 2;
            positions[i * 3 + 1] = Math.random() * 600;
            positions[i * 3 + 2] = (Math.random() - 0.5) * this.mapHeight * 2;
            velocities[i] = 1 + Math.random() * 2;
            sizes[i] = 3 + Math.random() * 4;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 5,
            transparent: true,
            opacity: 0.9,
            map: this.createSnowflakeTexture()
        });

        this.snowParticles = new THREE.Points(geometry, material);
        this.snowParticles.visible = false;
        this.scene.add(this.snowParticles);
    },

    /**
     * Create snowflake texture
     */
    createSnowflakeTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);

        return new THREE.CanvasTexture(canvas);
    },

    /**
     * Set weather condition with dramatic effects
     */
    setWeather(weather) {
        this.currentWeather = weather;

        if (this.rainParticles) this.rainParticles.visible = false;
        if (this.snowParticles) this.snowParticles.visible = false;
        this.scene.fog = null;
        this.lightningLight.intensity = 0;

        // Reset ambient light
        this.scene.children.forEach(child => {
            if (child.isAmbientLight) child.intensity = 0.7;
        });
        if (this.sunLight) this.sunLight.intensity = 0.8;

        switch (weather) {
            case 'rain':
                this.rainParticles.visible = true;
                this.scene.fog = new THREE.FogExp2(0x333344, 0.0012);
                this.scene.background = new THREE.Color(0x1a1a2a);
                this.scene.children.forEach(child => {
                    if (child.isAmbientLight) child.intensity = 0.4;
                });
                if (this.sunLight) this.sunLight.intensity = 0.3;
                break;
            case 'snow':
                this.snowParticles.visible = true;
                this.scene.fog = new THREE.FogExp2(0xddeeff, 0.0008);
                this.scene.background = new THREE.Color(0x8899aa);
                break;
            case 'fog':
                this.scene.fog = new THREE.FogExp2(0x7a8a8a, 0.0018);
                this.scene.background = new THREE.Color(0x5a6a6a);
                this.scene.children.forEach(child => {
                    if (child.isAmbientLight) child.intensity = 0.5;
                });
                break;
            default:
                this.scene.background = new THREE.Color(0x1a1209);
        }
    },

    /**
     * Trigger lightning flash
     */
    triggerLightning() {
        if (this.currentWeather !== 'rain') return;

        this.lightningLight.intensity = 3;
        setTimeout(() => { this.lightningLight.intensity = 0; }, 50);
        setTimeout(() => { this.lightningLight.intensity = 2; }, 100);
        setTimeout(() => { this.lightningLight.intensity = 0; }, 150);
        setTimeout(() => { this.lightningLight.intensity = 1.5; }, 200);
        setTimeout(() => { this.lightningLight.intensity = 0; }, 250);
    },

    /**
     * Update animations
     */
    updateAnimations() {
        const time = Date.now() * 0.001;

        // Calculate zoom-based label scale
        const distance = this.camera.position.distanceTo(this.controls.target);
        const minDist = this.controls.minDistance || 150;
        const maxDist = this.controls.maxDistance || 2000;
        // Labels scale: smaller when zoomed in, larger when zoomed out
        // Range from 0.4 (close) to 1.2 (far)
        const labelScale = 0.4 + 0.8 * ((distance - minDist) / (maxDist - minDist));

        // Animate POI sprites and scale labels
        this.poiObjects.forEach(obj => {
            if (obj.isSprite && obj.userData.baseY) {
                obj.position.y = obj.userData.baseY + Math.sin(time * 1.5 + obj.position.x * 0.01) * 1.5;
            }
            if (obj.userData.isGroundMarker) {
                obj.rotation.z += 0.003;
            }
            // Scale labels based on zoom
            if (obj.userData.isLabel && obj.userData.baseScaleX) {
                obj.scale.set(
                    obj.userData.baseScaleX * labelScale,
                    obj.userData.baseScaleY * labelScale,
                    1
                );
            }
        });

        // Scale walker labels
        this.walkerObjects.forEach(obj => {
            if (obj.userData && obj.userData.isLabel && obj.userData.baseScaleX) {
                obj.scale.set(
                    obj.userData.baseScaleX * labelScale,
                    obj.userData.baseScaleY * labelScale,
                    1
                );
            }
        });

        // Random lightning during rain
        if (this.currentWeather === 'rain' && Math.random() < 0.002) {
            this.triggerLightning();
        }

        this.updateParticles();
    },

    /**
     * Update particle systems
     */
    updateParticles() {
        // Rain with wind effect
        if (this.rainParticles && this.rainParticles.visible) {
            const positions = this.rainParticles.geometry.attributes.position.array;
            const velocities = this.rainParticles.geometry.attributes.velocity.array;
            const windX = Math.sin(Date.now() * 0.0005) * 2;

            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3 + 1] -= velocities[i];
                positions[i * 3] += windX * 0.5;

                if (positions[i * 3 + 1] < 0) {
                    positions[i * 3 + 1] = 600;
                    positions[i * 3] = (Math.random() - 0.5) * this.mapWidth * 2;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * this.mapHeight * 2;
                }
            }
            this.rainParticles.geometry.attributes.position.needsUpdate = true;
        }

        // Snow with swirling
        if (this.snowParticles && this.snowParticles.visible) {
            const positions = this.snowParticles.geometry.attributes.position.array;
            const velocities = this.snowParticles.geometry.attributes.velocity.array;
            const time = Date.now() * 0.001;

            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3 + 1] -= velocities[i];
                positions[i * 3] += Math.sin(time + i * 0.1) * 0.8;
                positions[i * 3 + 2] += Math.cos(time * 0.7 + i * 0.1) * 0.5;

                if (positions[i * 3 + 1] < 0) {
                    positions[i * 3 + 1] = 600;
                    positions[i * 3] = (Math.random() - 0.5) * this.mapWidth * 2;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * this.mapHeight * 2;
                }
            }
            this.snowParticles.geometry.attributes.position.needsUpdate = true;
        }
    },

    /**
     * Update walker positions with hobbit sprites
     */
    async update(walkers) {
        // Remove old walker objects
        this.walkerObjects.forEach(obj => this.scene.remove(obj));
        this.walkerObjects = [];

        for (let index = 0; index < walkers.length; index++) {
            const walker = walkers[index];
            const miles = walker.miles || JourneyRoute.stepsToMiles(walker.steps || 0);
            const percent = Math.min(miles / JourneyRoute.totalMiles, 1);
            const point = this.pathCurve.getPointAt(percent);

            // Store first walker position
            if (index === 0) {
                this.currentWalkerPosition = point;
            }

            const color = index === 0 ? 0x00ff88 : 0xff4488;
            const walkerName = walker.name ? walker.name.toLowerCase() : '_default';
            const imageUrl = this.walkerImages[walkerName] || this.walkerImages['_default'];

            let material;
            if (imageUrl) {
                const texture = await this.loadTexture(imageUrl);
                if (texture) {
                    material = new THREE.SpriteMaterial({
                        map: texture,
                        transparent: true
                    });
                }
            }

            if (!material) {
                // Fallback colored circle
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');

                const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
                gradient.addColorStop(0, index === 0 ? '#00ff88' : '#ff4488');
                gradient.addColorStop(0.5, index === 0 ? '#00cc66' : '#cc3366');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 64, 64);

                const texture = new THREE.CanvasTexture(canvas);
                material = new THREE.SpriteMaterial({ map: texture, transparent: true });
            }

            const sprite = new THREE.Sprite(material);
            sprite.position.copy(point);
            sprite.position.y = 25;
            sprite.scale.set(30, 30, 1);

            // Store walker data for tooltip
            const currentLocation = JourneyRoute.getCurrentWaypoint(miles);
            const nextLocation = JourneyRoute.getNextWaypoint(miles);
            sprite.userData = {
                isWalker: true,
                name: walker.name,
                miles: miles,
                steps: walker.steps,
                percent: percent * 100,
                currentLocation: currentLocation.name,
                nextLocation: nextLocation ? nextLocation.name : 'Mount Doom'
            };

            this.walkerObjects.push(sprite);
            this.scene.add(sprite);

            // Add name label above walker
            const labelColor = index === 0 ? '#7dffb3' : '#ff7eb3';
            const borderCol = index === 0 ? '#00cc66' : '#cc3366';
            const label = this.createTextSprite(walker.name, {
                fontSize: 38,
                color: labelColor,
                padding: 14,
                backgroundColor: 'rgba(10, 8, 5, 0.95)',
                borderColor: borderCol,
                borderWidth: 3,
                strokeWidth: 5,
                shadowBlur: 8
            });
            label.position.copy(point);
            label.position.y = 58;
            this.walkerObjects.push(label);
            this.scene.add(label);

            // Ground ring
            const ringGeometry = new THREE.RingGeometry(10, 14, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(point.x, 2, point.z);

            this.walkerObjects.push(ring);
            this.scene.add(ring);
        }
    },

    /**
     * Animation loop
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        this.processKeyboardMovement();
        this.controls.update();
        this.updateAnimations();
        this.renderer.render(this.scene, this.camera);
    },

    /**
     * Handle window resize
     */
    onWindowResize() {
        const container = document.getElementById('map3dContainer');
        if (!container) return;

        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    },

    /**
     * Clean up
     */
    dispose() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.renderer) this.renderer.dispose();
    }
};
