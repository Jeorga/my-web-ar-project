let camera, scene, renderer;
let controller;
let reticle;
let model = null;
let modelUrl = '';

function init() {
  // Setup scene
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Add light
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  // Load reticle for placement
  const loader = new THREE.GLTFLoader();
  loader.load('https://cdn.jsdelivr.net/gh/mrdoob/three.js@r158/examples/models/gltf/reticle/reticle.gltf', (gltf) => {
    reticle = gltf.scene;
    reticle.scale.set(0.5, 0.5, 0.5);
    reticle.visible = false;
    scene.add(reticle);
  });

  // Setup controller
  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

  renderer.setAnimationLoop(render);
}

function onSelect() {
  if (reticle.visible && modelUrl) {
    const loader = new THREE.GLTFLoader();
    loader.load(`assets/models/${modelUrl}`, (gltf) => {
      if (model) {
        scene.remove(model);
      }
      model = gltf.scene;
      model.position.setFromMatrixPosition(reticle.matrix);
      model.scale.set(0.2, 0.2, 0.2); // Adjust model size if needed
      scene.add(model);
    });
  }
}

function render(timestamp, frame) {
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();

    const viewerPose = frame.getViewerPose(referenceSpace);
    if (viewerPose) {
      const hitTestResults = frame.getHitTestResultsForTransientInput
        ? []
        : frame.getHitTestResults(renderer.xr.getHitTestSource());

      if (hitTestResults.length > 0 && reticle) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);

        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }

  renderer.render(scene, camera);
}

function startAR() {
  const select = document.getElementById('modelSelect');
  modelUrl = select.value;

  init();
}

document.getElementById('startAR').addEventListener('click', startAR);
