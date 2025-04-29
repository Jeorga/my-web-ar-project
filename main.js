window.onload = () => {
  const modelViewer = document.getElementById('modelViewer');
  const modelDropdown = document.getElementById('modelDropdown');
  const arButton = document.getElementById('arButton');
  const exitButton = document.getElementById('exitButton');
  const infoDiv = document.getElementById('info');
  const warningDiv = document.getElementById('warning');
  const loadingDiv = document.getElementById('loading');

  arButton.addEventListener('click', () => {
    arButton.disabled = true;
    arButton.innerText = "Starting AR...";
    loadModel();
    modelViewer.activateAR();
  });

  exitButton.addEventListener('click', () => {
    modelViewer.dismissAR();
    modelViewer.style.display = 'none';
    document.getElementById('modelSelector').style.display = 'block';
    exitButton.style.display = 'none';
    warningDiv.style.display = 'none';
    arButton.disabled = false;
    arButton.innerText = "Start AR";
  });

  modelDropdown.addEventListener('change', loadModel);

  modelViewer.addEventListener('ar-status', (event) => {
    if (event.detail.status === 'session-started') {
      document.getElementById('modelSelector').style.display = 'block';
      exitButton.style.display = 'block';
      modelViewer.style.display = 'block';
      arButton.disabled = false;
      arButton.innerText = "Start AR";
    } else if (event.detail.status === 'failed') {
      alert("AR failed. Ensure Chrome and ARCore are supported.");
      modelViewer.style.display = 'none';
      document.getElementById('modelSelector').style.display = 'block';
      exitButton.style.display = 'none';
      arButton.disabled = false;
      arButton.innerText = "Start AR";
    }
  });

  modelViewer.addEventListener('load', () => {
    loadingDiv.style.display = 'none';
  });

  modelViewer.addEventListener('error', () => {
    loadingDiv.style.display = 'none';
    alert("Model failed to load.");
  });

  function loadModel() {
    loadingDiv.style.display = 'block';
    modelViewer.src = `assets/models/${modelDropdown.value}`;
  }
};