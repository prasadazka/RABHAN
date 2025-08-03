import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';

interface MultiselectOption {
  value: string;
  label: string;
}

interface MultiselectProps {
  options: MultiselectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  maxHeight?: number;
  searchable?: boolean;
  clearable?: boolean;
  maxSelections?: number;
  className?: string;
  label?: string;
  required?: boolean;
}

const Multiselect: React.FC<MultiselectProps> = ({
  options,
  value = [],
  onChange,
  placeholder,
  disabled = false,
  error = false,
  maxHeight = 200,
  searchable = true,
  clearable = true,
  maxSelections,
  className = '',
  label,
  required = false
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Responsive hook
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on search term
  const filteredOptions = searchable
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Get selected option labels
  const selectedLabels = value
    .map(val => options.find(opt => opt.value === val)?.label)
    .filter(Boolean);

  const handleToggleOption = useCallback((optionValue: string) => {
    if (disabled) return;

    const isSelected = value.includes(optionValue);
    let newValue: string[];

    if (isSelected) {
      newValue = value.filter(v => v !== optionValue);
    } else {
      if (maxSelections && value.length >= maxSelections) {
        return; // Don't add more if max reached
      }
      newValue = [...value, optionValue];
    }
    
    onChange(newValue);
  }, [value, onChange, disabled, maxSelections]);

  const handleClearAll = useCallback(() => {
    if (!disabled && clearable) {
      onChange([]);
    }
  }, [onChange, disabled, clearable]);

  const handleToggleDropdown = useCallback(() => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen && searchable) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [disabled, isOpen, searchable]);

  const handleRemoveTag = useCallback((optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      handleToggleOption(optionValue);
    }
  }, [disabled, handleToggleOption]);

  // Enhanced styles following RABHAN theme system
  const styles = {
    container: {
      position: 'relative' as const,
      width: '100%',
      fontFamily: theme.typography.fontFamily,
      direction: isRTL ? 'rtl' as const : 'ltr' as const,
    },
    
    label: {
      display: 'block',
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing[2],
      fontFamily: theme.typography.fontFamily,
    },
    
    trigger: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? theme.spacing[3] : theme.spacing[3],
      border: `2px solid ${error ? theme.colors.semantic.error.main : theme.colors.borders.light}`,
      borderRadius: theme.radius.md,
      backgroundColor: disabled ? theme.colors.backgrounds.disabled : theme.colors.backgrounds.primary,
      cursor: disabled ? 'not-allowed' : 'pointer',
      minHeight: theme.accessibility.minTouchTarget,
      transition: theme.transitions.normal,
      outline: 'none',
      position: 'relative' as const,
      ...(isOpen && !disabled && {
        borderColor: theme.colors.primary['500'],
        boxShadow: `0 0 0 3px ${theme.colors.primary['100']}`,
      }),
      '&:focus': {
        borderColor: theme.colors.borders.focus,
        boxShadow: `0 0 0 ${theme.accessibility.focusRing.width} ${theme.accessibility.focusRing.color}`,
      },
    },
    
    triggerContent: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: theme.spacing[1],
      flex: 1,
      alignItems: 'center',
      minHeight: '24px',
    },
    
    selectedTag: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: theme.spacing[1],
      backgroundColor: theme.colors.primary['500'],
      color: theme.colors.backgrounds.primary,
      padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
      borderRadius: theme.radius.sm,
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.weights.medium,
      maxWidth: isMobile ? '120px' : '150px',
      transition: theme.transitions.fast,
      cursor: disabled ? 'default' : 'pointer',
    },
    
    tagText: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
      flex: 1,
    },
    
    removeTag: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '16px',
      height: '16px',
      borderRadius: theme.radius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      cursor: disabled ? 'default' : 'pointer',
      fontSize: '10px',
      transition: theme.transitions.fast,
      '&:hover': !disabled ? {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        transform: 'scale(1.1)',
      } : {},
    },
    
    placeholder: {
      color: theme.colors.text.placeholder,
      fontSize: theme.typography.sizes.sm,
      fontStyle: 'italic',
      userSelect: 'none' as const,
    },
    
    controls: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing[2],
      marginLeft: isRTL ? '0' : theme.spacing[2],
      marginRight: isRTL ? theme.spacing[2] : '0',
      flexShrink: 0,
    },
    
    clearButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '20px',
      height: '20px',
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.neutral['200'],
      cursor: disabled ? 'default' : 'pointer',
      fontSize: '12px',
      color: theme.colors.text.secondary,
      transition: theme.transitions.fast,
      opacity: disabled ? 0.5 : 1,
      '&:hover': !disabled ? {
        backgroundColor: theme.colors.neutral['300'],
        color: theme.colors.text.primary,
        transform: 'scale(1.1)',
      } : {},
    },
    
    chevron: {
      width: '20px',
      height: '20px',
      color: theme.colors.text.secondary,
      transition: theme.transitions.normal,
      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      opacity: disabled ? 0.5 : 1,
    },
    
    dropdown: {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: theme.colors.backgrounds.primary,
      border: `1px solid ${theme.colors.borders.light}`,
      borderRadius: theme.radius.md,
      boxShadow: theme.shadows.lg,
      zIndex: theme.zIndex.dropdown,
      marginTop: theme.spacing[1],
      overflow: 'hidden',
      // Mobile optimization
      ...(isMobile && {
        position: 'fixed' as const,
        top: 'auto',
        bottom: theme.spacing[4],
        left: theme.spacing[4],
        right: theme.spacing[4],
        zIndex: theme.zIndex.modal,
        borderRadius: theme.radius.lg,
        maxHeight: '60vh',
      }),
    },
    
    searchInput: {
      width: '100%',
      padding: theme.spacing[3],
      border: 'none',
      borderBottom: `1px solid ${theme.colors.borders.light}`,
      fontSize: theme.typography.sizes.sm,
      outline: 'none',
      fontFamily: theme.typography.fontFamily,
      backgroundColor: theme.colors.backgrounds.primary,
      color: theme.colors.text.primary,
      direction: isRTL ? 'rtl' as const : 'ltr' as const,
      '&::placeholder': {
        color: theme.colors.text.placeholder,
        fontStyle: 'italic',
      },
    },
    
    optionsList: {
      maxHeight: isMobile ? 'calc(60vh - 60px)' : `${maxHeight}px`,
      overflowY: 'auto' as const,
      padding: theme.spacing[1],
    },
    
    option: {
      display: 'flex',
      alignItems: 'center',
      padding: theme.spacing[3],
      cursor: 'pointer',
      transition: theme.transitions.fast,
      borderRadius: theme.radius.sm,
      margin: `${theme.spacing[1]} 0`,
      fontSize: theme.typography.sizes.sm,
      fontFamily: theme.typography.fontFamily,
      direction: isRTL ? 'rtl' as const : 'ltr' as const,
      minHeight: theme.accessibility.minTouchTarget,
      gap: theme.spacing[3],
      userSelect: 'none' as const,
    },
    
    optionSelected: {
      backgroundColor: `${theme.colors.primary['500']}10`,
      color: theme.colors.primary['600'],
      fontWeight: theme.typography.weights.medium,
    },
    
    optionHover: {
      backgroundColor: theme.colors.backgrounds.hover,
    },
    
    checkbox: {
      width: '18px',
      height: '18px',
      borderRadius: theme.radius.sm,
      border: `2px solid ${theme.colors.borders.medium}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: theme.transitions.fast,
      flexShrink: 0,
    },
    
    checkboxChecked: {
      backgroundColor: theme.colors.primary['500'],
      borderColor: theme.colors.primary['500'],
      color: theme.colors.backgrounds.primary,
    },
    
    checkmark: {
      width: '10px',
      height: '10px',
      fill: 'currentColor',
    },
    
    mobileOverlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: theme.zIndex.overlay,
      backdropFilter: theme.backdropFilters.blur,
    },
    
    selectionCount: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.text.secondary,
      fontWeight: theme.typography.weights.medium,
      backgroundColor: theme.colors.neutral['100'],
      padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
      borderRadius: theme.radius.full,
      whiteSpace: 'nowrap' as const,
    },
  };

  const displayPlaceholder = placeholder || t('common.selectOptions') || 'Select options...';
  const noOptionsText = t('common.noOptions') || 'No options available';
  const searchPlaceholderText = t('common.searchOptions') || 'Search options...';

  return (
    <div style={styles.container} className={className} ref={containerRef}>
      {label && (
        <label style={styles.label}>
          {label}
          {required && <span style={{ color: theme.colors.semantic.error.main }}>*</span>}
        </label>
      )}
      
      <div
        style={styles.trigger}
        onClick={handleToggleDropdown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label || displayPlaceholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleDropdown();
          }
        }}
      >
        <div style={styles.triggerContent}>
          {value.length === 0 ? (
            <span style={styles.placeholder}>{displayPlaceholder}</span>
          ) : (
            <>
              {selectedLabels.slice(0, isMobile ? 2 : 3).map((label, index) => {
                const optionValue = value[index];
                return (
                  <span key={optionValue} style={styles.selectedTag}>
                    <span style={styles.tagText}>{label}</span>
                    {!disabled && (
                      <button
                        style={styles.removeTag}
                        onClick={(e) => handleRemoveTag(optionValue, e)}
                        aria-label={t('common.remove') || 'Remove'}
                        type="button"
                      >
                        ×
                      </button>
                    )}
                  </span>
                );
              })}
              {value.length > (isMobile ? 2 : 3) && (
                <span style={styles.selectionCount}>
                  +{value.length - (isMobile ? 2 : 3)} {t('common.more') || 'more'}
                </span>
              )}
            </>
          )}
        </div>
        
        <div style={styles.controls}>
          {clearable && value.length > 0 && (
            <button
              style={styles.clearButton}
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              aria-label={t('common.clearAll') || 'Clear all'}
              type="button"
            >
              ×
            </button>
          )}
          
          <svg style={styles.chevron} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <>
          {isMobile && <div style={styles.mobileOverlay} onClick={() => setIsOpen(false)} />}
          
          <div style={styles.dropdown}>
            {searchable && (
              <input
                ref={inputRef}
                style={styles.searchInput}
                type="text"
                placeholder={searchPlaceholderText}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            
            <div style={styles.optionsList}>
              {filteredOptions.length === 0 ? (
                <div style={{...styles.option, cursor: 'default', color: theme.colors.text.secondary}}>
                  {searchTerm ? (t('common.noResultsFound') || 'No results found') : noOptionsText}
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = value.includes(option.value);
                  const isMaxReached = maxSelections && value.length >= maxSelections && !isSelected;
                  
                  return (
                    <div
                      key={option.value}
                      style={{
                        ...styles.option,
                        ...(isSelected ? styles.optionSelected : {}),
                        ...(isMaxReached ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                      }}
                      onClick={() => !isMaxReached && handleToggleOption(option.value)}
                      onMouseEnter={(e) => {
                        if (!isMaxReached) {
                          Object.assign(e.currentTarget.style, styles.optionHover);
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div
                        style={{
                          ...styles.checkbox,
                          ...(isSelected ? styles.checkboxChecked : {}),
                        }}
                      >
                        {isSelected && (
                          <svg style={styles.checkmark} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span>{option.label}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Multiselect;