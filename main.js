let scene, camera, renderer;
let xrSession = null, xrReferenceSpace = null, xrHitTestSource = null;
let infoDiv, warningDiv, currentModel = null, modelAnchor = null;
const loader = new THREE.GLTFLoader();
const forward = new THREE.Vector3(0, 0, -1), targetPos = new THREE.Vector3();
let lastUpdate = 0, lastPlacementTime = 0;
const placementCooldown = 200;

function checkWebXRSupport() {
  if (!navigator.xr) {
    alert("WebXR not supported in your browser");
    return false;
  }
  return true;
}

function setupLighting() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 1.0);
  directional.position.set(0.5, 1, 0.5);
  scene.add(directional);
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
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
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
  if (!checkWebXRSupport()) return;

  const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!isSupported) return alert("immersive-ar not supported");

  try {
    xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hit-test', 'anchors', 'dom-overlay'],
      domOverlay: { root: document.body }
    });

    renderer.xr.setSession(xrSession);
    xrSession.addEventListener('end', onSessionEnd);
    xrSession.addEventListener('visibilitychange', onVisibilityChange);

    try {
      xrReferenceSpace = await xrSession.requestReferenceSpace('local-floor');
    } catch {
      xrReferenceSpace = await xrSession.requestReferenceSpace('viewer');
    }

    const viewerSpace = await xrSession.requestReferenceSpace('viewer');
    xrHitTestSource = await xrSession.requestHitTestSource({ space: viewerSpace });

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

  if (modelAnchor?.cancel) modelAnchor.cancel();
  scene.clear();

  xrSession = null;
  xrHitTestSource = null;
  xrReferenceSpace = null;
  currentModel = null;
  modelAnchor = null;

  document.getElementById('arButton').style.display = 'block';
  warningDiv.style.display = 'none';

  initScene();
}

function onVisibilityChange() {
  if (xrSession?.visibilityState === 'visible-blurred') {
    warningDiv.style.display = 'block';
  } else {
    warningDiv.style.display = 'none';
  }
}

function onTap(event) {
  if (!xrSession || !renderer.xr.isPresenting) return;

  const now = Date.now();
  if (now - lastPlacementTime < placementCooldown) return;
  lastPlacementTime = now;

  placeModel();
}

async function placeModel() {
  if (currentModel) {
    scene.remove(currentModel);
    disposeModel(currentModel);
    currentModel = null;
  }

  loader.load('./assets/models/aoiBa.glb', async (gltf) => {
    currentModel = gltf.scene;
    currentModel.scale.set(0.1, 0.1, 0.1);

    const frame = renderer.xr.getFrame();
    const hitResults = frame.getHitTestResults(xrHitTestSource);

    if (hitResults.length > 0) {
      const hitPose = hitResults[0].getPose(xrReferenceSpace);
      if (hitPose) {
        const hitMatrix = new THREE.Matrix4().fromArray(hitPose.transform.matrix);
        currentModel.applyMatrix4(hitMatrix);

        try {
          modelAnchor = await xrSession.createAnchor(hitPose.transform, xrReferenceSpace);
        } catch (e) {
          console.warn("Anchor creation failed:", e);
        }
      }
    } else {
      const xrCam = renderer.xr.getCamera(camera);
      forward.set(0, 0, -1).applyQuaternion(xrCam.quaternion);
      currentModel.position.copy(xrCam.position).add(forward.multiplyScalar(1.5));
      currentModel.quaternion.copy(xrCam.quaternion);
    }

    scene.add(currentModel);
  }, undefined, (err) => console.error("Model load error:", err));
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

function disposeModel(model) {
  model.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(mat => mat.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

window.onload = () => {
  initScene();
  document.getElementById('arButton').addEventListener('click', startAR);
};
