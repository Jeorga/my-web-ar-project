function isiOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

window.addEventListener('DOMContentLoaded', async () => {
  const arLink = document.getElementById('arLink');

  if (isiOS()) {
    try {
      const resp = await fetch('http://127.0.0.1:8000/models3d/latest-usdz/');
      if (resp.ok) {
        const data = await resp.json();
        if (data.usdz_url) {
          arLink.href = data.usdz_url;
        } else {
          document.querySelector('.note').textContent = 'No USDZ file available.';
        }
      } else {
        document.querySelector('.note').textContent = 'Failed to get the USDZ file.';
      }
    } catch (e) {
      document.querySelector('.note').textContent = 'Error loading USDZ file.';
    }
  } else {
    document.querySelector('.note').textContent = 'This feature only works on iOS Safari.';
  }
});
