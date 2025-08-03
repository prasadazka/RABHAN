import { useState, useCallback } from 'react';

export interface GeolocationData {
  latitude: number;
  longitude: number;
  landmark: string;
}

export interface GeolocationState {
  loading: boolean;
  error: string | null;
  data: GeolocationData | null;
}

export interface GeolocationOptions {
  timeout?: number;
  enableHighAccuracy?: boolean;
  maximumAge?: number;
}

export const useGeolocation = (options: GeolocationOptions = {}) => {
  const [state, setState] = useState<GeolocationState>({
    loading: false,
    error: null,
    data: null,
  });

  const {
    timeout = 10000,
    enableHighAccuracy = true,
    maximumAge = 300000, // 5 minutes
  } = options;

  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
      // Using OpenStreetMap Nominatim API for reverse geocoding (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=ar,en`,
        {
          headers: {
            'User-Agent': 'RABHAN Solar BNPL Platform',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract landmark information from the response
      let landmark = '';
      
      if (data.address) {
        const {
          amenity,
          building,
          house_number,
          road,
          neighbourhood,
          suburb,
          city_district,
          quarter,
        } = data.address;

        // Build landmark string from available data
        const parts = [
          amenity,
          building,
          house_number && road ? `${house_number} ${road}` : road,
          neighbourhood || suburb || city_district || quarter,
        ].filter(Boolean);

        landmark = parts.join(', ') || data.display_name?.split(',')[0] || 'Current Location';
      } else {
        landmark = 'Current Location';
      }

      return landmark;
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return 'Current Location';
    }
  };

  const getCurrentLocation = useCallback(async (): Promise<GeolocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      setState(prev => ({ ...prev, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            
            // Get landmark through reverse geocoding
            const landmark = await reverseGeocode(latitude, longitude);
            
            const locationData: GeolocationData = {
              latitude: Number(latitude.toFixed(6)),
              longitude: Number(longitude.toFixed(6)),
              landmark,
            };

            setState({
              loading: false,
              error: null,
              data: locationData,
            });

            resolve(locationData);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to get landmark';
            setState({
              loading: false,
              error: errorMessage,
              data: null,
            });
            reject(new Error(errorMessage));
          }
        },
        (error) => {
          let errorMessage: string;
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
            default:
              errorMessage = 'An unknown error occurred while retrieving location';
              break;
          }

          setState({
            loading: false,
            error: errorMessage,
            data: null,
          });

          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        }
      );
    });
  }, [enableHighAccuracy, timeout, maximumAge]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      data: null,
    });
  }, []);

  return {
    getCurrentLocation,
    clearError,
    reset,
    ...state,
  };
};