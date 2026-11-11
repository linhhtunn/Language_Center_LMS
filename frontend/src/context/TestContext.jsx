import React, { createContext, useState, useContext, useCallback } from 'react';

const TestContext = createContext();

export const TestProvider = ({ children }) => {
  const [isTestActive, updateTestActive] = useState(false);
  const setIsTestActive = useCallback((active) => {
    updateTestActive(active);
    // Other tabs re-check the server guard; localStorage is only a notification, never authority.
    try { localStorage.setItem('chatbot:exam-change', `${Date.now()}:${active}`); } catch { /* private mode */ }
    window.dispatchEvent(new Event('chatbot:exam-change'));
  }, []);

  return (
    <TestContext.Provider value={{ isTestActive, setIsTestActive }}>
      {children}
    </TestContext.Provider>
  );
};

export const useTest = () => useContext(TestContext);
