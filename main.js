import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer;
let controller;
let reticle;
let loader = new GLTFLoader();
let currentModel = null;

const modelSelector = document.getElementById('modelSelector');

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(ARButton.createButton(renderer, {
    requiredFeatures: ['hit-test']
  }));

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  const reticleGeometry = new THREE.RingGeometry(0.1, 0.15, 32).rotateX(-Math.PI / 2);
  const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0x0fff00 });
  reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  const hitTestSource = { current: null };
  const hitTestSourceRequested = { current: false };

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', () => {
    if (reticle.visible) {
      loadModel(modelSelector.value, reticle.matrix);
    }
  });
  scene.add(controller);

  renderer.xr.addEventListener('sessionstart', async () => {
    const session = renderer.xr.getSession();
    const viewerRefSpace = await session.requestReferenceSpace('viewer');
    const hitTestSourceTemp = await session.requestHitTestSource({ space: viewerRefSpace });
    hitTestSource.current = hitTestSourceTemp;

    renderer.xr.setAnimationLoop((timestamp, frame) => {
      if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const hitTestResults = frame.getHitTestResults(hitTestSource.current);
        if (hitTestResults.length > 0) {
          const hit = hitTestResults[0];
          const pose = hit.getPose(referenceSpace);
          reticle.visible = true;
          reticle.matrix.fromArray(pose.transform.matrix);
        } else {
          reticle.visible = false;
        }
      }
      renderer.render(scene, camera);
    });
  });
}

function loadModel(url, matrix) {
  if (currentModel) {
    scene.remove(currentModel);
    currentModel.traverse(obj => {
      if (obj.isMesh) obj.geometry.dispose();
    });
  }

  loader.load(url, (gltf) => {
    currentModel = gltf.scene;
    currentModel.scale.set(0.3, 0.3, 0.3); // adjust as needed
    currentModel.position.setFromMatrixPosition(matrix);
    currentModel.quaternion.setFromRotationMatrix(matrix);
    scene.add(currentModel);
  });
}

function animate() {
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
}
