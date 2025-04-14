import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let scene, camera, renderer;
let xrSession = null, xrReferenceSpace, xrHitTestSource = null;
let currentModel = null, modelAnchor = null;
const loader = new GLTFLoader();

let lastPlacementTime = 0;
const placementCooldown = 200;
const forward = new THREE.Vector3(0, 0, -1);
const targetPos = new THREE.Vector3();

const infoDiv = document.getElementById('info');
const warningDiv = document.getElementById('warning');
const loadingDiv = document.getElementById('loading');
const arButton = document.getElementById('arButton');

function setupScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0.5, 1, 0.5);
  scene.add(ambientLight, directionalLight);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener('click', onTap);
}

async function startAR() {
  if (!navigator.xr) return alert('WebXR not supported');

  const supported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!supported) return alert('immersive-ar not supported');

  xrSession = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['local-floor'],
    optionalFeatures: ['hit-test', 'anchors', 'dom-overlay'],
    domOverlay: { root: document.body }
  });

  renderer.xr.setSession(xrSession);
  xrReferenceSpace = await xrSession.requestReferenceSpace('local-floor');

  const viewerSpace = await xrSession.requestReferenceSpace('viewer');
  xrHitTestSource = await xrSession.requestHitTestSource({ space: viewerSpace });

  xrSession.addEventListener('end', onSessionEnd);
  xrSession.addEventListener('visibilitychange', () => {
    warningDiv.style.display = xrSession.visibilityState === 'visible-blurred' ? 'block' : 'none';
  });

  arButton.style.display = 'none';
  loadingDiv.style.display = 'none';
  animate();
}

function onSessionEnd() {
  renderer.setAnimationLoop(null);
  document.body.removeChild(renderer.domElement);
  xrSession = xrHitTestSource = xrReferenceSpace = null;
  currentModel = null;
  modelAnchor = null;
  scene.clear();
  arButton.style.display = 'block';
  warningDiv.style.display = 'none';
  setupScene();
}

function onTap() {
  if (!xrSession || !renderer.xr.isPresenting) return;

  const now = Date.now();
  if (now - lastPlacementTime < placementCooldown) return;
  lastPlacementTime = now;

  placeModel();
}

async function placeModel() {
  if (currentModel) scene.remove(currentModel);
  currentModel = null;

  loadingDiv.style.display = 'block';

  loader.load(
    './assets/models/aoiBa.glb',
    async (gltf) => {
      currentModel = gltf.scene;
      currentModel.scale.set(0.1, 0.1, 0.1);

      const frame = renderer.xr.getFrame();
      const hits = frame.getHitTestResults(xrHitTestSource);

      if (hits.length > 0) {
        const hitPose = hits[0].getPose(xrReferenceSpace);
        if (hitPose) {
          const matrix = new THREE.Matrix4().fromArray(hitPose.transform.matrix);
          currentModel.applyMatrix4(matrix);

          if (xrSession.createAnchor) {
            try {
              modelAnchor = await xrSession.createAnchor(hitPose.transform, xrReferenceSpace);
            } catch (e) {
              console.warn("Anchor failed:", e);
            }
          }
        }
      } else {
        const xrCamera = renderer.xr.getCamera(camera);
        forward.set(0, 0, -1).applyQuaternion(xrCamera.quaternion);
        targetPos.copy(xrCamera.position).add(forward.multiplyScalar(1.5));
        currentModel.position.copy(targetPos);
        currentModel.quaternion.copy(xrCamera.quaternion);
      }

      scene.add(currentModel);
      loadingDiv.style.display = 'none';
    },
    undefined,
    (error) => {
      console.error("Model load error:", error);
      loadingDiv.textContent = "Failed to load model";
    }
  );
}

function animate() {
  renderer.setAnimationLoop((timestamp, frame) => {
    if (!frame || !xrSession) return;
    const pose = frame.getViewerPose(xrReferenceSpace);

    if (pose && !pose.emulatedPosition) {
      const xrCamera = renderer.xr.getCamera(camera);
      const pos = xrCamera.position;
      infoDiv.style.display = 'block';
      infoDiv.textContent = `Camera: X ${pos.x.toFixed(2)}, Y ${pos.y.toFixed(2)}, Z ${pos.z.toFixed(2)}`;
    } else {
      warningDiv.style.display = 'block';
    }

    renderer.render(scene, camera);
  });
}

window.addEventListener('load', () => {
  setupScene();
  arButton.addEventListener('click', startAR);
});
