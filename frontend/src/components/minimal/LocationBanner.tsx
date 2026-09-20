'use client';

import React, { useState, useEffect } from 'react';
import { useLocation, LOCATION_PRESETS } from '../../context/LocationContext';
import { MapPin, Navigation, Compass, Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface LocationBannerProps {
  onLocationReady?: () => void;
}

export const LocationBanner: React.FC<LocationBannerProps> = ({ onLocationReady }) => {
  const { location, requestLocation, setMockLocation } = useLocation();
  const [showHelp, setShowHelp] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator?.userAgent) {
      const ua = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        setPlatform('ios');
      } else if (/android/.test(ua)) {
        setPlatform('android');
      } else {
        setPlatform('desktop');
      }
    }
  }, []);

  // If location is already granted and coordinates exist, do not render banner
  if (location.latitude !== null && location.longitude !== null && location.isAllowed && !isDismissed) {
    return null;
  }

  const handleEnableClick = async () => {
    try {
      await requestLocation();
      onLocationReady?.();
    } catch {
      // Handled in LocationContext
    }
  };

  const handleSelectPreset = (preset: (typeof LOCATION_PRESETS)[0]) => {
    setMockLocation(preset.lat, preset.lng, preset.name);
    onLocationReady?.();
  };

  const isDenied = location.permissionStatus === 'denied' || (location.error && location.error.includes('denied'));

  return (
    <div className="w-full bg-gradient-to-r from-[#0C1424] via-[#0E1B30] to-[#0C1424] border-b border-[#1E2E4A] px-3.5 py-3 text-xs select-none shadow-lg animate-in slide-in-from-top duration-200">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Left info & status */}
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-[#38BDF8] shrink-0 mt-0.5">
            {location.isDetecting ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#38BDF8]" />
            ) : (
              <Navigation className="w-4 h-4 text-[#38BDF8]" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-white tracking-wide">
                {isDenied ? 'Location Access Blocked' : 'Enable 10 KM Nearby Radar'}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-950/80 text-sky-300 border border-sky-700/40">
                10 km radius
              </span>
            </div>
            <p className="text-[#8A99AD] text-[11px] mt-0.5 leading-tight">
              {isDenied
                ? 'Location is blocked in browser settings. Tap Allow or pick a city preset below.'
                : 'Connect with nearby anonymous people in real-time around your area.'}
            </p>
          </div>
        </div>

        {/* Right action buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end flex-wrap">
          {/* Direct Gesture Enable Button */}
          <button
            type="button"
            onClick={handleEnableClick}
            disabled={location.isDetecting}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold text-xs transition-all shadow-md shadow-sky-500/20 cursor-pointer disabled:opacity-50"
          >
            {location.isDetecting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Locating...</span>
              </>
            ) : (
              <>
                <MapPin className="w-3.5 h-3.5" />
                <span>Allow Location</span>
              </>
            )}
          </button>

          {/* Toggle Device-Adaptive Help Button */}
          <button
            type="button"
            onClick={() => setShowHelp((prev) => !prev)}
            className="px-2.5 py-2 rounded-xl bg-[#141F33] hover:bg-[#1A2A45] text-[#8A99AD] hover:text-[#F0F4F8] border border-white/5 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
            title="How to allow location"
          >
            <span>{platform === 'ios' ? 'Safari Help' : platform === 'android' ? 'Android Help' : 'Help'}</span>
            {showHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Quick City Preset Pills (Instant 1-Click Fallback) */}
      <div className="max-w-4xl mx-auto mt-2.5 pt-2 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-[10px] text-[#57657A] font-medium uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Quick City:
        </span>
        {LOCATION_PRESETS.slice(0, 5).map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => handleSelectPreset(preset)}
            className="px-2.5 py-1 rounded-lg bg-[#141C2B] hover:bg-[#1D293E] hover:border-sky-500/40 text-[#94A3B8] hover:text-white border border-white/5 text-[11px] whitespace-nowrap transition-all shrink-0 cursor-pointer active:scale-95"
          >
            {preset.name.split(',')[0]}
          </button>
        ))}
      </div>

      {/* Device-Specific Settings Help Drawer */}
      {showHelp && (
        <div className="max-w-4xl mx-auto mt-2.5 p-3 rounded-xl bg-[#090F1A] border border-sky-900/40 text-[11px] text-[#8A99AD] space-y-1.5 animate-in fade-in duration-150">
          {platform === 'ios' ? (
            <>
              <div className="font-semibold text-sky-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                <span>How to allow location in iOS Safari:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[#94A3B8] pl-1">
                <li>
                  Tap the <strong className="text-white">AA</strong> or <strong className="text-white">Page Settings</strong> icon in the Safari address bar.
                </li>
                <li>
                  Select <strong className="text-white">Website Settings</strong> &gt; <strong className="text-white">Location</strong> &gt; Set to <strong className="text-sky-300">Allow</strong>.
                </li>
                <li>
                  If still blocked, open iPhone <strong className="text-white">Settings</strong> &gt; <strong className="text-white">Privacy &amp; Security</strong> &gt; <strong className="text-white">Location Services</strong> &gt; <strong className="text-white">Safari Websites</strong> &gt; <strong className="text-sky-300">While Using the App</strong>.
                </li>
              </ol>
            </>
          ) : platform === 'android' ? (
            <>
              <div className="font-semibold text-sky-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                <span>How to allow location on Android (Chrome):</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[#94A3B8] pl-1">
                <li>
                  Tap the <strong className="text-white">Tune / Lock</strong> icon on the left of the website URL.
                </li>
                <li>
                  Tap <strong className="text-white">Permissions</strong> &gt; Toggle <strong className="text-sky-300">Location to On</strong>.
                </li>
                <li>
                  If still blocked, open phone <strong className="text-white">Settings</strong> &gt; <strong className="text-white">Apps</strong> &gt; <strong className="text-white">Chrome</strong> &gt; <strong className="text-white">Permissions</strong> &gt; <strong className="text-white">Location</strong> &gt; <strong className="text-sky-300">Allow while using app</strong>.
                </li>
              </ol>
            </>
          ) : (
            <>
              <div className="font-semibold text-sky-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                <span>How to allow location on Desktop:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[#94A3B8] pl-1">
                <li>
                  Click the <strong className="text-white">Tune / Lock </strong> icon in your browser address bar.
                </li>
                <li>
                  Toggle <strong className="text-sky-300">Location permission to Allow</strong> and reload the page.
                </li>
              </ol>
            </>
          )}
        </div>
      )}
    </div>
  );
};
