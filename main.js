function isiOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

window.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('modelSelect');
  const arLink = document.getElementById('arLink');

  // Update the href based on selected model
  modelSelect.addEventListener('change', () => {
    const selectedModel = modelSelect.value;
    arLink.href = `assets/${selectedModel}`;
  });

  // Show note for non-iOS users
  if (!isiOS()) {
    document.querySelector('.note').textContent = "This feature only works on iOS Safari.";
  }
});
