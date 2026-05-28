import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../locales/en.json';
import th from '../locales/th.json';

const LanguageContext = createContext();

const dictionaries = {
  en,
  th
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('phudit_lang') || 'th';
  });

  useEffect(() => {
    localStorage.setItem('phudit_lang', language);
  }, [language]);

  const t = (key) => {
    const keys = key.split('.');
    let value = dictionaries[language];
    for (let k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        return key; // return the key itself if not found
      }
    }
    return value;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'th' ? 'en' : 'th');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
