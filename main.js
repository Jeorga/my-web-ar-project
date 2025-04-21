function detectPlatform() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
    return 'ios';
  } else if (/Android/.test(ua)) {
    return 'android';
  }
  return 'unsupported';
}

window.addEventListener('DOMContentLoaded', () => {
  const platform = detectPlatform();
  const modelSelect = document.getElementById('modelSelect');
  const iosARLink = document.getElementById('iosARLink');
  const androidARButton = document.getElementById('androidARButton');
  const note = document.getElementById('note');

  if (platform === 'ios') {
    iosARLink.style.display = 'inline-block';
    initIOSAR(modelSelect, iosARLink);
    note.textContent = 'Use Safari on iOS for the best AR experience.';
  } else if (platform === 'android') {
    androidARButton.style.display = 'inline-block';
    initAndroidAR(modelSelect, androidARButton);
    note.textContent = 'Use Chrome on Android for the best AR experience.';
  } else {
    note.textContent = 'AR is only supported on iOS Safari or Android Chrome.';
  }
});