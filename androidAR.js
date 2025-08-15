let currentModelUrl = "";

// Called whenever a model is selected
function selectModel(fileName) {
    const viewer = document.getElementById("viewer");
    const arButton = document.getElementById("ar-button");

    if (!fileName) {
        viewer.removeAttribute('src');
        currentModelUrl = "";
        arButton.style.display = "none"; // Hide AR button
        return;
    }

    viewer.setAttribute('src', fileName); // full URL
    currentModelUrl = fileName;
    arButton.style.display = "inline-block"; // Show AR button
}

// Launch AR via Scene Viewer on Android
function launchAR() {
    if (!currentModelUrl) {
        alert("Please select a model first.");
        return;
    }

    const modelUrl = encodeURIComponent(currentModelUrl);
    const intentUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${modelUrl}&mode=ar_only&resizable=false#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;end;`;
    window.location.href = intentUrl;
}

// Initialize on page load
window.onload = () => {
    currentModelUrl = "";
    const selectElement = document.getElementById("modelSelect");
    if (selectElement) selectElement.value = "";
    selectModel(""); // Ensure no model is shown initially
};
