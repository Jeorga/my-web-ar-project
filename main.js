window.onload = () => {
  const arScene = document.getElementById('arScene');
  const modelEntity = document.getElementById('modelEntity');
  const modelDropdown = document.getElementById('modelDropdown');
  const arButton = document.getElementById('arButton');
  const exitButton = document.getElementById('exitButton');
  const infoDiv = document.getElementById('info');
  const warningDiv = document.getElementById('warning');
  const loadingDiv = document.getElementById('loading');

  arScene.style.display = 'none';

  arButton.addEventListener('click', () => {
    arScene.style.display = 'block';
    document.getElementById('modelSelector').style.display = 'block';
    exitButton.style.display = 'block';
    warningDiv.style.display = 'block';
    loadModel();
  });

  exitButton.addEventListener('click', () => {
    arScene.style.display = 'none';
    document.getElementById('modelSelector').style.display = 'block';
    exitButton.style.display = 'none';
    warningDiv.style.display = 'none';
    modelEntity.setAttribute('visible', false);
  });

  modelDropdown.addEventListener('change', loadModel);

  modelEntity.addEventListener('model-loaded', () => {
    loadingDiv.style.display = 'none';
    modelEntity.setAttribute('visible', true);
    warningDiv.style.display = 'none';
  });

  modelEntity.addEventListener('model-error', (event) => {
    loadingDiv.style.display = 'none';
    alert("Model failed to load: " + event.detail.src);
  });

  function loadModel() {
    loadingDiv.style.display = 'block';
    const selectedModel = modelDropdown.value.replace('.glb', '');
    modelEntity.setAttribute('gltf-model', `#${selectedModel}`);
  }
};