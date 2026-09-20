'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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



const LOCATION_CACHE_KEY = 'anym_last_location';
const LOCATION_CACHE_TTL_MS = 60 * 60 * 1000; // 1 Hour TTL for local UI hint cache

export function LocationProvider({ children }: { children: React.ReactNode }) {
  // Initialize from valid local cache hint if within TTL
  const [location, setLocation] = useState<LocationState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCATION_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const now = Date.now();
          const age = now - (parsed.timestamp || 0);

          // Validate coordinate boundaries & TTL
          if (
            typeof parsed.latitude === 'number' &&
            typeof parsed.longitude === 'number' &&
            parsed.latitude >= -90 &&
            parsed.latitude <= 90 &&
            parsed.longitude >= -180 &&
            parsed.longitude <= 180 &&
            age >= 0 &&
            age < LOCATION_CACHE_TTL_MS
          ) {
            return {
              latitude: parsed.latitude,
              longitude: parsed.longitude,
              radiusKm: parsed.radiusKm || 10,
              isAllowed: true,
              isDetecting: false,
              error: null,
              cityName: parsed.cityName || 'Cached Location',
              source: (parsed.source as any) || 'cached',
              cachedTimestamp: parsed.timestamp,
            };
          } else {
            // Clean expired or malformed cache
            localStorage.removeItem(LOCATION_CACHE_KEY);
          }
        }
      } catch {
        /* ignore parsing issues */
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
      source: 'none',
    };
  });

  const locationSeqRef = useRef<number>(0);

  const saveLocationHint = useCallback(
    (lat: number, lng: number, rad: number, city?: string, source: 'gps' | 'cached' | 'mock' | 'none' = 'gps') => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            LOCATION_CACHE_KEY,
            JSON.stringify({
              latitude: lat,
              longitude: lng,
              radiusKm: rad,
              cityName: city,
              source,
              timestamp: Date.now(),
            })
          );
        } catch {
          /* ignore storage quota/privacy mode */
        }
      }
    },
    []
  );

  const syncBackend = useCallback(async (lat: number, lng: number, rad: number) => {
    try {
      await ApiService.updateLocation(lat, lng, rad);
    } catch {
      // Background sync non-blocking
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

    const currentSeq = ++locationSeqRef.current;
    setLocation((prev) => ({ ...prev, isDetecting: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Prevent race if newer location call started
        if (currentSeq !== locationSeqRef.current) return;

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
          source: 'gps',
          cachedTimestamp: Date.now(),
        }));

        saveLocationHint(lat, lng, location.radiusKm, 'Your Current Device GPS', 'gps');
        syncBackend(lat, lng, location.radiusKm);
      },
      (err) => {
        if (currentSeq !== locationSeqRef.current) return;

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
  }, [location.radiusKm, saveLocationHint, syncBackend]);

  const setCustomRadius = (radius: number) => {
    setLocation((prev) => {
      if (prev.latitude && prev.longitude) {
        saveLocationHint(prev.latitude, prev.longitude, radius, prev.cityName, prev.source || 'cached');
        syncBackend(prev.latitude, prev.longitude, radius);
      }
      return { ...prev, radiusKm: radius };
    });
  };

  const setMockLocation = (lat: number, lng: number, cityName: string) => {
    locationSeqRef.current++;
    saveLocationHint(lat, lng, location.radiusKm, cityName, 'mock');
    setLocation((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      isAllowed: true,
      isDetecting: false,
      error: null,
      cityName,
      source: 'mock',
      cachedTimestamp: Date.now(),
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
