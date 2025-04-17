// Initialize polyfill if needed
if (navigator.xr === undefined) {
  const polyfill = new WebXRPolyfill();
}

let scene, camera, renderer, xrSession, xrReferenceSpace, xrHitTestSource;
let infoDiv, warningDiv, loadingDiv, modelDropdown, exitButton;
let currentModel = null;
let modelAnchor = null;
const loader = new THREE.GLTFLoader();
const forward = new THREE.Vector3(0, 0, -1);
const targetPos = new THREE.Vector3();
let lastUpdate = 0;
let lastPlacementTime = 0;
const PLACEMENT_COOLDOWN = 200;

window.onload = () => {
  initScene();
  document.getElementById('arButton').addEventListener('click', startAR);
  exitButton = document.getElementById('exitButton');
  exitButton.addEventListener('click', exitAR);
};

function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
  
  if (renderer) {
    document.body.removeChild(renderer.domElement);
  }
  
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  
  // iOS requires 'local' reference space
  renderer.xr.setReferenceSpaceType('local');
  document.body.appendChild(renderer.domElement);

  setupLighting();

  infoDiv = document.getElementById('info');
  warningDiv = document.getElementById('warning');
  loadingDiv = document.getElementById('loading');
  modelDropdown = document.getElementById('modelDropdown');

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener('click', onTap);
}

async function startAR() {
  const button = document.getElementById('arButton');
  button.disabled = true;
  button.innerText = "Starting AR...";

  // Improved WebXR availability check
  if (typeof navigator.xr === 'undefined') {
    alert("WebXR not available. Please use a compatible browser like Chrome (Android) or Safari (iOS 12.2+).");
    button.disabled = false;
    button.innerText = "Start AR";
    return;
  }

  try {
    // Check for AR support with different options for iOS/Android
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const supported = await navigator.xr.isSessionSupported(
      isIOS ? 'immersive-ar' : 'immersive-ar'
    );

    if (!supported) {
      alert("AR not supported on this device. Make sure you're using iOS 12.2+ or Android 8+ with Chrome.");
      button.disabled = false;
      button.innerText = "Start AR";
      return;
    }

    initScene();
    
    // Different session requirements for iOS vs Android
    const sessionOptions = {
      requiredFeatures: isIOS ? [] : ['local-floor'],
      optionalFeatures: ['hit-test', 'dom-overlay'],
      domOverlay: { root: document.body }
    };

    xrSession = await navigator.xr.requestSession('immersive-ar', sessionOptions);

    xrSession.addEventListener('end', onSessionEnd);
    xrSession.addEventListener('visibilitychange', onVisibilityChange);

    // iOS uses 'local' reference space by default
    xrReferenceSpace = await xrSession.requestReferenceSpace(
      isIOS ? 'local' : 'local-floor'
    );
    
    const viewSpace = await xrSession.requestReferenceSpace('viewer');
    xrHitTestSource = await xrSession.requestHitTestSource({ space: viewSpace });

    renderer.xr.setSession(xrSession);
    animate();
    document.getElementById('modelSelector').style.display = 'none';
    exitButton.style.display = 'block';
    button.disabled = false;
    button.innerText = "Start AR";
  } catch (err) {
    console.error("Failed to start AR:", err);
    alert("AR failed: " + err.message);
    button.disabled = false;
    button.innerText = "Start AR";
  }
}

// Rest of your existing JavaScript remains the same...