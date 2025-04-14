import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Mobile check
function isMobile() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent);
}

// Show or hide loading screen
function showLoading(show) {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = show ? 'block' : 'none';
}

// Initialize WebAR scene
function initializeAR() {
  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 1000
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('ar-container').appendChild(renderer.domElement);

  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  scene.add(light);

  camera.position.set(0, 1.6, 3);

  // Load model
  const loader = new GLTFLoader();

  // Optional DRACO compression
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
  loader.setDRACOLoader(dracoLoader);

  showLoading(true);

  loader.load(
    'asset/aoiBtest.glb', // Update this path as needed
    (gltf) => {
      const model = gltf.scene;
      model.scale.set(1, 1, 1);
      scene.add(model);
      showLoading(false);
    },
    (xhr) => {
      const percent = (xhr.loaded / xhr.total) * 100;
      console.log(`Loading: ${percent.toFixed(2)}%`);
    },
    (error) => {
      console.error('Error loading model:', error);
      showLoading(false);
    }
  );

  // Animate
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();
}

// Entry
if (isMobile()) {
  initializeAR();
} else {
  document.getElementById('ar-container').innerHTML = `
    <h2 style="text-align:center; margin-top:40vh;">
      This AR experience is only available on mobile devices.
    </h2>
  `;
}
