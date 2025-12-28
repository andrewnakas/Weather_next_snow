/**
 * Weather data fetching using Google Weather API (Google Maps Platform)
 * Requires API key from Google Cloud Console
 * Documentation: https://developers.google.com/maps/documentation/weather
 */

class WeatherAPI {
    constructor() {
        this.apiKey = CONFIG.GOOGLE_WEATHER_API_KEY;
        this.hourlyEndpoint = CONFIG.GOOGLE_WEATHER_HOURLY_ENDPOINT;
        this.dailyEndpoint = CONFIG.GOOGLE_WEATHER_DAILY_ENDPOINT;
        this.elevationUrl = CONFIG.ELEVATION_API;
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
            // Fallback to 0
            return 0;
        }
    }

    /**
     * Fetch hourly weather forecast from Google Weather API
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @param {number} hours - Number of hours to forecast (max 240)
     * @returns {Promise<Object>} Weather forecast data
     */
    async fetchHourlyForecast(latitude, longitude, hours = 72) {
        try {
            const params = new URLSearchParams({
                key: this.apiKey,
                'location.latitude': latitude,
                'location.longitude': longitude,
                hours: Math.min(hours, 240)
            });

            const response = await fetch(`${this.hourlyEndpoint}?${params}`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Google Weather API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            return this.parseHourlyForecast(data);
        } catch (error) {
            console.error('Weather fetch error:', error);
            throw error;
        }
    }

    /**
     * Parse hourly forecast data from Google Weather API
     * @param {Object} data - Raw API response
     * @returns {Object} Parsed forecast data
     */
    parseHourlyForecast(data) {
        if (!data.hourlyForecasts || data.hourlyForecasts.length === 0) {
            throw new Error('No forecast data available');
        }

        const hourly = data.hourlyForecasts.map(hour => {
            // Extract temperature (convert to Celsius if needed)
            const temp_c = hour.temperature?.value || 0;

            // Extract precipitation
            const precip_mm = hour.precipitation?.value || 0;

            // Extract humidity
            const humidity = hour.relativeHumidity?.value || 50;

            // Extract pressure (convert to mb if needed)
            const pressure_mb = hour.pressure?.value ? hour.pressure.value / 100 : 1013;

            // Extract wind
            const wind_speed_ms = hour.wind?.speed?.value || 0;
            const wind_direction = hour.wind?.direction || 0;

            // Extract cloud cover
            const cloud_cover = hour.cloudCover?.value || 0;

            // Parse time
            const time = new Date(hour.time);

            return {
                time: time,
                temperature_2m: temp_c,
                precipitation: precip_mm,
                relative_humidity_2m: humidity,
                surface_pressure: pressure_mb,
                wind_speed_10m: wind_speed_ms,
                wind_direction_10m: wind_direction,
                cloud_cover: cloud_cover,
                precipitation_probability: hour.precipitationProbability || 0,
                dew_point: hour.dewPoint?.value || temp_c - 5,
                feels_like: hour.apparentTemperature?.value || temp_c
            };
        });

        return {
            latitude: data.location?.latitude || 0,
            longitude: data.location?.longitude || 0,
            hourly: hourly,
            timezone: data.timezone || 'UTC'
        };
    }

    /**
     * Estimate pressure level data from surface conditions
     * Google Weather API doesn't provide pressure level data directly,
     * so we estimate using standard atmosphere and lapse rates
     * @param {Object} surfaceData - Surface forecast data
     * @param {number} surfaceElevation - Surface elevation in meters
     * @returns {Array} Pressure level data
     */
    estimatePressureLevels(surfaceData, surfaceElevation) {
        // Standard pressure levels (mb)
        const standardLevels = [1000, 925, 850, 700, 500, 300];

        const firstHour = surfaceData.hourly[0];
        const surfaceTemp = firstHour.temperature_2m;
        const surfaceRH = firstHour.relative_humidity_2m;
        const surfacePressure = firstHour.surface_pressure;

        // Calculate pressure levels
        const pressureLevels = standardLevels.map(pressure => {
            // Calculate height of this pressure level
            const height = Utils.pressureToElevation(pressure);

            // Skip if below surface
            if (height < surfaceElevation) {
                return null;
            }

            // Estimate temperature using environmental lapse rate
            // Adjust lapse rate based on humidity (saturated vs dry)
            const lapseRate = surfaceRH > 80 ? 0.006 : 0.0065; // °C/m
            const heightDiff = height - surfaceElevation;
            const temp = surfaceTemp - (heightDiff * lapseRate);

            // Estimate humidity (decreases with height)
            const rh = Math.max(10, surfaceRH - (heightDiff / 100));

            return {
                pressure: pressure,
                height: height,
                temperature: temp,
                relative_humidity: rh
            };
        }).filter(level => level !== null);

        return pressureLevels;
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

            // Fetch hourly forecast
            const forecast = await this.fetchHourlyForecast(latitude, longitude, 72);

            // Estimate pressure level data
            const pressureLevels = this.estimatePressureLevels(forecast, elevation);

            // Enhance forecast hours with pressure level data
            const enhancedHourly = forecast.hourly.map((hour, index) => {
                // Get pressure level data for this hour
                const temperatures = pressureLevels.map(level => level.temperature);
                const heights = pressureLevels.map(level => level.height);
                const pressures = pressureLevels.map(level => level.pressure);

                // Calculate temperature at target elevation
                const temp_at_elevation = Utils.interpolateTemperatureAtElevation(
                    elevation,
                    pressures,
                    temperatures,
                    heights
                );

                // Get specific pressure level temps
                // 850mb is typically ~1500m, 700mb is ~3000m
                const level_850mb = pressureLevels.find(l => l.pressure === 850);
                const level_700mb = pressureLevels.find(l => l.pressure === 700);

                const temp_850mb = level_850mb ? level_850mb.temperature : temp_at_elevation - 5;
                const temp_700mb = level_700mb ? level_700mb.temperature : temp_at_elevation - 10;

                // Estimate RH at elevation
                const rh_at_elevation = Utils.interpolateTemperatureAtElevation(
                    elevation,
                    pressures,
                    pressureLevels.map(l => l.relative_humidity),
                    heights
                );

                // Estimate DGZ RH (average of levels in DGZ range)
                const dgz_levels = pressureLevels.filter(l =>
                    l.temperature >= -18 && l.temperature <= -12
                );
                const rh_dgz = dgz_levels.length > 0
                    ? dgz_levels.reduce((sum, l) => sum + l.relative_humidity, 0) / dgz_levels.length
                    : 80;

                return {
                    ...hour,
                    temp_surface_c: temp_at_elevation,
                    temp_850mb_c: temp_850mb,
                    temp_700mb_c: temp_700mb,
                    rh_surface: rh_at_elevation,
                    rh_dgz: rh_dgz,
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
                model_source: 'Google Weather API (Maps Platform)'
            };
        } catch (error) {
            console.error('Error fetching complete forecast:', error);
            throw error;
        }
    }
}
