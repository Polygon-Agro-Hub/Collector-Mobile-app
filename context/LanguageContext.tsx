import React, { createContext, useState, useEffect, ReactNode } from "react";
import i18n from "../i18n/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface LanguageContextType {
  language: string;
  changeLanguage: (lng: string) => void;
}

export const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  changeLanguage: () => {},
});

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [language, setLanguage] = useState("en");
  const [ready, setReady] = useState(false); // Fix 1: wait for saved language

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem("@user_language");
        if (storedLanguage) {
          setLanguage(storedLanguage);
          await i18n.changeLanguage(storedLanguage);
        }
      } catch (err) {
        console.warn("Failed to load saved language:", err);
      } finally {
        setReady(true); // set only AFTER the language is applied
      }
    };

    loadLanguage();
  }, []);

  const changeLanguage = (lng: string) => {
    setLanguage(lng);
    i18n.changeLanguage(lng);
    AsyncStorage.setItem("@user_language", lng);
  };

  if (!ready) return null;

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};