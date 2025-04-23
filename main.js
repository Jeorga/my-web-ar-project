const models = ["model1", "model2", "model3"];
let currentModelIndex = 0;
let modelPlaced = false;

// Custom A-Frame component for placing models
AFRAME.registerComponent("place-model", {
  init: function () {
    const sceneEl = document.querySelector("a-scene");
    const modelContainer = this.el;

    // Handle tap/click to place or cycle models
    sceneEl.addEventListener("click", (event) => {
      if (!modelPlaced) {
        // Place the current model
        modelContainer.setAttribute(
          "gltf-model",
          `#${models[currentModelIndex]}`
        );
        modelContainer.setAttribute("position", "0 0 -2");
        modelContainer.setAttribute("scale", "0.5 0.5 0.5");
        modelPlaced = true;
      } else {
        // Cycle to the next model
        modelContainer.removeAttribute("gltf-model");
        currentModelIndex = (currentModelIndex + 1) % models.length;
        modelContainer.setAttribute(
          "gltf-model",
          `#${models[currentModelIndex]}`
        );
        modelContainer.setAttribute("position", "0 0 -2");
        modelContainer.setAttribute("scale", "0.5 0.5 0.5");
      }
    });
  },
});

// Function to select a specific model via UI buttons
window.selectModel = (index) => {
  const modelContainer = document.querySelector("#model-container");
  modelContainer.removeAttribute("gltf-model");
  currentModelIndex = index;
  modelContainer.setAttribute("gltf-model", `#${models[currentModelIndex]}`);
  modelContainer.setAttribute("position", "0 0 -2");
  modelContainer.setAttribute("scale", "0.5 0.5 0.5");
  modelPlaced = true;
};

// Preload models to improve performance
document.addEventListener("DOMContentLoaded", () => {
  const assets = document.querySelector("a-assets");
  assets.addEventListener("loaded", () => {
    console.log("All assets loaded");
  });
});