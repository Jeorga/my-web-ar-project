let scene, camera, renderer, model, loader, infoDiv;
let alpha = 0, beta = 0, gamma = 0;

window.onload = () => {
  initScene();

  document.getElementById("startButton").addEventListener("click", () => {
    const selectedModel = document.getElementById("modelDropdown").value;
    loadModel(`./assets/models/${selectedModel}`);
  });

  window.addEventListener("deviceorientation", handleOrientation, true);
};

function initScene() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 2;

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  loader = new THREE.GLTFLoader();
  infoDiv = document.getElementById("info");

  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
  scene.add(light);

  animate();
}

function handleOrientation(event) {
  alpha = event.alpha || 0;
  beta = event.beta || 0;
  gamma = event.gamma || 0;

  infoDiv.textContent = `Device Rotation: Alpha: ${alpha.toFixed(1)}, Beta: ${beta.toFixed(1)}, Gamma: ${gamma.toFixed(1)}`;
}

function loadModel(url) {
  const loading = document.getElementById("loading");
  loading.style.display = "block";

  if (model) {
    scene.remove(model);
    model = null;
  }

  loader.load(url, (gltf) => {
    model = gltf.scene;
    model.scale.set(0.1, 0.1, 0.1);
    model.position.set(0, 0, 0);
    scene.add(model);
    loading.style.display = "none";
  }, undefined, err => {
    console.error("Error loading model:", err);
    alert("Failed to load model.");
    loading.style.display = "none";
  });
}

function animate() {
  requestAnimationFrame(animate);

  if (model) {
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(beta),
      THREE.MathUtils.degToRad(alpha),
      THREE.MathUtils.degToRad(-gamma),
      'YXZ'
    );
    model.setRotationFromEuler(euler);
  }

  renderer.render(scene, camera);
}
