window.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('modelSelect');
  const modelViewer = document.getElementById('modelViewer');

  modelSelect.addEventListener('change', () => {
    const selected = modelSelect.value;
    modelViewer.src = `assets/models/${selected}.glb`;
    modelViewer.iosSrc = `assets/models/${selected}.usdz`;
  });
});
