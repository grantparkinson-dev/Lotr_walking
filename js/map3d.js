/**
 * 3D Map Rendering Module using Three.js
 * Handles 3D terrain, path drawing, walker positioning, and weather effects
 */

const Map3D = {
    // Three.js core
    scene: null,
    camera: null,
    renderer: null,
    controls: null,

    // Map objects
    terrain: null,
    pathLine: null,
    landmarks: [],
    walkers: [],

    // Weather systems
    rainParticles: null,
    snowParticles: null,
    fog: null,
    currentWeather: 'clear', // 'clear', 'rain', 'snow', 'fog'

    // Map dimensions (matching the original 2D map)
    mapWidth: 7680,
    mapHeight: 4386,
    terrainScale: 2, // Scale factor for 3D world

    // Animation
    animationId: null,

    /**
     * Initialize the 3D map
     */
    async init() {
        const container = document.getElementById('map3dContainer');
        if (!container) {
            console.error('3D map container not found');
            return;
        }

        // Set up Three.js scene
        this.setupScene(container);
        this.setupCamera(container);
        this.setupRenderer(container);
        this.setupControls();
        this.setupLights();

        // Create terrain with map texture
        await this.createTerrain();

        // Draw journey path
        this.createJourneyPath();

        // Create landmarks
        this.createLandmarks();

        // Set up weather systems
        this.setupWeatherSystems();

        // Start animation loop
        this.animate();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    },

    /**
     * Set up the Three.js scene
     */
    setupScene(container) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1209); // Dark parchment color
    },

    /**
     * Set up camera
     */
    setupCamera(container) {
        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 1, 10000);

        // Position camera above and angled down at the map
        this.camera.position.set(0, 1500, 1500);
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
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
    },

    /**
     * Set up orbit controls for camera
     */
    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 500;
        this.controls.maxDistance = 4000;
        this.controls.maxPolarAngle = Math.PI / 2.2; // Don't go below horizon
    },

    /**
     * Set up scene lighting
     */
    setupLights() {
        // Ambient light for base illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun) with shadows
        const directionalLight = new THREE.DirectionalLight(0xffd7a0, 0.8);
        directionalLight.position.set(1000, 2000, 1000);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -2000;
        directionalLight.shadow.camera.right = 2000;
        directionalLight.shadow.camera.top = 2000;
        directionalLight.shadow.camera.bottom = -2000;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 5000;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Atmospheric rim light
        const rimLight = new THREE.DirectionalLight(0x4a6fa5, 0.3);
        rimLight.position.set(-1000, 500, -1000);
        this.scene.add(rimLight);
    },

    /**
     * Create the terrain mesh with map texture
     */
    async createTerrain() {
        return new Promise((resolve) => {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load('assets/map.webp', (texture) => {
                // Create plane geometry for the terrain
                const geometry = new THREE.PlaneGeometry(
                    this.mapWidth / this.terrainScale,
                    this.mapHeight / this.terrainScale,
                    128,
                    128
                );

                // Add some subtle height variation for visual interest
                const positions = geometry.attributes.position;
                for (let i = 0; i < positions.count; i++) {
                    const z = Math.random() * 10 - 5; // Random height -5 to 5
                    positions.setZ(i, z);
                }
                geometry.computeVertexNormals();

                // Create material with the map texture
                const material = new THREE.MeshStandardMaterial({
                    map: texture,
                    roughness: 0.8,
                    metalness: 0.2,
                    side: THREE.DoubleSide
                });

                this.terrain = new THREE.Mesh(geometry, material);
                this.terrain.rotation.x = -Math.PI / 2; // Rotate to be horizontal
                this.terrain.receiveShadow = true;
                this.scene.add(this.terrain);

                resolve();
            });
        });
    },

    /**
     * Create the journey path as a 3D tube
     */
    createJourneyPath() {
        const points = JourneyRoute.waypoints.map(wp => {
            // Convert 2D percentage coords to 3D world coords
            const x = ((wp.x - 50) / 100) * (this.mapWidth / this.terrainScale);
            const z = ((wp.y - 50) / 100) * (this.mapHeight / this.terrainScale);
            return new THREE.Vector3(x, 20, z); // Elevated above terrain
        });

        // Create smooth curve through points
        const curve = new THREE.CatmullRomCurve3(points);

        // Create tube geometry
        const tubeGeometry = new THREE.TubeGeometry(curve, 200, 8, 8, false);

        // Create glowing material for the path
        const pathMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            emissive: 0xffd700,
            emissiveIntensity: 0.5,
            roughness: 0.3,
            metalness: 0.7
        });

        this.pathLine = new THREE.Mesh(tubeGeometry, pathMaterial);
        this.pathLine.castShadow = true;
        this.scene.add(this.pathLine);

        // Store curve for walker animation
        this.pathCurve = curve;
    },

    /**
     * Create 3D landmark markers
     */
    createLandmarks() {
        JourneyRoute.waypoints.forEach((waypoint, index) => {
            // Convert to 3D coordinates
            const x = ((waypoint.x - 50) / 100) * (this.mapWidth / this.terrainScale);
            const z = ((waypoint.y - 50) / 100) * (this.mapHeight / this.terrainScale);

            // Create landmark group
            const group = new THREE.Group();

            // Glowing sphere
            const sphereGeometry = new THREE.SphereGeometry(15, 16, 16);
            const sphereMaterial = new THREE.MeshStandardMaterial({
                color: 0xffd700,
                emissive: 0xffa500,
                emissiveIntensity: 0.8,
                roughness: 0.2,
                metalness: 0.8
            });
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            sphere.position.set(x, 30, z);
            sphere.castShadow = true;
            group.add(sphere);

            // Outer glow ring
            const ringGeometry = new THREE.RingGeometry(20, 25, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0xffd700,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.set(x, 30, z);
            ring.rotation.x = -Math.PI / 2;
            group.add(ring);

            // Add pulsing animation data
            group.userData = {
                waypoint: waypoint,
                pulsPhase: Math.random() * Math.PI * 2,
                baseY: 30
            };

            this.landmarks.push(group);
            this.scene.add(group);
        });
    },

    /**
     * Set up weather particle systems
     */
    setupWeatherSystems() {
        this.setupRain();
        this.setupSnow();
        this.setupFog();
    },

    /**
     * Create rain particle system
     */
    setupRain() {
        const particleCount = 5000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount);

        const bounds = this.mapWidth / this.terrainScale / 2;

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * bounds * 3;
            positions[i * 3 + 1] = Math.random() * 1500;
            positions[i * 3 + 2] = (Math.random() - 0.5) * bounds * 3;
            velocities[i] = 5 + Math.random() * 10;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));

        const material = new THREE.PointsMaterial({
            color: 0x8eb8e5,
            size: 3,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        this.rainParticles = new THREE.Points(geometry, material);
        this.rainParticles.visible = false;
        this.scene.add(this.rainParticles);
    },

    /**
     * Create snow particle system
     */
    setupSnow() {
        const particleCount = 3000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount);

        const bounds = this.mapWidth / this.terrainScale / 2;

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * bounds * 3;
            positions[i * 3 + 1] = Math.random() * 1500;
            positions[i * 3 + 2] = (Math.random() - 0.5) * bounds * 3;
            velocities[i] = 1 + Math.random() * 2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 5,
            transparent: true,
            opacity: 0.8,
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
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    },

    /**
     * Set up fog
     */
    setupFog() {
        // Exponential fog for atmospheric depth
        this.fog = new THREE.FogExp2(0x9fa8b0, 0.0005);
    },

    /**
     * Set weather condition
     */
    setWeather(weather) {
        this.currentWeather = weather;

        // Hide all weather effects
        if (this.rainParticles) this.rainParticles.visible = false;
        if (this.snowParticles) this.snowParticles.visible = false;
        this.scene.fog = null;

        // Show selected weather
        switch (weather) {
            case 'rain':
                this.rainParticles.visible = true;
                this.scene.fog = new THREE.FogExp2(0x555555, 0.0003);
                break;
            case 'snow':
                this.snowParticles.visible = true;
                this.scene.fog = new THREE.FogExp2(0xcccccc, 0.0002);
                break;
            case 'fog':
                this.scene.fog = this.fog;
                break;
            case 'clear':
            default:
                // No weather effects
                break;
        }
    },

    /**
     * Update particle systems
     */
    updateParticles() {
        const bounds = this.mapWidth / this.terrainScale / 2;

        // Update rain
        if (this.rainParticles && this.rainParticles.visible) {
            const positions = this.rainParticles.geometry.attributes.position.array;
            const velocities = this.rainParticles.geometry.attributes.velocity.array;

            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3 + 1] -= velocities[i];

                // Reset particle when it hits the ground
                if (positions[i * 3 + 1] < 0) {
                    positions[i * 3 + 1] = 1500;
                    positions[i * 3] = (Math.random() - 0.5) * bounds * 3;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * bounds * 3;
                }
            }

            this.rainParticles.geometry.attributes.position.needsUpdate = true;
        }

        // Update snow
        if (this.snowParticles && this.snowParticles.visible) {
            const positions = this.snowParticles.geometry.attributes.position.array;
            const velocities = this.snowParticles.geometry.attributes.velocity.array;

            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3 + 1] -= velocities[i];
                positions[i * 3] += Math.sin(Date.now() * 0.001 + i) * 0.5; // Drift
                positions[i * 3 + 2] += Math.cos(Date.now() * 0.001 + i) * 0.5;

                // Reset particle when it hits the ground
                if (positions[i * 3 + 1] < 0) {
                    positions[i * 3 + 1] = 1500;
                    positions[i * 3] = (Math.random() - 0.5) * bounds * 3;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * bounds * 3;
                }
            }

            this.snowParticles.geometry.attributes.position.needsUpdate = true;
        }
    },

    /**
     * Update landmarks with pulsing animation
     */
    updateLandmarks() {
        const time = Date.now() * 0.001;

        this.landmarks.forEach((group) => {
            const sphere = group.children[0];
            const ring = group.children[1];
            const data = group.userData;

            // Pulsing glow
            const pulse = Math.sin(time * 2 + data.pulsPhase) * 0.5 + 0.5;
            sphere.material.emissiveIntensity = 0.5 + pulse * 0.5;

            // Floating animation
            sphere.position.y = data.baseY + Math.sin(time + data.pulsPhase) * 5;
            ring.position.y = sphere.position.y;

            // Rotating ring
            ring.rotation.z += 0.01;
        });
    },

    /**
     * Update walker positions
     */
    updateWalkers(walkers) {
        // Clear existing walkers
        this.walkers.forEach(walker => this.scene.remove(walker));
        this.walkers = [];

        walkers.forEach((walker, index) => {
            const miles = walker.miles || JourneyRoute.stepsToMiles(walker.steps);
            const percent = miles / JourneyRoute.totalMiles;

            // Get position along path curve
            const point = this.pathCurve.getPointAt(Math.min(percent, 1));

            // Create walker mesh (simple glowing sphere for now)
            const geometry = new THREE.SphereGeometry(20, 16, 16);
            const material = new THREE.MeshStandardMaterial({
                color: index === 0 ? 0x00ff00 : 0x0000ff,
                emissive: index === 0 ? 0x00ff00 : 0x0000ff,
                emissiveIntensity: 0.8,
                roughness: 0.3,
                metalness: 0.7
            });

            const walkerMesh = new THREE.Mesh(geometry, material);
            walkerMesh.position.copy(point);
            walkerMesh.position.y += 40; // Elevate above path
            walkerMesh.castShadow = true;

            this.walkers.push(walkerMesh);
            this.scene.add(walkerMesh);
        });
    },

    /**
     * Animation loop
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        // Update controls
        this.controls.update();

        // Update particles
        this.updateParticles();

        // Update landmarks
        this.updateLandmarks();

        // Render scene
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
     * Update map with walker data
     */
    update(walkers) {
        this.updateWalkers(walkers);
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
