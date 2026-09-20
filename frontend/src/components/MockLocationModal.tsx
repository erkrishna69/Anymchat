'use client';

import React, { useState } from 'react';
import { useLocation, LOCATION_PRESETS } from '../context/LocationContext';
import { MapPin, X, Compass, Check } from 'lucide-react';

interface MockLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MockLocationModal: React.FC<MockLocationModalProps> = ({ isOpen, onClose }) => {
  const { location, setMockLocation, requestLocation } = useLocation();
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof LOCATION_PRESETS[0]) => {
    setMockLocation(preset.lat, preset.lng, preset.name);
    onClose();
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      setMockLocation(lat, lng, `Custom (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
      onClose();
    }
  };

  const handleUseRealGps = () => {
    requestLocation();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl glass-panel p-6 shadow-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Location & Proximity Simulator
              </h3>
              <p className="text-xs text-slate-500">
                Choose a location to test the 10 KM proximity filter
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real GPS button */}
        <div className="mt-4">
          <button
            onClick={handleUseRealGps}
            className="w-full p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <MapPin className="w-4 h-4" />
            Use My Real Device GPS Location
          </button>
        </div>

        {/* Preset Cities */}
        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2">
            Quick City Hubs (Click to teleport)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {LOCATION_PRESETS.map((preset: (typeof LOCATION_PRESETS)[0]) => {
              const isCurrent =
                location.cityName === preset.name ||
                (location.latitude &&
                  Math.abs(location.latitude - preset.lat) < 0.005 &&
                  location.longitude &&
                  Math.abs(location.longitude - preset.lng) < 0.005);

              return (
                <button
                  key={preset.name}
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2.5 rounded-xl text-left text-xs font-medium border transition-all flex items-center justify-between ${
                    isCurrent
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="truncate">
                    <div className="font-semibold">{preset.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {preset.lat.toFixed(2)}, {preset.lng.toFixed(2)}
                    </div>
                  </div>
                  {isCurrent && <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Coordinates Form */}
        <form onSubmit={handleApplyCustom} className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2">
            Or Enter Custom Coordinates
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Latitude (e.g. 28.6139)"
              value={customLat}
              onChange={(e) => setCustomLat(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <input
              type="text"
              placeholder="Longitude (e.g. 77.2090)"
              value={customLng}
              onChange={(e) => setCustomLng(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="w-full mt-2 py-1.5 text-xs font-semibold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-all"
          >
            Apply Custom Coordinates
          </button>
        </form>
      </div>
    </div>
  );
};
