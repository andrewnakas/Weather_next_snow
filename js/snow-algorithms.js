/**
 * Advanced snow prediction algorithms
 * Based on meteorological research and operational forecasting methods
 */

class SnowAlgorithms {
    /**
     * Determine precipitation type
     * @param {number} temp_surface_c - Surface temperature (°C)
     * @param {number} rh - Relative humidity (%)
     * @param {Array} temps_c_profile - Temperature profile (°C)
     * @returns {string} Precipitation type: 'snow', 'rain', 'mixed', 'sleet', 'freezing_rain'
     */
    static precipitationType(temp_surface_c, rh, temps_c_profile) {
        // Calculate wet bulb temperature
        const wet_bulb = Utils.wetBulbTemperature(temp_surface_c, rh);

        // Simple check first
        if (wet_bulb > 2) {
            return 'rain';
        }

        // Check for warm layers aloft
        const warmLayerResult = this.detectWarmLayers(temps_c_profile, temp_surface_c);

        return warmLayerResult;
    }

    /**
     * Detect warm layers that could cause mixed precipitation
     * @param {Array} temps_c - Temperature profile (°C)
     * @param {number} surface_temp_c - Surface temperature (°C)
     * @returns {string} Precipitation type
     */
    static detectWarmLayers(temps_c, surface_temp_c) {
        if (!temps_c || temps_c.length === 0) {
            // Fallback to simple temperature check
            if (surface_temp_c <= 0) return 'snow';
            if (surface_temp_c <= 2) return 'mixed';
            return 'rain';
        }

        // Check surface
        if (surface_temp_c > 2) {
            return 'rain';
        }

        // Check for warm layers aloft (above 0°C)
        let hasWarmLayer = false;
        for (let temp of temps_c) {
            if (temp > 0) {
                hasWarmLayer = true;
                break;
            }
        }

        if (!hasWarmLayer) {
            return 'snow'; // No warm layers, all snow
        }

        // Found warm layer - check if it would cause sleet or freezing rain
        if (surface_temp_c < 0) {
            // Surface below freezing with warm layer aloft
            // Simple heuristic: if surface very cold, precipitation refreezes (sleet)
            if (surface_temp_c < -2) {
                return 'sleet';
            } else {
                return 'freezing_rain';
            }
        }

        return 'mixed';
    }

    /**
     * Calculate Snow-to-Liquid Ratio using advanced multi-variable method
     * @param {Object} params - Parameters object
     * @returns {number} SLR ratio
     */
    static calculateSLR(params) {
        const {
            temp_surface_c,
            temp_850mb_c,
            temp_700mb_c,
            rh_surface,
            rh_dgz,
            wind_speed_ms,
            precip_rate_mm_hr
        } = params;

        // Base SLR from temperature
        const avg_temp = (temp_surface_c + temp_850mb_c + temp_700mb_c) / 3.0;

        let base_slr;
        if (avg_temp >= -2) {
            base_slr = 10;
        } else if (avg_temp >= -7) {
            base_slr = 15;
        } else if (avg_temp >= -12) {
            base_slr = 20;
        } else if (avg_temp >= -17) {
            base_slr = 25; // Peak dendritic growth zone
        } else {
            base_slr = 15; // Very cold, smaller crystals
        }

        // Humidity adjustment
        let humidity_factor = 1.0;
        if (rh_dgz >= 85 && rh_surface >= 90) {
            humidity_factor = 1.2; // Very favorable for large crystals
        } else if (rh_dgz >= 75) {
            humidity_factor = 1.1;
        } else if (rh_dgz < 60) {
            humidity_factor = 0.9; // Dry air = smaller crystals
        }

        // Wind speed adjustment
        let wind_factor = 1.0;
        if (wind_speed_ms < 5) {
            wind_factor = 1.1; // Light winds preserve crystals
        } else if (wind_speed_ms < 10) {
            wind_factor = 1.0;
        } else if (wind_speed_ms < 15) {
            wind_factor = 0.9;
        } else {
            wind_factor = 0.8; // Strong winds compact and break snow
        }

        // Precipitation rate adjustment
        let precip_factor = 1.0;
        if (precip_rate_mm_hr > 5) {
            precip_factor = 0.9;
        } else if (precip_rate_mm_hr > 10) {
            precip_factor = 0.85;
        }

        // Calculate final SLR
        const slr = base_slr * humidity_factor * wind_factor * precip_factor;

        // Clamp to reasonable range
        return Utils.clamp(slr, 5, 50);
    }

    /**
     * Analyze Dendritic Growth Zone
     * @param {Array} temps_c - Temperature profile (°C)
     * @param {Array} rh_profile - Relative humidity profile (%)
     * @param {Array} heights_m - Height profile (m)
     * @returns {Object} DGZ analysis results
     */
    static analyzeDGZ(temps_c, rh_profile, heights_m) {
        if (!temps_c || temps_c.length === 0) {
            return {
                present: false,
                depth_m: 0,
                mean_rh: 0,
                favorable: false,
                slr_boost: 1.0
            };
        }

        // Find layers within DGZ temperature range (-12°C to -18°C)
        const dgz_indices = [];
        for (let i = 0; i < temps_c.length; i++) {
            if (temps_c[i] >= -18 && temps_c[i] <= -12) {
                dgz_indices.push(i);
            }
        }

        if (dgz_indices.length === 0) {
            return {
                present: false,
                depth_m: 0,
                mean_rh: 0,
                favorable: false,
                slr_boost: 1.0
            };
        }

        // Calculate DGZ properties
        const dgz_top_idx = dgz_indices[0];
        const dgz_bottom_idx = dgz_indices[dgz_indices.length - 1];

        const dgz_depth = Math.abs(heights_m[dgz_bottom_idx] - heights_m[dgz_top_idx]);

        // Calculate mean RH in DGZ
        let sum_rh = 0;
        let sum_temp = 0;
        for (let idx of dgz_indices) {
            sum_rh += rh_profile[idx];
            sum_temp += temps_c[idx];
        }
        const mean_rh = sum_rh / dgz_indices.length;
        const mean_temp = sum_temp / dgz_indices.length;

        // Check if conditions are favorable
        // Ideal: DGZ depth >500m, RH >80%, centered around -15°C
        const favorable = (dgz_depth >= 500 && mean_rh >= 80);

        return {
            present: true,
            depth_m: dgz_depth,
            mean_rh: mean_rh,
            mean_temp_c: mean_temp,
            favorable: favorable,
            slr_boost: favorable ? 1.3 : 1.0 // Increase SLR by 30% if ideal DGZ
        };
    }

    /**
     * Calculate total snow accumulation
     * @param {Array} forecast_hours - Array of hourly forecast objects
     * @param {Object} params - Additional parameters
     * @returns {Object} Snow accumulation results
     */
    static calculateSnowAccumulation(forecast_hours, params = {}) {
        const orographic_factor = params.orographic_factor || 1.0;

        let total_liquid_mm = 0;
        let total_snow_cm = 0;
        const hourly_snow = [];
        let snow_hours_count = 0;
        let rain_hours_count = 0;
        let mixed_hours_count = 0;

        for (let i = 0; i < Math.min(48, forecast_hours.length); i++) {
            const hour = forecast_hours[i];

            // Check precipitation type
            const precip_type = this.precipitationType(
                hour.temp_surface_c,
                hour.rh_surface,
                hour.temps_c_profile
            );

            // Get liquid precip amount
            let liquid_mm = hour.precip_mm || 0;

            // Apply orographic enhancement
            liquid_mm *= orographic_factor;

            let snow_cm = 0;
            let slr = 0;

            if (precip_type === 'snow') {
                snow_hours_count++;

                // Calculate SLR
                slr = this.calculateSLR({
                    temp_surface_c: hour.temp_surface_c,
                    temp_850mb_c: hour.temp_850mb_c,
                    temp_700mb_c: hour.temp_700mb_c,
                    rh_surface: hour.rh_surface,
                    rh_dgz: hour.rh_dgz || 80,
                    wind_speed_ms: hour.wind_speed_ms,
                    precip_rate_mm_hr: liquid_mm
                });

                // Check for favorable DGZ
                const dgz_analysis = this.analyzeDGZ(
                    hour.temps_c_profile,
                    hour.rh_profile,
                    hour.heights_profile
                );

                if (dgz_analysis.favorable) {
                    slr *= dgz_analysis.slr_boost;
                }

                // Calculate snow for this hour
                snow_cm = (liquid_mm * slr) / 10.0;
            } else if (precip_type === 'mixed') {
                mixed_hours_count++;
                // Mixed precipitation - assume 50% falls as snow with lower SLR
                slr = 8;
                snow_cm = (liquid_mm * 0.5 * slr) / 10.0;
            } else if (precip_type === 'sleet') {
                // Sleet - accumulates but with very low SLR
                slr = 7;
                snow_cm = (liquid_mm * slr) / 10.0;
            } else {
                rain_hours_count++;
                // Rain - no snow accumulation
            }

            total_liquid_mm += liquid_mm;
            total_snow_cm += snow_cm;

            hourly_snow.push({
                time: hour.time,
                temp_c: Utils.round(hour.temp_surface_c, 1),
                precip_type: precip_type,
                liquid_mm: Utils.round(liquid_mm, 2),
                snow_cm: Utils.round(snow_cm, 1),
                slr: Utils.round(slr, 1),
                wind_speed_ms: Utils.round(hour.wind_speed_ms, 1)
            });
        }

        const mean_slr = total_liquid_mm > 0 ? (total_snow_cm * 10) / total_liquid_mm : 0;

        return {
            total_liquid_mm: Utils.round(total_liquid_mm, 1),
            total_snow_cm: Utils.round(total_snow_cm, 1),
            total_snow_inches: Utils.round(total_snow_cm / 2.54, 1),
            mean_slr: Utils.round(mean_slr, 1),
            hourly_snow: hourly_snow,
            snow_hours: snow_hours_count,
            rain_hours: rain_hours_count,
            mixed_hours: mixed_hours_count,
            confidence: this.calculateConfidence(forecast_hours, {
                snow_hours: snow_hours_count,
                mixed_hours: mixed_hours_count,
                total_snow_cm: total_snow_cm
            })
        };
    }

    /**
     * Calculate forecast confidence
     * @param {Array} forecast_hours - Forecast data
     * @param {Object} stats - Statistics from accumulation calculation
     * @returns {string} Confidence level: 'high', 'medium', 'low'
     */
    static calculateConfidence(forecast_hours, stats) {
        // Factors that affect confidence:
        // 1. Temperature consistency (all snow vs mixed)
        // 2. Amount of snow (small amounts less certain)
        // 3. Forecast hour (earlier hours more confident)

        let confidence_score = 100;

        // Penalize for mixed precipitation
        if (stats.mixed_hours > 5) {
            confidence_score -= 20;
        }

        // Penalize for very small amounts (harder to predict accurately)
        if (stats.total_snow_cm < 2) {
            confidence_score -= 15;
        }

        // Penalize for marginal temperatures
        const temps = forecast_hours.slice(0, 24).map(h => h.temp_surface_c);
        const near_freezing = temps.filter(t => t > -2 && t < 2).length;
        if (near_freezing > 6) {
            confidence_score -= 25;
        }

        if (confidence_score >= 80) return 'high';
        if (confidence_score >= 60) return 'medium';
        return 'low';
    }

    /**
     * Generate complete snow forecast
     * @param {Object} forecast_data - Complete forecast data from WeatherAPI
     * @returns {Object} Complete snow forecast
     */
    static generateForecast(forecast_data) {
        const accumulation = this.calculateSnowAccumulation(forecast_data.hourly);

        // Analyze DGZ for first snowy hour
        let dgz_info = null;
        for (let hour of forecast_data.hourly) {
            if (hour.temp_surface_c < 0) {
                dgz_info = this.analyzeDGZ(
                    hour.temps_c_profile,
                    hour.rh_profile,
                    hour.heights_profile
                );
                break;
            }
        }

        // Get atmospheric details from first hour
        const first_hour = forecast_data.hourly[0];

        return {
            location: forecast_data.location,
            accumulation: accumulation,
            dgz_analysis: dgz_info,
            atmospheric_conditions: {
                surface_temp_c: Utils.round(first_hour.temp_surface_c, 1),
                temp_850mb_c: Utils.round(first_hour.temp_850mb_c, 1),
                temp_700mb_c: Utils.round(first_hour.temp_700mb_c, 1),
                surface_rh: Utils.round(first_hour.rh_surface, 0),
                wind_speed_ms: Utils.round(first_hour.wind_speed_ms, 1),
                surface_pressure_mb: Utils.round(first_hour.surface_pressure, 1)
            },
            model_source: forecast_data.model_source,
            generated_at: new Date().toISOString()
        };
    }
}
