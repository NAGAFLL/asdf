
// Apply saved cloak settings
function applySavedCloak() {
    const storedFavicon = localStorage.getItem('customFavicon');
    const storedName = localStorage.getItem('customName');
    
    if (storedName) {
        document.title = storedName;
    }
    
    if (storedFavicon) {
        let favicon = document.querySelector("link[rel*='icon']");
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.type = 'image/x-icon';
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        favicon.href = storedFavicon;
    }
}

// Apply immediately when script loads
applySavedCloak();

// Also apply when DOM is fully loaded
document.addEventListener('DOMContentLoaded', applySavedCloak);

// Reapply periodically to maintain persistence
setInterval(applySavedCloak, 1000);


