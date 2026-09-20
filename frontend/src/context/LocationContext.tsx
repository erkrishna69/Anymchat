'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { LocationState } from '../types';
import { ApiService } from '../services/api';

interface LocationContextType {
  location: LocationState;
  requestLocation: () => Promise<void>;
  setCustomRadius: (radius: number) => void;
  setMockLocation: (lat: number, lng: number, cityName: string) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Quick preset locations for easy testing
export const LOCATION_PRESETS = [
  { name: 'Connaught Place, Delhi', lat: 28.6315, lng: 77.2167 },
  { name: 'Hauz Khas Village, Delhi', lat: 28.5535, lng: 77.1945 },
  { name: 'Bandra West, Mumbai', lat: 19.0596, lng: 72.8295 },
  { name: 'Indiranagar, Bangalore', lat: 12.9784, lng: 77.6408 },
  { name: 'Koramangala, Bangalore', lat: 12.9352, lng: 77.6245 },
  { name: 'Cyber City, Gurgaon', lat: 28.4952, lng: 77.0895 },
  { name: 'Times Square, New York', lat: 40.7580, lng: -73.9855 },
  { name: 'Soho, London', lat: 51.5136, lng: -0.1365 },
];

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<LocationState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('anym_last_location');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.latitude && parsed.longitude) {
            return {
              latitude: parsed.latitude,
              longitude: parsed.longitude,
              radiusKm: parsed.radiusKm || 10,
              isAllowed: true,
              isDetecting: false,
              error: null,
              cityName: parsed.cityName || 'Last Known Location',
            };
          }
        }
      } catch {
        /* ignore */
      }
    }
    return {
      latitude: null,
      longitude: null,
      radiusKm: 10,
      isAllowed: false,
      isDetecting: false,
      error: null,
      cityName: undefined,
    };
  });

  const saveLocationToStorage = (lat: number, lng: number, rad: number, city?: string) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'anym_last_location',
          JSON.stringify({ latitude: lat, longitude: lng, radiusKm: rad, cityName: city })
        );
      } catch {
        /* ignore */
      }
    }
  };

  const syncBackend = useCallback(async (lat: number, lng: number, rad: number) => {
    try {
      await ApiService.updateLocation(lat, lng, rad);
    } catch (e) {
      console.warn('Location sync to backend delayed or pending auth');
    }
  }, []);

  const requestLocation = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser.',
        isDetecting: false,
      }));
      return;
    }

    setLocation((prev) => ({ ...prev, isDetecting: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocation((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          isAllowed: true,
          isDetecting: false,
          error: null,
          cityName: 'Your Current Device GPS',
        }));
        saveLocationToStorage(lat, lng, location.radiusKm, 'Your Current Device GPS');
        syncBackend(lat, lng, location.radiusKm);
      },
      (err) => {
        let msg = 'Location permission denied. Please allow location to view 10km nearby users.';
        if (err.code === err.TIMEOUT) msg = 'Location request timed out.';
        setLocation((prev) => ({
          ...prev,
          isAllowed: prev.latitude !== null,
          isDetecting: false,
          error: prev.latitude !== null ? null : msg,
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [location.radiusKm, syncBackend]);

  const setCustomRadius = (radius: number) => {
    setLocation((prev) => {
      if (prev.latitude && prev.longitude) {
        saveLocationToStorage(prev.latitude, prev.longitude, radius, prev.cityName);
        syncBackend(prev.latitude, prev.longitude, radius);
      }
      return { ...prev, radiusKm: radius };
    });
  };

  const setMockLocation = (lat: number, lng: number, cityName: string) => {
    saveLocationToStorage(lat, lng, location.radiusKm, cityName);
    setLocation((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      isAllowed: true,
      isDetecting: false,
      error: null,
      cityName,
    }));
    syncBackend(lat, lng, location.radiusKm);
  };

  // Auto-request location when component mounts
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return (
    <LocationContext.Provider
      value={{ location, requestLocation, setCustomRadius, setMockLocation }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
