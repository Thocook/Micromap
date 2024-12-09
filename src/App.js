import React from 'react';
import './App.css';
import { FilterProvider } from './FilterContext';
import PopulationMap from './PopulationMap'; // New component we'll create for the map and slider

const App = () => {
  return (
    <FilterProvider>
      <div className="App">
        <h1>Population Heatmap Over Time</h1>
        <PopulationMap />
      </div>
    </FilterProvider>
  );
};

export default App;
