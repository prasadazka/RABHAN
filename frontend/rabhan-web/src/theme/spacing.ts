// RABHAN Spacing System
export const spacing = {
  // Base spacing units
  0: '0px',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px
  32: '8rem',    // 128px
  40: '10rem',   // 160px
  48: '12rem',   // 192px
  56: '14rem',   // 224px
  64: '16rem',   // 256px
  
  // Component-specific spacing
  components: {
    button: {
      padding: {
        sm: '0.5rem 1rem',
        md: '0.75rem 1.5rem',
        lg: '1rem 2rem',
        xl: '1.25rem 2.5rem',
      },
      gap: '0.5rem',
    },
    card: {
      padding: {
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '2.5rem',
      },
      gap: '1rem',
    },
    form: {
      fieldGap: '1rem',
      labelGap: '0.5rem',
      buttonGap: '1.5rem',
    },
    layout: {
      container: '1200px',
      section: '5rem',
      header: '4rem',
      footer: '3rem',
    },
  },
};

// Border radius
export const radius = {
  none: '0px',
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
  
  // Component-specific radius
  components: {
    button: '0.5rem',
    card: '1rem',
    modal: '1.5rem',
    input: '0.5rem',
  },
};