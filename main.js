let scene, camera, renderer, xrSession, xrReferenceSpace, xrHitTestSource;
let infoDiv, warningDiv, loadingDiv, modelDropdown, exitButton;
let currentModel = null;
let modelAnchor = null;
const loader = new THREE.GLTFLoader();
const forward = new THREE.Vector3(0, 0, -1);
let lastUpdate = 0;

window.onload = () => {
  initScene();
  document.getElementById('arButton').addEventListener('click', startAR);
  exitButton = document.getElementById('exitButton');
  exitButton.addEventListener('click', exitAR);
  modelDropdown = document.getElementById('modelDropdown');
  modelDropdown.addEventListener('change', () => {
    if (xrSession && renderer.xr.isPresenting) placeModel();
  });
};

function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  infoDiv = document.getElementById('info');
  warningDiv = document.getElementById('warning');
  loadingDiv = document.getElementById('loading');

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

async function startAR() {
  const button = document.getElementById('arButton');
  button.disabled = true;
  button.innerText = "Starting AR...";

  if (!navigator.xr) {
    alert("WebXR not supported. Use Chrome on Android.");
    button.disabled = false;
    button.innerText = "Start AR";
    return;
  }

  try {
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
    document.getElementById('modelSelector').style.display = 'block';
    exitButton.style.display = 'block';
    button.disabled = false;
    button.innerText = "Start AR";
    placeModel();
  } catch (err) {
    alert("AR failed: " + err.message);
    button.disabled = false;
    button.innerText = "Start AR";
  }
}

function exitAR() {
  if (xrSession) xrSession.end();
}

function onSessionEnd() {
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

  document.getElementById('modelSelector').style.display = 'block';
  exitButton.style.display = 'none';
  warningDiv.style.display = 'none';
}

function onVisibilityChange() {
  warningDiv.style.display = xrSession?.visibilityState === 'visible-blurred' ? 'block' : 'none';
}

async function placeModel() {
  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }

  const modelPath = `assets/models/${modelDropdown.value}`;
  loadingDiv.style.display = 'block';

  loader.load(modelPath, (gltf) => {
    currentModel = gltf.scene;
    currentModel.scale.set(0.5, 0.5, 0.5);

    const frame = renderer.xr.getFrame();
    if (frame && xrHitTestSource) {
      const hits = frame.getHitTestResults(xrHitTestSource);
      if (hits.length > 0) {
        const pose = hits[0].getPose(xrReferenceSpace);
        if (pose) {
          currentModel.position.setFromMatrixPosition(new THREE.Matrix4().fromArray(pose.transform.matrix));
        }
      }
    }

    if (!currentModel.position.length()) {
      const xrCam = renderer.xr.getCamera(camera);
      forward.set(0, 0, -1).applyQuaternion(xrCam.quaternion);
      currentModel.position.copy(xrCam.position).add(forward.multiplyScalar(1.5));
    }

    scene.add(currentModel);
    loadingDiv.style.display = 'none';
  }, undefined, (err) => {
    loadingDiv.style.display = 'none';
    alert("Model failed to load: " + err.message);
  });
}

function animate() {
  renderer.setAnimationLoop((timestamp, frame) => {
    if (!frame || !xrSession) return;
    const pose = frame.getViewerPose(xrReferenceSpace);
    warningDiv.style.display = !pose || pose.emulatedPosition ? 'block' : 'none';

    const xrCam = renderer.xr.getCamera(camera);
    const pos = xrCam.position;
    if (performance.now() - lastUpdate > 100) {
      infoDiv.textContent = `Camera Position: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`;
      lastUpdate = performance.now();
    }

    renderer.render(scene, camera);
  });
}