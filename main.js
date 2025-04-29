let scene, camera, renderer, controller, reticle, hitTestSource = null, hitTestSourceRequested = false;
let model = null;
let modelUrl = '';

const loader = new THREE.GLTFLoader();

function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  // Reticle
  const ringGeo = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  reticle = new THREE.Mesh(ringGeo, ringMat);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);
}

function onSelect() {
  if (reticle.visible && modelUrl) {
    loader.load(`assets/models/${modelUrl}`, (gltf) => {
      if (model) scene.remove(model);
      model = gltf.scene;
      model.position.setFromMatrixPosition(reticle.matrix);
      model.scale.set(0.2, 0.2, 0.2);
      scene.add(model);
    });
  }
}

function render(timestamp, frame) {
  if (frame) {
    const refSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();

    if (!hitTestSourceRequested) {
      session.requestReferenceSpace('viewer').then((viewerSpace) => {
        session.requestHitTestSource({ space: viewerSpace }).then((source) => {
          hitTestSource = source;
        });
      });

      session.addEventListener('end', () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });

      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(refSpace);
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }

  renderer.render(scene, camera);
}

document.getElementById('startAR').addEventListener('click', async () => {
  modelUrl = document.getElementById('modelSelect').value;

  if (navigator.xr) {
    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    if (supported) {
      initScene();
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test']
      });
      renderer.xr.setReferenceSpaceType('local');
      renderer.xr.setSession(session);
      renderer.setAnimationLoop(render);
    } else {
      alert('WebXR not supported on this device.');
    }
  } else {
    alert('WebXR not available.');
  }
});
