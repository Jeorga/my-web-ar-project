let scene, camera, renderer, xrSession, xrReferenceSpace, xrHitTestSource;
let currentModel, modelAnchor;
const loader = new THREE.GLTFLoader();
const forward = new THREE.Vector3(0, 0, -1);
let infoDiv, warningDiv, exitButton, menuDiv, selectedModel;
let lastUpdate = 0;
let lastPlacement = 0;

const PLACEMENT_COOLDOWN = 300;

window.onload = () => {
  infoDiv = document.getElementById('info');
  warningDiv = document.getElementById('warning');
  exitButton = document.getElementById('exitButton');
  menuDiv = document.getElementById('menu');

  document.getElementById('startButton').onclick = () => {
    const select = document.getElementById('modelSelect');
    selectedModel = select.value;
    if (selectedModel) startAR();
    else alert('Please select a model.');
  };

  exitButton.onclick = endAR;

  initScene();
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

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1.2);
  scene.add(light);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener('click', onTap);
}

async function startAR() {
  if (!navigator.xr) return alert("WebXR not supported");
  if (!await navigator.xr.isSessionSupported('immersive-ar')) return alert("AR not supported");

  try {
    xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hit-test', 'anchors', 'dom-overlay'],
      domOverlay: { root: document.body }
    });

    xrSession.addEventListener('end', onSessionEnd);
    xrSession.addEventListener('visibilitychange', () => {
      warningDiv.style.display = xrSession.visibilityState === 'visible-blurred' ? 'block' : 'none';
    });

    xrReferenceSpace = await xrSession.requestReferenceSpace('local-floor');
    const viewerSpace = await xrSession.requestReferenceSpace('viewer');
    xrHitTestSource = await xrSession.requestHitTestSource({ space: viewerSpace });

    renderer.xr.setSession(xrSession);
    menuDiv.style.display = 'none';
    exitButton.style.display = 'block';
    animate();
  } catch (err) {
    alert("Failed to start AR: " + err.message);
  }
}

function endAR() {
  if (xrSession) xrSession.end();
}

function onSessionEnd() {
  renderer.setAnimationLoop(null);
  scene.clear();
  if (renderer.domElement) renderer.domElement.remove();
  xrSession = null;
  xrReferenceSpace = null;
  xrHitTestSource = null;
  currentModel = null;
  modelAnchor = null;

  menuDiv.style.display = 'flex';
  exitButton.style.display = 'none';
  warningDiv.style.display = 'none';

  initScene();
}

function onTap() {
  if (!xrSession || Date.now() - lastPlacement < PLACEMENT_COOLDOWN) return;
  lastPlacement = Date.now();
  placeModel();
}

async function placeModel() {
  if (!selectedModel) return;

  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }

  loader.load(`./assets/models/${selectedModel}`, async (gltf) => {
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
      const cam = renderer.xr.getCamera(camera);
      forward.set(0, 0, -1).applyQuaternion(cam.quaternion);
      currentModel.position.copy(cam.position).add(forward.multiplyScalar(1.5));
      currentModel.quaternion.copy(cam.quaternion);
    }

    scene.add(currentModel);
  }, undefined, err => {
    console.error("Failed to load model:", err);
  });
}

function animate() {
  renderer.setAnimationLoop((timestamp, frame) => {
    if (!frame) return;

    const pose = frame.getViewerPose(xrReferenceSpace);
    warningDiv.style.display = !pose || pose.emulatedPosition ? 'block' : 'none';

    const xrCam = renderer.xr.getCamera(camera);
    if (Date.now() - lastUpdate > 100) {
      infoDiv.textContent = `Camera Position: X: ${xrCam.position.x.toFixed(2)}, Y: ${xrCam.position.y.toFixed(2)}, Z: ${xrCam.position.z.toFixed(2)}`;
      lastUpdate = Date.now();
    }

    if (currentModel && !modelAnchor) {
      forward.set(0, 0, -1).applyQuaternion(xrCam.quaternion);
      currentModel.position.copy(xrCam.position).add(forward.multiplyScalar(1.5));
    }

    renderer.render(scene, camera);
  });
}
