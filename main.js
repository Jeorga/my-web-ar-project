function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

window.addEventListener('DOMContentLoaded', () => {
  const enterButton = document.getElementById('enterButton');
  enterButton.addEventListener('click', () => {
    if (isIOS()) {
      window.location.href = 'iosAR.html';
    } else if (isAndroid()) {
      window.location.href = 'androidAR.html';
    } else {
      document.querySelector('.note').textContent = 'This AR experience is only available on iOS or Android smartphones and tablets.';
    }
  });
});