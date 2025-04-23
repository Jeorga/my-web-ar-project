import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer;
let controller;
let reticle;
let currentModel = null;
let modelURL = 'assets/model1.glb';

init();
animate();

function init() {
  const container = document.createElement('div');
  document.body.appendChild(container);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  const modelSelector = document.getElementById('modelSelector');
  modelSelector.addEventListener('change', (e) => {
    modelURL = e.target.value;
    if (currentModel) {
      scene.remove(currentModel);
      currentModel = null;
    }
  });

  const loader = new THREE.GLTFLoader();
  const hitTestSource = { current: null };
  let hitTestSourceRequested = false;

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', () => {
    if (reticle.visible && !currentModel) {
      loader.load(modelURL, (gltf) => {
        currentModel = gltf.scene;
        currentModel.position.setFromMatrixPosition(reticle.matrix);
        currentModel.scale.set(0.5, 0.5, 0.5);
        scene.add(currentModel);
      });
    }
  });
  scene.add(controller);

  const geometry = new THREE.RingGeometry(0.1, 0.15, 32).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  reticle = new THREE.Mesh(geometry, material);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  renderer.setAnimationLoop((timestamp, frame) => {
    if (frame) {
      const referenceSpace = renderer.xr.getReferenceSpace();
      const session = renderer.xr.getSession();

      if (!hitTestSourceRequested) {
        session.requestReferenceSpace('viewer').then((viewerSpace) => {
          session.requestHitTestSource({ space: viewerSpace }).then((source) => {
            hitTestSource.current = source;
          });
        });

        session.addEventListener('end', () => {
          hitTestSourceRequested = false;
          hitTestSource.current = null;
          if (currentModel) {
            scene.remove(currentModel);
            currentModel = null;
          }
        });

        hitTestSourceRequested = true;
      }

      if (hitTestSource.current) {
        const hitTestResults = frame.getHitTestResults(hitTestSource.current);
        if (hitTestResults.length) {
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
  });
}

function animate() {
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
}
