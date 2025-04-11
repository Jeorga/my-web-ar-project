import * as THREE from 'three';

let scene, camera, renderer, xrSession = null, xrReferenceSpace, xrHitTestSource = null;
let currentModel = null;
let modelAnchor = null;
let infoDiv, warningDiv;
const loader = new THREE.GLTFLoader();
let lastPlacementTime = 0;
const placementCooldown = 500;

function showError(error) {
  const log = document.getElementById('errorLog');
  log.style.display = 'block';
  log.innerText += error + '\n';
  console.error(error); // Log error to console as well for better visibility
}

window.onerror = function(message, source, lineno, colno, error) {
  const errorMessage = `JS Error: ${message} at ${source}:${lineno}:${colno}`;
  showError(errorMessage);
};

window.addEventListener("unhandledrejection", function(event) {
  showError("Unhandled Promise Rejection: " + event.reason);
});

function isMobile() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent);
}

function checkWebXRSupport() {
  if (!navigator.xr) {
    showError("WebXR not supported in your browser");
    return false;
  }
  return true;
}

function setupLighting() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  const directional = new THREE.DirectionalLight(0xffffff, 1);
  directional.position.set(0.5, 1, 0.5);
  scene.add(ambient, directional);
}

function initScene() {
  if (renderer) {
    renderer.setAnimationLoop(null);
    renderer.dispose();
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
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
  warningDiv = document.getElementById('warning');

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener('click', onTap);
}

async function startAR() {
  showError("Start AR clicked");
  if (!checkWebXRSupport()) return;

  try {
    xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hit-test', 'dom-overlay', 'anchors'],
      domOverlay: { root: document.body }
    });

    console.log("AR session started successfully");
    renderer.xr.setSession(xrSession);
    xrReferenceSpace = await xrSession.requestReferenceSpace('local-floor');

    const viewerSpace = await xrSession.requestReferenceSpace('viewer');
    xrHitTestSource = await xrSession.requestHitTestSource({ space: viewerSpace });

    document.getElementById('arButton').style.display = 'none';

    animate();
  } catch (e) {
    const errorMessage = "AR session failed: " + e.message;
    showError(errorMessage);
    console.error(errorMessage);
  }
}

function onTap() {
  if (!renderer.xr.isPresenting || !xrSession) {
    showError("Tap ignored: Not in AR session");
    return;
  }

  const now = Date.now();
  if (now - lastPlacementTime < placementCooldown) return;
  lastPlacementTime = now;

  placeModel();
}

async function placeModel() {
  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }

  loader.load(
    'assets/objects/aoiBtest.glb', // ✅ Make sure your model is here
    async (gltf) => {
      console.log("Model loaded", gltf);
      currentModel = gltf.scene;
      currentModel.scale.set(0.01, 0.01, 0.01);

      const frame = renderer.xr.getFrame();
      const hits = frame.getHitTestResults(xrHitTestSource);

      if (hits.length > 0) {
        const hit = hits[0];
        const pose = hit.getPose(xrReferenceSpace);
        currentModel.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
      } else {
        const xrCamera = renderer.xr.getCamera(camera);
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(xrCamera.quaternion);
        currentModel.position.copy(xrCamera.position).add(forward.multiplyScalar(1.5));
      }

      scene.add(currentModel);
    },
    undefined,
    (error) => {
      const errorMessage = "Model loading error: " + error.message;
      showError(errorMessage);
      console.error(errorMessage);
    }
  );
}

function animate() {
  renderer.setAnimationLoop((timestamp, frame) => {
    if (!frame || !xrSession) return;

    render(frame);

    const pose = frame.getViewerPose(xrReferenceSpace);
    if (!pose || pose.emulatedPosition) {
      warningDiv.style.display = 'block';
    } else {
      warningDiv.style.display = 'none';
    }
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
    document.body.innerHTML = "<h1 style='text-align:center;margin-top:40vh;'>AR not available for laptop yet, sorry.</h1>";
    return;
  }

  initScene();
  document.getElementById('arButton').addEventListener('click', () => {
    console.log("AR button clicked");
    startAR();
  });
};
