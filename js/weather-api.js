/**
 * Weather data fetching using Open-Meteo API
 * Free, no API key required, CORS-enabled
 */

class WeatherAPI {
    constructor() {
        this.baseUrl = 'https://api.open-meteo.com/v1/forecast';
        this.elevationUrl = 'https://api.open-elevation.io/api/v1/lookup';
    }

    /**
     * Fetch elevation for given coordinates
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @returns {Promise<number>} Elevation in meters
     */
    async fetchElevation(latitude, longitude) {
        try {
            const response = await fetch(
                `${this.elevationUrl}?locations=${latitude},${longitude}`
            );

            if (!response.ok) {
                throw new Error('Elevation fetch failed');
            }

            const data = await response.json();
            return data.results[0].elevation;
        } catch (error) {
            console.error('Elevation fetch error:', error);
            // Fallback: estimate from pressure if available, or use 0
            return 0;
        }
    }

    /**
     * Fetch weather forecast data
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @returns {Promise<Object>} Weather forecast data
     */
    async fetchForecast(latitude, longitude) {
        try {
            const params = new URLSearchParams({
                latitude: latitude,
                longitude: longitude,
                hourly: [
                    'temperature_2m',
                    'precipitation',
                    'relative_humidity_2m',
                    'surface_pressure',
                    'wind_speed_10m',
                    'wind_direction_10m',
                    'cloud_cover',
                    'precipitation_probability'
                ].join(','),
                temperature_unit: 'celsius',
                wind_speed_unit: 'ms',
                precipitation_unit: 'mm',
                forecast_days: 3
            });

            const response = await fetch(`${this.baseUrl}?${params}`);

            if (!response.ok) {
                throw new Error(`Weather fetch failed: ${response.status}`);
            }

            const data = await response.json();
            return this.parseForecastData(data);
        } catch (error) {
            console.error('Weather fetch error:', error);
            throw error;
        }
    }

    /**
     * Fetch pressure level data (simulated from surface data)
     * Open-Meteo doesn't provide full pressure level data, so we'll simulate it
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @returns {Promise<Object>} Pressure level data
     */
    async fetchPressureLevels(latitude, longitude) {
        // For demonstration, we'll simulate pressure levels using surface data
        // and standard atmosphere assumptions
        const surfaceData = await this.fetchForecast(latitude, longitude);

        // Standard pressure levels (mb)
        const standardLevels = [1000, 925, 850, 700, 500, 300];

        // Simulate pressure level data for first forecast hour
        const pressureLevels = standardLevels.map(pressure => {
            const height = Utils.pressureToElevation(pressure);
            // Use standard lapse rate to estimate temperature
            const temp = surfaceData.hourly[0].temperature_2m - (height * 0.0065);

            return {
                pressure: pressure,
                height: height,
                temperature: temp,
                // Assume humidity decreases with height
                relative_humidity: Math.max(10, surfaceData.hourly[0].relative_humidity_2m - (height / 100))
            };
        });

        return pressureLevels;
    }

    /**
     * Parse forecast data into usable format
     * @param {Object} data - Raw API response
     * @returns {Object} Parsed forecast data
     */
    parseForecastData(data) {
        const hourly = data.hourly;
        const times = hourly.time;

        const forecastHours = times.map((time, index) => {
            return {
                time: new Date(time),
                temperature_2m: hourly.temperature_2m[index],
                precipitation: hourly.precipitation[index],
                relative_humidity_2m: hourly.relative_humidity_2m[index],
                surface_pressure: hourly.surface_pressure[index],
                wind_speed_10m: hourly.wind_speed_10m[index],
                wind_direction_10m: hourly.wind_direction_10m[index],
                cloud_cover: hourly.cloud_cover[index],
                precipitation_probability: hourly.precipitation_probability[index]
            };
        });

        return {
            latitude: data.latitude,
            longitude: data.longitude,
            elevation: data.elevation,
            hourly: forecastHours,
            timezone: data.timezone
        };
    }

    /**
     * Get complete forecast data for snow prediction
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @param {number} elevation - Elevation in meters (optional)
     * @returns {Promise<Object>} Complete forecast data
     */
    async getCompleteForecast(latitude, longitude, elevation = null) {
        try {
            // Fetch elevation if not provided
            if (elevation === null) {
                elevation = await this.fetchElevation(latitude, longitude);
            }

            // Fetch surface forecast
            const forecast = await this.fetchForecast(latitude, longitude);

            // Fetch pressure level data
            const pressureLevels = await this.fetchPressureLevels(latitude, longitude);

            // Enhance forecast hours with pressure level data
            const enhancedHourly = forecast.hourly.map((hour, index) => {
                // Calculate temperature at elevation
                const temperatures = pressureLevels.map(level => level.temperature);
                const heights = pressureLevels.map(level => level.height);
                const pressures = pressureLevels.map(level => level.pressure);

                const temp_at_elevation = Utils.interpolateTemperatureAtElevation(
                    elevation,
                    pressures,
                    temperatures,
                    heights
                );

                // Get 850mb and 700mb temps (indices 2 and 3)
                const temp_850mb = pressureLevels[2].temperature;
                const temp_700mb = pressureLevels[3].temperature;

                // Get RH at elevation (simplified)
                const rh_at_elevation = Math.max(20, hour.relative_humidity_2m - (elevation / 100));

                return {
                    ...hour,
                    temp_surface_c: temp_at_elevation,
                    temp_850mb_c: temp_850mb,
                    temp_700mb_c: temp_700mb,
                    rh_surface: rh_at_elevation,
                    rh_dgz: 80, // Assumed for DGZ (would need more data)
                    wind_speed_ms: hour.wind_speed_10m,
                    precip_mm: hour.precipitation,
                    pressure_levels: pressures,
                    temps_c_profile: temperatures,
                    rh_profile: pressureLevels.map(l => l.relative_humidity),
                    heights_profile: heights
                };
            });

            return {
                location: {
                    latitude: forecast.latitude,
                    longitude: forecast.longitude,
                    elevation_m: elevation
                },
                hourly: enhancedHourly,
                timezone: forecast.timezone,
                model_source: 'Open-Meteo API (GFS-based)'
            };
        } catch (error) {
            console.error('Error fetching complete forecast:', error);
            throw error;
        }
    }
}
