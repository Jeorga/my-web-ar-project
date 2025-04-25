function isARSupported() {
  // Basic check for AR support (Android or iOS)
  return (
    (/Android/i.test(navigator.userAgent) && typeof window.AR !== 'undefined') ||
    /iPad|iPhone|iPod/.test(navigator.userAgent)
  );
}

window.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('modelSelect');
  const modelViewer = document.getElementById('modelViewer');

  // Set default model
  const defaultModel = JSON.parse(modelSelect.value);
  modelViewer.src = `assets/models/${defaultModel.gltf}`;
  modelViewer.iosSrc = `assets/models/${defaultModel.usdz}`;

  // Update model when dropdown changes
  modelSelect.addEventListener('change', () => {
    const selectedModel = JSON.parse(modelSelect.value);
    modelViewer.src = `assets/models/${selectedModel.gltf}`;
    modelViewer.iosSrc = `assets/models/${selectedModel.usdz}`;
  });

  // Show message if AR is not supported
  if (!isARSupported()) {
    document.querySelector('.note').textContent = 
      "This feature requires an ARCore-supported Android device or iOS Safari.";
  }
});