function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

window.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('modelSelect');
  const modelViewer = document.getElementById('modelViewer');
  const note = document.querySelector('.note');

  // Restrict to Android only
  if (!isAndroid()) {
    note.textContent = 'This feature only works on Android devices.';
    modelSelect.disabled = true;
    modelViewer.style.display = 'none';
    return;
  }

  // Check for ARCore support (basic heuristic; not foolproof)
  if (!('ar' in navigator)) {
    note.textContent = 'AR not supported on this device. Requires ARCore.';
    modelSelect.disabled = true;
    modelViewer.style.display = 'none';
    return;
  }

  // Set default model
  modelViewer.src = `assets/models/${modelSelect.value}`;

  // Update model when dropdown changes
  modelSelect.addEventListener('change', () => {
    const selectedModel = modelSelect.value;
    modelViewer.src = `assets/models/${selectedModel}`;
  });

  // Show model-viewer for Android users
  modelViewer.style.display = 'block';
});