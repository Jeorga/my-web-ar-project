// main.js

// Device detection function
function isMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
}

// Function to handle navigation to the AR page
function navigateToAR() {
    if (isMobileDevice()) {
        window.location.href = '/ar.html';
    } else {
        // Show a message on the index page if the user is on a non-mobile device
        const messageDiv = document.createElement('div');
        messageDiv.id = 'notAvailable';
        messageDiv.textContent = 'Currently AR not available.';
        messageDiv.style.position = 'absolute';
        messageDiv.style.top = '50%';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translate(-50%, -50%)';
        messageDiv.style.color = '#333';
        messageDiv.style.background = 'rgba(255, 255, 255, 0.9)';
        messageDiv.style.padding = '20px';
        messageDiv.style.fontSize = '18px';
        messageDiv.style.textAlign = 'center';
        messageDiv.style.borderRadius = '10px';
        messageDiv.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        document.body.appendChild(messageDiv);
    }
}

// Function to initialize the AR page (called from ar.html)
function initARPage() {
    if (!isMobileDevice()) {
        // If the user somehow accesses ar.html directly on a non-mobile device, redirect or show message
        const notAvailableDiv = document.getElementById('notAvailable');
        const arContentDiv = document.getElementById('arContent');
        notAvailableDiv.style.display = 'block';
        arContentDiv.style.display = 'none';
        return false;
    }
    return true; // Proceed with AR initialization
}

// Function to initialize the index page
function initIndexPage() {
    const arLink = document.getElementById('arLink');
    if (arLink) {
        arLink.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToAR();
        });
    }
}

// Initialize based on the current page
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname;
    if (currentPage.includes('index.html') || currentPage === '/') {
        initIndexPage();
    } else if (currentPage.includes('ar.html')) {
        if (initARPage()) {
            // If on a mobile device, the AR page's inline script will handle the rest
            // This ensures the AR logic (initScene, startAR, etc.) runs only if needed
        }
    }
});