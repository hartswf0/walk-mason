// ThunderBuild Scene Manager
class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedObject = null;
        this.clipboard = null;
        this.isDragging = false;
        this.currentTool = 'select';
        this.gridHelper = null;
        this.transformControls = null;
        this.dragStart = null;
        this.gridSnap = true;

        this.init();
        this.setupLights();
        this.setupGrid();
        this.setupControls();
        this.setupEventListeners();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x1a1a1a);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        // Setup camera
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);
    }

    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light with shadows
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
    }

    setupGrid() {
        this.gridHelper = new THREE.GridHelper(20, 20);
        this.scene.add(this.gridHelper);

        // Ground plane for shadows
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
        const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
        groundPlane.rotation.x = -Math.PI / 2;
        groundPlane.receiveShadow = true;
        this.scene.add(groundPlane);
    }

    setupControls() {
        // Orbit controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true; // Enable screen space panning
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };

        // Transform controls with correct orientation
        this.transformControls = new THREE.TransformControls(this.camera, this.renderer.domElement);
        this.transformControls.setSpace('local'); // Use local space for transforms
        this.transformControls.setTranslationSnap(0.5); // Half unit snap for translation
        this.transformControls.setRotationSnap(THREE.MathUtils.degToRad(15)); // 15-degree rotation snap
        this.transformControls.setScaleSnap(0.1); // 0.1 unit snap for scaling
        
        this.transformControls.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
        });

        // Update control visibility on camera move
        this.controls.addEventListener('change', () => {
            if (this.transformControls.object) {
                this.transformControls.update();
            }
        });

        this.scene.add(this.transformControls);
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Mouse events
        this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));

        // Context menu
        this.renderer.domElement.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            if (this.selectedObject) {
                this.showContextMenu(event.clientX, event.clientY);
            }
        });

        // Keyboard shortcuts
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    onMouseDown(event) {
        if (event.button !== 0) return; // Only handle left click

        // Get mouse position in normalized device coordinates (-1 to +1)
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Filter out non-selectable objects (like grid, helpers, etc.)
        const selectableObjects = this.scene.children.filter(obj => 
            obj.userData.type && 
            obj !== this.gridHelper &&
            !(obj instanceof THREE.TransformControls)
        );
        
        const intersects = this.raycaster.intersectObjects(selectableObjects, false);

        if (intersects.length > 0) {
            const object = intersects[0].object;
            
            // If clicking the same object, don't reselect
            if (this.selectedObject === object) {
                if (this.currentTool === 'move') {
                    this.isDragging = true;
                    this.dragStart = {
                        point: intersects[0].point.clone(),
                        objectPos: object.position.clone(),
                        planeNormal: this.camera.getWorldDirection(new THREE.Vector3())
                    };
                }
                return;
            }

            // Deselect previous object if exists
            if (this.selectedObject) {
                this.deselectObject();
            }

            // Select new object
            this.selectObject(object);
            
            if (this.currentTool === 'move') {
                this.isDragging = true;
                this.dragStart = {
                    point: intersects[0].point.clone(),
                    objectPos: object.position.clone(),
                    planeNormal: this.camera.getWorldDirection(new THREE.Vector3())
                };
            }
        } else {
            // Only deselect if clicking empty space
            if (!this.transformControls.dragging) {
                this.deselectObject();
            }
        }
    }

    onMouseMove(event) {
        if (!this.selectedObject || !this.isDragging) return;

        // Update mouse position
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Create a plane perpendicular to the camera
        const dragPlane = new THREE.Plane();
        dragPlane.setFromNormalAndCoplanarPoint(
            this.dragStart.planeNormal,
            this.dragStart.point
        );

        // Cast ray from mouse to plane
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(dragPlane, intersection);

        if (intersection) {
            // Calculate movement in world space
            const delta = intersection.sub(this.dragStart.point);
            
            // Apply movement
            this.selectedObject.position.copy(this.dragStart.objectPos.clone().add(delta));

            // Snap to grid if enabled
            if (this.gridSnap) {
                this.selectedObject.position.x = Math.round(this.selectedObject.position.x / 0.5) * 0.5;
                this.selectedObject.position.y = Math.round(this.selectedObject.position.y / 0.5) * 0.5;
                this.selectedObject.position.z = Math.round(this.selectedObject.position.z / 0.5) * 0.5;
            }

            this.updatePropertiesPanel();
        }
    }

    onMouseUp() {
        this.isDragging = false;
    }

    selectObject(object) {
        if (this.selectedObject === object) return;

        // Deselect previous object if exists
        if (this.selectedObject) {
            this.selectedObject.material.emissive.setHex(0x000000);
            this.transformControls.detach();
        }

        // Select new object
        this.selectedObject = object;
        this.selectedObject.material.emissive.setHex(0x333333);
        
        // Update transform controls
        this.transformControls.attach(object);
        this.transformControls.visible = true;
        this.setTool(this.currentTool); // Update transform controls mode
        
        // Show properties panel
        document.querySelector('.properties-panel').classList.add('active');
        this.updatePropertiesPanel();

        // Dispatch custom event for selection change
        window.dispatchEvent(new CustomEvent('objectSelected', { 
            detail: { object: object } 
        }));
    }

    deselectObject() {
        if (!this.selectedObject) return;

        // Reset material
        this.selectedObject.material.emissive.setHex(0x000000);
        
        // Detach transform controls
        this.transformControls.detach();
        this.transformControls.visible = false;
        
        // Hide properties panel
        document.querySelector('.properties-panel').classList.remove('active');
        
        // Clear selection
        this.selectedObject = null;
        this.isDragging = false;
        this.dragStart = null;

        // Dispatch custom event for selection change
        window.dispatchEvent(new CustomEvent('objectDeselected'));
    }

    updatePropertiesPanel() {
        if (!this.selectedObject) return;

        const position = this.selectedObject.position;
        const rotation = this.selectedObject.rotation;
        const scale = this.selectedObject.scale;

        // Update position inputs
        const posX = document.querySelector('[data-property="position-x"]');
        const posY = document.querySelector('[data-property="position-y"]');
        const posZ = document.querySelector('[data-property="position-z"]');
        
        if (posX && posY && posZ) {
            posX.value = position.x.toFixed(2);
            posY.value = position.y.toFixed(2);
            posZ.value = position.z.toFixed(2);
        }

        // Update rotation inputs (convert to degrees)
        const rotX = document.querySelector('[data-property="rotation-x"]');
        const rotY = document.querySelector('[data-property="rotation-y"]');
        const rotZ = document.querySelector('[data-property="rotation-z"]');
        
        if (rotX && rotY && rotZ) {
            rotX.value = (rotation.x * 180 / Math.PI).toFixed(0);
            rotY.value = (rotation.y * 180 / Math.PI).toFixed(0);
            rotZ.value = (rotation.z * 180 / Math.PI).toFixed(0);
        }

        // Update scale/dimension inputs
        const length = document.querySelector('[data-property="length"]');
        const width = document.querySelector('[data-property="width"]');
        const height = document.querySelector('[data-property="height"]');
        
        if (length && width && height) {
            length.value = scale.x.toFixed(2);
            width.value = scale.y.toFixed(2);
            height.value = scale.z.toFixed(2);
        }
    }

    showContextMenu(x, y) {
        const contextMenu = document.querySelector('.context-menu');
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.classList.add('active');

        const hideContextMenu = () => {
            contextMenu.classList.remove('active');
            document.removeEventListener('click', hideContextMenu);
        };

        document.addEventListener('click', hideContextMenu);
    }

    handleKeyDown(event) {
        switch(event.key.toLowerCase()) {
            case 'delete':
                if (this.selectedObject) {
                    this.scene.remove(this.selectedObject);
                    this.deselectObject();
                }
                break;
            case 'c':
                if (event.ctrlKey || event.metaKey) {
                    this.copySelectedObject();
                }
                break;
            case 'v':
                if (event.ctrlKey || event.metaKey) {
                    this.pasteObject();
                }
                break;
            case 'd':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.duplicateSelectedObject();
                }
                break;
        }
    }

    copySelectedObject() {
        if (!this.selectedObject) return;
        this.clipboard = this.selectedObject.clone();
    }

    pasteObject() {
        if (!this.clipboard) return;
        const newObject = this.clipboard.clone();
        newObject.position.add(new THREE.Vector3(1, 0, 1)); // Offset from original
        this.scene.add(newObject);
        this.selectObject(newObject);
    }

    duplicateSelectedObject() {
        if (!this.selectedObject) return;
        const duplicate = this.selectedObject.clone();
        duplicate.position.add(new THREE.Vector3(1, 0, 1)); // Offset from original
        this.scene.add(duplicate);
        this.selectObject(duplicate);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    setTool(tool) {
        this.currentTool = tool;
        
        if (this.selectedObject) {
            switch(tool) {
                case 'move':
                    this.transformControls.setMode('translate');
                    this.transformControls.showX = true;
                    this.transformControls.showY = true;
                    this.transformControls.showZ = true;
                    break;
                case 'rotate':
                    this.transformControls.setMode('rotate');
                    this.transformControls.showX = true;
                    this.transformControls.showY = true;
                    this.transformControls.showZ = true;
                    break;
                case 'scale':
                    this.transformControls.setMode('scale');
                    this.transformControls.showX = true;
                    this.transformControls.showY = true;
                    this.transformControls.showZ = true;
                    break;
                default:
                    this.transformControls.visible = false;
                    return;
            }
            this.transformControls.visible = true;
        }
    }

    createComponent(type) {
        const geometries = {
            beam: new THREE.BoxGeometry(4, 0.2, 0.2),
            connector: new THREE.SphereGeometry(0.2, 32, 32),
            plate: new THREE.BoxGeometry(2, 0.1, 2),
            block: new THREE.BoxGeometry(1, 1, 1)
        };

        const material = new THREE.MeshPhongMaterial({
            color: 0xB22222,
            specular: 0x111111,
            shininess: 30
        });

        if (!geometries[type]) return null;

        const mesh = new THREE.Mesh(geometries[type], material);
        mesh.userData.type = type;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Position at camera's target point, slightly offset towards the camera
        const cameraDir = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDir);
        const target = this.controls.target.clone();
        target.add(cameraDir.multiplyScalar(-2)); // Place 2 units in front of the target point
        mesh.position.copy(target);

        // Ensure the object is placed on the grid
        if (this.gridSnap) {
            mesh.position.x = Math.round(mesh.position.x / 0.5) * 0.5;
            mesh.position.y = Math.round(mesh.position.y / 0.5) * 0.5;
            mesh.position.z = Math.round(mesh.position.z / 0.5) * 0.5;
        }

        this.scene.add(mesh);
        return mesh;
    }
}

// Export for use in main application
export default SceneManager;
