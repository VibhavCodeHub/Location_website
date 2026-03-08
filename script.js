// Location Tracker - Main JavaScript File

// Global Variables
let map;
let currentMarker;
let currentLat = null;
let currentLng = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupEventListeners();
    checkForSharedLocation();
    
    // Auto-get location on page load (if no shared location)
    autoGetLocation();
});

// Auto-get location on page load
function autoGetLocation() {
    const urlParams = new URLSearchParams(window.location.search);
    const hasLatLng = urlParams.get('lat') && urlParams.get('lng');
    
    // Only auto-get if no shared location in URL
    if (!hasLatLng && navigator.geolocation) {
        // Small delay to let map initialize first
        setTimeout(function() {
            getCurrentLocation();
        }, 1000);
    }
}

// Initialize Leaflet Map
function initializeMap() {
    // Default location (center of world)
    const defaultLat = 20.0;
    const defaultLng = 0.0;
    
    // Create map instance
    map = L.map('map').setView([defaultLat, defaultLng], 2);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Add click listener to map
    map.on('click', function(e) {
        const { lat, lng } = e.latlng;
        setLocation(lat, lng);
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Get Location Button
    document.getElementById('getLocationBtn').addEventListener('click', getCurrentLocation);
    
    // Share Location Button
    document.getElementById('shareLocationBtn').addEventListener('click', shareLocation);
    
    // Go to Location Button
    document.getElementById('goToLocationBtn').addEventListener('click', goToManualLocation);
    
    // Copy Link Button
    document.getElementById('copyLinkBtn').addEventListener('click', copyShareLink);
    
    // Generate QR Button
    document.getElementById('generateQRBtn').addEventListener('click', generateQRCode);
    
    // Close Modal
    document.querySelector('.close-modal').addEventListener('click', closeModal);
    
    // Privacy Info
    document.getElementById('privacyInfo').addEventListener('click', showPrivacyInfo);
    
    // Enter key support for manual input
    document.getElementById('latInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') goToManualLocation();
    });
    document.getElementById('lngInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') goToManualLocation();
    });
}

// Get Current Location using Geolocation API
function getCurrentLocation() {
    // Show loading indicator
    showLoading(true);
    hideError();
    
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        showLoading(false);
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            
            setLocation(lat, lng, accuracy);
            showLoading(false);
        },
        function(error) {
            let errorMessage = 'Unable to get location';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location permission denied. Please enable location access.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Location request timed out.';
                    break;
            }
            
            showError(errorMessage);
            showLoading(false);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Set Location on Map and Display
function setLocation(lat, lng, accuracy = null) {
    currentLat = lat;
    currentLng = lng;
    
    // Update display
    document.getElementById('latDisplay').textContent = lat.toFixed(6);
    document.getElementById('lngDisplay').textContent = lng.toFixed(6);
    document.getElementById('accuracyDisplay').textContent = accuracy ? Math.round(accuracy) : 'N/A';
    
    // Show location info
    document.getElementById('locationDisplay').style.display = 'block';
    
    // Enable share button
    document.getElementById('shareLocationBtn').disabled = false;
    
    // Update map marker
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }
    
    // Create custom icon
    const customIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
    
    currentMarker = L.marker([lat, lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(`<b>Location</b><br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}`)
        .openPopup();
    
    // Center map on location
    map.setView([lat, lng], 15);
    
    // Update URL without refresh
    updateURL(lat, lng);
}

// Go to Manual Location
function goToManualLocation() {
    const latInput = document.getElementById('latInput').value.trim();
    const lngInput = document.getElementById('lngInput').value.trim();
    
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    
    if (isNaN(lat) || isNaN(lng)) {
        showError('Please enter valid latitude and longitude values');
        return;
    }
    
    if (lat < -90 || lat > 90) {
        showError('Latitude must be between -90 and 90');
        return;
    }
    
    if (lng < -180 || lng > 180) {
        showError('Longitude must be between -180 and 180');
        return;
    }
    
    hideError();
    setLocation(lat, lng);
}

// Share Location
function shareLocation() {
    if (!currentLat || !currentLng) {
        showError('No location to share');
        return;
    }
    
    const shareUrl = generateShareURL(currentLat, currentLng);
    
    // Show share link
    document.getElementById('shareLink').value = shareUrl;
    document.getElementById('shareLinkContainer').style.display = 'block';
    
    // Auto-copy to clipboard
    copyToClipboard(shareUrl);
}

// Generate Share URL
function generateShareURL(lat, lng) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`;
}

// Copy Share Link
function copyShareLink() {
    const shareLink = document.getElementById('shareLink').value;
    copyToClipboard(shareLink);
    
    // Show feedback
    const feedback = document.getElementById('copyFeedback');
    feedback.classList.add('show');
    setTimeout(() => {
        feedback.classList.remove('show');
    }, 2000);
}

// Copy to Clipboard
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(err => {
            console.error('Failed to copy:', err);
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }
}

// Generate QR Code
function generateQRCode() {
    if (!currentLat || !currentLng) {
        showError('No location to generate QR code');
        return;
    }
    
    const shareUrl = generateShareURL(currentLat, currentLng);
    const canvas = document.getElementById('qrCanvas');
    
    QRCode.toCanvas(canvas, shareUrl, {
        width: 250,
        margin: 2,
        color: {
            dark: '#333333',
            light: '#ffffff'
        }
    }, function(error) {
        if (error) {
            showError('Failed to generate QR code');
            return;
        }
        
        document.getElementById('qrModal').style.display = 'flex';
    });
}

// Close Modal
function closeModal() {
    document.getElementById('qrModal').style.display = 'none';
}

// Update URL with Location Parameters
function updateURL(lat, lng) {
    const newUrl = `${window.location.pathname}?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`;
    window.history.replaceState({}, '', newUrl);
}

// Check for Shared Location in URL
function checkForSharedLocation() {
    const urlParams = new URLSearchParams(window.location.search);
    const lat = urlParams.get('lat');
    const lng = urlParams.get('lng');
    
    if (lat && lng) {
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        
        if (!isNaN(latNum) && !isNaN(lngNum)) {
            // Show notification
            setTimeout(() => {
                alert('Viewing shared location!');
            }, 500);
            
            setLocation(latNum, lngNum);
        }
    }
}

// Show Privacy Info
function showPrivacyInfo() {
    alert(`Privacy Information:

• This website uses your browser's built-in GPS (Geolocation API) to get your location
• Your location is processed locally in your browser and is not stored on any server
• When you share a location, only the coordinates are included in the URL
• No personal data is collected or transmitted
• You can disable location access in your browser settings at any time

For best results, use HTTPS or localhost.`);
}

// Show Loading
function showLoading(show) {
    document.getElementById('loadingIndicator').style.display = show ? 'block' : 'none';
}

// Show Error
function showError(message) {
    document.getElementById('errorText').textContent = message;
    document.getElementById('errorMessage').style.display = 'flex';
}

// Hide Error
function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('qrModal');
    if (event.target === modal) {
        closeModal();
    }
};

