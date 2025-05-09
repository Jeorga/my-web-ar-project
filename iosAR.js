function isiOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

window.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('modelSelect');
  const arLink = document.getElementById('arLink');

  arLink.href = `assets/models/${modelSelect.value}`;

  modelSelect.addEventListener('change', () => {
    const selectedModel = modelSelect.value;
    arLink.href = `assets/models/${selectedModel}`;
  });

  if (!isiOS()) {
    document.querySelector('.note').textContent = 'This feature only works on iOS Safari.';
  }
});