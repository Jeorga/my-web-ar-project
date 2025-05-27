let currentModelUrl = "";

// Update this base URL to match your hosting path
const BASE_URL = "https://jeorga.github.io/my-web-ar-project/assets/models/"; // <-- your path

function selectModel(fileName) {
  const viewer = document.getElementById("viewer");
  if (!fileName) {
    viewer.removeAttribute('src');
    currentModelUrl = "";
    return;
  }
  const fullUrl = BASE_URL + fileName;
  viewer.setAttribute('src', fullUrl);
  currentModelUrl = fullUrl;
}

function launchAR() {
  if (!currentModelUrl) {
    alert("Please select a model first.");
    return;
  }

  const modelUrl = encodeURIComponent(currentModelUrl);

  const intentUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${modelUrl}&mode=ar_only&resizable=false#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;end;`;

  window.location.href = intentUrl;
}

// Load default model on startup
window.onload = () => {
  currentModelUrl = "";
  const selectElement = document.getElementById("modelSelect");
  if (selectElement) {
    selectElement.value = "";
  }
  selectModel(""); // Ensures no model is shown initially
};
