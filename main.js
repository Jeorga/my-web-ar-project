let scene, camera, renderer, xrSession, xrReferenceSpace, xrHitTestSource;
let currentModel = null, modelAnchor = null;
const loader = new THREE.GLTFLoader();
const forward = new THREE.Vector3(0, 0, -1);
const targetPos = new THREE.Vector3();
let lastUpdate = 0, lastPlacementTime = 0;
const PLACEMENT_COOLDOWN = 200;

window.onload = () => {
  const arButton = document.getElementById('arButton');
  const exitButton = document.getElementById('exitButton');
  const unsupported = document.getElementById('unsupportedMessage');
  const modelDropdown = document.getElementById('modelDropdown');

  // Detect platform
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const isAndroid = /android/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;

  if (!isAndroid && !isIOS) {
    unsupported.style.display = 'block';
    document.getElementById('modelSelector').style.display = 'none';
    return;
  }

  arButton.addEventListener('click', () => {
    const model = modelDropdown.value;
    if (isIOS) {
      // iOS: Launch USDZ via Quick Look
      const usdzPath = `./assets/models/${model}.usdz`;
      const a = document.createElement('a');
      a.rel = 'ar';
      a.href = usdzPath;
      a.appendChild(document.createElement('img'));
      a.click();
    } else if (isAndroid) {
      // Android: Start WebXR AR
      startWebXR(model + ".glb");
    }
  });

  exitButton.addEventListener('click', exitAR);
  initScene();
};

function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  document.body.appendChild(renderer.domElement);

  setupLighting();

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
}

async function startWebXR(glbPath) {
  const button = document.getElementById('arButton');
  const exitButton = document.getElementById('exitButton');
  const loadingDiv = document.getElementById('loading');

  if (!navigator.xr) return alert("WebXR not supported");

  const supported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!supported) return alert("immersive-ar not supported");

  try {
    if (xrSession) await xrSession.end();

    xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hit-test', 'anchors', 'dom-overlay'],
      domOverlay: { root: document.body }
    });

    xrSession.addEventListener('end', onSessionEnd);
    xrReferenceSpace = await xrSession.requestReferenceSpace('local-floor');
    const viewSpace = await xrSession.requestReferenceSpace('viewer');
    xrHitTestSource = await xrSession.requestHitTestSource({ space: viewSpace });

    renderer.xr.setSession(xrSession);
    document.getElementById('modelSelector').style.display = 'none';
    exitButton.style.display = 'block';

    loadGLBModel(glbPath);
    animate();
  } catch (err) {
    alert("AR failed: " + err.message);
    console.error(err);
  }
}

function exitAR() {
  if (xrSession) xrSession.end();
}

function onSessionEnd() {
  renderer.setAnimationLoop(null);
  if (currentModel) scene.remove(currentModel);
  currentModel = null;
  modelAnchor = null;
  xrSession = null;
  xrReferenceSpace = null;
  xrHitTestSource = null;
  document.getElementById('modelSelector').style.display = 'block';
  document.getElementById('exitButton').style.display = 'none';
  document.getElementById('warning').style.display = 'none';
}

function onTap() {
  if (!xrSession) return;
  const now = Date.now();
  if (now - lastPlacementTime < PLACEMENT_COOLDOWN) return;
  lastPlacementTime = now;
  placeModel();
}

function loadGLBModel(path) {
  document.getElementById('loading').style.display = 'block';
  loader.load(`./assets/models/${path}`, (gltf) => {
    currentModel = gltf.scene;
    currentModel.scale.set(0.1, 0.1, 0.1);
    scene.add(currentModel);
    document.getElementById('loading').style.display = 'none';
  }, undefined, err => {
    alert("Failed to load model");
    console.error(err);
    document.getElementById('loading').style.display = 'none';
  });
}

async function placeModel() {
  if (!currentModel || !xrHitTestSource) return;
  const frame = renderer.xr.getFrame();
  const hits = frame.getHitTestResults(xrHitTestSource);
  if (hits.length > 0) {
    const pose = hits[0].getPose(xrReferenceSpace);
    if (pose) {
      currentModel.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
      currentModel.quaternion.set(pose.transform.orientation.x, pose.transform.orientation.y, pose.transform.orientation.z, pose.transform.orientation.w);
    }
  }
}

function animate() {
  renderer.setAnimationLoop((timestamp, frame) => {
    if (!frame || !xrSession) return;
    const pose = frame.getViewerPose(xrReferenceSpace);
    document.getElementById('warning').style.display = pose?.emulatedPosition ? 'block' : 'none';

    if (currentModel && !modelAnchor) {
      const xrCam = renderer.xr.getCamera(camera);
      forward.set(0, 0, -1).applyQuaternion(xrCam.quaternion);
      targetPos.copy(xrCam.position).add(forward.multiplyScalar(1.5));
      currentModel.position.copy(targetPos);
    }

    renderer.render(scene, camera);
  });
}
