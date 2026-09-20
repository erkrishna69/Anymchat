'use client';

import React from 'react';
import { useLocation } from '../context/LocationContext';
import { useSocket } from '../context/SocketContext';
import { MapPin, ShieldCheck, Navigation, AlertCircle, Sliders } from 'lucide-react';

interface LocationBannerProps {
  onOpenMockLocation: () => void;
}

export const LocationBanner: React.FC<LocationBannerProps> = ({ onOpenMockLocation }) => {
  const { location, requestLocation, setCustomRadius } = useLocation();
  const { totalNearbyCount } = useSocket();

  const radiusOptions = [1, 5, 10, 25];

  if (!location.isAllowed) {
    return (
      <div className="mx-4 my-3 sm:mx-6 rounded-2xl p-4 sm:p-5 border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/10 backdrop-blur-md shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-500 mt-0.5">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Enable Location for 10 KM Anonymous Chat
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" /> Zero Coordinate Leakage
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                We only use your general area to show active anonymous users within 10 km. Your exact GPS coordinates, building, or address are <strong>never</strong> shared with anyone.
              </p>
              {location.error && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-500">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{location.error}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={requestLocation}
              disabled={location.isDetecting}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all rounded-xl shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2"
            >
              <MapPin className="w-3.5 h-3.5" />
              {location.isDetecting ? 'Detecting GPS...' : 'Allow GPS Location'}
            </button>

            <button
              onClick={onOpenMockLocation}
              className="px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
            >
              Simulate City
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 my-2 sm:mx-6 px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span className="font-bold tracking-wider uppercase text-slate-800 dark:text-slate-200">
          NEARBY — {location.radiusKm} KM
        </span>
        <span className="text-slate-400 dark:text-slate-500">•</span>
        <span className="text-slate-600 dark:text-slate-400 font-medium">
          {totalNearbyCount} {totalNearbyCount === 1 ? 'person' : 'people'} online
        </span>
      </div>

      {/* Radius selector buttons */}
      <div className="flex items-center gap-1">
        <span className="text-slate-400 text-[11px] mr-1 hidden md:inline">Range:</span>
        {radiusOptions.map((rad) => (
          <button
            key={rad}
            onClick={() => setCustomRadius(rad)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              location.radiusKm === rad
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            {rad} KM {rad === 10 ? '(Default)' : ''}
          </button>
        ))}
      </div>
    </div>
  );
};
