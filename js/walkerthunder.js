// WalkerThunder Scene Manager
class SceneManager {
    constructor() {
        this.scenes = {
            builder: new THREE.Scene(),
            camera1: new THREE.Scene(),
            camera2: new THREE.Scene(),
            virtual: new THREE.Scene() // Add virtual camera view
        };
        
        // Cameras
        this.cameras = {
            builder: new THREE.PerspectiveCamera(75, window.innerWidth * 0.7 / window.innerHeight, 0.1, 1000),
            camera1: new THREE.PerspectiveCamera(60, (window.innerWidth * 0.15) / window.innerHeight, 0.1, 1000),
            camera2: new THREE.PerspectiveCamera(60, (window.innerWidth * 0.15) / window.innerHeight, 0.1, 1000),
            virtual: new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 1000) // Top-down orthographic camera
        };

        // Renderers
        this.renderers = {
            builder: new THREE.WebGLRenderer({ antialias: true }),
            camera1: new THREE.WebGLRenderer({ antialias: true }),
            camera2: new THREE.WebGLRenderer({ antialias: true }),
            virtual: new THREE.WebGLRenderer({ antialias: true })
        };

        this.controls = {
            builder: null,
            camera1: null,
            camera2: null
        };

        this.transformControls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedObject = null;
        this.pedestrians = [];
        this.bridge = null;
        this.gridHelper = null;
        this.cameraModels = {}; // Store camera models
        this.virtualTransform = new THREE.Matrix4(); // Transform matrix for virtual view

        this.init();
        this.setupLights();
        this.setupGrid();
        this.setupControls();
        this.setupBridge();
        this.setupCameraModels(); // Add camera models
        this.setupEventListeners();
    }

    init() {
        // Setup renderers
        this.renderers.builder.setSize(window.innerWidth * 0.7, window.innerHeight);
        this.renderers.camera1.setSize(window.innerWidth * 0.15, window.innerHeight);
        this.renderers.camera2.setSize(window.innerWidth * 0.15, window.innerHeight);
        this.renderers.virtual.setSize(window.innerWidth * 0.15, window.innerHeight);

        Object.values(this.renderers).forEach(renderer => {
            renderer.setClearColor(0x1a1a1a);
            renderer.shadowMap.enabled = true;
        });

        // Add to DOM
        document.getElementById('builder-view').appendChild(this.renderers.builder.domElement);
        document.getElementById('camera1-view').appendChild(this.renderers.camera1.domElement);
        document.getElementById('camera2-view').appendChild(this.renderers.camera2.domElement);
        document.getElementById('virtual-view').appendChild(this.renderers.virtual.domElement);

        // Setup cameras
        this.cameras.builder.position.set(10, 10, 10);
        this.cameras.camera1.position.set(5, 3, 5); // Front-left camera
        this.cameras.camera2.position.set(-5, 3, 5);
        this.cameras.virtual.position.set(0, 0, 10); // Top-down virtual camera
        this.cameras.virtual.lookAt(0, 0, 0);

        Object.values(this.cameras).forEach(camera => camera.lookAt(0, 0, 0));
    }

    setupLights() {
        Object.values(this.scenes).forEach(scene => {
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 5, 5);
            directionalLight.castShadow = true;
            scene.add(ambientLight, directionalLight);
        });
    }

    setupGrid() {
        // Create ground plane
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x999999,
            side: THREE.DoubleSide
        });
        const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
        groundPlane.rotation.x = -Math.PI / 2;
        groundPlane.receiveShadow = true;

        // Add grid helper
        this.gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x444444);
        this.gridHelper.position.y = 0.01; // Slightly above ground to avoid z-fighting

        // Add to all scenes
        Object.values(this.scenes).forEach(scene => {
            scene.add(groundPlane.clone());
            scene.add(this.gridHelper.clone());
        });
    }

    setupBridge() {
        // Create bridge structure - made wider and deeper to match reference
        const bridgeGeometry = new THREE.BoxGeometry(12, 0.5, 6);
        const bridgeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x4287f5,
            transparent: true,
            opacity: 0.8
        });
        this.bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
        this.bridge.position.y = 4; // Higher bridge for better view
        this.bridge.castShadow = true;
        this.bridge.receiveShadow = true;

        // Create a group for the bridge and camera1
        this.bridgeGroup = new THREE.Group();
        this.bridgeGroup.add(this.bridge);

        // Position camera1 underneath the front edge of bridge
        const camera1Pivot = new THREE.Group();
        camera1Pivot.position.set(0, 3.75, 2.9); // Position just under the bridge edge
        this.cameras.camera1.position.set(0, 0, 0); // Position relative to pivot
        this.cameras.camera1.rotation.x = -Math.PI / 2.5; // Steeper downward angle (~72 degrees)
        camera1Pivot.add(this.cameras.camera1);
        this.bridgeGroup.add(camera1Pivot);

        // Add camera model for visualization
        const cameraModel = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.2, 0.3),
            new THREE.MeshPhongMaterial({ color: 0xff0000 })
        );
        this.cameras.camera1.add(cameraModel);
        
        // Add bridge group to all scenes
        Object.values(this.scenes).forEach(scene => {
            scene.add(this.bridgeGroup.clone());
        });

        // Setup virtual camera for perfect top-down view
        this.cameras.virtual = new THREE.OrthographicCamera(
            -6, 6,  // left, right
            4, -4,  // top, bottom
            0.1, 1000 // near, far
        );
        this.cameras.virtual.position.set(0, 10, 0);
        this.cameras.virtual.lookAt(0, 0, 0);
    }

    setupCameraModels() {
        // Create camera model geometry
        const cameraGeometry = new THREE.ConeGeometry(0.2, 0.4, 8);
        cameraGeometry.rotateX(-Math.PI / 2); // Point forward

        // Create camera models for each production camera
        ['camera1', 'camera2'].forEach(camName => {
            const material = new THREE.MeshPhongMaterial({ 
                color: camName === 'camera1' ? 0xff0000 : 0x00ff00 
            });
            const model = new THREE.Mesh(cameraGeometry, material);
            
            // Add frustum visualization
            const frustumHelper = new THREE.CameraHelper(this.cameras[camName]);
            
            // Group camera model and frustum
            const group = new THREE.Group();
            group.add(model);
            group.add(frustumHelper);
            
            this.cameraModels[camName] = group;
            this.scenes.builder.add(group);
            
            // Update camera model position
            group.position.copy(this.cameras[camName].position);
            group.rotation.copy(this.cameras[camName].rotation);
        });
    }

    createPedestrian() {
        // Create pedestrian with better scale relative to bridge height
        const bodyGeometry = new THREE.ConeGeometry(0.15, 0.7, 8);
        const headGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const material = new THREE.MeshPhongMaterial({ 
            color: new THREE.Color().setHSL(Math.random(), 0.5, 0.5)
        });

        const body = new THREE.Mesh(bodyGeometry, material);
        const head = new THREE.Mesh(headGeometry, material);
        head.position.y = 0.45;

        const pedestrian = new THREE.Group();
        pedestrian.add(body);
        pedestrian.add(head);
        
        // Position on ground, with wider range to match bridge size
        pedestrian.position.set(
            (Math.random() - 0.5) * 10,  // x: wider range
            0.35,                        // y: on ground
            (Math.random() - 0.5) * 4    // z: under bridge area
        );

        // Add random velocity
        pedestrian.userData.velocity = new THREE.Vector2(
            (Math.random() - 0.5) * 0.08,
            (Math.random() - 0.5) * 0.08
        );

        this.pedestrians.push(pedestrian);
        
        // Add to all scenes
        Object.values(this.scenes).forEach(scene => {
            scene.add(pedestrian.clone());
        });

        // Create more pedestrians if we have few
        if (this.pedestrians.length < 8) {
            setTimeout(() => this.createPedestrian(), 1000);
        }
    }

    setupControls() {
        // Builder view controls
        this.controls.builder = new THREE.OrbitControls(this.cameras.builder, this.renderers.builder.domElement);
        this.controls.builder.enableDamping = true;
        this.controls.builder.dampingFactor = 0.05;
        this.controls.builder.screenSpacePanning = true;

        // Transform controls for object manipulation
        this.transformControls = new THREE.TransformControls(this.cameras.builder, this.renderers.builder.domElement);
        this.transformControls.addEventListener('dragging-changed', (event) => {
            this.controls.builder.enabled = !event.value;
        });
        this.scenes.builder.add(this.transformControls);

        // Make transform controls more responsive
        this.transformControls.setTranslationSnap(0.5);
        this.transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));
        this.transformControls.setScaleSnap(0.1);
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Builder view interaction
        this.renderers.builder.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    onWindowResize() {
        // Update camera aspects
        this.cameras.builder.aspect = (window.innerWidth * 0.7) / window.innerHeight;
        this.cameras.camera1.aspect = (window.innerWidth * 0.15) / window.innerHeight;
        this.cameras.camera2.aspect = (window.innerWidth * 0.15) / window.innerHeight;

        Object.values(this.cameras).forEach(camera => camera.updateProjectionMatrix());

        // Update renderer sizes
        this.renderers.builder.setSize(window.innerWidth * 0.7, window.innerHeight);
        this.renderers.camera1.setSize(window.innerWidth * 0.15, window.innerHeight);
        this.renderers.camera2.setSize(window.innerWidth * 0.15, window.innerHeight);
        this.renderers.virtual.setSize(window.innerWidth * 0.15, window.innerHeight);
    }

    onMouseDown(event) {
        // Only handle clicks in builder view
        const rect = this.renderers.builder.domElement.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom) {
            return;
        }

        // Calculate mouse position in normalized device coordinates
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.cameras.builder);
        const intersects = this.raycaster.intersectObjects(this.scenes.builder.children, true);

        if (intersects.length > 0) {
            const selected = intersects[0].object;
            // Don't select grid or helpers
            if (!(selected instanceof THREE.GridHelper) && 
                !(selected instanceof THREE.CameraHelper)) {
                this.selectedObject = selected;
                this.transformControls.attach(selected);
            }
        } else {
            this.transformControls.detach();
            this.selectedObject = null;
        }
    }

    onKeyDown(event) {
        switch(event.key.toLowerCase()) {
            case 'p':
                this.createPedestrian();
                break;
            case 'escape':
                if (this.transformControls.object) {
                    this.transformControls.detach();
                    this.selectedObject = null;
                }
                break;
            case 'g':
                if (this.transformControls.object) {
                    this.transformControls.setMode('translate');
                }
                break;
            case 'r':
                if (this.transformControls.object) {
                    this.transformControls.setMode('rotate');
                }
                break;
            case 's':
                if (this.transformControls.object) {
                    this.transformControls.setMode('scale');
                }
                break;
        }
    }

    exportScene() {
        const sceneData = {
            bridge: {
                position: this.bridge.position.toArray(),
                rotation: this.bridge.rotation.toArray(),
                scale: this.bridge.scale.toArray(),
                dimensions: {
                    width: 10,
                    height: 0.5,
                    depth: 3
                }
            },
            cameras: {
                camera1: {
                    position: this.cameras.camera1.position.toArray(),
                    rotation: this.cameras.camera1.rotation.toArray(),
                    fov: this.cameras.camera1.fov
                },
                camera2: {
                    position: this.cameras.camera2.position.toArray(),
                    rotation: this.cameras.camera2.rotation.toArray(),
                    fov: this.cameras.camera2.fov
                }
            },
            pedestrians: this.pedestrians.map(ped => ({
                position: ped.position.toArray(),
                rotation: ped.rotation.toArray()
            }))
        };

        return JSON.stringify(sceneData, null, 2);
    }

    updateVirtualView() {
        // For virtual view, we don't need transformation since it's already orthographic top-down
        // Just ensure pedestrians are visible and properly positioned
        this.pedestrians.forEach(ped => {
            const virtualPed = this.scenes.virtual.getObjectById(ped.id);
            if (virtualPed) {
                virtualPed.position.copy(ped.position);
                virtualPed.rotation.y = ped.rotation.y;
            }
        });
    }

    updatePedestrians() {
        this.pedestrians.forEach(ped => {
            // Update position based on velocity
            ped.position.x += ped.userData.velocity.x;
            ped.position.z += ped.userData.velocity.y;

            // Bounce off boundaries with random variation
            if (Math.abs(ped.position.x) > 4) {
                ped.userData.velocity.x *= -1;
                ped.userData.velocity.x += (Math.random() - 0.5) * 0.02; // Add variation
                ped.position.x = Math.sign(ped.position.x) * 4;
            }
            if (Math.abs(ped.position.z) > 1.5) {
                ped.userData.velocity.y *= -1;
                ped.userData.velocity.y += (Math.random() - 0.5) * 0.02; // Add variation
                ped.position.z = Math.sign(ped.position.z) * 1.5;
            }

            // Rotate pedestrian to face movement direction
            ped.rotation.y = Math.atan2(ped.userData.velocity.x, ped.userData.velocity.y);

            // Update all instances in other scenes
            Object.values(this.scenes).forEach(scene => {
                const pedClone = scene.getObjectById(ped.id);
                if (pedClone) {
                    pedClone.position.copy(ped.position);
                    pedClone.rotation.copy(ped.rotation);
                }
            });
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update controls
        this.controls.builder.update();

        // Update camera models to match camera positions
        Object.entries(this.cameraModels).forEach(([camName, model]) => {
            const cam = this.cameras[camName];
            const worldPos = new THREE.Vector3();
            cam.getWorldPosition(worldPos);
            model.position.copy(worldPos);
            model.rotation.copy(cam.rotation);
        });

        // Update pedestrians
        this.updatePedestrians();

        // Render all views
        this.renderers.builder.render(this.scenes.builder, this.cameras.builder);
        this.renderers.camera1.render(this.scenes.camera1, this.cameras.camera1);
        this.renderers.camera2.render(this.scenes.camera2, this.cameras.camera2);
        this.renderers.virtual.render(this.scenes.virtual, this.cameras.virtual);
    }
}

export default SceneManager;
