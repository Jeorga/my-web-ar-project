let currentModelUrl = "";

function selectModel(url) {
    const viewer = document.getElementById("viewer");
    const arButton = document.getElementById("ar-button");

    if (!url) {
        viewer.removeAttribute("src");
        currentModelUrl = "";
        arButton.style.display = "none";
        return;
    }

    viewer.src = url; // set model-viewer src
    currentModelUrl = url;
    arButton.style.display = "inline-block";
}

function launchAR() {
    if (!currentModelUrl) {
        alert("Please select a model first.");
        return;
    }
    const intentUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(currentModelUrl)}&mode=ar_only&resizable=false#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;end;`;
    window.location.href = intentUrl;
}
