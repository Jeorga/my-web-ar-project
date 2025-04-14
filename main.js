let scene, camera, renderer;
let controller, reticle;
let model;
let hitTestSource = null;
let hitTestSourceRequested = false;
let anchor = null;

function initScene() {
  // Scene setup
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    70, window.innerWidth / window.innerHeight, 0.01, 20
  );

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Light
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  // Reticle
  const ringGeo = new THREE.RingGeometry(0.05, 0.06, 32).rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  reticle = new THREE.Mesh(ringGeo, ringMat);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // Controller
  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function startAR() {
  console.log("Attempting to enter AR...");

  navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test', 'anchors', 'dom-overlay'],
    domOverlay: { root: document.body }
  }).then(session => {
    renderer.xr.setSession(session);

    const loadingEl = document.getElementById('loading');
    const warningEl = document.getElementById('warning');

    const refSpaceType = 'local';
    let referenceSpace = null;

    session.requestReferenceSpace(refSpaceType).then(refSpace => {
      referenceSpace = refSpace;
      renderer.setAnimationLoop((timestamp, frame) => {
        if (frame) {
          const session = frame.session;

          const viewerPose = frame.getViewerPose(referenceSpace);
          if (!viewerPose) return;

          const pos = viewerPose.transform.position;
          document.getElementById('info').textContent =
            `Camera Position: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`;

          if (!hitTestSourceRequested) {
            session.requestReferenceSpace('viewer').then(viewerRef => {
              frame.requestHitTestSource({ space: viewerRef }).then(source => {
                hitTestSource = source;
              });
            });

            session.addEventListener('end', () => {
              hitTestSourceRequested = false;
              hitTestSource = null;
              anchor = null;
              model = null;
            });

            hitTestSourceRequested = true;
          }

          const hitTestResults = frame.getHitTestResults(hitTestSource);
          if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);

            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);

            warningEl.style.display = 'none';
          } else {
            reticle.visible = false;
            warningEl.style.display = 'block';
          }
        }

        renderer.render(scene, camera);
      });
    });
  }).catch(err => {
    console.error("Failed to start AR:", err);
    alert("AR not supported on this device or permission denied.");
  });
}

function onSelect() {
  if (reticle.visible && !model) {
    document.getElementById('loading').style.display = 'block';

    const loader = new THREE.GLTFLoader();
    loader.load(
      './assets/models/aoiBtest.glb',
      gltf => {
        model = gltf.scene;
        model.scale.set(0.2, 0.2, 0.2);
        model.position.setFromMatrixPosition(reticle.matrix);
        model.quaternion.setFromRotationMatrix(reticle.matrix);
        scene.add(model);

        const session = renderer.xr.getSession();
        const frame = renderer.xr.getFrame();
        const anchorPose = new XRRigidTransform(model.position, model.quaternion);

        frame.createAnchor(anchorPose, renderer.xr.getReferenceSpace())
          .then(createdAnchor => {
            anchor = createdAnchor;
            anchor.context = { model };
          }).catch(err => console.warn('Anchor creation failed:', err));

        document.getElementById('loading').style.display = 'none';
      },
      undefined,
      error => {
        console.error('Error loading model:', error);
        document.getElementById('loading').style.display = 'none';
      }
    );
  }
}

// Wait until DOM is ready and then initialize
window.addEventListener('DOMContentLoaded', () => {
  initScene();
  document.getElementById('arButton').addEventListener('click', startAR);
});
