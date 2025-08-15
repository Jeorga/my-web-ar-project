const MODELS_API_URL = "http://127.0.0.1:8000/api/models/"; // update for live server

document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById("modelSelect");

    async function loadModels() {
        try {
            const currentSelection = select.value;
            const res = await fetch(MODELS_API_URL);
            if (!res.ok) throw new Error("Network response not OK");

            const models = await res.json();
            select.innerHTML = '<option value="">-- Select 3D Model --</option>';

            models.forEach(m => {
                const opt = document.createElement("option");
                // Make sure URL is full path
                opt.value = m.url.startsWith("http") ? m.url : `http://127.0.0.1:8000${m.url}`;
                opt.textContent = m.name;
                select.appendChild(opt);
            });

            // Preserve previous selection if it exists
            if (currentSelection) select.value = currentSelection;
            selectModel(select.value); // update viewer after refresh

        } catch (err) {
            console.error("Failed to load models:", err);
        }
    }

    select.addEventListener("change", () => {
        selectModel(select.value);
    });

    loadModels();
    setInterval(loadModels, 10000); // refresh every 10s
});
