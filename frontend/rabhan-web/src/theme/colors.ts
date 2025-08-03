// RABHAN Professional Color System - Light Gradient Theme
export const RABHAN_PRIMARY = '#3eb2b1';

export const colors = {
  // Primary color palette - Professional teal/turquoise
  primary: {
    50: '#f0fdfc',
    100: '#ccfdf9', 
    200: '#99f9f3',
    300: '#5cecea',
    400: '#22d3db',
    500: '#3eb2b1', // Main brand color
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
    950: '#083344',
  },
  
  // Secondary palette - Professional grays
  secondary: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  
  // Semantic colors - Professional and accessible
  semantic: {
    success: {
      25: '#f0fdf4',
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
      light: '#ecfdf5',
      main: '#10b981',
      dark: '#047857',
      contrast: '#ffffff',
    },
    warning: {
      25: '#fffcf5',
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      light: '#fffbeb',
      main: '#f59e0b',
      dark: '#d97706',
      contrast: '#ffffff',
    },
    error: {
      25: '#fffbfa',
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      light: '#fef2f2',
      main: '#ef4444',
      dark: '#dc2626',
      contrast: '#ffffff',
    },
    info: {
      25: '#f8fafc',
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      light: '#eff6ff',
      main: '#3b82f6',
      dark: '#2563eb',
      contrast: '#ffffff',
    },
  },
  
  // Neutral palette - Clean and professional
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
    1000: '#000000',
  },
  
  // Professional light gradient system with improved hover states
  gradients: {
    // Primary gradients - Light and clean
    primary: `linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)`,
    primaryLight: `linear-gradient(135deg, #f0fdfc 0%, #ccfdf9 100%)`,
    primaryDark: `linear-gradient(135deg, #0e7490 0%, #155e75 100%)`,
    
    // Page backgrounds - Very subtle
    page: `linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)`,
    hero: `linear-gradient(135deg, #f0fdfc 0%, #ffffff 50%, #f9fafb 100%)`,
    section: `linear-gradient(135deg, #f0fdfc 0%, #ffffff 100%)`,
    
    // Glassmorphism card gradients
    glass: `linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%)`,
    glassHover: `linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.15) 100%)`,
    card: `linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(249, 250, 251, 0.8) 100%)`,
    cardHover: `linear-gradient(135deg, rgba(240, 253, 252, 0.9) 0%, rgba(204, 253, 249, 0.8) 100%)`,
    
    // Button gradients - Professional with better hover
    button: `linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)`,
    buttonHover: `linear-gradient(135deg, #22d3db 0%, #5cecea 100%)`,
    buttonSecondary: `linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)`,
    buttonSecondaryHover: `linear-gradient(135deg, #f0fdfc 0%, #ccfdf9 100%)`,
    
    // Semantic gradients - Light and subtle
    success: `linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)`,
    warning: `linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)`,
    error: `linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)`,
    info: `linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)`,
    
    // Wave animation gradients
    wave: `linear-gradient(45deg, #3eb2b1 0%, #22d3db 25%, #5cecea 50%, #22d3db 75%, #3eb2b1 100%)`,
    waveReverse: `linear-gradient(315deg, #3eb2b1 0%, #22d3db 25%, #5cecea 50%, #22d3db 75%, #3eb2b1 100%)`,
    
    // Overlay gradients
    overlay: `linear-gradient(135deg, rgba(62, 178, 177, 0.03) 0%, rgba(34, 211, 219, 0.03) 100%)`,
    modalOverlay: `linear-gradient(135deg, rgba(31, 41, 55, 0.4) 0%, rgba(31, 41, 55, 0.6) 100%)`,
  },
  
  // Background system - Light and clean
  backgrounds: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
    surface: '#ffffff',
    overlay: 'rgba(31, 41, 55, 0.7)',
    modal: 'rgba(255, 255, 255, 0.98)',
  },
  
  // Text colors - Professional hierarchy
  text: {
    primary: '#111827',
    secondary: '#4b5563',
    tertiary: '#6b7280',
    disabled: '#9ca3af',
    inverse: '#ffffff',
    link: '#3eb2b1',
    gradient: `linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)`,
  },
  
  // Border colors - Subtle and clean
  borders: {
    light: '#e5e7eb',
    medium: '#d1d5db',
    heavy: '#9ca3af',
    focus: '#3eb2b1',
    error: '#ef4444',
    success: '#10b981',
  },
};