import SceneManager from './scene.js';

class ThunderBuildApp {
    constructor() {
        this.sceneManager = new SceneManager();
        this.setupEventListeners();
        this.initializeUI();
        this.startAnimation();
    }

    setupEventListeners() {
        // Tool selection
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.control-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.sceneManager.setTool(btn.dataset.tool);
            });
        });

        // Component creation
        document.querySelectorAll('.component-item').forEach(item => {
            item.addEventListener('click', () => {
                const component = this.sceneManager.createComponent(item.dataset.type);
                if (component) {
                    this.sceneManager.selectObject(component);
                }
            });
        });

        // Property changes
        document.querySelectorAll('.property-input').forEach(input => {
            input.addEventListener('change', () => {
                if (!this.sceneManager.selectedObject) return;

                const value = parseFloat(input.value);
                const property = input.dataset.property;

                switch(property) {
                    case 'position-x':
                        this.sceneManager.selectedObject.position.x = value;
                        break;
                    case 'position-y':
                        this.sceneManager.selectedObject.position.y = value;
                        break;
                    case 'position-z':
                        this.sceneManager.selectedObject.position.z = value;
                        break;
                    case 'rotation-x':
                        this.sceneManager.selectedObject.rotation.x = value * Math.PI / 180;
                        break;
                    case 'rotation-y':
                        this.sceneManager.selectedObject.rotation.y = value * Math.PI / 180;
                        break;
                    case 'rotation-z':
                        this.sceneManager.selectedObject.rotation.z = value * Math.PI / 180;
                        break;
                    case 'length':
                        this.sceneManager.selectedObject.scale.x = Math.max(0.1, value);
                        break;
                    case 'width':
                        this.sceneManager.selectedObject.scale.y = Math.max(0.1, value);
                        break;
                    case 'height':
                        this.sceneManager.selectedObject.scale.z = Math.max(0.1, value);
                        break;
                }
            });
        });

        // Context menu actions
        document.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                switch(action) {
                    case 'copy':
                        this.sceneManager.copySelectedObject();
                        break;
                    case 'paste':
                        this.sceneManager.pasteObject();
                        break;
                    case 'delete':
                        if (this.sceneManager.selectedObject) {
                            this.sceneManager.scene.remove(this.sceneManager.selectedObject);
                            this.sceneManager.deselectObject();
                        }
                        break;
                    case 'duplicate':
                        this.sceneManager.duplicateSelectedObject();
                        break;
                }
            });
        });
    }

    initializeUI() {
        // Set initial tool
        document.querySelector('[data-tool="select"]').classList.add('active');
        this.sceneManager.setTool('select');

        // Add glassmorphism effects
        document.querySelectorAll('.component-library, .controls, .properties-panel').forEach(el => {
            el.style.backdropFilter = 'blur(10px)';
            el.style.webkitBackdropFilter = 'blur(10px)';
        });
    }

    startAnimation() {
        this.sceneManager.animate();
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ThunderBuildApp();
});
