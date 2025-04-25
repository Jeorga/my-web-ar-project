let scene, camera, renderer, xrSession, xrReferenceSpace, xrHitTestSource;
let infoDiv, warningDiv, loadingDiv, modelDropdown, exitButton;
let currentModel = null, previewModel = null, modelAnchor = null;
const loader = new THREE.GLTFLoader();
const forward = new THREE.Vector3(0, 0, -1);
const targetPos = new THREE.Vector3();
let lastUpdate = 0, lastPlacementTime = 0;
const PLACEMENT_COOLDOWN = 200;
const previewMaterial = new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true });

window.onload = () => {
  initScene();
  document.getElementById('arButton').addEventListener('click', startAR);
  exitButton = document.getElementById('exitButton');
  exitButton.addEventListener('click', exitAR);
};

function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
  
  if (renderer) document.body.removeChild(renderer.domElement);

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
  const directional = new THREE.DirectionalLight(0xffffff, 3);
  directional.position.set(1, 3, 2);
  scene.add(directional);
}

async function startAR() {
  const button = document.getElementById('arButton');
  button.disabled = true;
  button.innerText = "Starting AR...";

  if (!navigator.xr || !(await navigator.xr.isSessionSupported('immersive-ar'))) {
    alert("WebXR immersive-ar not supported");
    button.disabled = false;
    button.innerText = "Start AR";
    return;
  }

  try {
    initScene();

    xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor', 'hit-test'],
      optionalFeatures: ['anchors', 'dom-overlay'],
      domOverlay: { root: document.body }
    });

    xrSession.addEventListener('end', onSessionEnd);
    xrReferenceSpace = await xrSession.requestReferenceSpace('local-floor');
    const viewerSpace = await xrSession.requestReferenceSpace('viewer');
    xrHitTestSource = await xrSession.requestHitTestSource({ space: viewerSpace });

    renderer.xr.setSession(xrSession);
    animate();
    document.getElementById('modelSelector').style.display = 'none';
    exitButton.style.display = 'block';
    button.disabled = false;
    button.innerText = "Start AR";

    await loadPreviewModel(); // Load ghost preview
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
  if (currentModel) scene.remove(currentModel);
  if (previewModel) scene.remove(previewModel);
  currentModel = previewModel = modelAnchor = null;

  xrHitTestSource = null;
  xrReferenceSpace = null;
  xrSession = null;

  document.getElementById('arButton').innerText = "Start AR";
  document.getElementById('arButton').disabled = false;
  document.getElementById('modelSelector').style.display = 'block';
  exitButton.style.display = 'none';
  warningDiv.style.display = 'none';
}

async function loadPreviewModel() {
  const modelPath = `./assets/models/${modelDropdown.value}`;
  return new Promise((resolve, reject) => {
    loader.load(modelPath, (gltf) => {
      previewModel = gltf.scene;
      previewModel.scale.set(0.1, 0.1, 0.1);
      previewModel.traverse(child => {
        if (child.isMesh) child.material = previewMaterial;
      });

      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.2, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.4, transparent: true })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.renderOrder = 1;
      previewModel.add(shadow);

      scene.add(previewModel);
      resolve();
    }, undefined, err => reject(err));
  });
}

function onTap() {
  if (!renderer.xr.isPresenting || !xrSession || !previewModel) return;
  const now = Date.now();
  if (now - lastPlacementTime < PLACEMENT_COOLDOWN) return;
  lastPlacementTime = now;
  placeModel();
}

async function placeModel() {
  if (currentModel) scene.remove(currentModel);
  if (!previewModel) return;

  currentModel = previewModel;
  previewModel = null;

  currentModel.traverse(child => {
    if (child.isMesh && child.material.transparent) {
      child.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    }
  });

  try {
    const poseMatrix = new THREE.Matrix4().copy(currentModel.matrixWorld);
    modelAnchor = await xrSession.createAnchor(poseMatrix, xrReferenceSpace);
  } catch (e) {
    console.warn("Anchor creation failed:", e);
  }

  await loadPreviewModel(); // Load new ghost after placing
}

function animate() {
  renderer.setAnimationLoop((timestamp, frame) => {
    if (!frame || !xrSession) return;

    const pose = frame.getViewerPose(xrReferenceSpace);
    warningDiv.style.display = !pose || pose.emulatedPosition ? 'block' : 'none';

    if (previewModel && xrHitTestSource) {
      const hitTestResults = frame.getHitTestResults(xrHitTestSource);
      if (hitTestResults.length > 0) {
        const hitPose = hitTestResults[0].getPose(xrReferenceSpace);
        if (hitPose) {
          const matrix = new THREE.Matrix4().fromArray(hitPose.transform.matrix);
          previewModel.matrix.fromArray(hitPose.transform.matrix);
          previewModel.matrix.decompose(previewModel.position, previewModel.quaternion, previewModel.scale);
        }
      }
    }

    render(frame);
  });
}

function render(frame) {
  const xrCam = renderer.xr.getCamera(camera);
  const pos = xrCam.position;
  const now = performance.now();

  if (now - lastUpdate > 100) {
    infoDiv.textContent = `Camera Position: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`;
    lastUpdate = now;
  }

  renderer.render(scene, camera);
}
