const MODELS_API_URL = "http://127.0.0.1:8000/api/models/"; // update to live URL after deployment

document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById('modelSelect');

    async function loadModels() {
        try {
            const currentSelection = select.value;
            const res = await fetch(MODELS_API_URL);
            if (!res.ok) throw new Error("Network response not OK");

            const models = await res.json();
            select.innerHTML = '<option value="">-- Select 3D Model --</option>';

            models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.url; // full URL from backend
                opt.textContent = m.name;
                select.appendChild(opt);
            });

            if (currentSelection) select.value = currentSelection;
        } catch (err) {
            console.error("Failed to load models:", err);
        }
    }

    select.addEventListener("change", () => {
        const url = select.value;
        selectModel(url); // call function in androidAR.js
    });

    loadModels();
    setInterval(loadModels, 10000); // refresh every 10 seconds
});
