// main.js
let scene, camera, renderer, xrSession = null, xrReferenceSpace, xrHitTestSource = null;
let infoDiv, warningDiv, loadingDiv;
let currentModel = null;
let modelAnchor = null;
let preloadedModel = null;
const loader = new THREE.GLTFLoader();
let lastPlacementTime = 0;
const placementCooldown = 200;
const forward = new THREE.Vector3(0, 0, -1);
const targetPos = new THREE.Vector3();
let lastUpdate = 0;

function checkWebXRSupport() {
  if (!navigator.xr) {
    alert("WebXR not supported in your browser");
    return false;
  }
  return true;
}

function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(0.5, 1, 0.5);
  scene.add(directionalLight);
}

function initScene() {
  if (renderer) {
    renderer.setAnimationLoop(null);
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    renderer.dispose();
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
  loadingDiv = document.getElementById('loading');

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener('click', onTap);

  // Start preloading the model
  preloadModel();
}

function preloadModel() {
  console.log("Preloading model...");
  loadingDiv.classList.remove('hidden'); // Show loading indicator
  loader.load(
    './assets/models/aoiBa.glb',
    (gltf) => {
      preloadedModel = gltf.scene;
      preloadedModel.scale.set(0.1, 0.1, 0.1);
      console.log("Model preloaded successfully");
      loadingDiv.classList.add('hidden'); // Hide loading indicator
    },
    undefined,
    (error) => {
      console.error("Error preloading model:", error);
      loadingDiv.textContent = "Failed to load model. Please try again.";
    }
  );
}

async function startAR() {
  console.log("Start AR clicked");

  if (!checkWebXRSupport()) return;

  const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!isSupported) {
    alert("immersive-ar not supported");
    return;
  }

  try {
    xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hit-test', 'dom-overlay', 'anchors'],
      domOverlay: { root: document.body }
    });

    renderer.xr.setSession(xrSession);
    xrSession.addEventListener('end', onSessionEnd);
    xrSession.addEventListener('visibilitychange', onVisibilityChange);

    try {
      xrReferenceSpace = await xrSession.requestReferenceSpace('local-floor');
    } catch (e) {
      console.log("Local-floor not available, using viewer reference space");
      xrReferenceSpace = await xrSession.requestReferenceSpace('viewer');
    }

    if (xrSession.requestHitTestSource) {
      try {
        const viewSpace = await xrSession.requestReferenceSpace('viewer');
        xrHitTestSource = await xrSession.requestHitTestSource({
          space: viewSpace,
          entityTypes: ['plane', 'mesh']
        });
        console.log("Hit-test ready");
      } catch (e) {
        console.warn("Hit test failed:", e);
      }
    }

    document.getElementById('arButton').style.display = 'none';
    animate();
  } catch (err) {
    console.error("AR session failed:", err);
    alert("Failed to start AR: " + err.message);
  }
}

function onSessionEnd() {
  renderer.setAnimationLoop(null);
  if (renderer.domElement && renderer.domElement.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement);
  }
  renderer.dispose();

  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }

  xrSession = null;
  xrHitTestSource = null;
  xrReferenceSpace = null;
  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }
  modelAnchor = null;

  document.getElementById('arButton').style.display = 'block';
  warningDiv.style.display = 'none';
  loadingDiv.classList.add('hidden');

  initScene();
  console.log("AR session ended and scene reinitialized");
}

function onVisibilityChange() {
  if (xrSession && xrSession.visibilityState === 'visible-blurred') {
    warningDiv.style.display = 'block';
  } else {
    warningDiv.style.display = 'none';
  }
}

function onTap(event) {
  if (!renderer.xr.isPresenting || !xrSession) {
    console.log("Not in AR session");
    return;
  }

  const now = Date.now();
  if (now - lastPlacementTime < placementCooldown) {
    return;
  }
  lastPlacementTime = now;

  console.log("Tap detected - attempting to place model");
  placeModel();
}

async function placeModel() {
  if (!preloadedModel) {
    console.warn("Model not preloaded yet");
    loadingDiv.textContent = "Model still loading, please wait...";
    loadingDiv.classList.remove('hidden');
    return;
  }

  if (currentModel) {
    scene.remove(currentModel);
    if (modelAnchor && modelAnchor.cancel) {
      modelAnchor.cancel();
    }
    modelAnchor = null;
  }

  currentModel = preloadedModel.clone();
  scene.add(currentModel);

  if (xrHitTestSource && xrReferenceSpace) {
    try {
      const frame = renderer.xr.getFrame();
      const hitTestResults = frame.getHitTestResults(xrHitTestSource);

      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const hitPose = hit.getPose(xrReferenceSpace);

        if (hitPose) {
          const hitMatrix = new THREE.Matrix4().fromArray(hitPose.transform.matrix);
          currentModel.applyMatrix4(hitMatrix);

          if (xrSession.createAnchor) {
            try {
              modelAnchor = await xrSession.createAnchor(hitPose.transform, xrReferenceSpace);
              console.log("Anchor created for stable positioning");
            } catch (e) {
              console.warn("Couldn't create anchor:", e);
            }
          }
          console.log("Placed model on surface");
          return;
        }
      }
    } employing {
      console.warn("Hit test failed:", e);
    }
  }

  const xrCamera = renderer.xr.getCamera(camera);
  forward.set(0, 0, -1).applyQuaternion(xrCamera.quaternion);
  currentModel.position.copy(xrCamera.position).add(forward.multiplyScalar(1.5));
  currentModel.quaternion.copy(xrCamera.quaternion);
  console.log("Placed model in front of camera");
}

function animate() {
  renderer.setAnimationLoop((timestamp, frame) => {
    if (!frame || !xrSession) return;
    render(frame);

    if (frame.getViewerPose) {
      const pose = frame.getViewerPose(xrReferenceSpace);
      if (!pose || pose.emulatedPosition) {
        warningDiv.style.display = 'block';
      } else {
        warningDiv.style.display = 'none';
      }
    }
  });
}

function render(frame) {
  if (renderer.xr.isPresenting) {
    const xrCamera = renderer.xr.getCamera(camera);
    const pos = xrCamera.position;
    const now = performance.now();
    if (now - lastUpdate > 100) {
      infoDiv.textContent = `Camera Position: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`;
      lastUpdate = now;
    }

    if (currentModel && !modelAnchor) {
      forward.set(0, 0, -1).applyQuaternion(xrCamera.quaternion);
      targetPos.copy(xrCamera.position).add(forward.multiplyScalar(1.5));
      currentModel.position.copy(targetPos);
    }
  }
  renderer.render(scene, camera);
}

window.onload = () => {
  initScene();
  document.getElementById('arButton').addEventListener('click', startAR);
};