import React, { useState, useEffect, createContext, useContext } from 'react';
import { siteAPI } from '../utils/api';

// Create context for site settings
export const SiteSettingsContext = createContext({
  siteName: 'Blisswell',
  siteLogo: '',
  siteTagline: 'Premium Bedsheets',
  contact_phone: '',
  contact_email: '',
  contact_address: '',
  company_state: 'Maharashtra',
  social_facebook: '',
  social_instagram: '',
  social_twitter: '',
  social_linkedin: '',
  social_youtube: '',
  refreshSettings: () => {}
});

export const useSiteSettings = () => useContext(SiteSettingsContext);

const SiteSettingsProvider = ({ children }) => {
  const [siteSettings, setSiteSettings] = useState({
    site_name: 'Blisswell',
    site_logo: '',
    site_tagline: 'Premium Bedsheets',
    contact_phone: '',
    contact_email: '',
    contact_address: '',
    company_state: 'Maharashtra',
    social_facebook: '',
    social_instagram: '',
    social_twitter: '',
    social_linkedin: '',
    social_youtube: ''
  });

  // Fetch site settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await siteAPI.getSettings();
      if (response.data?.settings) {
        setSiteSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch site settings:', error);
    }
  };

  const refreshSettings = async () => {
    await fetchSettings();
  };

  // Create the context value with all settings
  const contextValue = {
    siteName: siteSettings.site_name || 'Blisswell',
    siteLogo: siteSettings.site_logo || '',
    siteTagline: siteSettings.site_tagline || 'Premium Bedsheets',
    contact_phone: siteSettings.contact_phone || '',
    contact_email: siteSettings.contact_email || '',
    contact_address: siteSettings.contact_address || '',
    company_state: siteSettings.company_state || 'Maharashtra',
    social_facebook: siteSettings.social_facebook || '',
    social_instagram: siteSettings.social_instagram || '',
    social_twitter: siteSettings.social_twitter || '',
    social_linkedin: siteSettings.social_linkedin || '',
    social_youtube: siteSettings.social_youtube || '',
    refreshSettings
  };

  return (
    <SiteSettingsContext.Provider value={contextValue}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

export default SiteSettingsProvider;