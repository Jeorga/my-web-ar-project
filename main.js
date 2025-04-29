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

  // Set default model
  modelViewer.src = `assets/models/${modelSelect.value}`;

  // Update model when dropdown changes
  modelSelect.addEventListener('change', () => {
    modelViewer.src = `assets/models/${modelSelect.value}`;
  });

  // Show model-viewer and update note
  modelViewer.style.display = 'block';
  note.textContent = 'Use your Android browser to view and interact with 3D models.';
});