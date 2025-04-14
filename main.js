// Global variables
let scene, camera, renderer, xrSession = null, xrReferenceSpace, xrHitTestSource = null;
let infoDiv, warningDiv;
let currentModel = null;
let modelAnchor = null;
const loader = new THREE.GLTFLoader();
let lastPlacementTime = 0;
const placementCooldown = 500; // milliseconds between placements

// Check WebXR support
function checkWebXRSupport() {
    if (!navigator.xr) {
        alert("WebXR not supported in your browser");
        return false;
    }
    return true;
}

// Lighting setup
function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(0.5, 1, 0.5);
    scene.add(directionalLight);
}

// Initialize the scene
function initScene() {
    if (renderer) {
        renderer.setAnimationLoop(null);
        if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        renderer.dispose();
    }

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    document.body.appendChild(renderer.domElement);

    setupLighting();

    infoDiv = document.getElementById('info');
    warningDiv = document.getElementById('warning');

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('click', onTap);
}

// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Start AR session
async function startAR() {
    if (!checkWebXRSupport()) return;

    try {
        xrSession = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['local-floor'],
            optionalFeatures: ['hit-test', 'dom-overlay', 'anchors'],
            domOverlay: { root: document.body }
        });

        renderer.xr.setSession(xrSession);
        xrSession.addEventListener('end', onSessionEnd);
        xrSession.addEventListener('visibilitychange', onVisibilityChange);

        xrReferenceSpace = await xrSession.requestReferenceSpace('local-floor');

        try {
            xrReferenceSpace = await xrSession.requestReferenceSpace('local-floor');
        } catch (e) {
            console.log("Local-floor not available, using viewer reference space");
            xrReferenceSpace = await xrSession.requestReferenceSpace('viewer');
        }

        if (xrSession.requestHitTestSource) {
            try {
                const viewSpace = await xrSession.requestReferenceSpace('viewer');
                xrHitTestSource = await xrSession.requestHitTestSource({
                    space: viewSpace,
                    entityTypes: ['plane', 'mesh']
                });
                console.log("Hit-test ready");
            } catch (e) {
                console.warn("Hit test failed:", e);
            }
        }

        document.getElementById('arButton').style.display = 'none';
        animate();
    } catch (err) {
        console.error("AR session failed:", err);
        alert("Failed to start AR: " + err.message);
    }
}

// Session end handler
function onSessionEnd() {
    renderer.setAnimationLoop(null);
    if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    renderer.dispose();

    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }

    xrSession = null;
    xrHitTestSource = null;
    xrReferenceSpace = null;
    if (currentModel) {
        scene.remove(currentModel);
        currentModel = null;
    }
    modelAnchor = null;

    document.getElementById('arButton').style.display = 'block';
    warningDiv.style.display = 'none';

    initScene();
    console.log("AR session ended and scene reinitialized");
}

// Visibility change handler
function onVisibilityChange() {
    if (xrSession && xrSession.visibilityState === 'visible-blurred') {
        warningDiv.style.display = 'block';
    } else {
        warningDiv.style.display = 'none';
    }
}

// Tap handler
function onTap(event) {
    if (!renderer.xr.isPresenting || !xrSession) {
        console.log("Not in AR session");
        return;
    }

    const now = Date.now();
    if (now - lastPlacementTime < placementCooldown) {
        return;
    }
    lastPlacementTime = now;

    console.log("Tap detected - attempting to place model");
    placeModel();
}

// Place model function
async function placeModel() {
    if (currentModel && modelAnchor) {
        try {
            const newAnchor = await xrSession.createAnchor(currentModel.matrix, xrReferenceSpace);
            if (newAnchor) {
                if (modelAnchor.cancel) modelAnchor.cancel();
                modelAnchor = newAnchor;
                console.log("Anchor updated");
            }
        } catch (e) {
            console.warn("Failed to update anchor:", e);
        }
        return;
    }

    if (currentModel) {
        scene.remove(currentModel);
        currentModel = null;
    }

    loader.load(
        '/static/objects/aoiBa.glb',
        async (gltf) => {
            currentModel = gltf.scene;
            currentModel.scale.set(0.1, 0.1, 0.1);

            currentModel.traverse((child) => {
                if (child.isMesh) {
                    console.log("Material:", child.material);
                }
            });

            if (xrHitTestSource && xrReferenceSpace) {
                try {
                    const frame = renderer.xr.getFrame();
                    const hitTestResults = frame.getHitTestResults(xrHitTestSource);

                    if (hitTestResults.length > 0) {
                        const hit = hitTestResults[0];
                        const hitPose = hit.getPose(xrReferenceSpace);

                        if (hitPose) {
                            const hitMatrix = new THREE.Matrix4().fromArray(hitPose.transform.matrix);
                            currentModel.applyMatrix4(hitMatrix);

                            if (xrSession.createAnchor) {
                                try {
                                    modelAnchor = await xrSession.createAnchor(hitPose.transform, xrReferenceSpace);
                                    console.log("Anchor created for stable positioning");
                                } catch (e) {
                                    console.warn("Couldn't create anchor:", e);
                                }
                            }
                            console.log("Placed model on surface");
                        }
                    }
                } catch (e) {
                    console.warn("Hit test failed:", e);
                }
            }

            if (!currentModel.parent) {
                const xrCamera = renderer.xr.getCamera(camera);
                const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(xrCamera.quaternion);
                currentModel.position.copy(xrCamera.position).add(forward.multiplyScalar(1.5));
                currentModel.quaternion.copy(xrCamera.quaternion);
                console.log("Placed model in front of camera");
            }

            scene.add(currentModel);
            console.log("Scene children after adding model:", scene.children);
        },
        undefined,
        (error) => {
            console.error("Error loading model:", error);
        }
    );
}

// Animation loop
function animate() {
    renderer.setAnimationLoop((timestamp, frame) => {
        if (!frame || !xrSession) return;

        render(frame);

        if (frame.getViewerPose) {
            const pose = frame.getViewerPose(xrReferenceSpace);
            if (!pose || pose.emulatedPosition) {
                warningDiv.style.display = 'block';
            } else {
                warningDiv.style.display = 'none';
            }
        }
    });
}

// Render function
function render(frame) {
    if (renderer.xr.isPresenting) {
        const xrCamera = renderer.xr.getCamera(camera);
        const pos = xrCamera.position;
        infoDiv.textContent = `Camera Position: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`;

        if (currentModel && !modelAnchor) {
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(xrCamera.quaternion);
            const targetPos = xrCamera.position.clone().add(forward.multiplyScalar(1.5));
            currentModel.position.lerp(targetPos, 0.05);
        }
    }

    renderer.render(scene, camera);
}

// Initialize when window loads
window.onload = () => {
    initScene();
    document.getElementById('arButton').addEventListener('click', startAR);
};