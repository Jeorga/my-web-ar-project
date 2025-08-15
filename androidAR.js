const MODELS_API_URL = "http://127.0.0.1:8000/api/models/"; // replace with live URL after deployment

async function loadModels() {
    try {
        const res = await fetch(MODELS_API_URL);
        const models = await res.json();

        const select = document.getElementById('modelSelect');
        select.innerHTML = '<option value="">-- Select 3D Model --</option>';

        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.url; // the .glb file URL
            opt.textContent = m.name;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error("Failed to load models:", err);
    }
}

function selectModel(url) {
    const viewer = document.getElementById('viewer');
    viewer.src = url;
}

// Initial load
loadModels();

// Optional: refresh every 10 seconds to reflect new uploads
setInterval(loadModels, 10000);
