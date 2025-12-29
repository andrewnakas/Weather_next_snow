/**
 * Configuration for weather APIs
 * For production deployment, credentials should be stored in environment variables
 */

const CONFIG = {
    // Google Weather API configuration
    // Get your API key at: https://developers.google.com/maps/documentation/weather/get-api-key
    GOOGLE_WEATHER_API_KEY: 'YOUR_API_KEY_HERE', // Will be replaced during build

    // WeatherNext 2 contact email
    WEATHERNEXT_EMAIL: 'YOUR_EMAIL_HERE', // Will be replaced during build

    // API endpoints
    GOOGLE_WEATHER_HOURLY_ENDPOINT: 'https://weather.googleapis.com/v1/forecast/hours:lookup',
    GOOGLE_WEATHER_DAILY_ENDPOINT: 'https://weather.googleapis.com/v1/forecast/days:lookup',

    // Fallback elevation API
    ELEVATION_API: 'https://api.open-elevation.io/api/v1/lookup',

    // Forecast settings
    FORECAST_HOURS: 240, // Up to 240 hours available from Google Weather API
};

// Check if we're in a build environment with injected credentials
if (typeof INJECTED_API_KEY !== 'undefined') {
    CONFIG.GOOGLE_WEATHER_API_KEY = INJECTED_API_KEY;
}

if (typeof INJECTED_EMAIL !== 'undefined') {
    CONFIG.WEATHERNEXT_EMAIL = INJECTED_EMAIL;
}
