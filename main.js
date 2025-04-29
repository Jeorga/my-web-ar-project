function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

window.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('modelSelect');
  const arButton = document.getElementById('arButton');
  const note = document.getElementById('note');

  if (!isAndroid()) {
    note.textContent = 'This feature only works on Android with Chrome.';
    arButton.disabled = true;
    return;
  }

  if (!navigator.xr) {
    note.textContent = 'WebXR not supported. Please use Chrome with ARCore.';
    arButton.disabled = true;
    return;
  }

  let scene, camera, renderer, model, reticle;
  let hitTestSource = null;
  let hitTestSourceRequested = false;

  function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.setClearColor(0x000000, 0); // Transparent background
    document.body.appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    // Add reticle for hit-test
    reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);
  }

  async function loadModel(modelPath) {
    const loader = new THREE.GLTFLoader();
    const gltf = await loader.loadAsync(`assets/models/${modelPath}`);
    if (model) scene.remove(model);
    model = gltf.scene;
    model.scale.set(0.5, 0.5, 0.5); // Adjust scale as needed
    model.position.set(0, 0, 0);
    scene.add(model);
  }

  async function startAR() {
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
    });

    renderer.xr.setSession(session);
    document.querySelector('.container').style.display = 'none';

    // Set up hit-test
    session.addEventListener('select', () => {
      if (reticle.visible && model) {
        model.position.setFromMatrixPosition(reticle.matrix);
        reticle.visible = false;
      }
    });

    renderer.setAnimationLoop((timestamp, frame) => {
      if (!frame) return;

      if (hitTestSourceRequested === false) {
        session.requestReferenceSpace('viewer').then((referenceSpace) => {
          session.requestHitTestSource({ space: referenceSpace }).then((source) => {
            hitTestSource = source;
          });
        });
        hitTestSourceRequested = true;
      }

      if (hitTestSource) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length) {
          const hit = hitTestResults[0];
          const pose = hit.getPose(session.baseReferenceSpace);
          reticle.visible = true;
          reticle.matrix.fromArray(pose.transform.matrix);
        } else {
          reticle.visible = false;
        }
      }

      renderer.render(scene, camera);
    });

    await loadModel(modelSelect.value);
  }

  arButton.addEventListener('click', () => {
    if (!scene) {
      initScene();
    }
    startAR();
  });

  modelSelect.addEventListener('change', async () => {
    if (scene) {
      await loadModel(modelSelect.value);
    }
  });
});