document.addEventListener('DOMContentLoaded', function() {
  const modelViewer = document.querySelector('#ar-model');
  const modelSelector = document.querySelector('.model-selector');
  const progressBar = document.querySelector('.progress-bar');
  const updateBar = document.querySelector('.update-bar');
  const errorMessage = document.querySelector('#error-message');
  
  // Default model
  let currentModel = 'assets/models/Astronaut.glb';
  
  // Check for WebXR support
  function checkXRSupport() {
      if (!navigator.xr) {
          showError("WebXR not supported in your browser. Please try Chrome for Android.");
          return false;
      }
      
      return true;
  }
  
  // Show error message
  function showError(message) {
      errorMessage.textContent = message;
      errorMessage.style.display = 'block';
      setTimeout(() => {
          errorMessage.style.display = 'none';
      }, 5000);
  }
  
  // Load a new model
  function loadModel(modelUrl) {
      currentModel = modelUrl;
      
      // Show loading progress
      progressBar.classList.remove('hide');
      updateBar.style.width = '0%';
      
      // Simulate progress (in a real app, you'd use actual loading events)
      let progress = 0;
      const interval = setInterval(() => {
          progress += 10;
          updateBar.style.width = `${progress}%`;
          
          if (progress >= 90) {
              clearInterval(interval);
          }
      }, 100);
      
      // Set the new model source
      modelViewer.src = modelUrl;
      
      // Hide progress bar when model is loaded
      modelViewer.addEventListener('load', () => {
          clearInterval(interval);
          updateBar.style.width = '100%';
          setTimeout(() => {
              progressBar.classList.add('hide');
          }, 300);
      });
  }
  
  // Handle model selection
  modelSelector.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
          const modelUrl = e.target.getAttribute('data-model');
          loadModel(modelUrl);
      }
  });
  
  // Handle tap to place object
  modelViewer.addEventListener('click', (event) => {
      // Only place object if in AR mode
      if (modelViewer.getAttribute('ar-status') === 'session-started') {
          const { clientX, clientY } = event;
          
          // Convert screen coordinates to model viewer coordinates
          const rect = modelViewer.getBoundingClientRect();
          const x = clientX - rect.left;
          const y = clientY - rect.top;
          
          // Place the object at the tapped position
          modelViewer.placeAt(x, y);
      }
  });
  
  // Check for AR support on load
  if (checkXRSupport()) {
      // Load the default model
      loadModel(currentModel);
      
      // Handle AR session events
      modelViewer.addEventListener('ar-status', (event) => {
          const status = event.detail.status;
          
          if (status === 'failed') {
              showError("AR session failed to start. Make sure your device supports ARCore.");
          }
      });
  }
  
  // Handle model loading errors
  modelViewer.addEventListener('error', (event) => {
      showError("Failed to load 3D model. Please try another model.");
      progressBar.classList.add('hide');
  });
});