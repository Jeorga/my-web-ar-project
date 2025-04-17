let scene, camera, renderer, xrSession, xrReferenceSpace, xrHitTestSource;
let infoDiv, warningDiv, loadingDiv, modelDropdown, exitButton, usdzButton;
let currentModel = null;
let modelAnchor = null;
const loader = new THREE.GLTFLoader();
const forward = new THREE.Vector3(0, 0, -1);
const targetPos = new THREE.Vector3();
let lastUpdate = 0;
let lastPlacementTime = 0;
const PLACEMENT_COOLDOWN = 200;
let isIOS = false;
let aframeScene = null;

window.onload = () => {
  // Detect platform
  const parser = Bowser.getParser(window.navigator.userAgent);
  isIOS = parser.getOSName() === 'iOS';

  initScene();
  document.getElementById('arButton').addEventListener('click', startAR);
  exitButton = document.getElementById('exitButton');
  exitButton.addEventListener('click', exitAR);
  usdzButton = document.getElementById('usdzButton');
};

function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
  
  if (renderer) {
    document.body.removeChild(renderer.domElement);
  }
  
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
  modelDropdown = document.getElementById('modelDropdown');

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener('click', onTap);
}

function setupLighting() {
  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const directional = new THREE.DirectionalLight(0xffffff, 20);
  directional.position.set(1, 3, 2);
  directional.castShadow = true;
  scene.add(directional);
  const backlight = new THREE.DirectionalLight(0xffffff, 1);
  backlight.position.set(-1, -1, -1);
  scene.add(backlight);
}

async function startAR() {
  const button = document.getElementById('arButton');
  button.disabled = true;
  button.innerText = "Starting AR...";

  // Check if running on HTTPS
  if (location.protocol !== 'https:') {
    alert("AR requires a secure context (HTTPS). Please access this page via HTTPS.");
    button.disabled = false;
    button.innerText = "Start AR";
    return;
  }

  if (isIOS) {
    // iOS: Try AR.js, fall back to USDZ
    try {
      await startARjs();
      button.disabled = false;
      button.innerText = "Start AR";
    } catch (err) {
      console.error("AR.js failed:", err);
      showUSDZFallback();
      button.disabled = false;
      button.innerText = "Start AR";
    }
    return;
  }

  // Android: Try WebXR
  if (!navigator.xr) {
    alert("WebXR not supported on this browser.");
    showUSDZFallback();
    button.disabled = false;
    button.innerText = "Start AR";
    return;
  }

  try {
    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    if (!supported) {
      alert("Immersive AR not supported on this device.");
      showUSDZFallback();
      button.disabled = false;
      button.innerText = "Start AR";
      return;
    }

    initScene();
    
    xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hit-test', 'dom-overlay'],
      domOverlay: { root: document.body }
    });

    xrSession.addEventListener('end', onSessionEnd);
    xrSession.addEventListener('visibilitychange', onVisibilityChange);

    xrReferenceSpace = await xrSession.requestReferenceSpace('local-floor');
    const viewSpace = await xrSession.requestReferenceSpace('viewer');
    xrHitTestSource = await xrSession.requestHitTestSource({ space: viewSpace });

    renderer.xr.setSession(xrSession);
    animate();
    document.getElementById('modelSelector').style.display = 'none';
    exitButton.style.display = 'block';
    button.disabled = false;
    button.innerText = "Start AR";
  } catch (err) {
    console.error("WebXR session failed:", err);
    alert(`Failed to start AR: ${err.message}`);
    showUSDZFallback();
    button.disabled = false;
    button.innerText = "Start AR";
  }
}

async function startARjs() {
  // Create A-Frame scene for AR.js
  aframeScene = document.createElement('a-scene');
  aframeScene.setAttribute('embedded', '');
  aframeScene.setAttribute('arjs', 'sourceType: webcam; trackingMethod: best; debugUIEnabled: false;');
  aframeScene.setAttribute('vr-mode-ui', 'enabled: false');
  document.body.appendChild(aframeScene);

  // Add markerless AR entity
  const entity = document.createElement('a-entity');
  const modelPath = `./assets/models/${modelDropdown.value}`;
  entity.setAttribute('gltf-model', modelPath);
  entity.setAttribute('scale', '0.1 0.1 0.1');
  entity.setAttribute('position', '0 0 -1.5');
  entity.setAttribute('gesture-handler', ''); // Optional: Add touch gestures
  aframeScene.appendChild(entity);

  // Ensure camera permission
  try {
    await navigator.mediaDevices.getUserMedia({ video: true });
    console.log("Camera permission granted");
  } catch (err) {
    throw new Error("Camera permission denied or unavailable");
  }

  document.getElementById('modelSelector').style.display = 'none';
  exitButton.style.display = 'block';
}

function showUSDZFallback() {
  if (!isIOS) return; // USDZ only for iOS
  const selectedOption = modelDropdown.options[modelDropdown.selectedIndex];
  const usdzPath = `./assets/models/${selectedOption.dataset.usdz}`;
  usdzButton.href = usdzPath;
  usdzButton.style.display = 'block';
  alert("AR not supported. Use the 'View in AR' link for AR Quick Look on iOS.");
}

function exitAR() {
  if (xrSession) {
    xrSession.end().catch(e => console.error("Error ending session:", e));
  }
  if (aframeScene) {
    aframeScene.parentNode.removeChild(aframeScene);
    aframeScene = null;
  }
  onSessionEnd();
}

function onSessionEnd() {
  if (renderer.xr.isPresenting) {
    renderer.xr.getSession().end().catch(e => console.error("Error ending session:", e));
  }
  
  renderer.setAnimationLoop(null);
  
  if (xrSession) {
    xrSession.removeEventListener('end', onSessionEnd);
    xrSession.removeEventListener('visibilitychange', onVisibilityChange);
    xrSession = null;
  }
  
  xrHitTestSource = null;
  xrReferenceSpace = null;

  if (currentModel) scene.remove(currentModel);
  currentModel = null;
  modelAnchor = null;

  document.getElementById('arButton').innerText = "Start AR";
  document.getElementById('arButton').disabled = false;
  document.getElementById('modelSelector').style.display = 'block';
  exitButton.style.display = 'none';
  usdzButton.style.display = 'none';
  warningDiv.style.display = 'none';
}

function onVisibilityChange() {
  warningDiv.style.display = xrSession?.visibilityState === 'visible-blurred' ? 'block' : 'none';
}

function onTap() {
  if (!renderer.xr.isPresenting || !xrSession) return;
  const now = Date.now();
  if (now - lastPlacementTime < PLACEMENT_COOLDOWN) return;
  lastPlacementTime = now;
  placeModel();
}

async function placeModel() {
  if (currentModel && modelAnchor) {
    try {
      const anchor = await xrSession.createAnchor(currentModel.matrix, xrReferenceSpace);
      if (anchor) {
        modelAnchor.cancel?.();
        modelAnchor = anchor;
      }
    } catch (e) {
      console.warn("Anchor update failed:", e);
    }
    return;
  }

  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }

  const modelPath = `./assets/models/${modelDropdown.value}`;
  loadingDiv.style.display = 'block';
  loader.load(
    modelPath,
    async (gltf) => {
      currentModel = gltf.scene;
      currentModel.scale.set(0.1, 0.1, 0.1);

      const frame = renderer.xr.getFrame();
      if (frame && xrHitTestSource && xrReferenceSpace) {
        const hits = frame.getHitTestResults(xrHitTestSource);
        if (hits.length > 0) {
          const pose = hits[0].getPose(xrReferenceSpace);
          if (pose) {
            const matrix = new THREE.Matrix4().fromArray(pose.transform.matrix);
            currentModel.applyMatrix4(matrix);

            try {
              modelAnchor = await xrSession.createAnchor(pose.transform, xrReferenceSpace);
            } catch (e) {
              console.warn("Anchor creation failed:", e);
            }
          }
        }
      }

      if (!currentModel.parent) {
        const xrCam = renderer.xr.getCamera(camera);
        forward.set(0, 0, -1).applyQuaternion(xrCam.quaternion);
        currentModel.position.copy(xrCam.position).add(forward.multiplyScalar(1.5));
        currentModel.quaternion.copy(xrCam.quaternion);
      }

      scene.add(currentModel);
      loadingDiv.style.display = 'none';
    },
    undefined,
    (err) => {
      loadingDiv.style.display = 'none';
      console.error("Model load error:", err);
      alert("Failed to load model. Please try again.");
    }
  );
}

function animate() {
  renderer.setAnimationLoop((timestamp, frame) => {
    if (!frame || !xrSession) return;
    render(frame);

    const pose = frame.getViewerPose(xrReferenceSpace);
    warningDiv.style.display = !pose || pose.emulatedPosition ? 'block' : 'none';
  });
}

function render(frame) {
  if (renderer.xr.isPresenting) {
    const xrCam = renderer.xr.getCamera(camera);
    const pos = xrCam.position;
    const now = performance.now();

    if (now - lastUpdate > 100) {
      infoDiv.textContent = `Camera Position: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`;
      lastUpdate = now;
    }

    if (currentModel && !modelAnchor) {
      forward.set(0, 0, -1).applyQuaternion(xrCam.quaternion);
      targetPos.copy(xrCam.position).add(forward.multiplyScalar(1.5));
      currentModel.position.copy(targetPos);
    }
  }

  renderer.render(scene, camera);
}