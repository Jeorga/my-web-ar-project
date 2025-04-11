import * as THREE from 'https://cdn.skypack.dev/three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
camera.position.z = 5;

function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
}

function isMobile() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent);
}

function initializeAR() {
  document.getElementById('ar-container').appendChild(renderer.domElement);
  animate();
}

if (isMobile()) {
  initializeAR();
} else {
  document.getElementById('ar-container').innerHTML = `
    <h1 style="text-align:center; margin-top: 40vh; font-family:sans-serif;">
      AR not available for laptop yet, sorry.
    </h1>`;
}
