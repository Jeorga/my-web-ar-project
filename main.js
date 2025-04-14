// Main application class
class ARApp {
    constructor() {
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.xrSession = null;
      this.xrReferenceSpace = null;
      this.xrHitTestSource = null;
      this.currentModel = null;
      this.modelAnchor = null;
      this.loader = new THREE.GLTFLoader();
      this.lastPlacementTime = 0;
      this.placementCooldown = 300; // ms
      this.forward = new THREE.Vector3(0, 0, -1);
      this.targetPos = new THREE.Vector3();
      this.lastUpdate = 0;
      this.isModelLoading = false;
      
      // DOM elements
      this.infoDiv = document.getElementById('info');
      this.warningDiv = document.getElementById('warning');
      this.arButton = document.getElementById('arButton');
      this.resetButton = document.getElementById('resetButton');
      this.placeButton = document.getElementById('placeButton');
      this.loadingDiv = document.getElementById('loading');
      
      // Initialize the app
      this.initScene();
      this.setupEventListeners();
    }
    
    initScene() {
      // Clean up previous scene if it exists
      if (this.renderer) {
        this.renderer.setAnimationLoop(null);
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        this.renderer.dispose();
      }
      
      // Create new scene
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(
        70, 
        window.innerWidth / window.innerHeight, 
        0.01, 
        100
      );
      
      // Create renderer with better defaults
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: "high-performance"
      });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.xr.enabled = true;
      this.renderer.xr.setReferenceSpaceType('local-floor');
      document.body.appendChild(this.renderer.domElement);
      
      // Setup lighting
      this.setupLighting();
      
      // Setup window resize handler
      window.addEventListener('resize', () => this.onWindowResize(), false);
      
      // Update info display
      this.updateInfo('Model Status', 'No model loaded');
      this.updateInfo('Tracking State', 'Not tracking');
      
      // Enable place button if we have a model
      this.placeButton.disabled = !this.currentModel;
    }
    
    setupLighting() {
      // Ambient light for general illumination
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      this.scene.add(ambientLight);
      
      // Directional light for shadows and highlights
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
      directionalLight.position.set(0.5, 1, 0.5);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 1024;
      directionalLight.shadow.mapSize.height = 1024;
      this.scene.add(directionalLight);
      
      // Hemisphere light for more natural outdoor lighting
      const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
      this.scene.add(hemisphereLight);
    }
    
    setupEventListeners() {
      // AR button
      this.arButton.addEventListener('click', () => this.startAR());
      
      // Reset button
      this.resetButton.addEventListener('click', () => this.resetScene());
      
      // Place button
      this.placeButton.addEventListener('click', () => this.placeModel());
      
      // Tap/click handler
      window.addEventListener('click', (e) => this.onTap(e));
    }
    
    onWindowResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    async checkWebXRSupport() {
      if (!navigator.xr) {
        this.showError("WebXR not supported in your browser");
        return false;
      }
      
      try {
        const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
        if (!isSupported) {
          this.showError("AR not supported on this device");
          return false;
        }
        return true;
      } catch (e) {
        this.showError("Error checking AR support: " + e.message);
        return false;
      }
    }
    
    async startAR() {
      console.log("Starting AR session");
      
      if (!await this.checkWebXRSupport()) return;
      
      try {
        // Request AR session
        this.xrSession = await navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: ['local-floor'],
          optionalFeatures: ['hit-test', 'dom-overlay', 'anchors'],
          domOverlay: { root: document.body }
        });
        
        // Set up session
        this.renderer.xr.setSession(this.xrSession);
        this.xrSession.addEventListener('end', () => this.onSessionEnd());
        this.xrSession.addEventListener('visibilitychange', () => this.onVisibilityChange());
        
        // Get reference space
        try {
          this.xrReferenceSpace = await this.xrSession.requestReferenceSpace('local-floor');
          this.updateInfo('Tracking State', 'Local floor tracking');
        } catch (e) {
          console.log("Local-floor not available, using viewer reference space");
          this.xrReferenceSpace = await this.xrSession.requestReferenceSpace('viewer');
          this.updateInfo('Tracking State', 'Viewer tracking (no floor)');
        }
        
        // Set up hit test if available
        if (this.xrSession.requestHitTestSource) {
          try {
            const viewSpace = await this.xrSession.requestReferenceSpace('viewer');
            this.xrHitTestSource = await this.xrSession.requestHitTestSource({
              space: viewSpace,
              entityTypes: ['plane', 'mesh']
            });
            console.log("Hit-test ready");
          } catch (e) {
            console.warn("Hit test failed:", e);
          }
        }
        
        // Update UI
        this.arButton.style.display = 'none';
        this.resetButton.disabled = false;
        this.placeButton.disabled = false;
        
        // Start animation loop
        this.animate();
      } catch (err) {
        console.error("AR session failed:", err);
        this.showError("Failed to start AR: " + err.message);
      }
    }
    
    onSessionEnd() {
      console.log("AR session ending");
      
      // Clean up renderer
      this.renderer.setAnimationLoop(null);
      
      // Reset XR-related variables
      this.xrSession = null;
      this.xrHitTestSource = null;
      this.xrReferenceSpace = null;
      
      // Update UI
      this.arButton.style.display = 'block';
      this.resetButton.disabled = true;
      this.placeButton.disabled = true;
      this.warningDiv.style.display = 'none';
      
      this.updateInfo('Tracking State', 'Not tracking');
      
      // Reinitialize scene
      this.initScene();
    }
    
    onVisibilityChange() {
      if (this.xrSession && this.xrSession.visibilityState === 'visible-blurred') {
        this.warningDiv.style.display = 'flex';
      } else {
        this.warningDiv.style.display = 'none';
      }
    }
    
    onTap(event) {
      // Only handle taps in AR session
      if (!this.renderer.xr.isPresenting || !this.xrSession) return;
      
      // Prevent rapid consecutive taps
      const now = Date.now();
      if (now - this.lastPlacementTime < this.placementCooldown) return;
      this.lastPlacementTime = now;
      
      this.placeModel();
    }
    
    async placeModel() {
      // If we already have a model and anchor, just update the anchor position
      if (this.currentModel && this.modelAnchor) {
        try {
          const newAnchor = await this.xrSession.createAnchor(
            this.currentModel.matrix, 
            this.xrReferenceSpace
          );
          if (newAnchor) {
            if (this.modelAnchor.cancel) this.modelAnchor.cancel();
            this.modelAnchor = newAnchor;
            console.log("Anchor updated");
            this.updateInfo('Model Status', 'Model repositioned');
          }
        } catch (e) {
          console.warn("Failed to update anchor:", e);
        }
        return;
      }
      
      // Show loading indicator
      this.showLoading(true);
      this.isModelLoading = true;
      
      try {
        // Load the model
        const gltf = await this.loader.loadAsync('./assets/models/aoiBa.glb');
        
        this.currentModel = gltf.scene;
        this.currentModel.scale.set(0.1, 0.1, 0.1);
        
        // Optimize model
        this.currentModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.metalness = 0.1;
              child.material.roughness = 0.5;
            }
          }
        });
        
        // Try to place on detected surface
        if (this.xrHitTestSource && this.xrReferenceSpace) {
          try {
            const frame = this.renderer.xr.getFrame();
            const hitTestResults = frame.getHitTestResults(this.xrHitTestSource);
            
            if (hitTestResults.length > 0) {
              const hit = hitTestResults[0];
              const hitPose = hit.getPose(this.xrReferenceSpace);
              
              if (hitPose) {
                const hitMatrix = new THREE.Matrix4().fromArray(hitPose.transform.matrix);
                this.currentModel.applyMatrix4(hitMatrix);
                
                if (this.xrSession.createAnchor) {
                  try {
                    this.modelAnchor = await this.xrSession.createAnchor(
                      hitPose.transform, 
                      this.xrReferenceSpace
                    );
                    console.log("Anchor created for stable positioning");
                    this.updateInfo('Model Status', 'Model placed on surface with anchor');
                  } catch (e) {
                    console.warn("Couldn't create anchor:", e);
                    this.updateInfo('Model Status', 'Model placed on surface (no anchor)');
                  }
                }
              }
            }
          } catch (e) {
            console.warn("Hit test failed:", e);
          }
        }
        
        // If no surface detected, place in front of camera
        if (!this.currentModel.parent) {
          const xrCamera = this.renderer.xr.getCamera(this.camera);
          this.forward.set(0, 0, -1).applyQuaternion(xrCamera.quaternion);
          this.currentModel.position.copy(xrCamera.position)
            .add(this.forward.multiplyScalar(1.5));
          this.currentModel.quaternion.copy(xrCamera.quaternion);
          this.updateInfo('Model Status', 'Model placed in front of camera');
        }
        
        this.scene.add(this.currentModel);
        this.placeButton.disabled = false;
        
      } catch (error) {
        console.error("Error loading model:", error);
        this.showError("Failed to load model");
        this.updateInfo('Model Status', 'Model failed to load');
      } finally {
        this.showLoading(false);
        this.isModelLoading = false;
      }
    }
    
    resetScene() {
      if (confirm("Are you sure you want to reset the scene?")) {
        // Remove current model
        if (this.currentModel) {
          this.scene.remove(this.currentModel);
          this.currentModel = null;
        }
        
        // Clean up anchor
        if (this.modelAnchor) {
          if (this.modelAnchor.cancel) this.modelAnchor.cancel();
          this.modelAnchor = null;
        }
        
        this.updateInfo('Model Status', 'No model loaded');
        this.placeButton.disabled = false;
      }
    }
    
    animate() {
      this.renderer.setAnimationLoop((timestamp, frame) => {
        if (!frame || !this.xrSession) return;
        
        this.render(frame);
        
        // Update tracking state display
        if (frame.getViewerPose) {
          const pose = frame.getViewerPose(this.xrReferenceSpace);
          if (!pose || pose.emulatedPosition) {
            this.warningDiv.style.display = 'flex';
            this.updateInfo('Tracking State', 'Tracking lost');
          } else {
            this.warningDiv.style.display = 'none';
            this.updateInfo('Tracking State', 'Tracking active');
          }
        }
      });
    }
    
    render(frame) {
      if (this.renderer.xr.isPresenting) {
        const xrCamera = this.renderer.xr.getCamera(this.camera);
        const pos = xrCamera.position;
        
        // Throttle position updates
        const now = performance.now();
        if (now - this.lastUpdate > 100) {
          this.updateInfo(
            'Camera Position', 
            `X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`
          );
          this.lastUpdate = now;
        }
        
        // If model has no anchor, make it follow camera (but not while loading)
        if (this.currentModel && !this.modelAnchor && !this.isModelLoading) {
          this.forward.set(0, 0, -1).applyQuaternion(xrCamera.quaternion);
          this.targetPos.copy(xrCamera.position)
            .add(this.forward.multiplyScalar(1.5));
          this.currentModel.position.lerp(this.targetPos, 0.1);
        }
      }
      
      this.renderer.render(this.scene, this.camera);
    }
    
    updateInfo(key, value) {
      const infoLines = this.infoDiv.querySelectorAll('div');
      for (let line of infoLines) {
        if (line.textContent.startsWith(key)) {
          line.textContent = `${key}: ${value}`;
          return;
        }
      }
    }
    
    showLoading(show) {
      this.loadingDiv.style.display = show ? 'flex' : 'none';
    }
    
    showError(message) {
      alert(message); // In a real app, you'd use a nicer error display
    }
  }
  
  // Initialize the app when the window loads
  window.onload = () => {
    const app = new ARApp();
  };