function isiOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

window.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('modelSelect');
  const arLink = document.getElementById('arLink');

  // Set default model
  arLink.href = `assets/models/${modelSelect.value}`;

  // Update model when dropdown changes
  modelSelect.addEventListener('change', () => {
    const selectedModel = modelSelect.value;
    arLink.href = `assets/models/${selectedModel}`;
  });

  // Show message if not on iOS
  if (!isiOS()) {
    document.querySelector('.note').textContent = "This feature only works on iOS Safari.";
  }
});
