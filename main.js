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

  let scene, camera, renderer, model;

  function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);
  }

  async function loadModel(modelPath) {
    const loader = new THREE.GLTFLoader();
    const gltf = await loader.loadAsync(`assets/models/${modelPath}`);
    model = gltf.scene;
    model.position.set(0, -1, -2);
    scene.add(model);
  }

  async function startAR() {
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
    });

    renderer.xr.setSession(session);
    renderer.setAnimationLoop(() => {
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
    if (model && scene) {
      scene.remove(model);
      await loadModel(modelSelect.value);
    }
  });
});