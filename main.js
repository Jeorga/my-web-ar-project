function isiOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

window.addEventListener('DOMContentLoaded', () => {
  const iosSection = document.getElementById('iosSection');
  const androidSection = document.getElementById('androidSection');
  const unsupportedMessage = document.getElementById('unsupportedMessage');

  // Device detection logic
  if (isiOS()) {
    iosSection.style.display = 'block';
    androidSection.style.display = 'none';
    unsupportedMessage.style.display = 'none';

    const modelSelect = document.getElementById('modelSelect');
    const arLink = document.getElementById('arLink');

    arLink.href = `assets/models/${modelSelect.value}`;
    modelSelect.addEventListener('change', () => {
      arLink.href = `assets/models/${modelSelect.value}`;
    });

  } else if (isAndroid()) {
    iosSection.style.display = 'none';
    androidSection.style.display = 'block';
    unsupportedMessage.style.display = 'none';
  } else {
    iosSection.style.display = 'none';
    androidSection.style.display = 'none';
    unsupportedMessage.style.display = 'block';
  }
});
