import React, { createContext, useState } from 'react';

const FilterContext = createContext();

const FilterProvider = ({ children }) => {
  const [year, setYear] = useState(-10000);

  return (
    <FilterContext.Provider value={{ year, setYear }}>
      {children}
    </FilterContext.Provider>
  );
};

export { FilterContext, FilterProvider };
