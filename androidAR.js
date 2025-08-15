const viewer = document.getElementById('viewer');
const modelSelect = document.getElementById('modelSelect');
const arButton = document.getElementById('ar-button');

// Django endpoint returning JSON list of 3D models
const MODELS_API_URL = '/model_list/';  // match your urls.py path

// Load models dynamically
async function loadModels() {
  try {
    const res = await fetch(MODELS_API_URL);
    if (!res.ok) throw new Error("Failed to fetch models");
    const models = await res.json();

    // Clear existing options except placeholder
    modelSelect.innerHTML = '<option value="">-- Select 3D Model --</option>';

    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.url; // use absolute URL from Django
      option.textContent = model.name;
      modelSelect.appendChild(option);
    });

  } catch (err) {
    console.error(err);
  }
}

// Select a model for viewing
function selectModel(url) {
  if (url) {
    viewer.src = url;
    arButton.style.display = 'inline-block';
  } else {
    viewer.src = '';
    arButton.style.display = 'none';
  }
}

// Launch AR
function launchAR() {
  viewer.activateAR();
}

// Optional: delete model
async function deleteModel(fileName) {
  try {
    const res = await fetch(`/api/delete_model/${fileName}/`, {
      method: 'DELETE',
      headers: { 'X-CSRFToken': getCookie('csrftoken') }
    });
    if (res.ok) {
      alert('Deleted successfully');
      loadModels(); // refresh dropdown
    } else {
      alert('Failed to delete');
    }
  } catch (err) {
    console.error(err);
  }
}

// CSRF helper
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Initialize
document.addEventListener('DOMContentLoaded', loadModels);
