let scene, camera, renderer, xrSession = null, xrReferenceSpace;
let models = []; // Store multiple models
let infoDiv, desktopWarningDiv;
const loader = new THREE.GLTFLoader();

// Check if the browser supports WebXR
function checkWebXRSupport() {
    if (!navigator.xr) {
        alert("WebXR not supported in your browser");
        return false;
    }
    return true;
}

// Check if it's a mobile device
function isMobile() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent);
}

function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(0.5, 1, 0.5);
    scene.add(directionalLight);
}

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
    desktopWarningDiv = document.getElementById('desktopWarning');

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('click', onTap);  // Handle screen taps
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

        xrReferenceSpace = await xrSession.requestReferenceSpace('local-floor');
        document.getElementById('arButton').style.display = 'none';
        animate();
    } catch (err) {
        alert("Failed to start AR: " + err.message);
    }
}

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
    xrReferenceSpace = null;
    models = [];  // Clear models
    document.getElementById('arButton').style.display = 'block';  // Show AR button again
}

function onTap(event) {
    if (!xrSession) return;
    placeModel();  // Add a new model on screen tap
}

async function placeModel() {
    loader.load(
        '/static/objects/aoiBa.glb', // Path to your model
        (gltf) => {
            const model = gltf.scene;
            model.scale.set(0.1, 0.1, 0.1);
            models.push(model);
            scene.add(model);

            // Optionally, set model placement logic here, such as random positioning
            model.position.set(Math.random() * 2 - 1, 0, Math.random() * 2 - 1);
        },
        undefined,
        (error) => {
            console.error("Error loading model:", error);
        }
    );
}

function animate() {
    renderer.setAnimationLoop((timestamp, frame) => {
        if (!frame || !xrSession) return;
        render(frame);
    });
}

function render(frame) {
    if (renderer.xr.isPresenting) {
        const xrCamera = renderer.xr.getCamera(camera);
        const pos = xrCamera.position;
        infoDiv.textContent = `Camera Position: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`;
    }

    renderer.render(scene, camera);
}

window.onload = () => {
    if (!isMobile()) {
        desktopWarningDiv.style.display = 'block';  // Show warning for desktop users
        document.getElementById('arButton').style.display = 'none';  // Hide AR button for desktop
    } else {
        initScene();
        document.getElementById('arButton').addEventListener('click', startAR);
    }
};
