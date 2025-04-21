function initIOSAR(modelSelect, arLink) {
  // Set default model
  const selectedOption = modelSelect.options[modelSelect.selectedIndex];
  arLink.href = `assets/models/${selectedOption.dataset.ios}`;

  // Update model when dropdown changes
  modelSelect.addEventListener('change', () => {
    const selectedOption = modelSelect.options[modelSelect.selectedIndex];
    arLink.href = `assets/models/${selectedOption.dataset.ios}`;
  });
}