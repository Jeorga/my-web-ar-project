import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let camera, scene, renderer;
let controller, reticle, currentModel;
let hitTestSource = null, localSpace = null;

const modelSelector = document.getElementById('modelSelector');
const startARButton = document.getElementById('startAR');

const loader = new GLTFLoader();

init();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.12, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', () => {
    if (reticle.visible) {
      placeModel(reticle.matrix);
    }
  });
  scene.add(controller);

  startARButton.addEventListener('click', async () => {
    if (navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')) {
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test']
      });
      renderer.xr.setSession(session);
      document.getElementById('ui').style.display = 'none';
      onSessionStarted(session);
    } else {
      alert('AR not supported on this device/browser');
    }
  });
}

async function onSessionStarted(session) {
  const viewerSpace = await session.requestReferenceSpace('viewer');
  localSpace = await session.requestReferenceSpace('local');
  hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

  renderer.setAnimationLoop((timestamp, frame) => {
    if (frame) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0].getPose(localSpace);
        reticle.visible = true;
        reticle.matrix.fromArray(hit.transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
    renderer.render(scene, camera);
  });
}

function placeModel(matrix) {
  if (currentModel) {
    scene.remove(currentModel);
  }

  loader.load(modelSelector.value, (gltf) => {
    currentModel = gltf.scene;
    currentModel.scale.set(0.3, 0.3, 0.3);
    currentModel.position.setFromMatrixPosition(matrix);
    currentModel.quaternion.setFromRotationMatrix(matrix);
    scene.add(currentModel);
  });
}
