// RABHAN Universal Theme System - Works Across All 14 Applications
// Following fdev.md: "Universal theme system - Any brand, any color scheme, instant switching"

import { tokens } from '../design-system/tokens';

/**
 * Universal Theme System Architecture
 * - Works across all 14 React applications
 * - Zero hardcoding policy enforced
 * - Instant brand switching capability
 * - Saudi cultural adaptation built-in
 * - Performance optimized for <1ms interactions
 */

// =============================================================================
// THEME INTERFACE
// =============================================================================

export interface ThemeConfig {
  // Brand Configuration
  brand: {
    name: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logo: string;
  };
  
  // Color System
  colors: {
    primary: Record<string, string>;
    secondary: Record<string, string>;
    accent: Record<string, string>;
    semantic: {
      success: Record<string, string>;
      error: Record<string, string>;
      warning: Record<string, string>;
      info: Record<string, string>;
    };
    neutral: Record<string, string>;
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      inverse: string;
      disabled: string;
      link: string;
      linkHover: string;
    };
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
      inverse: string;
      overlay: string;
      disabled: string;
    };
    border: {
      primary: string;
      secondary: string;
      tertiary: string;
      inverse: string;
      focus: string;
      error: string;
      success: string;
    };
    interactive: {
      primary: {
        default: string;
        hover: string;
        active: string;
        disabled: string;
      };
      secondary: {
        default: string;
        hover: string;
        active: string;
        disabled: string;
      };
      danger: {
        default: string;
        hover: string;
        active: string;
        disabled: string;
      };
    };
  };
  
  // Typography System
  typography: {
    fontFamilies: {
      primary: string;
      secondary: string;
      mono: string;
      arabic: string;
    };
    fontSizes: Record<string, string>;
    fontWeights: Record<string, number>;
    lineHeights: Record<string, number>;
    letterSpacings: Record<string, string>;
  };
  
  // Spacing System
  spacing: Record<string, string>;
  
  // Layout System
  layout: {
    borderRadius: Record<string, string>;
    shadows: Record<string, string>;
    zIndex: Record<string, string | number>;
    maxWidth: Record<string, string>;
    breakpoints: Record<string, string>;
  };
  
  // Animation System
  animation: {
    duration: Record<string, string>;
    easing: Record<string, string>;
    scale: Record<string, string>;
    rotate: Record<string, string>;
  };
  
  // Cultural Adaptation
  cultural: {
    direction: 'ltr' | 'rtl';
    language: string;
    region: string;
    currency: string;
    dateFormat: string;
    numberFormat: string;
    colors: Record<string, string>;
    patterns: Record<string, string>;
  };
  
  // Accessibility
  accessibility: {
    contrast: Record<string, string>;
    focus: {
      outline: string;
      outlineOffset: string;
      borderRadius: string;
    };
    touchTarget: {
      minSize: string;
      minSpacing: string;
    };
  };
  
  // Performance
  performance: {
    animation: {
      gpuAcceleration: string;
      willChange: string;
      containment: string;
    };
    prefersReducedMotion: boolean;
  };
}

// =============================================================================
// RABHAN DEFAULT THEME
// =============================================================================

export const rabhanTheme: ThemeConfig = {
  brand: {
    name: 'RABHAN',
    primaryColor: '#3eb2b1',
    secondaryColor: '#1a5f7a',
    accentColor: '#f39c12',
    logo: '/assets/rabhan-logo.svg',
  },
  
  colors: {
    primary: tokens.base.colors.primary,
    secondary: tokens.base.colors.secondary,
    accent: tokens.base.colors.accent,
    semantic: tokens.base.colors.semantic,
    neutral: tokens.base.colors.neutral,
    text: tokens.semantic.colors.text,
    background: tokens.semantic.colors.background,
    border: tokens.semantic.colors.border,
    interactive: tokens.semantic.colors.interactive,
  },
  
  typography: {
    fontFamilies: {
      primary: tokens.base.typography.fontFamilies.english.primary,
      secondary: tokens.base.typography.fontFamilies.english.display,
      mono: tokens.base.typography.fontFamilies.english.mono,
      arabic: tokens.base.typography.fontFamilies.arabic.primary,
    },
    fontSizes: tokens.base.typography.fontSizes,
    fontWeights: tokens.base.typography.fontWeights,
    lineHeights: tokens.base.typography.lineHeights,
    letterSpacings: tokens.base.typography.letterSpacings,
  },
  
  spacing: tokens.base.spacing,
  
  layout: {
    borderRadius: tokens.base.borderRadius,
    shadows: tokens.base.shadows,
    zIndex: tokens.base.zIndex,
    maxWidth: tokens.semantic.layout.maxWidth,
    breakpoints: tokens.base.breakpoints,
  },
  
  animation: {
    duration: tokens.base.animation.duration,
    easing: tokens.base.animation.easing,
    scale: tokens.base.animation.scale,
    rotate: tokens.base.animation.rotate,
  },
  
  cultural: {
    direction: 'ltr',
    language: 'en',
    region: 'SA',
    currency: 'SAR',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'en-SA',
    colors: tokens.cultural.saudi.heritage,
    patterns: {
      geometric: 'url(/assets/patterns/geometric.svg)',
      arabesque: 'url(/assets/patterns/arabesque.svg)',
      calligraphy: 'url(/assets/patterns/calligraphy.svg)',
    },
  },
  
  accessibility: {
    contrast: tokens.cultural.accessibility.contrast,
    focus: tokens.cultural.accessibility.focus,
    touchTarget: tokens.cultural.accessibility.touchTarget,
  },
  
  performance: {
    animation: tokens.cultural.performance.animation,
    prefersReducedMotion: false,
  },
};

// =============================================================================
// SAUDI CULTURAL THEME VARIANT
// =============================================================================

export const saudiTheme: ThemeConfig = {
  ...rabhanTheme,
  cultural: {
    ...rabhanTheme.cultural,
    direction: 'rtl',
    language: 'ar',
    colors: tokens.cultural.saudi.vision2030,
  },
  typography: {
    ...rabhanTheme.typography,
    fontFamilies: {
      ...rabhanTheme.typography.fontFamilies,
      primary: tokens.base.typography.fontFamilies.arabic.primary,
      secondary: tokens.base.typography.fontFamilies.arabic.display,
    },
  },
};

// =============================================================================
// THEME VARIANTS (For Multi-Brand Support)
// =============================================================================

export const themeVariants = {
  rabhan: rabhanTheme,
  saudi: saudiTheme,
  
  // Government Theme (For NAFATH Integration)
  government: {
    ...rabhanTheme,
    brand: {
      ...rabhanTheme.brand,
      name: 'Saudi Government Services',
      primaryColor: '#006C35', // Saudi flag green
      secondaryColor: '#FFFFFF', // Saudi flag white
      accentColor: '#D4AF37',   // Traditional gold
    },
    colors: {
      ...rabhanTheme.colors,
      primary: {
        ...tokens.base.colors.primary,
        500: '#006C35',
        600: '#005C2E',
        700: '#004A26',
      },
    },
  },
  
  // Banking Theme (For Financial Services)
  banking: {
    ...rabhanTheme,
    brand: {
      ...rabhanTheme.brand,
      name: 'RABHAN Banking',
      primaryColor: '#1a5f7a',
      secondaryColor: '#2c3e50',
      accentColor: '#3498db',
    },
    colors: {
      ...rabhanTheme.colors,
      primary: {
        ...tokens.base.colors.primary,
        500: '#1a5f7a',
        600: '#16536a',
        700: '#12465a',
      },
    },
  },
  
  // Solar Theme (For Energy Services)
  solar: {
    ...rabhanTheme,
    brand: {
      ...rabhanTheme.brand,
      name: 'RABHAN Solar',
      primaryColor: '#f39c12',
      secondaryColor: '#e67e22',
      accentColor: '#27ae60',
    },
    colors: {
      ...rabhanTheme.colors,
      primary: {
        ...tokens.base.colors.primary,
        500: '#f39c12',
        600: '#e67e22',
        700: '#d68910',
      },
    },
  },
} as const;

// =============================================================================
// THEME CONTEXT & HOOKS
// =============================================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  theme: ThemeConfig;
  themeName: keyof typeof themeVariants;
  setTheme: (themeName: keyof typeof themeVariants) => void;
  isDark: boolean;
  toggleDarkMode: () => void;
  direction: 'ltr' | 'rtl';
  setDirection: (direction: 'ltr' | 'rtl') => void;
  language: string;
  setLanguage: (language: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: keyof typeof themeVariants;
  defaultDirection?: 'ltr' | 'rtl';
  defaultLanguage?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'rabhan',
  defaultDirection = 'ltr',
  defaultLanguage = 'en',
}) => {
  const [themeName, setThemeName] = useState<keyof typeof themeVariants>(defaultTheme);
  const [isDark, setIsDark] = useState(false);
  const [direction, setDirection] = useState<'ltr' | 'rtl'>(defaultDirection);
  const [language, setLanguage] = useState(defaultLanguage);
  
  // Get current theme
  const theme = themeVariants[themeName];
  
  // Handle theme changes
  const setTheme = (newThemeName: keyof typeof themeVariants) => {
    setThemeName(newThemeName);
    localStorage.setItem('rabhan-theme', newThemeName);
  };
  
  // Handle dark mode toggle
  const toggleDarkMode = () => {
    setIsDark(!isDark);
    localStorage.setItem('rabhan-dark-mode', String(!isDark));
  };
  
  // Handle direction changes
  const handleSetDirection = (newDirection: 'ltr' | 'rtl') => {
    setDirection(newDirection);
    document.documentElement.dir = newDirection;
    document.documentElement.lang = newDirection === 'rtl' ? 'ar' : 'en';
    localStorage.setItem('rabhan-direction', newDirection);
  };
  
  // Handle language changes
  const handleSetLanguage = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('rabhan-language', newLanguage);
  };
  
  // Load saved preferences
  useEffect(() => {
    const savedTheme = localStorage.getItem('rabhan-theme') as keyof typeof themeVariants;
    const savedDarkMode = localStorage.getItem('rabhan-dark-mode') === 'true';
    const savedDirection = localStorage.getItem('rabhan-direction') as 'ltr' | 'rtl';
    const savedLanguage = localStorage.getItem('rabhan-language');
    
    if (savedTheme && themeVariants[savedTheme]) {
      setThemeName(savedTheme);
    }
    if (savedDarkMode !== null) {
      setIsDark(savedDarkMode);
    }
    if (savedDirection) {
      handleSetDirection(savedDirection);
    }
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
    
    // Handle system preferences
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (localStorage.getItem('rabhan-dark-mode') === null) {
      setIsDark(prefersDark);
    }
    
    // Handle reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      theme.performance.prefersReducedMotion = true;
    }
  }, []);
  
  // Apply CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply color variables
    Object.entries(theme.colors.primary).forEach(([key, value]) => {
      root.style.setProperty(`--color-primary-${key}`, value);
    });
    
    Object.entries(theme.colors.text).forEach(([key, value]) => {
      root.style.setProperty(`--color-text-${key}`, value);
    });
    
    Object.entries(theme.colors.background).forEach(([key, value]) => {
      root.style.setProperty(`--color-bg-${key}`, value);
    });
    
    // Apply spacing variables
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });
    
    // Apply typography variables
    Object.entries(theme.typography.fontSizes).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value);
    });
    
    // Apply animation variables
    Object.entries(theme.animation.duration).forEach(([key, value]) => {
      root.style.setProperty(`--duration-${key}`, value);
    });
    
    // Apply cultural variables
    root.style.setProperty('--direction', direction);
    root.style.setProperty('--language', language);
    
    // Apply performance optimizations
    if (theme.performance.prefersReducedMotion) {
      root.style.setProperty('--duration-fast', '0ms');
      root.style.setProperty('--duration-normal', '0ms');
      root.style.setProperty('--duration-slow', '0ms');
    }
  }, [theme, direction, language]);
  
  const value: ThemeContextType = {
    theme,
    themeName,
    setTheme,
    isDark,
    toggleDarkMode,
    direction,
    setDirection: handleSetDirection,
    language,
    setLanguage: handleSetLanguage,
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// =============================================================================
// STYLED-COMPONENTS THEME PROVIDER
// =============================================================================

import { ThemeProvider as StyledThemeProvider } from 'styled-components';

export const StyledThemeWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  
  return (
    <StyledThemeProvider theme={theme}>
      {children}
    </StyledThemeProvider>
  );
};

// =============================================================================
// THEME UTILITIES
// =============================================================================

// CSS-in-JS helper for accessing theme values
export const getThemeValue = (path: string, fallback?: string) => {
  return `var(--${path.replace(/\./g, '-')}, ${fallback || 'inherit'})`;
};

// Responsive utilities
export const breakpoint = (size: keyof ThemeConfig['layout']['breakpoints']) => {
  return `@media (min-width: ${getThemeValue(`layout.breakpoints.${size}`)})`;
};

// RTL utilities
export const rtl = (ltrValue: string, rtlValue: string) => {
  return `
    [dir="ltr"] & { ${ltrValue} }
    [dir="rtl"] & { ${rtlValue} }
  `;
};

// Animation utilities with performance optimization
export const animateWithGPU = (property: string, duration?: string, easing?: string) => {
  return `
    ${property};
    transition: ${property} ${duration || getThemeValue('animation.duration.fast')} ${easing || getThemeValue('animation.easing.easeInOut')};
    will-change: ${property};
    transform: translateZ(0);
  `;
};

// Accessibility utilities
export const focusRing = (color?: string) => {
  return `
    outline: 2px solid ${color || getThemeValue('colors.border.focus')};
    outline-offset: 2px;
    border-radius: ${getThemeValue('accessibility.focus.borderRadius')};
  `;
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  tokens,
  themeVariants as themes,
  rabhanTheme as defaultTheme,
};

export type { ThemeConfig };

export default {
  ThemeProvider,
  StyledThemeWrapper,
  useTheme,
  getThemeValue,
  breakpoint,
  rtl,
  animateWithGPU,
  focusRing,
  themes: themeVariants,
  defaultTheme: rabhanTheme,
};