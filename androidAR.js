let scene, camera, renderer, xrSession, xrReferenceSpace, xrHitTestSource;
let infoDiv, warningDiv, loadingDiv, modelDropdown, exitButton;
let currentModel = null;
let modelAnchor = null;
let previewModel = null;
let hasPlacedModel = false;

const loader = new THREE.GLTFLoader();
const forward = new THREE.Vector3(0, 0, -1);
const targetPos = new THREE.Vector3();
let lastUpdate = 0;
let lastPlacementTime = 0;
const PLACEMENT_COOLDOWN = 200;

window.onload = () => {
  initScene();
  document.getElementById('arButton').addEventListener('click', startAR);
  exitButton = document.getElementById('exitButton');
  exitButton.addEventListener('click', exitAR);
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

  if (!navigator.xr) {
    alert("WebXR not supported");
    resetUI();
    return;
  }

  const supported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!supported) {
    alert("immersive-ar not supported");
    resetUI();
    return;
  }

  try {
    initScene();

    xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hit-test', 'anchors', 'dom-overlay'],
      domOverlay: { root: document.body }
    });

    xrReferenceSpace = await xrSession.requestReferenceSpace('local-floor');
    const viewerSpace = await xrSession.requestReferenceSpace('viewer');
    xrHitTestSource = await xrSession.requestHitTestSource({ space: viewerSpace });

    xrSession.addEventListener('end', onSessionEnd);
    xrSession.addEventListener('visibilitychange', onVisibilityChange);

    renderer.xr.setSession(xrSession);
    hasPlacedModel = false;
    await loadPreviewModel();

    animate();

    document.getElementById('modelSelector').style.display = 'none';
    exitButton.style.display = 'block';
    resetUI();
  } catch (err) {
    console.error("Failed to start AR:", err);
    alert("AR failed: " + err.message);
    resetUI();
  }
}

function resetUI() {
  const button = document.getElementById('arButton');
  button.disabled = false;
  button.innerText = "Start AR";
}

function exitAR() {
  if (xrSession) {
    xrSession.end().catch(console.error);
  } else {
    onSessionEnd();
  }
}

function onSessionEnd() {
  renderer.setAnimationLoop(null);
  xrSession?.removeEventListener('end', onSessionEnd);
  xrSession?.removeEventListener('visibilitychange', onVisibilityChange);
  xrSession = null;
  xrHitTestSource = null;
  xrReferenceSpace = null;

  [currentModel, previewModel].forEach(m => m && scene.remove(m));
  currentModel = previewModel = modelAnchor = null;

  document.getElementById('modelSelector').style.display = 'block';
  exitButton.style.display = 'none';
  warningDiv.style.display = 'none';
}

function onVisibilityChange() {
  warningDiv.style.display = xrSession?.visibilityState === 'visible-blurred' ? 'block' : 'none';
}

function onTap() {
  if (!previewModel || !xrSession || hasPlacedModel) return;
  const now = Date.now();
  if (now - lastPlacementTime < PLACEMENT_COOLDOWN) return;
  lastPlacementTime = now;
  placeModelAtPreview();
}

async function loadPreviewModel() {
  const modelPath = `./assets/models/${modelDropdown.value}`;
  loadingDiv.style.display = 'block';

  return new Promise((resolve, reject) => {
    loader.load(modelPath, (gltf) => {
      previewModel = gltf.scene;
      previewModel.scale.set(0.1, 0.1, 0.1);
      previewModel.visible = false;
      scene.add(previewModel);
      loadingDiv.style.display = 'none';
      resolve();
    }, undefined, err => {
      loadingDiv.style.display = 'none';
      console.error("Preview load error:", err);
      alert("Model failed to load");
      reject();
    });
  });
}

async function placeModelAtPreview() {
  if (!previewModel || !xrSession || !xrReferenceSpace) return;

  const matrix = previewModel.matrixWorld.clone();

  loader.load(`./assets/models/${modelDropdown.value}`, async (gltf) => {
    currentModel = gltf.scene;
    currentModel.scale.set(0.1, 0.1, 0.1);
    currentModel.applyMatrix4(matrix);
    scene.add(currentModel);

    try {
      modelAnchor = await xrSession.createAnchor(new XRRigidTransform().fromMatrix(matrix), xrReferenceSpace);
    } catch (e) {
      console.warn("Anchor failed, using static placement:", e);
    }

    previewModel.visible = false;
    hasPlacedModel = true;
  });
}

function animate() {
  renderer.setAnimationLoop((timestamp, frame) => {
    if (!frame || !xrSession) return;

    const pose = frame.getViewerPose(xrReferenceSpace);
    warningDiv.style.display = !pose || pose.emulatedPosition ? 'block' : 'none';

    if (!hasPlacedModel && previewModel && xrHitTestSource) {
      const hits = frame.getHitTestResults(xrHitTestSource);
      if (hits.length > 0) {
        const pose = hits[0].getPose(xrReferenceSpace);
        if (pose) {
          previewModel.visible = true;
          const matrix = new THREE.Matrix4().fromArray(pose.transform.matrix);
          previewModel.matrixAutoUpdate = false;
          previewModel.matrix.copy(matrix);
        }
      } else {
        previewModel.visible = false;
      }
    }

    render(frame);
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
  }

  renderer.render(scene, camera);
}
