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
    modelEntity.setAttribute('gltf-model', `#${selectedModel}`);
  });
});