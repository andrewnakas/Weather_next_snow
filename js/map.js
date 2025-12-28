/**
 * Interactive map using Leaflet
 */

class SnowMap {
    constructor(mapElementId) {
        this.mapElementId = mapElementId;
        this.map = null;
        this.selectedMarker = null;
        this.clickHandler = null;
    }

    /**
     * Initialize the map
     * @param {number} lat - Initial latitude
     * @param {number} lon - Initial longitude
     * @param {number} zoom - Initial zoom level
     */
    initialize(lat = 40.0, lon = -105.5, zoom = 6) {
        // Create map
        this.map = L.map(this.mapElementId).setView([lat, lon], zoom);

        // Add terrain tile layer (OpenTopoMap for mountain visualization)
        L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
            maxZoom: 17
        }).addTo(this.map);

        // Add scale
        L.control.scale({ imperial: true, metric: true }).addTo(this.map);

        // Set up click handler
        this.map.on('click', (e) => {
            this.handleMapClick(e.latlng);
        });
    }

    /**
     * Handle map click
     * @param {Object} latlng - Leaflet LatLng object
     */
    handleMapClick(latlng) {
        // Remove previous marker if exists
        if (this.selectedMarker) {
            this.map.removeLayer(this.selectedMarker);
        }

        // Add new marker
        this.selectedMarker = L.marker([latlng.lat, latlng.lng], {
            icon: L.divIcon({
                className: 'selected-location-marker',
                html: '<div style="background-color: #667eea; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(this.map);

        // Call the registered click handler if exists
        if (this.clickHandler) {
            this.clickHandler(latlng.lat, latlng.lng);
        }
    }

    /**
     * Register click handler
     * @param {Function} handler - Function to call on map click
     */
    onMapClick(handler) {
        this.clickHandler = handler;
    }

    /**
     * Add a popup to the selected marker
     * @param {string} content - HTML content for popup
     */
    addPopup(content) {
        if (this.selectedMarker) {
            this.selectedMarker.bindPopup(content).openPopup();
        }
    }

    /**
     * Fly to location
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {number} zoom - Zoom level
     */
    flyTo(lat, lon, zoom = 10) {
        this.map.flyTo([lat, lon], zoom);
    }

    /**
     * Get map instance
     * @returns {Object} Leaflet map instance
     */
    getMap() {
        return this.map;
    }
}
