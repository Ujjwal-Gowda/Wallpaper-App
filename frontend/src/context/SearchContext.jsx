import React, { createContext, useState, useContext } from 'react';

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
  const [query, setQuery] = useState("");
  const [searchText, setSearchText] = useState("");

  const clearSearch = () => {
    setQuery("");
    setSearchText("");
  };

  return (
    <SearchContext.Provider value={{ query, setQuery, searchText, setSearchText, clearSearch }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
