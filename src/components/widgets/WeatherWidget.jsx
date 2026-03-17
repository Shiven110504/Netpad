import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, MapPin } from 'lucide-react';

const WEATHER_CODES = {
  0: { icon: '☀️', desc: 'Clear' },
  1: { icon: '🌤️', desc: 'Mainly clear' },
  2: { icon: '⛅', desc: 'Partly cloudy' },
  3: { icon: '☁️', desc: 'Overcast' },
  45: { icon: '🌫️', desc: 'Fog' },
  48: { icon: '🌫️', desc: 'Fog' },
  51: { icon: '🌦️', desc: 'Light drizzle' },
  53: { icon: '🌦️', desc: 'Drizzle' },
  55: { icon: '🌧️', desc: 'Heavy drizzle' },
  61: { icon: '🌧️', desc: 'Light rain' },
  63: { icon: '🌧️', desc: 'Rain' },
  65: { icon: '🌧️', desc: 'Heavy rain' },
  71: { icon: '🌨️', desc: 'Light snow' },
  73: { icon: '🌨️', desc: 'Snow' },
  75: { icon: '❄️', desc: 'Heavy snow' },
  77: { icon: '🌨️', desc: 'Snow grains' },
  80: { icon: '🌧️', desc: 'Showers' },
  81: { icon: '🌧️', desc: 'Showers' },
  82: { icon: '🌧️', desc: 'Heavy showers' },
  85: { icon: '🌨️', desc: 'Snow showers' },
  86: { icon: '❄️', desc: 'Heavy snow showers' },
  95: { icon: '⛈️', desc: 'Thunderstorm' },
  96: { icon: '⛈️', desc: 'Thunderstorm w/ hail' },
  99: { icon: '⛈️', desc: 'Severe thunderstorm' },
};

function getWeatherInfo(code) {
  return WEATHER_CODES[code] || { icon: '🌡️', desc: 'Unknown' };
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useFahrenheit, setUseFahrenheit] = useState(false);

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check cache
      const cached = localStorage.getItem('netpad_weather_cache');
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 30 * 60 * 1000) {
          setWeather(data.weather);
          setCity(data.city);
          setLoading(false);
          return;
        }
      }

      // Get location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode
      const geoRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      const geoData = await geoRes.json();
      const cityName = geoData.city || geoData.locality || geoData.principalSubdivision || 'Unknown';

      // Fetch weather
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
      );
      const weatherData = await weatherRes.json();

      const result = {
        temp: weatherData.current.temperature_2m,
        code: weatherData.current.weather_code,
      };

      setWeather(result);
      setCity(cityName);

      // Cache
      localStorage.setItem('netpad_weather_cache', JSON.stringify({
        data: { weather: result, city: cityName },
        timestamp: Date.now(),
      }));
    } catch (err) {
      setError(err.message || 'Failed to load weather');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWeather(); }, [fetchWeather]);

  if (loading) {
    return <span style={{ fontSize: 12, opacity: 0.7 }}>Loading weather...</span>;
  }

  if (error) {
    return (
      <span style={{ fontSize: 12, opacity: 0.6, display: 'flex', alignItems: 'center', gap: 4 }}>
        <MapPin size={12} /> Weather unavailable
      </span>
    );
  }

  if (!weather) return null;

  const info = getWeatherInfo(weather.code);
  const tempC = Math.round(weather.temp);
  const tempF = Math.round(weather.temp * 9 / 5 + 32);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
      <span>{info.icon}</span>
      <span
        onClick={() => setUseFahrenheit(!useFahrenheit)}
        style={{ cursor: 'pointer' }}
        title="Click to toggle °C/°F"
      >
        {useFahrenheit ? `${tempF}°F` : `${tempC}°C`}
      </span>
      <span style={{ opacity: 0.7 }}>{city}</span>
      <button
        onClick={fetchWeather}
        title="Refresh weather"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          padding: 0,
          opacity: 0.7,
        }}
      >
        <RefreshCw size={11} />
      </button>
    </div>
  );
}
