import React, { useContext, useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Papa from 'papaparse';
import { FilterContext } from './FilterContext';

const PopulationMap = () => {
  const [geoData, setGeoData] = useState(null);
  const [populationData, setPopulationData] = useState([]);
  const { year, setYear } = useContext(FilterContext); // Access year and setYear from context
  const [availableYears, setAvailableYears] = useState([]);

  // Load GeoJSON data for world borders
  useEffect(() => {
    fetch('/data/countries.geojson')
      .then((response) => response.json())
      .then((data) => setGeoData(data))
      .catch((error) => console.error('Error loading GeoJSON:', error));
  }, []);

  // Load and parse population CSV data
  useEffect(() => {
    fetch('/data/populationCountries.csv')
      .then((response) => response.text())
      .then((csvText) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setPopulationData(results.data);

            // Extract unique years from the data
            const years = [...new Set(results.data.map((d) => parseInt(d.Year)))].filter(
              (year) => year !== 1640 && year !== 1755 // Filter out specific years
            ).sort((a, b) => a - b);
            setAvailableYears(years);
          },
        });
      })
      .catch((error) => console.error('Error loading CSV:', error));
  }, []);

  // Create a population index for efficient lookup
  const populationDataIndex = useMemo(() => {
    const index = {};
    populationData.forEach((d) => {
      if (d.Country && d.Year) {
        const year = parseInt(d.Year);
        const country = d.Country.trim().toLowerCase();
        if (!index[year]) index[year] = {};
        index[year][country] = parseFloat(d.Population);
      }
    });
    return index;
  }, [populationData]);

  const getPopulationForCountry = (countryName, year) => {
    if (!countryName || typeof countryName !== 'string') return 0;
    const countryKey = countryName.trim().toLowerCase();
    return populationDataIndex[year]?.[countryKey] || 0;
  };

  // Function to style GeoJSON features based on population data
  const styleFeature = (feature) => {
    const countryName = feature.properties.ADMIN; // Use ADMIN for country name
    const population = getPopulationForCountry(countryName, year);

    // Filter populations for the selected year and sort them
    const populationsForYear = Object.values(populationDataIndex[year] || {}).filter(p => p > 0).sort((a, b) => a - b);

    // Calculate percentiles for range bounds
    const getPercentile = (arr, percentile) => {
      const index = Math.floor(percentile * arr.length);
      return arr[index] || 0;
    };
    const lowerBoundPopulation = getPercentile(populationsForYear, 0.1); // 10th percentile (lower bound)
    const upperBoundPopulation = getPercentile(populationsForYear, 0.98); // 90th percentile (upper bound)

    // Linear scaling of intensity
    let intensity = upperBoundPopulation > lowerBoundPopulation
      ? (Math.max(0, Math.min(population, upperBoundPopulation)) - lowerBoundPopulation) / (upperBoundPopulation - lowerBoundPopulation)
      : 0;

    // Color blending logic (Light Steel Blue to Steel Blue)
    const lightBlue = [255, 255, 255]; // Light Steel Blue RGB
    const deepBlue = [70, 130, 180]; // Steel Blue RGB

    const blendedColor = lightBlue.map((start, i) => {
      const end = deepBlue[i];
      return Math.floor(start + intensity * (end - start));
    });

    const color = `rgb(${blendedColor[0]}, ${blendedColor[1]}, ${blendedColor[2]})`;

    return {
      fillColor: color,
      weight: 1.3,
      opacity: 1,
      color: 'rgb(255, 255, 255)', // Border color (white)
      fillOpacity: 0.9,
    };
  };

  // Function to handle country click events
  const onEachFeature = (feature, layer) => {
    layer.on({
      click: (e) => {
        const countryName = feature.properties.ADMIN; // Use ADMIN property for country name
        const population = getPopulationForCountry(countryName, year);

        // Create a popup and open it at the click location
        const popupContent = `<strong>${countryName}</strong><br>Year: ${year}<br>Population: ${population.toLocaleString()}`;
        layer.bindPopup(popupContent).openPopup(e.latlng);
      },
    });
  };

  return (
    <div>
      <label htmlFor="yearSelect">Select Year:</label>
      <select
        id="yearSelect"
        value={year}
        onChange={(e) => setYear(parseInt(e.target.value))}
      >
        {availableYears.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <p>Year: {year}</p>
      <MapContainer center={[20, 0]} zoom={2} style={{ height: '80vh', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {geoData && (
          <GeoJSON
            key={year} // Use key prop to force re-render when year changes
            data={geoData}
            style={styleFeature}
            onEachFeature={onEachFeature} // Handle click events
          />
        )}
      </MapContainer>
    </div>
  );
};

export default PopulationMap;


