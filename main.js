let scene, camera, renderer, loader, model, infoDiv, loadingDiv, modelDropdown;
let modelPlaced = false;

window.onload = async () => {
  infoDiv = document.getElementById("info");
  loadingDiv = document.getElementById("loading");
  modelDropdown = document.getElementById("modelDropdown");
  document.getElementById("placeButton").addEventListener("click", loadAndPlaceModel);

  await startCameraFeed();
  initScene();
  animate();
};

async function startCameraFeed() {
  const video = document.getElementById("cameraFeed");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
  } catch (err) {
    alert("Camera access denied.");
    console.error(err);
  }
}

function initScene() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 1000);
  camera.position.set(0, 0, 5);

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("arCanvas"), alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  loader = new THREE.GLTFLoader();

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
  directionalLight.position.set(1, 3, 2);
  scene.add(ambientLight, directionalLight);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Optional: tap to reposition
  window.addEventListener('click', (e) => {
    if (model) {
      const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
      model.position.set(mouse.x * 2, mouse.y * 2, 0);
    }
  });
}

function loadAndPlaceModel() {
  if (model) {
    scene.remove(model);
    model = null;
  }

  const modelPath = `./assets/models/${modelDropdown.value}`;
  loadingDiv.style.display = "block";

  loader.load(modelPath, (gltf) => {
    model = gltf.scene;
    model.scale.set(0.1, 0.1, 0.1);
    model.position.set(0, 0, 0);
    scene.add(model);
    loadingDiv.style.display = "none";
    modelPlaced = true;
  }, undefined, (err) => {
    loadingDiv.style.display = "none";
    alert("Failed to load model.");
    console.error(err);
  });
}

function animate() {
  requestAnimationFrame(animate);
  if (modelPlaced && model) {
    const pos = model.position;
    infoDiv.textContent = `Model Position: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`;
  }
  renderer.render(scene, camera);
}
