// RABHAN Shadow System with Gradient Support
export const shadows = {
  // Standard shadows
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  
  // Colored shadows using primary color
  primary: {
    sm: '0 1px 2px 0 rgba(62, 178, 177, 0.1)',
    md: '0 4px 6px -1px rgba(62, 178, 177, 0.15), 0 2px 4px -1px rgba(62, 178, 177, 0.1)',
    lg: '0 10px 15px -3px rgba(62, 178, 177, 0.2), 0 4px 6px -2px rgba(62, 178, 177, 0.1)',
    xl: '0 20px 25px -5px rgba(62, 178, 177, 0.2), 0 10px 10px -5px rgba(62, 178, 177, 0.1)',
    '2xl': '0 25px 50px -12px rgba(62, 178, 177, 0.3)',
  },
  
  // Glow effects
  glow: {
    sm: '0 0 5px rgba(62, 178, 177, 0.3)',
    md: '0 0 10px rgba(62, 178, 177, 0.4)',
    lg: '0 0 20px rgba(62, 178, 177, 0.5)',
    xl: '0 0 40px rgba(62, 178, 177, 0.6)',
  },
  
  // Inner shadows
  inner: {
    sm: 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)',
    lg: 'inset 0 4px 8px 0 rgba(0, 0, 0, 0.15)',
  },
  
  // Component-specific shadows
  components: {
    button: {
      default: '0 4px 6px -1px rgba(62, 178, 177, 0.15), 0 2px 4px -1px rgba(62, 178, 177, 0.1)',
      hover: '0 10px 15px -3px rgba(62, 178, 177, 0.2), 0 4px 6px -2px rgba(62, 178, 177, 0.1)',
      active: 'inset 0 2px 4px 0 rgba(62, 178, 177, 0.2)',
    },
    card: {
      default: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      hover: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    modal: {
      backdrop: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      content: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    },
    input: {
      default: 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      focus: '0 0 0 3px rgba(62, 178, 177, 0.1)',
    },
    dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
};