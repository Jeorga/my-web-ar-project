// @ts-nocheck  // disable TS errors for this file

// Handle model selection
document.getElementById("modelSelect").addEventListener("change", function (event) {
  const viewer = document.getElementById("viewer");
  const modelPath = event.target.value;

  if (modelPath) {
    viewer.src = modelPath;
  } else {
    viewer.src = "";
  }
});

// Handle AR button click
document.getElementById("ar-button").addEventListener("click", function () {
  const viewer = document.getElementById("viewer");

  if (viewer.src) {
    // launch AR mode
    viewer.activateAR();
  } else {
    alert("Please select a model first.");
  }
});
