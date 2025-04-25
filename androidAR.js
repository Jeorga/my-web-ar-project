let scene, camera, renderer, xrSession, xrReferenceSpace, hitTestSource;
let currentModel = null;
let previewModel = null;
const loader = new THREE.GLTFLoader();
const modelPath = () => `./assets/models/${document.getElementById('modelDropdown').value}`;
let hasPlaced = false;

window.onload = () => {
  initScene();
  document.getElementById('arButton').addEventListener('click', startAR);
  document.getElementById('exitButton').addEventListener('click', exitAR);
};

function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);
}

async function startAR() {
  if (!navigator.xr) return alert("WebXR not supported on this browser.");
  const supported = await navigator.xr.isSessionSupported("immersive-ar");
  if (!supported) return alert("AR not supported on this device.");

  xrSession = await navigator.xr.requestSession("immersive-ar", {
    requiredFeatures: ["hit-test", "local-floor"],
    optionalFeatures: ["dom-overlay"],
    domOverlay: { root: document.body }
  });

  xrReferenceSpace = await xrSession.requestReferenceSpace("local-floor");
  const viewerSpace = await xrSession.requestReferenceSpace("viewer");
  hitTestSource = await xrSession.requestHitTestSource({ space: viewerSpace });

  renderer.xr.setSession(xrSession);
  loadPreviewModel();
  renderer.setAnimationLoop(render);

  document.getElementById('modelSelector').style.display = 'none';
  document.getElementById('exitButton').style.display = 'block';
  window.addEventListener('click', placeModel);
}

function exitAR() {
  if (xrSession) xrSession.end();
  renderer.setAnimationLoop(null);
  if (currentModel) scene.remove(currentModel);
  if (previewModel) scene.remove(previewModel);
  currentModel = previewModel = null;
  hasPlaced = false;

  document.getElementById('modelSelector').style.display = 'block';
  document.getElementById('exitButton').style.display = 'none';
}

function loadPreviewModel() {
  loader.load(modelPath(), (gltf) => {
    previewModel = gltf.scene;
    previewModel.scale.set(0.1, 0.1, 0.1);
    previewModel.traverse(child => {
      if (child.isMesh) {
        child.material.transparent = true;
        child.material.opacity = 0.4;
      }
    });
    scene.add(previewModel);
  });
}

function placeModel() {
  if (!previewModel || hasPlaced) return;

  currentModel = previewModel;
  previewModel = null;
  currentModel.traverse(child => {
    if (child.isMesh) {
      child.material.opacity = 1;
      child.material.transparent = false;
    }
  });
  hasPlaced = true;
}

function render(timestamp, frame) {
  if (!frame || !hitTestSource || hasPlaced) return renderer.render(scene, camera);

  const hitTestResults = frame.getHitTestResults(hitTestSource);
  if (hitTestResults.length > 0) {
    const hitPose = hitTestResults[0].getPose(xrReferenceSpace);
    if (hitPose && previewModel) {
      const pos = hitPose.transform.position;
      const rot = hitPose.transform.orientation;
      previewModel.position.set(pos.x, pos.y, pos.z);
      previewModel.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    }
  }

  renderer.render(scene, camera);
}
