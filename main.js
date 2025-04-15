let scene, camera, renderer, xrSession, xrReferenceSpace, xrHitTestSource;
let currentModel, modelAnchor;
let selectedModel = 'aoiBa.glb';
let infoDiv, warningDiv;

const loader = new THREE.GLTFLoader();
const forward = new THREE.Vector3(0, 0, -1);
const targetPos = new THREE.Vector3();
let lastUpdate = 0;
let lastPlacementTime = 0;
const PLACEMENT_COOLDOWN = 200;

window.onload = () => {
  initScene();

  document.getElementById('modelDropdown').addEventListener('change', e => {
    selectedModel = e.target.value;
  });

  document.getElementById('arButton').addEventListener('click', startAR);
  document.getElementById('exitButton').addEventListener('click', endAR);
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

  setupLighting();

  infoDiv = document.getElementById('info');
  warningDiv = document.getElementById('warning');

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener('click', onTap);
}

function setupLighting() {
  const ambient = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 20);
  directional.position.set(1, 3, 2);
  directional.castShadow = true;
  scene.add(directional);

  const backlight = new THREE.DirectionalLight(0xffffff, 1);
  backlight.position.set(-1, -1, -1);
  scene.add(backlight);
}

async function startAR() {
  const arButton = document.getElementById('arButton');
  const exitButton = document.getElementById('exitButton');
  arButton.disabled = true;
  arButton.innerText = "Starting...";

  if (!navigator.xr) return alert("WebXR not supported");

  const supported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!supported) return alert("immersive-ar not supported");

  try {
    xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hit-test', 'dom-overlay', 'anchors'],
      domOverlay: { root: document.body }
    });

    xrSession.addEventListener('end', endAR);
    xrSession.addEventListener('visibilitychange', () => {
      warningDiv.style.display = xrSession?.visibilityState === 'visible-blurred' ? 'block' : 'none';
    });

    xrReferenceSpace = await xrSession.requestReferenceSpace('local-floor');
    const viewerSpace = await xrSession.requestReferenceSpace('viewer');
    xrHitTestSource = await xrSession.requestHitTestSource({ space: viewerSpace });

    renderer.xr.setSession(xrSession);
    renderer.setAnimationLoop(animate);

    document.getElementById('modelSelector').style.display = 'none';
    arButton.style.display = 'none';
    exitButton.style.display = 'block';
  } catch (err) {
    console.error("AR failed:", err);
    alert("AR start failed: " + err.message);
  }
}

function endAR() {
  if (xrSession) {
    xrSession.end();
    xrSession = null;
  }

  if (currentModel) scene.remove(currentModel);
  currentModel = null;
  modelAnchor = null;

  document.getElementById('arButton').innerText = "Start AR";
  document.getElementById('arButton').disabled = false;
  document.getElementById('arButton').style.display = 'block';
  document.getElementById('exitButton').style.display = 'none';
  document.getElementById('modelSelector').style.display = 'block';
  warningDiv.style.display = 'none';

  renderer.setAnimationLoop(null);
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
      modelAnchor?.cancel?.();
      modelAnchor = anchor;
    } catch (e) {
      console.warn("Anchor update failed:", e);
    }
    return;
  }

  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }

  loader.load(`./assets/models/${selectedModel}`, async (gltf) => {
    currentModel = gltf.scene;
    currentModel.scale.set(0.1, 0.1, 0.1);

    const frame = renderer.xr.getFrame();
    if (frame && xrHitTestSource) {
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
  }, undefined, err => {
    console.error("Failed to load model:", err);
  });
}

function animate(timestamp, frame) {
  if (!frame || !xrSession) return;
  render(frame);

  const pose = frame.getViewerPose(xrReferenceSpace);
  warningDiv.style.display = !pose || pose.emulatedPosition ? 'block' : 'none';
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
