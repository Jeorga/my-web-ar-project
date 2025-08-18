function isiOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

window.addEventListener('DOMContentLoaded', async () => {
  const modelSelect = document.getElementById('modelSelect');
  const arLink = document.getElementById('arLink');

  // Clear existing options
  modelSelect.innerHTML = '';

  try {
    // Fetch models from Django backend
    const res = await fetch('http://127.0.0.1:8000/api/models/');
    const models = await res.json();

    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.file; // Django provides full URL or relative path
      option.textContent = model.name;
      modelSelect.appendChild(option);
    });

    // Set initial AR link
    if (models.length > 0) {
      arLink.href = models[0].file;
    }

  } catch (error) {
    console.error('Failed to load models:', error);
    // Fallback to default static options
    modelSelect.innerHTML = `
      <option value="aoiBa.usdz">Model 1</option>
      <option value="twomachinesZeroPointFour.usdz">Model 2</option>
    `;
    arLink.href = modelSelect.value;
  }

  modelSelect.addEventListener('change', () => {
    const selectedModel = modelSelect.value;
    arLink.href = selectedModel;
  });

  if (!isiOS()) {
    document.querySelector('.note').textContent = 'This feature only works on iOS Safari.';
  }
});
