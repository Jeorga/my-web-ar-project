import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

const modelSelect = document.getElementById("modelSelect");
const arLink = document.getElementById("arLink");
const arButton = document.getElementById("arButton");
const note = document.getElementById("note");

const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

if (isiOS) {
  arLink.style.display = "inline-block";
  modelSelect.addEventListener("change", updateUSDZLink);
  updateUSDZLink();
} else {
  if (navigator.xr && navigator.xr.isSessionSupported) {
    navigator.xr.isSessionSupported("immersive-ar").then((supported) => {
      if (supported) {
        arButton.style.display = "inline-block";
      } else {
        note.textContent = "AR is not supported on this Android device.";
      }
    });
  } else {
    note.textContent = "WebXR is not available on this browser.";
  }
}

function updateUSDZLink() {
  const modelName = modelSelect.value;
  arLink.href = `assets/models/${modelName}.usdz`;
}

arButton.addEventListener("click", () => {
  startWebXR(modelSelect.value);
});

let scene, camera, renderer, reticle, controller, currentModel = null;

function startWebXR(modelName) {
  // Clear previous renderers
  if (renderer && renderer.domElement) {
    renderer.setAnimationLoop(null);
    renderer.domElement.remove();
  }

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  controller = renderer.xr.getController(0);
  scene.add(controller);

  const loader = new GLTFLoader();

  controller.addEventListener('select', () => {
    if (reticle.visible) {
      loader.load(`assets/models/${modelName}.glb`, (gltf) => {
        if (currentModel) scene.remove(currentModel);
        currentModel = gltf.scene;
        currentModel.position.setFromMatrixPosition(reticle.matrix);
        currentModel.scale.set(0.5, 0.5, 0.5);
        scene.add(currentModel);
      });
    }
  });

  // Reticle
  const geometry = new THREE.RingGeometry(0.1, 0.11, 32).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  reticle = new THREE.Mesh(geometry, material);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  let hitTestSource = null;
  let localSpace = null;

  renderer.setAnimationLoop((timestamp, frame) => {
    if (frame) {
      const session = renderer.xr.getSession();
      const referenceSpace = renderer.xr.getReferenceSpace();

      if (!hitTestSource) {
        session.requestReferenceSpace("viewer").then((space) => {
          session.requestHitTestSource({ space }).then((source) => {
            hitTestSource = source;
          });
        });

        session.addEventListener("end", () => {
          hitTestSource = null;
        });
      }

      if (hitTestSource) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length > 0) {
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
