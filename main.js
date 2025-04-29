function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

window.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('modelSelect');
  const arButton = document.getElementById('arButton');
  const note = document.getElementById('note');
  const arScene = document.getElementById('arScene');
  const modelEntity = document.getElementById('modelEntity');

  if (!isAndroid()) {
    note.textContent = 'This feature only works on Android browsers.';
    arButton.disabled = true;
    arScene.style.display = 'none';
    return;
  }

  arScene.style.display = 'none';

  arButton.addEventListener('click', () => {
    arScene.style.display = 'block';
    document.querySelector('.container').style.display = 'none';
  });

  modelSelect.addEventListener('change', () => {
    const selectedModel = modelSelect.value.replace('.glb', '');
    try {
      modelEntity.setAttribute('gltf-model', `#${selectedModel}`);
      modelEntity.setAttribute('visible', true);
    } catch (error) {
      console.error('Error loading model:', error);
      note.textContent = 'Failed to load model. Check model files.';
    }
  });

  // Ensure model is visible on load
  modelEntity.addEventListener('model-loaded', () => {
    modelEntity.setAttribute('visible', true);
  });

  modelEntity.addEventListener('model-error', (event) => {
    console.error('Model loading error:', event);
    note.textContent = 'Failed to load model. Check model files.';
  });
});