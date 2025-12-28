# Mountain Snowfall Prediction System

An interactive web application for predicting mountain snowfall using advanced meteorological algorithms. Click anywhere on the map to get detailed snowfall predictions based on atmospheric conditions.

## Features

- **Interactive Map**: Click any location on the map to get snowfall predictions
- **Advanced Algorithms**: Uses multi-variable snow-to-liquid ratio calculations
- **Dendritic Growth Zone Analysis**: Identifies optimal conditions for fluffy snow
- **Atmospheric Profiles**: Shows temperature and humidity at multiple pressure levels
- **48-Hour Forecasts**: Detailed hourly breakdown of snow accumulation
- **Precipitation Type Detection**: Distinguishes between snow, rain, mixed, and sleet
- **Elevation-Aware**: Automatically adjusts predictions based on terrain elevation

## How It Works

The system combines multiple meteorological data sources and applies sophisticated algorithms:

1. **Weather Data**: Fetches forecast data from Open-Meteo API (GFS-based model)
2. **Elevation Correction**: Adjusts temperature using pressure level interpolation
3. **Snow-to-Liquid Ratio**: Calculates SLR based on temperature, humidity, and wind
4. **DGZ Analysis**: Identifies dendritic growth zones (-12°C to -18°C) for optimal snow crystal formation
5. **Warm Layer Detection**: Detects atmospheric conditions that cause mixed precipitation

## Technologies Used

- **Frontend**: Pure JavaScript (ES6+), HTML5, CSS3
- **Mapping**: Leaflet.js with OpenTopoMap tiles
- **Data Sources**:
  - **Google Weather API** (powered by WeatherNext 2 - Google DeepMind's AI forecasting model)
  - Open-Elevation API (terrain elevation)
- **Deployment**: GitHub Pages via GitHub Actions

## Getting Started

### View Online

Visit the live application: **https://andrewnakas.github.io/Weather_next_snow/**

### Setup Your Own Instance

1. **Get a Google Weather API Key**:
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Weather API
   - Create an API key
   - Keep it secure!

2. **Clone the repository**:
   ```bash
   git clone https://github.com/andrewnakas/Weather_next_snow.git
   cd Weather_next_snow
   ```

3. **Configure API Key**:
   - Open `js/config.js`
   - Replace `'YOUR_API_KEY_HERE'` with your actual API key
   - **Important**: Never commit your API key to public repos!

4. **Run locally**:
   ```bash
   # Using Python 3
   python -m http.server 8000

   # Or using Node.js
   npx serve
   ```

5. **Open** http://localhost:8000 in your browser

### Deploy to GitHub Pages

To deploy with GitHub Actions:

1. **Add API Key as Secret**:
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `GOOGLE_WEATHER_API_KEY`
   - Value: Your API key

2. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Under "Source", select "GitHub Actions"

3. **Push to main branch** - deployment happens automatically!

## Usage

1. **Select a Location**: Click anywhere on the map
2. **View Predictions**: See detailed snowfall forecast in the sidebar
3. **Analyze Conditions**: Review atmospheric conditions and DGZ analysis
4. **Check Hourly Breakdown**: See hour-by-hour precipitation and accumulation

## Meteorological Algorithms

### Snow-to-Liquid Ratio (SLR)

The system calculates SLR using multiple factors:
- **Temperature Profile**: Surface, 850mb, and 700mb temperatures
- **Humidity**: Surface and dendritic growth zone relative humidity
- **Wind Speed**: Higher winds reduce SLR by breaking crystals
- **Precipitation Rate**: Heavy precipitation can compress snow

### Dendritic Growth Zone (DGZ)

The DGZ (-12°C to -18°C) is where snowflakes grow largest and fluffiest:
- **Favorable Conditions**: DGZ depth >500m, RH >80%
- **SLR Boost**: Up to 30% increase in snow ratio when favorable
- **Crystal Type**: Dendritic (stellar) crystals form in this zone

### Precipitation Type Detection

Detects various precipitation types:
- **Snow**: All-snow when temperatures favorable throughout column
- **Rain**: Temperatures too warm for snow
- **Mixed**: Marginal temperatures near freezing
- **Sleet**: Warm layer aloft melts snow, refreezes before surface
- **Freezing Rain**: Warm layer aloft, surface below freezing

## Project Structure

```
Weather_next_snow/
├── index.html              # Main HTML page
├── css/
│   └── styles.css         # Styling
├── js/
│   ├── utils.js           # Utility functions
│   ├── weather-api.js     # Weather data fetching
│   ├── snow-algorithms.js # Snow prediction algorithms
│   ├── map.js             # Leaflet map management
│   └── app.js             # Main application logic
├── .github/
│   └── workflows/
│       └── deploy.yml     # GitHub Actions deployment
└── README.md              # This file
```

## API Usage

This project uses the following APIs:

### Google Weather API (Required)
- **What**: Google Maps Platform Weather API powered by WeatherNext 2
- **Setup**: Get API key from [Google Cloud Console](https://developers.google.com/maps/documentation/weather/get-api-key)
- **Pricing**: Currently in Preview - free up to 10,000 calls/month, then $0.15 per 1,000 calls
- **Configuration**: API key stored in `js/config.js` or injected via GitHub Secrets

### Open-Elevation API (Free)
- **What**: Terrain elevation data
- **Setup**: No API key required, CORS-enabled

## Limitations

- Weather model resolution: ~20-28km (GFS resolution)
- Forecast range: 3 days (72 hours)
- Pressure level data: Simulated from surface data for demonstration
- No real-time radar data integration

## Future Enhancements

- [ ] Integration with NOAA HRRR data (3km resolution)
- [ ] Ensemble forecasting with uncertainty ranges
- [ ] Historical verification against observations
- [ ] Machine learning terrain corrections
- [ ] Mobile-responsive design improvements
- [ ] Save favorite locations
- [ ] Export forecast data

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## References

Based on meteorological research including:
- NOAA National Weather Service snow forecasting techniques
- Cobb-Waldsteicher SLR prediction method
- Mount Washington Observatory snow research
- Academic papers on dendritic growth zones

## Author

Created for mountain enthusiasts, backcountry skiers, and weather geeks who want to understand where and when the best snow will fall.

---

**Disclaimer**: This is a demonstration project for educational purposes. Always consult official weather forecasts and avalanche advisories for backcountry activities.
