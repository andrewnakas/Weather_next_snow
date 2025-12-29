#!/bin/bash
# Inject secrets into config.js during build

if [ -z "$GOOGLE_WEATHER_API_KEY" ]; then
    echo "Warning: GOOGLE_WEATHER_API_KEY not set"
else
    echo "Injecting Google Weather API key..."
    sed -i "s/YOUR_API_KEY_HERE/${GOOGLE_WEATHER_API_KEY}/g" js/config.js
fi

if [ -z "$WEATHERNEXT_EMAIL" ]; then
    echo "Warning: WEATHERNEXT_EMAIL not set"
else
    echo "Injecting WeatherNext email..."
    sed -i "s/YOUR_EMAIL_HERE/${WEATHERNEXT_EMAIL}/g" js/config.js
fi

echo "Configuration updated successfully"
