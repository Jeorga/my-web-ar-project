import * as THREE from 'https://cdn.skypack.dev/three@0.152.2';
import { GLTFLoader } from 'https://cdn.skypack.dev/three/examples/jsm/loaders/GLTFLoader.js';

let scene, camera, renderer;
let model = null;
let selectedModel = 'assets/model1.glb';
let deviceQuaternion = new THREE.Quaternion();

const modelSelector = document.getElementById('model-selector');
modelSelector.addEventListener('change', (e) => {
  selectedModel = `assets/${e.target.value}`;
  removeModel();
});

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.6, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true; // If you want shadows
  document.body.appendChild(renderer.domElement);

  // Lighting for realism
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(2, 4, -2);
  dirLight.castShadow = false; // Set to true if adding shadows
  scene.add(dirLight);

  // Device orientation tracking
  window.addEventListener('deviceorientation', handleOrientation, true);

  // Tap to place model
  window.addEventListener('click', () => {
    if (!model) placeModel();
  });
}

function handleOrientation(event) {
  const alpha = THREE.MathUtils.degToRad(event.alpha || 0);
  const beta = THREE.MathUtils.degToRad(event.beta || 0);
  const gamma = THREE.MathUtils.degToRad(event.gamma || 0);

  const euler = new THREE.Euler(beta, alpha, -gamma, 'YXZ');
  deviceQuaternion.setFromEuler(euler);
  camera.quaternion.copy(deviceQuaternion);
}

function placeModel() {
  const loader = new GLTFLoader();
  loader.load(selectedModel, (gltf) => {
    model = gltf.scene;

    // Improve material if basic
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.flatShading = false;
        child.material.needsUpdate = true;
      }
    });

    model.scale.set(1, 1, 1);
    model.quaternion.copy(camera.quaternion);
    model.position.copy(camera.position);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    model.position.add(forward.multiplyScalar(2));
    model.position.y -= 0.5;

    scene.add(model);
  });
}

function removeModel() {
  if (model) {
    scene.remove(model);
    model = null;
  }
}

function animate() {
  requestAnimationFrame(animate);

  // Optional: slight idle animation
  if (model) {
    model.rotation.y += 0.003;
  }

  renderer.render(scene, camera);
}
