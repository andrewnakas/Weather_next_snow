/**
 * Utility functions for mountain snowfall prediction
 */

class Utils {
    /**
     * Convert elevation to pressure using barometric formula
     * @param {number} elevation_m - Elevation in meters
     * @returns {number} Pressure in millibars
     */
    static elevationToPressure(elevation_m) {
        // Simplified barometric formula
        return 1013.25 * Math.pow(1 - elevation_m / 44330.77, 5.25588);
    }

    /**
     * Convert pressure to approximate elevation
     * @param {number} pressure_mb - Pressure in millibars
     * @returns {number} Elevation in meters
     */
    static pressureToElevation(pressure_mb) {
        return 44330.77 * (1 - Math.pow(pressure_mb / 1013.25, 0.190266));
    }

    /**
     * Linear interpolation
     * @param {number} x - Target x value
     * @param {number} x1 - Lower bound x
     * @param {number} x2 - Upper bound x
     * @param {number} y1 - Lower bound y
     * @param {number} y2 - Upper bound y
     * @returns {number} Interpolated y value
     */
    static linearInterpolate(x, x1, x2, y1, y2) {
        if (x2 === x1) return y1;
        return y1 + (x - x1) * (y2 - y1) / (x2 - x1);
    }

    /**
     * Find temperature at target elevation from pressure level data
     * @param {number} target_elevation_m - Target elevation
     * @param {Array} pressures - Array of pressure levels (mb)
     * @param {Array} temperatures - Array of temperatures (°C)
     * @param {Array} heights - Array of geopotential heights (m)
     * @returns {number} Temperature at target elevation (°C)
     */
    static interpolateTemperatureAtElevation(target_elevation_m, pressures, temperatures, heights) {
        // Find bracketing levels
        let lowerIdx = -1;
        let upperIdx = -1;

        for (let i = 0; i < heights.length - 1; i++) {
            if (heights[i] <= target_elevation_m && heights[i + 1] >= target_elevation_m) {
                lowerIdx = i;
                upperIdx = i + 1;
                break;
            }
        }

        // If not found, extrapolate using lapse rate
        if (lowerIdx === -1) {
            if (target_elevation_m < heights[0]) {
                // Below lowest level - use standard lapse rate
                const lapseRate = 0.0065; // °C/m
                return temperatures[0] + (heights[0] - target_elevation_m) * lapseRate;
            } else {
                // Above highest level - use standard lapse rate
                const lapseRate = 0.0065; // °C/m
                const lastIdx = heights.length - 1;
                return temperatures[lastIdx] - (target_elevation_m - heights[lastIdx]) * lapseRate;
            }
        }

        // Linear interpolation
        return this.linearInterpolate(
            target_elevation_m,
            heights[lowerIdx],
            heights[upperIdx],
            temperatures[lowerIdx],
            temperatures[upperIdx]
        );
    }

    /**
     * Calculate wet bulb temperature approximation
     * @param {number} temp_c - Temperature in Celsius
     * @param {number} rh - Relative humidity (%)
     * @returns {number} Wet bulb temperature (°C)
     */
    static wetBulbTemperature(temp_c, rh) {
        // Simplified wet bulb approximation
        const wetBulbDepression = (100 - rh) / 5.0;
        return temp_c - wetBulbDepression;
    }

    /**
     * Format date/time for display
     * @param {Date} date - Date object
     * @returns {string} Formatted date string
     */
    static formatDateTime(date) {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Calculate wind speed from u and v components
     * @param {number} u - U component (m/s)
     * @param {number} v - V component (m/s)
     * @returns {number} Wind speed (m/s)
     */
    static windSpeed(u, v) {
        return Math.sqrt(u * u + v * v);
    }

    /**
     * Calculate wind direction from u and v components
     * @param {number} u - U component (m/s)
     * @param {number} v - V component (m/s)
     * @returns {number} Wind direction (degrees, meteorological convention)
     */
    static windDirection(u, v) {
        let dir = (270 - Math.atan2(v, u) * 180 / Math.PI) % 360;
        return dir;
    }

    /**
     * Convert Kelvin to Celsius
     * @param {number} kelvin - Temperature in Kelvin
     * @returns {number} Temperature in Celsius
     */
    static kelvinToCelsius(kelvin) {
        return kelvin - 273.15;
    }

    /**
     * Round to specified decimal places
     * @param {number} value - Value to round
     * @param {number} decimals - Number of decimal places
     * @returns {number} Rounded value
     */
    static round(value, decimals = 1) {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    /**
     * Clamp value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
}
