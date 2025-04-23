import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let camera, scene, renderer;
let controller, reticle, currentModel = null;
let loader = new GLTFLoader();

const modelSelector = document.getElementById('modelSelector');
const startButton = document.getElementById('startAR');

init();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  const reticleGeometry = new THREE.RingGeometry(0.1, 0.15, 32).rotateX(-Math.PI / 2);
  const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', () => {
    if (reticle.visible) {
      loadModel(modelSelector.value, reticle.matrix);
    }
  });
  scene.add(controller);

  startButton.addEventListener('click', () => {
    navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test']
    }).then(onSessionStarted);
  });
}

async function onSessionStarted(session) {
  renderer.xr.setSession(session);
  document.getElementById('ui').style.display = 'none';

  const viewerSpace = await session.requestReferenceSpace('viewer');
  const refSpace = await session.requestReferenceSpace('local');
  const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

  renderer.setAnimationLoop((timestamp, frame) => {
    if (frame) {
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
    renderer.render(scene, camera);
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
    currentModel.scale.set(0.3, 0.3, 0.3);
    currentModel.position.setFromMatrixPosition(matrix);
    currentModel.quaternion.setFromRotationMatrix(matrix);
    scene.add(currentModel);
  });
}
