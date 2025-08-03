// RABHAN Complete Theme System
import { colors } from './colors';
import { typography } from './typography';
import { spacing, radius } from './spacing';
import { shadows } from './shadows';

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  
  // Mobile-first breakpoints
  breakpoints: {
    xs: '320px',  // Small phones
    sm: '640px',  // Large phones
    md: '768px',  // Tablets
    lg: '1024px', // Laptops
    xl: '1280px', // Desktops
    '2xl': '1536px', // Large desktops
  },
  
  // Responsive media queries
  media: {
    xs: '@media (min-width: 320px)',
    sm: '@media (min-width: 640px)',
    md: '@media (min-width: 768px)',
    lg: '@media (min-width: 1024px)',
    xl: '@media (min-width: 1280px)',
    '2xl': '@media (min-width: 1536px)',
    
    // Max-width queries for mobile-first
    maxXs: '@media (max-width: 479px)',
    maxSm: '@media (max-width: 639px)',
    maxMd: '@media (max-width: 767px)',
    maxLg: '@media (max-width: 1023px)',
    maxXl: '@media (max-width: 1279px)',
    max2xl: '@media (max-width: 1535px)',
    
    // Utility queries
    touch: '@media (pointer: coarse)',
    hover: '@media (hover: hover)',
    dark: '@media (prefers-color-scheme: dark)',
    light: '@media (prefers-color-scheme: light)',
    reducedMotion: '@media (prefers-reduced-motion: reduce)',
    highContrast: '@media (prefers-contrast: high)',
  },
  
  // Responsive utilities
  responsive: {
    // Fluid typography
    fluid: {
      xs: 'clamp(0.75rem, 2vw, 0.875rem)',
      sm: 'clamp(0.875rem, 2.5vw, 1rem)',
      base: 'clamp(1rem, 3vw, 1.125rem)',
      lg: 'clamp(1.125rem, 3.5vw, 1.25rem)',
      xl: 'clamp(1.25rem, 4vw, 1.5rem)',
      '2xl': 'clamp(1.5rem, 5vw, 2rem)',
      '3xl': 'clamp(1.875rem, 6vw, 2.5rem)',
      '4xl': 'clamp(2.25rem, 7vw, 3rem)',
      '5xl': 'clamp(3rem, 8vw, 4rem)',
    },
    
    // Fluid spacing
    spacing: {
      xs: 'clamp(0.5rem, 1vw, 0.75rem)',
      sm: 'clamp(0.75rem, 2vw, 1rem)',
      md: 'clamp(1rem, 3vw, 1.5rem)',
      lg: 'clamp(1.5rem, 4vw, 2rem)',
      xl: 'clamp(2rem, 5vw, 3rem)',
      '2xl': 'clamp(2.5rem, 6vw, 4rem)',
    },
    
    // Container sizes
    container: {
      xs: '100%',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    
    // Grid systems
    grid: {
      cols1: 'repeat(1, 1fr)',
      cols2: 'repeat(2, 1fr)',
      cols3: 'repeat(3, 1fr)',
      cols4: 'repeat(4, 1fr)',
      cols6: 'repeat(6, 1fr)',
      cols12: 'repeat(12, 1fr)',
      autoFit: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
      autoFitSm: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
      autoFitLg: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
    },
  },
  
  // Transitions optimized for mobile
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    
    // Touch optimized
    touch: '100ms cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: '400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Animations
  animations: {
    fadeIn: 'fadeIn 0.2s ease-in-out',
    spin: 'spin 1s linear infinite',
    wave: 'wave 2s ease-in-out infinite',
    pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    bounce: 'bounce 1s infinite',
  },

  // Backdrop filters
  backdropFilters: {
    blur: 'blur(10px)',
    blurStrong: 'blur(20px)',
    blurLight: 'blur(5px)',
  },
  
  // Z-index scale
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },
  
  // Touch targets and accessibility
  accessibility: {
    // Minimum touch target size (44px iOS, 48px Android)
    minTouchTarget: '48px',
    
    // Focus ring styles
    focusRing: {
      width: '2px',
      style: 'solid',
      color: colors.borders.focus,
      offset: '2px',
    },
    
    // Screen reader only utility
    srOnly: {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: 0,
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: 0,
    },
  },
};

// Export individual theme parts
export { colors, typography, spacing, radius, shadows };

// Export CSS variables generator
export const generateCSSVariables = () => {
  const cssVars: Record<string, string> = {};
  
  // Primary colors
  Object.entries(colors.primary).forEach(([key, value]) => {
    cssVars[`--color-primary-${key}`] = value;
  });
  
  // Secondary colors
  Object.entries(colors.secondary).forEach(([key, value]) => {
    cssVars[`--color-secondary-${key}`] = value;
  });
  
  // Neutral colors
  Object.entries(colors.neutral).forEach(([key, value]) => {
    cssVars[`--color-neutral-${key}`] = value;
  });
  
  // Semantic colors
  Object.entries(colors.semantic).forEach(([category, values]) => {
    Object.entries(values).forEach(([key, value]) => {
      cssVars[`--color-${category}-${key}`] = value;
    });
  });
  
  // Background colors
  Object.entries(colors.backgrounds).forEach(([key, value]) => {
    cssVars[`--color-background-${key}`] = value;
  });
  
  // Text colors
  Object.entries(colors.text).forEach(([key, value]) => {
    cssVars[`--color-text-${key}`] = value;
  });
  
  // Border colors
  Object.entries(colors.borders).forEach(([key, value]) => {
    cssVars[`--color-border-${key}`] = value;
  });
  
  // Gradients
  Object.entries(colors.gradients).forEach(([key, value]) => {
    cssVars[`--gradient-${key}`] = value;
  });
  
  // Typography
  Object.entries(typography.sizes).forEach(([key, value]) => {
    cssVars[`--font-size-${key}`] = value;
  });
  
  Object.entries(typography.weights).forEach(([key, value]) => {
    cssVars[`--font-weight-${key}`] = value.toString();
  });
  
  // Spacing
  Object.entries(spacing).forEach(([key, value]) => {
    if (typeof value === 'string') {
      cssVars[`--spacing-${key}`] = value;
    }
  });
  
  // Border radius
  Object.entries(radius).forEach(([key, value]) => {
    if (typeof value === 'string') {
      cssVars[`--radius-${key}`] = value;
    }
  });
  
  // Shadows
  Object.entries(shadows).forEach(([key, value]) => {
    if (typeof value === 'string') {
      cssVars[`--shadow-${key}`] = value;
    }
  });
  
  return cssVars;
};

export default theme;