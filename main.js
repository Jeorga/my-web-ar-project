let scene, camera, renderer, xrSession = null, xrReferenceSpace, xrHitTestSource = null;
let infoDiv, warningDiv, loadingDiv;
let currentModel = null, modelAnchor = null;
const loader = new THREE.GLTFLoader();
let lastPlacementTime = 0;
const placementCooldown = 500;

function checkWebXRSupport() {
    if (!navigator.xr) {
        document.body.innerHTML = '<h1 style="text-align: center; padding: 2rem;">WebXR not supported. Use a compatible mobile browser.</h1>';
        return false;
    }
    return true;
}

function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0.5, 1, 0.5);
    scene.add(directionalLight);
}

function initScene() {
    if (renderer) {
        renderer.setAnimationLoop(null);
        if (renderer.domElement.parentNode) {
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
    loadingDiv = document.getElementById('loading');

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('click', onTap);
}

async function startAR() {
    if (!checkWebXRSupport()) return;

    try {
        xrSession = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['local-floor'],
            optionalFeatures: ['hit-test', 'dom-overlay'],
            domOverlay: { root: document.body }
        });

        renderer.xr.setSession(xrSession);
        xrSession.addEventListener('end', onSessionEnd);
        xrSession.addEventListener('visibilitychange', onVisibilityChange);
        xrReferenceSpace = await xrSession.requestReferenceSpace('local-floor');

        if (xrSession.requestHitTestSource) {
            const viewSpace = await xrSession.requestReferenceSpace('viewer');
            xrHitTestSource = await xrSession.requestHitTestSource({
                space: viewSpace,
                entityTypes: ['plane']
            });
        }

        document.getElementById('arButton').style.display = 'none';
        animate();
    } catch (err) {
        alert("Failed to start AR: " + err.message);
    }
}

function onSessionEnd() {
    renderer.setAnimationLoop(null);
    if (renderer.domElement.parentNode) {
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
}

function onVisibilityChange() {
    warningDiv.style.display = xrSession && xrSession.visibilityState === 'visible-blurred' ? 'block' : 'none';
}

function onTap(event) {
    if (!renderer.xr.isPresenting || !xrSession) return;
    const now = Date.now();
    if (now - lastPlacementTime < placementCooldown) return;
    lastPlacementTime = now;
    placeModel();
}

async function placeModel() {
    if (currentModel && modelAnchor) {
        try {
            const newAnchor = await xrSession.createAnchor(currentModel.matrix, xrReferenceSpace);
            if (newAnchor) {
                if (modelAnchor.cancel) modelAnchor.cancel();
                modelAnchor = newAnchor;
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

    loadingDiv.style.display = 'block';
    loader.load(
        '/static/objects/aoiBa.glb',
        async (gltf) => {
            currentModel = gltf.scene;
            currentModel.scale.set(0.1, 0.1, 0.1);

            if (xrHitTestSource && xrReferenceSpace) {
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
                            } catch (e) {
                                console.warn("Couldn't create anchor:", e);
                            }
                        }
                    }
                }
            }

            if (!currentModel.parent) {
                const xrCamera = renderer.xr.getCamera(camera);
                const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(xrCamera.quaternion);
                currentModel.position.copy(xrCamera.position).add(forward.multiplyScalar(1.5));
                currentModel.quaternion.copy(xrCamera.quaternion);
            }

            scene.add(currentModel);
            loadingDiv.style.display = 'none';
        },
        undefined,
        (error) => {
            console.error("Error loading model:", error);
            loadingDiv.style.display = 'none';
            alert("Failed to load model. Please try again.");
        }
    );
}

function animate() {
    renderer.setAnimationLoop((timestamp, frame) => {
        if (!frame || !xrSession) return;
        render(frame);
        const pose = frame.getViewerPose && frame.getViewerPose(xrReferenceSpace);
        warningDiv.style.display = (!pose || pose.emulatedPosition) ? 'block' : 'none';
    });
}

function render(frame) {
    if (renderer.xr.isPresenting) {
        const xrCamera = renderer.xr.getCamera(camera);
        infoDiv.textContent = `Camera: X: ${xrCamera.position.x.toFixed(2)}, Y: ${xrCamera.position.y.toFixed(2)}, Z: ${xrCamera.position.z.toFixed(2)}`;
        if (currentModel && !modelAnchor) {
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(xrCamera.quaternion);
            const targetPos = xrCamera.position.clone().add(forward.multiplyScalar(1.5));
            currentModel.position.lerp(targetPos, 0.1);
        }
    }
    renderer.render(scene, camera);
}

window.onload = () => {
    initScene();
    document.getElementById('arButton').addEventListener('click', startAR);
};