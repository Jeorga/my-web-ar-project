const MODELS_API_URL = "http://127.0.0.1:8000/api/models/";

function isiOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

async function loadModels() {
  const modelSelect = document.getElementById("modelSelect");
  const arLink = document.getElementById("arLink");

  try {
    const res = await fetch(MODELS_API_URL);
    if (!res.ok) throw new Error("Failed to fetch models");
    const models = await res.json();

    // Clear old options
    modelSelect.innerHTML = "";

    // Add new ones from Django
    models.forEach(model => {
      const option = document.createElement("option");
      option.value = model.url;
      option.textContent = model.name;
      modelSelect.appendChild(option);
    });

    // Default AR link
    if (models.length > 0) {
      arLink.href = models[0].url;
    }

    // Update on change
    modelSelect.addEventListener("change", () => {
      arLink.href = modelSelect.value;
    });
  } catch (err) {
    console.error("Error loading models:", err);
  }

  if (!isiOS()) {
    document.querySelector(".note").textContent =
      "This feature only works on iOS Safari.";
  }
}

document.addEventListener("DOMContentLoaded", loadModels);
