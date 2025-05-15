let scene, camera, renderer, xrSession, xrReferenceSpace, xrHitTestSource;
let infoDiv, warningDiv, loadingDiv, categoryDropdown, modelDropdown, exitButton;
let currentModel = null;
let modelAnchor = null;

const loader = new THREE.GLTFLoader();
const dracoLoader = new THREE.DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
loader.setDRACOLoader(dracoLoader);

const forward = new THREE.Vector3(0, 0, -1);
const targetPos = new THREE.Vector3();
let lastUpdate = 0;
let lastPlacementTime = 0;
const PLACEMENT_COOLDOWN = 200;

// Define categories and their models
const categories = {
  A: [
    { value: 'aoiBa.glb', label: 'A1' },
    { value: '3dmodelconverter_convert3d.glb', label: 'A2' }
  ],
  B: [
    { value: 'aoiBa_draco.glb', label: 'B1' },
    { value: 'twoMachines_blender.glb', label: 'B2' }
  ],
  C: [
    { value: 'twoMachines_blender.glb', label: 'C1' },
    { value: 'aoi_tripo_pbr.glb', label: 'C2' }
  ]
};

window.onload = () => {
  initScene();
  document.getElementById('arButton').addEventListener('click', startAR);
  exitButton = document.getElementById('exitButton');
  exitButton.addEventListener('click', exitAR);
  setupCategoryDropdown();
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
  categoryDropdown = document.getElementById('categoryDropdown');
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

function setupCategoryDropdown() {
  categoryDropdown.addEventListener('change', updateModelDropdown);
  updateModelDropdown();
}

function updateModelDropdown() {
  const category = categoryDropdown.value;
  modelDropdown.innerHTML = '';
  categories[category].forEach(model => {
    const option = document.createElement('option');
    option.value = model.value;
    option.textContent = model.label;
    modelDropdown.appendChild(option);
  });
}

async function startAR() {
  const button = document.getElementById('arButton');
  button.disabled = true;
  button.innerText = "Starting AR...";

  if (!navigator.xr) {
    alert("WebXR not supported");
    button.disabled = false;
    button.innerText = "Start AR";
    return;
  }

  const supported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!supported) {
    alert("immersive-ar not supported");
    button.disabled = false;
    button.innerText = "Start AR";
    return;
  }

  try {
    initScene();
    
    xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hit-test', 'dom-overlay', 'anchors'],
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
    console.error("Failed to start AR:", err);
    alert("AR failed: " + err.message);
    button.disabled = false;
    button.innerText = "Start AR";
  }
}

function exitAR() {
  if (xrSession) {
    xrSession.end().catch(e => console.error("Error ending session:", e));
  } else {
    onSessionEnd();
  }
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

  const modelPath = `assets/models/${categoryDropdown.value}/${modelDropdown.value}`;
  loadingDiv.style.display = 'block';

  loader.load(modelPath, async (gltf) => {
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
  }, undefined, err => {
    loadingDiv.style.display = 'none';
    console.error("Model load error:", err);
    alert("Model failed to load");
  });
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