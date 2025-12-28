/**
 * Main application logic
 */

class SnowForecastApp {
    constructor() {
        this.map = new SnowMap('map');
        this.weatherAPI = new WeatherAPI();
        this.currentForecast = null;

        // UI elements
        this.sidebar = document.getElementById('sidebar');
        this.loading = document.getElementById('loading');
        this.results = document.getElementById('results');
        this.error = document.getElementById('error');
        this.closeSidebarBtn = document.getElementById('closeSidebar');
    }

    /**
     * Initialize the application
     */
    initialize() {
        // Initialize map (centered on Colorado Rockies by default)
        this.map.initialize(39.5, -106.0, 7);

        // Register map click handler
        this.map.onMapClick((lat, lon) => {
            this.handleLocationClick(lat, lon);
        });

        // Close sidebar button
        this.closeSidebarBtn.addEventListener('click', () => {
            this.hideSidebar();
        });

        console.log('Snow Forecast App initialized');
    }

    /**
     * Handle location click on map
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     */
    async handleLocationClick(latitude, longitude) {
        console.log(`Location clicked: ${latitude}, ${longitude}`);

        // Show sidebar and loading state
        this.showSidebar();
        this.showLoading();
        this.hideResults();
        this.hideError();

        try {
            // Fetch forecast data
            const forecastData = await this.weatherAPI.getCompleteForecast(latitude, longitude);

            // Generate snow prediction
            const snowForecast = SnowAlgorithms.generateForecast(forecastData);

            // Store current forecast
            this.currentForecast = snowForecast;

            // Display results
            this.displayResults(snowForecast);

            // Hide loading
            this.hideLoading();
            this.showResults();

        } catch (error) {
            console.error('Error generating forecast:', error);
            this.hideLoading();
            this.showError(error.message || 'Failed to generate forecast. Please try again.');
        }
    }

    /**
     * Display forecast results
     * @param {Object} forecast - Snow forecast object
     */
    displayResults(forecast) {
        // Location info
        document.getElementById('coords').textContent =
            `${forecast.location.latitude.toFixed(4)}°N, ${forecast.location.longitude.toFixed(4)}°E`;
        document.getElementById('elevation').textContent =
            `${forecast.location.elevation_m}m (${Math.round(forecast.location.elevation_m * 3.28084)}ft)`;

        // Forecast summary
        document.getElementById('totalSnow').textContent = forecast.accumulation.total_snow_cm;
        document.getElementById('totalSnowInches').textContent = forecast.accumulation.total_snow_inches;
        document.getElementById('slr').textContent = forecast.accumulation.mean_slr;
        document.getElementById('confidence').textContent = forecast.accumulation.confidence.toUpperCase();

        // Hourly breakdown
        this.displayHourlyBreakdown(forecast.accumulation.hourly_snow);

        // Atmospheric conditions
        this.displayAtmosphericConditions(forecast.atmospheric_conditions, forecast.dgz_analysis);

        // Model info
        document.getElementById('modelSource').textContent = forecast.model_source;
        document.getElementById('timestamp').textContent = new Date(forecast.generated_at).toLocaleString();
    }

    /**
     * Display hourly breakdown
     * @param {Array} hourly_snow - Array of hourly snow data
     */
    displayHourlyBreakdown(hourly_snow) {
        const container = document.getElementById('hourlyBreakdown');
        container.innerHTML = '';

        // Show first 24 hours with significant precipitation
        const significantHours = hourly_snow.filter((hour, index) => {
            return index < 24 && (hour.snow_cm > 0 || hour.liquid_mm > 0.1);
        });

        if (significantHours.length === 0) {
            container.innerHTML = '<p><em>No significant precipitation expected in next 24 hours</em></p>';
            return;
        }

        significantHours.forEach(hour => {
            const hourDiv = document.createElement('div');
            hourDiv.className = `hourly-item ${hour.precip_type}`;

            const timeStr = Utils.formatDateTime(new Date(hour.time));
            const precipIcon = this.getPrecipIcon(hour.precip_type);

            hourDiv.innerHTML = `
                <strong>${timeStr}</strong> ${precipIcon}<br>
                Temp: ${hour.temp_c}°C |
                ${hour.precip_type === 'snow' ? `Snow: ${hour.snow_cm}cm` :
                  hour.precip_type === 'rain' ? `Rain: ${hour.liquid_mm}mm` :
                  `Mixed: ${hour.snow_cm}cm snow`}
                ${hour.slr > 0 ? `| SLR: ${hour.slr}:1` : ''}
            `;

            container.appendChild(hourDiv);
        });
    }

    /**
     * Get precipitation icon
     * @param {string} type - Precipitation type
     * @returns {string} Icon HTML
     */
    getPrecipIcon(type) {
        const icons = {
            'snow': '❄️',
            'rain': '🌧️',
            'mixed': '🌨️',
            'sleet': '🧊',
            'freezing_rain': '🌧️❄️'
        };
        return icons[type] || '🌧️';
    }

    /**
     * Display atmospheric conditions
     * @param {Object} conditions - Atmospheric conditions
     * @param {Object} dgz - DGZ analysis
     */
    displayAtmosphericConditions(conditions, dgz) {
        const container = document.getElementById('atmosphericDetails');
        container.innerHTML = '';

        const grid = document.createElement('div');
        grid.className = 'atmospheric-details-grid';

        // Temperature levels
        grid.innerHTML += `
            <div class="atmos-item">
                <strong>Surface Temp</strong>
                ${conditions.surface_temp_c}°C
            </div>
            <div class="atmos-item">
                <strong>850mb Temp</strong>
                ${conditions.temp_850mb_c}°C
            </div>
            <div class="atmos-item">
                <strong>700mb Temp</strong>
                ${conditions.temp_700mb_c}°C
            </div>
            <div class="atmos-item">
                <strong>Rel. Humidity</strong>
                ${conditions.surface_rh}%
            </div>
            <div class="atmos-item">
                <strong>Wind Speed</strong>
                ${conditions.wind_speed_ms} m/s (${Math.round(conditions.wind_speed_ms * 2.237)} mph)
            </div>
            <div class="atmos-item">
                <strong>Pressure</strong>
                ${conditions.surface_pressure_mb} mb
            </div>
        `;

        container.appendChild(grid);

        // DGZ information
        if (dgz) {
            const dgzDiv = document.createElement('div');
            dgzDiv.style.marginTop = '15px';
            dgzDiv.style.padding = '10px';
            dgzDiv.style.background = '#f8f9fa';
            dgzDiv.style.borderRadius = '5px';

            let dgzStatus, dgzClass;
            if (dgz.favorable) {
                dgzStatus = 'FAVORABLE';
                dgzClass = 'favorable';
            } else if (dgz.present) {
                dgzStatus = 'PRESENT';
                dgzClass = 'present';
            } else {
                dgzStatus = 'ABSENT';
                dgzClass = 'absent';
            }

            dgzDiv.innerHTML = `
                <strong>Dendritic Growth Zone:</strong>
                <span class="dgz-indicator ${dgzClass}">${dgzStatus}</span>
                ${dgz.present ? `
                    <br><small>Depth: ${Math.round(dgz.depth_m)}m |
                    Mean RH: ${Math.round(dgz.mean_rh)}% |
                    Mean Temp: ${dgz.mean_temp_c.toFixed(1)}°C</small>
                ` : ''}
                <br><small style="color: #666; margin-top: 5px; display: block;">
                    DGZ (-12°C to -18°C) produces fluffy dendritic snow crystals with higher snow ratios
                </small>
            `;

            container.appendChild(dgzDiv);
        }
    }

    /**
     * Show sidebar
     */
    showSidebar() {
        this.sidebar.classList.remove('hidden');
    }

    /**
     * Hide sidebar
     */
    hideSidebar() {
        this.sidebar.classList.add('hidden');
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.loading.classList.remove('hidden');
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.loading.classList.add('hidden');
    }

    /**
     * Show results
     */
    showResults() {
        this.results.classList.remove('hidden');
    }

    /**
     * Hide results
     */
    hideResults() {
        this.results.classList.add('hidden');
    }

    /**
     * Show error
     * @param {string} message - Error message
     */
    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        this.error.classList.remove('hidden');
    }

    /**
     * Hide error
     */
    hideError() {
        this.error.classList.add('hidden');
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new SnowForecastApp();
    app.initialize();

    // Make app globally accessible for debugging
    window.snowApp = app;
});
