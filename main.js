function isiOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

window.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('modelSelect');
  const arLink = document.getElementById('arLink');

  // Set default model with scale
  arLink.href = `assets/models/${modelSelect.value}`;

  // Update model when dropdown changes
  modelSelect.addEventListener('change', () => {
    const selectedModel = modelSelect.value;
    arLink.href = `assets/models/${selectedModel}`;
    arLink.setAttribute('data-scale', '0.04 0.04 0.04'); // Apply scaling when model changes
  });

  // Show message if not on iOS
  if (!isiOS()) {
    document.querySelector('.note').textContent = "This feature only works on iOS Safari.";
  }
});
