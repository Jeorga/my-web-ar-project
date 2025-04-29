function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

window.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('modelSelect');
  const arLink = document.getElementById('arLink');
  const note = document.querySelector('.note');

  function updateLink(model) {
    const modelUrl = encodeURIComponent(`https://yourdomain.com/assets/models/${model}`);
    const fallbackUrl = encodeURIComponent(`https://yourdomain.com/fallback.html`);

    arLink.href = `intent://arvr.google.com/scene-viewer/1.0?file=${modelUrl}&mode=ar_preferred#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${fallbackUrl};end;`;
  }

  if (!isAndroid()) {
    arLink.style.display = 'none';
    modelSelect.style.display = 'none';
    note.textContent = "This AR experience is only available on Android Chrome.";
    return;
  }

  updateLink(modelSelect.value);

  modelSelect.addEventListener('change', () => {
    updateLink(modelSelect.value);
  });
});
