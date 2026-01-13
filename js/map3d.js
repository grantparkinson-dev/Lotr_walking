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
    currentWeather: 'clear',

    // Map dimensions
    mapWidth: 2000,
    mapHeight: 1142,

    // Animation
    animationId: null,

    // POI image configuration - maps POI names/types to image files
    // Place images in assets/pois/ folder
    poiImages: {
        // Specific locations (by name) - matched to actual filenames
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

        // Fallback by type
        '_mountain': 'assets/pois/mountain.png',
        '_city': 'assets/pois/city.png',
        '_forest': 'assets/pois/forest.png',
        '_water': 'assets/pois/water.png',
        '_waypoint': 'assets/pois/waypoint.png',
        '_default': 'assets/pois/default.png'
    },

    // Billboard sizes by type (width, height in world units)
    poiSizes: {
        'Mount Doom': { w: 80, h: 100 },
        'Minas Tirith': { w: 80, h: 100 },
        'Minas Morgul': { w: 70, h: 90 },
        'Rivendell': { w: 70, h: 80 },
        'Lothlórien': { w: 70, h: 80 },
        'Hobbiton': { w: 60, h: 60 },
        'Black Gate': { w: 80, h: 70 },
        'Helm\'s Deep': { w: 80, h: 80 },
        'Edoras': { w: 70, h: 80 },
        'Fangorn Forest': { w: 70, h: 80 },
        'Dead Marshes': { w: 60, h: 50 },
        'Weathertop': { w: 60, h: 70 },
        'Argonath': { w: 80, h: 100 },
        'Cirith Ungol': { w: 60, h: 80 },
        'Barad-dûr': { w: 50, h: 120 },
        '_mountain': { w: 60, h: 70 },
        '_city': { w: 50, h: 60 },
        '_forest': { w: 50, h: 50 },
        '_water': { w: 40, h: 30 },
        '_waypoint': { w: 25, h: 25 },
        '_default': { w: 40, h: 40 }
    },

    /**
     * Initialize the 3D map
     */
    async init() {
        const container = document.getElementById('map3dContainer');
        if (!container) {
            console.error('3D map container not found');
            return;
        }

        this.textureLoader = new THREE.TextureLoader();

        this.setupScene();
        this.setupCamera(container);
        this.setupRenderer(container);
        this.setupControls();
        this.setupLights();

        await this.createMapPlane();
        this.createJourneyPath();
        await this.createPOIs();
        this.setupWeatherSystems();

        this.animate();

        window.addEventListener('resize', () => this.onWindowResize());
    },

    /**
     * Set up the Three.js scene
     */
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1209);
    },

    /**
     * Set up camera for isometric-ish view
     */
    setupCamera(container) {
        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 10000);
        this.camera.position.set(0, 1200, 800);
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
     * Set up orbit controls - restricted to stay above map
     */
    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 400;
        this.controls.maxDistance = 2500;
        this.controls.minPolarAngle = 0.2;
        this.controls.maxPolarAngle = Math.PI / 2.5;
        this.controls.enablePan = true;
        this.controls.panSpeed = 0.8;
    },

    /**
     * Set up scene lighting
     */
    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffd7a0, 0.6);
        sunLight.position.set(500, 1000, 500);
        this.scene.add(sunLight);

        const fillLight = new THREE.DirectionalLight(0x4a6fa5, 0.3);
        fillLight.position.set(-500, 300, -500);
        this.scene.add(fillLight);
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
     * Create the journey path as a glowing line above the map
     */
    createJourneyPath() {
        const points = JourneyRoute.waypoints.map(wp => {
            const pos = this.mapToWorld(wp.x, wp.y);
            return new THREE.Vector3(pos.x, 3, pos.z);
        });

        const curve = new THREE.CatmullRomCurve3(points);

        const tubeGeometry = new THREE.TubeGeometry(curve, 200, 2, 8, false);
        const tubeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            emissive: 0xffa500,
            emissiveIntensity: 0.5,
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
                () => {
                    // On error, resolve with null
                    resolve(null);
                }
            );
        });
    },

    /**
     * Get the image URL for a POI
     */
    getPoiImageUrl(name, type) {
        // Check for specific name first
        if (this.poiImages[name]) {
            return this.poiImages[name];
        }
        // Fall back to type
        if (this.poiImages['_' + type]) {
            return this.poiImages['_' + type];
        }
        // Default fallback
        return this.poiImages['_default'];
    },

    /**
     * Get the size for a POI billboard
     */
    getPoiSize(name, type) {
        if (this.poiSizes[name]) {
            return this.poiSizes[name];
        }
        if (this.poiSizes['_' + type]) {
            return this.poiSizes['_' + type];
        }
        return this.poiSizes['_default'];
    },

    /**
     * Create 3D POI billboards
     */
    async createPOIs() {
        // Create waypoint markers
        for (const wp of JourneyRoute.waypoints) {
            await this.createBillboard(wp.x, wp.y, wp.name, 'waypoint');
        }

        // Create additional landmarks
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

        // Try to load the texture
        const texture = await this.loadTexture(imageUrl);

        let material;
        if (texture) {
            // Use loaded image
            material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.1
            });
        } else {
            // Fallback to colored placeholder
            material = this.createFallbackMaterial(name, type);
        }

        const sprite = new THREE.Sprite(material);
        sprite.position.set(pos.x, size.h / 2 + 5, pos.z);
        sprite.scale.set(size.w, size.h, 1);
        sprite.userData = { name, type, baseY: size.h / 2 + 5 };

        this.poiObjects.push(sprite);
        this.scene.add(sprite);

        // Add a subtle shadow/glow circle on the ground
        this.addGroundMarker(pos.x, pos.z, name, type);
    },

    /**
     * Create fallback material when image not found
     */
    createFallbackMaterial(name, type) {
        // Create a canvas-based fallback
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Background based on type
        const colors = {
            mountain: '#5c5c5c',
            city: '#d4c4a8',
            forest: '#228b22',
            water: '#4169e1',
            waypoint: '#ffd700'
        };
        const color = colors[type] || '#888888';

        // Draw a simple icon
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

        // Add border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        return new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
    },

    /**
     * Add a ground marker/shadow under the billboard
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

        // Glowing ring on the ground
        const ringGeometry = new THREE.RingGeometry(8, 12, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5,
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
     * Create rain particle system
     */
    setupRain() {
        const particleCount = 3000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * this.mapWidth * 1.5;
            positions[i * 3 + 1] = Math.random() * 500;
            positions[i * 3 + 2] = (Math.random() - 0.5) * this.mapHeight * 1.5;
            velocities[i] = 5 + Math.random() * 5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));

        const material = new THREE.PointsMaterial({
            color: 0x8eb8e5,
            size: 2,
            transparent: true,
            opacity: 0.6
        });

        this.rainParticles = new THREE.Points(geometry, material);
        this.rainParticles.visible = false;
        this.scene.add(this.rainParticles);
    },

    /**
     * Create snow particle system
     */
    setupSnow() {
        const particleCount = 2000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * this.mapWidth * 1.5;
            positions[i * 3 + 1] = Math.random() * 500;
            positions[i * 3 + 2] = (Math.random() - 0.5) * this.mapHeight * 1.5;
            velocities[i] = 1 + Math.random() * 2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 4,
            transparent: true,
            opacity: 0.8
        });

        this.snowParticles = new THREE.Points(geometry, material);
        this.snowParticles.visible = false;
        this.scene.add(this.snowParticles);
    },

    /**
     * Set weather condition
     */
    setWeather(weather) {
        this.currentWeather = weather;

        if (this.rainParticles) this.rainParticles.visible = false;
        if (this.snowParticles) this.snowParticles.visible = false;
        this.scene.fog = null;

        switch (weather) {
            case 'rain':
                this.rainParticles.visible = true;
                this.scene.fog = new THREE.FogExp2(0x555555, 0.0008);
                break;
            case 'snow':
                this.snowParticles.visible = true;
                this.scene.fog = new THREE.FogExp2(0xcccccc, 0.0005);
                break;
            case 'fog':
                this.scene.fog = new THREE.FogExp2(0x9fa8b0, 0.001);
                break;
        }
    },

    /**
     * Update animations
     */
    updateAnimations() {
        const time = Date.now() * 0.001;

        // Animate POI sprites - subtle hover
        this.poiObjects.forEach(obj => {
            if (obj.isSprite && obj.userData.baseY) {
                obj.position.y = obj.userData.baseY + Math.sin(time * 1.5 + obj.position.x) * 2;
            }
            // Rotate ground markers
            if (obj.userData.isGroundMarker) {
                obj.rotation.z += 0.005;
            }
        });

        this.updateParticles();
    },

    /**
     * Update particle systems
     */
    updateParticles() {
        // Rain
        if (this.rainParticles && this.rainParticles.visible) {
            const positions = this.rainParticles.geometry.attributes.position.array;
            const velocities = this.rainParticles.geometry.attributes.velocity.array;

            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3 + 1] -= velocities[i];

                if (positions[i * 3 + 1] < 0) {
                    positions[i * 3 + 1] = 500;
                    positions[i * 3] = (Math.random() - 0.5) * this.mapWidth * 1.5;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * this.mapHeight * 1.5;
                }
            }

            this.rainParticles.geometry.attributes.position.needsUpdate = true;
        }

        // Snow
        if (this.snowParticles && this.snowParticles.visible) {
            const positions = this.snowParticles.geometry.attributes.position.array;
            const velocities = this.snowParticles.geometry.attributes.velocity.array;
            const time = Date.now() * 0.001;

            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3 + 1] -= velocities[i];
                positions[i * 3] += Math.sin(time + i) * 0.3;

                if (positions[i * 3 + 1] < 0) {
                    positions[i * 3 + 1] = 500;
                    positions[i * 3] = (Math.random() - 0.5) * this.mapWidth * 1.5;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * this.mapHeight * 1.5;
                }
            }

            this.snowParticles.geometry.attributes.position.needsUpdate = true;
        }
    },

    /**
     * Update walker positions
     */
    update(walkers) {
        // Remove old walker objects
        this.walkerObjects.forEach(obj => this.scene.remove(obj));
        this.walkerObjects = [];

        walkers.forEach((walker, index) => {
            const miles = walker.miles || JourneyRoute.stepsToMiles(walker.steps);
            const percent = Math.min(miles / JourneyRoute.totalMiles, 1);

            const point = this.pathCurve.getPointAt(percent);

            // Create walker sprite
            const color = index === 0 ? 0x00ff88 : 0xff4488;

            // Try to load walker image, fall back to colored circle
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');

            // Glowing circle
            const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            gradient.addColorStop(0, index === 0 ? '#00ff88' : '#ff4488');
            gradient.addColorStop(0.5, index === 0 ? '#00cc66' : '#cc3366');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 64, 64);

            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true
            });

            const sprite = new THREE.Sprite(material);
            sprite.position.copy(point);
            sprite.position.y = 30;
            sprite.scale.set(40, 40, 1);

            this.walkerObjects.push(sprite);
            this.scene.add(sprite);

            // Ground ring
            const ringGeometry = new THREE.RingGeometry(12, 16, 32);
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
        });
    },

    /**
     * Animation loop
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

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
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
};
