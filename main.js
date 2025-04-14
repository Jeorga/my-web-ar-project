import { GLTFLoader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';

let scene, camera, renderer, xrSession = null, xrReferenceSpace = null, xrHitTestSource = null;
let infoDiv, warningDiv, loadingDiv, arButton;
let currentModel = null, modelAnchor = null;
let reticle = null;
const loader = new GLTFLoader();
const placementCooldown = 500;
let lastPlacementTime = 0;
const forward = new THREE.Vector3(0, 0, -1);
let lastUpdate = 0;

const initScene = () => {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  document.body.appendChild(renderer.domElement);

  setupLighting();
  setupReticle();

  infoDiv = document.getElementById('info');
  warningDiv = document.getElementById('warning');
  loadingDiv = document.getElementById('loading');
  arButton = document.getElementById('arButton');

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
};

const setupLighting = () => {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 2, 1);
  scene.add(directionalLight);
};

const setupReticle = () => {
  const geometry = new THREE.RingGeometry(0.02, 0.03, 32).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  reticle = new THREE.Mesh(geometry, material);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);
};

const checkWebXRSupport = async () => {
  if (!navigator.xr) {
    alert('WebXR is not supported by your browser.');
    return false;
  }
  const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!isSupported) {
    alert('Immersive AR is not supported on this device.');
    return false;
  }
  return true;
};

const startAR = async () => {
  if (!(await checkWebXRSupport())) return;

  try {
    xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hit-test', 'dom-overlay', 'anchors'],
      domOverlay: { root: document.body },
    });

    renderer.xr.setSession(xrSession);
    xrSession.addEventListener('end', onSessionEnd);
    xrSession.addEventListener('visibilitychange', onVisibilityChange);

    xrReferenceSpace = await xrSession.requestReferenceSpace('local-floor').catch(async () => {
      console.warn('Falling back to viewer reference space');
      return await xrSession.requestReferenceSpace('viewer');
    });

    if (xrSession.requestHitTestSource) {
      const viewerSpace = await xrSession.requestReferenceSpace('viewer');
      xrHitTestSource = await xrSession.requestHitTestSource({
        space: viewerSpace,
        entityTypes: ['plane', 'mesh'],
      }).catch((e) => console.warn('Hit-test unavailable:', e));
    }

    arButton.style.display = 'none';
    animate();
  } catch (err) {
    console.error('Failed to start AR:', err);
    alert(`AR session failed: ${err.message}`);
  }
};

const onSessionEnd = () => {
  renderer.setAnimationLoop(null);
  document.body.removeChild(renderer.domElement);
  renderer.dispose();
  scene.children.length = 0;

  xrSession = null;
  xrHitTestSource = null;
  xrReferenceSpace = null;
  currentModel = null;
  modelAnchor = null;
  reticle.visible = false;

  arButton.style.display = 'block';
  warningDiv.style.display = 'none';
  loadingDiv.style.display = 'none';

  initScene();
};

const onVisibilityChange = () => {
  warningDiv.style.display = xrSession?.visibilityState === 'visible-blurred' ? 'block' : 'none';
};

const onTap = (event) => {
  if (!renderer.xr.isPresenting || !xrSession) return;

  const now = Date.now();
  if (now - lastPlacementTime < placementCooldown) return;
  lastPlacementTime = now;

  placeModel();
};

const placeModel = async () => {
  if (reticle.visible && !currentModel) {
    loadingDiv.style.display = 'block';
    loader.load(
      './assets/models/aoiBa.glb',
      async (gltf) => {
        currentModel = gltf.scene;
        currentModel.scale.set(0.1, 0.1, 0.1);
        currentModel.position.copy(reticle.position);
        currentModel.quaternion.copy(reticle.quaternion);

        if (xrSession.createAnchor && reticle.matrix) {
          try {
            const pose = new XRRigidTransform(reticle.matrix);
            modelAnchor = await xrSession.createAnchor(pose, xrReferenceSpace);
            console.log('Anchor created');
          } catch (e) {
            console.warn('Anchor creation failed:', e);
          }
        }

        scene.add(currentModel);
        loadingDiv.style.display = 'none';
      },
      undefined,
      (error) => {
        console.error('Model loading failed:', error);
        loadingDiv.style.display = 'none';
        alert('Failed to load model.');
      }
    );
  }
};

const animate = () => {
  renderer.setAnimationLoop((timestamp, frame) => {
    if (!frame || !xrSession) return;
    render(frame);
  });
};

const render = (frame) => {
  if (renderer.xr.isPresenting) {
    const xrCamera = renderer.xr.getCamera(camera);
    const now = performance.now();

    // Update camera position info
    if (now - lastUpdate > 200) {
      const pos = xrCamera.position;
      infoDiv.textContent = `Camera: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`;
      lastUpdate = now;
    }

    // Update reticle for hit-test
    if (xrHitTestSource) {
      const hitTestResults = frame.getHitTestResults(xrHitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const hitPose = hit.getPose(xrReferenceSpace);
        if (hitPose) {
          reticle.matrix.fromArray(hitPose.transform.matrix);
          reticle.visible = true;
          reticle.updateMatrixWorld();
        } else {
          reticle.visible = false;
        }
      } else {
        reticle.visible = false;
      }
    }

    // Update model position if no anchor
    if (currentModel && !modelAnchor) {
      forward.set(0, 0, -1).applyQuaternion(xrCamera.quaternion);
      const targetPos = xrCamera.position.clone().add(forward.multiplyScalar(1.5));
      currentModel.position.lerp(targetPos, 0.1);
    }

    // Check tracking status
    const pose = frame.getViewerPose(xrReferenceSpace);
    warningDiv.style.display = !pose || pose.emulatedPosition ? 'block' : 'none';
  }

  renderer.render(scene, camera);
};

window.onload = () => {
  initScene();
  arButton.addEventListener('click', startAR);
  window.addEventListener('click', onTap);
};