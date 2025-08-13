import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

interface ThemedDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}

export const ThemedDatePicker: React.FC<ThemedDatePickerProps> = ({
  value,
  onChange,
  min,
  style,
  placeholder = 'Select date'
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value) : null;
  const minDate = min ? new Date(min) : null;

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const isDateDisabled = (date: Date) => {
    if (!minDate) return false;
    return date < minDate;
  };

  const handleDateSelect = (date: Date) => {
    if (isDateDisabled(date)) return;
    onChange(date.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newMonth;
    });
  };

  const weekDays = i18n.language === 'ar' 
    ? ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Input Field */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          backgroundColor: 'white',
          color: selectedDate ? theme.colors.text.primary : theme.colors.text.secondary
        }}
      >
        <span>
          {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
        </span>
        <CalendarIcon size={16} color={theme.colors.primary[500]} />
      </div>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: 'white',
          border: `2px solid ${theme.colors.primary[200]}`,
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          padding: '1rem',
          marginTop: '4px'
        }}>
          {/* Calendar Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem'
          }}>
            <button
              onClick={() => navigateMonth('prev')}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.primary[50],
                color: theme.colors.primary[600]
              }}
            >
              <ChevronLeftIcon size={16} />
            </button>
            
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: theme.colors.text.primary,
              margin: 0
            }}>
              {currentMonth.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
                month: 'long',
                year: 'numeric'
              })}
            </h3>
            
            <button
              onClick={() => navigateMonth('next')}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.primary[50],
                color: theme.colors.primary[600]
              }}
            >
              <ChevronRightIcon size={16} />
            </button>
          </div>

          {/* Week Days Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '2px',
            marginBottom: '0.5rem'
          }}>
            {weekDays.map((day) => (
              <div
                key={day}
                style={{
                  padding: '0.5rem',
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: theme.colors.text.secondary
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '2px'
          }}>
            {getDaysInMonth(currentMonth).map((day, index) => {
              if (!day) {
                return <div key={index} style={{ padding: '0.5rem' }} />;
              }

              const isSelected = selectedDate && 
                day.getDate() === selectedDate.getDate() &&
                day.getMonth() === selectedDate.getMonth() &&
                day.getFullYear() === selectedDate.getFullYear();
              
              const isDisabled = isDateDisabled(day);
              const isToday = new Date().toDateString() === day.toDateString();

              return (
                <button
                  key={index}
                  onClick={() => handleDateSelect(day)}
                  disabled={isDisabled}
                  style={{
                    padding: '0.5rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: isSelected ? '600' : '400',
                    backgroundColor: isSelected 
                      ? theme.colors.primary[500]
                      : isToday 
                        ? theme.colors.primary[100]
                        : 'transparent',
                    color: isSelected 
                      ? 'white'
                      : isDisabled 
                        ? theme.colors.text.disabled
                        : isToday
                          ? theme.colors.primary[600]
                          : theme.colors.text.primary,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: theme.transitions.normal,
                    opacity: isDisabled ? 0.4 : 1,
                    ':hover': !isDisabled && !isSelected ? {
                      backgroundColor: theme.colors.primary[50]
                    } : {}
                  }}
                  onMouseEnter={(e) => {
                    if (!isDisabled && !isSelected) {
                      e.currentTarget.style.backgroundColor = theme.colors.primary[50];
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDisabled && !isSelected) {
                      e.currentTarget.style.backgroundColor = isToday ? theme.colors.primary[100] : 'transparent';
                    }
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};