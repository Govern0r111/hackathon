'use client';

import React, { useMemo, useState } from 'react';
import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from '@react-google-maps/api';

/**
 * SafePathDashboard.jsx
 *
 * Drop-in React component for a dark-mode commuter safety dashboard.
 * - React hooks + Tailwind for layout
 * - @react-google-maps/api for official Google Maps JS API integration
 *
 * Env vars (pick one based on your setup):
 * - Vite:  VITE_GOOGLE_MAPS_API_KEY
 * - Next:  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 * - CRA:   REACT_APP_GOOGLE_MAPS_API_KEY
 */
const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_MAPS_API_KEY) ||
  (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_GOOGLE_MAPS_API_KEY) ||
  '';

// Bangalore, India (center)
const BANGALORE_CENTER = { lat: 12.9716, lng: 77.5946 };

// Placeholder points so the demo looks good immediately.
const START_POINT = { lat: 12.9752, lng: 77.6033 };
const END_POINT = { lat: 12.9612, lng: 77.5850 };

// Hazard location (on/near the standard route).
const HAZARD_POINT = { lat: 12.9686, lng: 77.5955 };

// Standard route path: simple polyline between start and end with a couple of bends.
const STANDARD_ROUTE_PATH = [
  START_POINT,
  { lat: 12.9729, lng: 77.6000 },
  { lat: 12.9700, lng: 77.5966 },
  { lat: 12.9678, lng: 77.5925 },
  END_POINT,
];

// Detour route path: bypasses the hazard with a safer arc.
const DETOUR_ROUTE_PATH = [
  START_POINT,
  { lat: 12.9782, lng: 77.5960 },
  { lat: 12.9760, lng: 77.5905 },
  { lat: 12.9698, lng: 77.5872 },
  { lat: 12.9652, lng: 77.5856 },
  END_POINT,
];

// A "Night" / dark map style (futuristic, high-contrast).
// This is a generic style object (no external dependencies).
const NIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0b1220' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b1220' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7b93b6' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#1b2a44' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6d86ab' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0a1a16' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#101b2f' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1b2a44' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8aa3c7' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#101b2f' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#08101c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4a648a' }],
  },
];

function buildHazardIcon() {
  // Custom red warning marker (SVG data URI).
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <g filter="url(#glow)">
      <path d="M32 6 L60 54 H4 Z" fill="#ff2d55" stroke="#ff9aa9" stroke-width="2"/>
      <rect x="29" y="22" width="6" height="18" rx="2" fill="#0b1220"/>
      <circle cx="32" cy="46" r="3.2" fill="#0b1220"/>
    </g>
  </svg>`;

  // Encode as data URI.
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');

  return {
    url: `data:image/svg+xml,${encoded}`,
    scaledSize:
      typeof window !== 'undefined' && window.google
        ? new window.google.maps.Size(36, 36)
        : undefined,
    anchor:
      typeof window !== 'undefined' && window.google
        ? new window.google.maps.Point(18, 34)
        : undefined,
  };
}

export default function SafePathDashboard() {
  const [startText, setStartText] = useState('MG Road Metro');
  const [destinationText, setDestinationText] = useState('Cubbon Park');

  // routeState: 'standard' | 'detour'
  const [routeState, setRouteState] = useState('standard');
  const [terminalText, setTerminalText] = useState('SYSTEM: Standing by. Route is clear.');

  const hazardTriggered = routeState === 'detour';

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'safepath-google-maps',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const mapOptions = useMemo(
    () => ({
      styles: NIGHT_MAP_STYLE,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
      backgroundColor: '#0b1220',
    }),
    [],
  );

  const standardPolylineOptions = useMemo(
    () => ({
      strokeColor: '#60a5fa', // Tailwind blue-400-ish
      strokeOpacity: 0.45,
      strokeWeight: 6,
      geodesic: true,
    }),
    [],
  );

  // "Glowing" detour: draw a thick translucent line + a thinner bright line.
  const detourGlowOptions = useMemo(
    () => ({
      strokeColor: '#00ffb3',
      strokeOpacity: 0.25,
      strokeWeight: 12,
      geodesic: true,
    }),
    [],
  );

  const detourCoreOptions = useMemo(
    () => ({
      strokeColor: '#00ffb3',
      strokeOpacity: 0.95,
      strokeWeight: 5,
      geodesic: true,
    }),
    [],
  );

  const onTriggerHazard = () => {
    if (hazardTriggered) return;

    setRouteState('detour');
    setTerminalText('ALERT: Unsafe condition detected ahead. Rerouting to safe detour...');
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h1 className="text-xl font-semibold">SafePath AI — Maps Not Configured</h1>
          <p className="mt-2 text-sm text-slate-300">
            Set a Google Maps API key and reload.
          </p>
          <ul className="mt-3 text-sm text-slate-300 list-disc pl-5 space-y-1">
            <li>Vite: <span className="font-mono">VITE_GOOGLE_MAPS_API_KEY</span></li>
            <li>Next.js: <span className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</span></li>
          </ul>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h1 className="text-xl font-semibold">SafePath AI — Maps Load Error</h1>
          <p className="mt-2 text-sm text-slate-300">
            Failed to load Google Maps. Check the API key, billing, and allowed referrers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <div className="flex h-screen w-full">
        {/* Sidebar */}
        <aside className="w-full max-w-md border-r border-slate-800 bg-slate-900/40 p-5 flex flex-col gap-5">
          <div>
            <div className="text-xs tracking-widest text-slate-400">SAFEPATH AI</div>
            <h1 className="text-2xl font-semibold">Commuter Safety Dashboard</h1>
            <p className="mt-1 text-sm text-slate-300">
              Dark-mode routing demo with hazard reroute visualization.
            </p>
          </div>

          {/* Controls */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
            <label className="block text-xs text-slate-400">Start Location</label>
            <input
              value={startText}
              onChange={(e) => setStartText(e.target.value)}
              placeholder="Enter start"
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-slate-600"
            />

            <label className="mt-4 block text-xs text-slate-400">Destination</label>
            <input
              value={destinationText}
              onChange={(e) => setDestinationText(e.target.value)}
              placeholder="Enter destination"
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-slate-600"
            />

            <button
              type="button"
              onClick={onTriggerHazard}
              disabled={hazardTriggered}
              className={
                'mt-4 w-full rounded-lg px-4 py-3 text-sm font-semibold transition ' +
                (hazardTriggered
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-red-500/90 hover:bg-red-500 text-white shadow-lg shadow-red-500/20')
              }
            >
              Trigger Hazard Alert
            </button>
          </div>

          {/* AI Terminal */}
          <div className="rounded-xl border border-slate-800 bg-black/40 p-4 flex-1">
            <div className="flex items-center justify-between">
              <div className="text-xs tracking-widest text-emerald-300">AI TERMINAL</div>
              <div className={
                'text-[10px] px-2 py-1 rounded border ' +
                (hazardTriggered
                  ? 'border-red-400/40 text-red-200 bg-red-500/10'
                  : 'border-emerald-400/30 text-emerald-200 bg-emerald-500/10')
              }>
                {hazardTriggered ? 'ALERT' : 'ONLINE'}
              </div>
            </div>
            <div className="mt-3 font-mono text-sm leading-relaxed text-slate-100 whitespace-pre-wrap">
              {terminalText}
            </div>
          </div>
        </aside>

        {/* Map */}
        <main className="flex-1 relative">
          {!isLoaded ? (
            <div className="h-full w-full flex items-center justify-center text-slate-300">
              Loading map…
            </div>
          ) : (
            <GoogleMap
              mapContainerClassName="h-full w-full"
              center={BANGALORE_CENTER}
              zoom={13}
              options={mapOptions}
            >
              {/* Start / End markers */}
              <MarkerF position={START_POINT} label="A" />
              <MarkerF position={END_POINT} label="B" />

              {/* Standard route */}
              {!hazardTriggered && (
                <PolylineF path={STANDARD_ROUTE_PATH} options={standardPolylineOptions} />
              )}

              {/* Hazard + detour route */}
              {hazardTriggered && (
                <>
                  <MarkerF position={HAZARD_POINT} icon={buildHazardIcon()} />

                  {/* Glowing detour */}
                  <PolylineF path={DETOUR_ROUTE_PATH} options={detourGlowOptions} />
                  <PolylineF path={DETOUR_ROUTE_PATH} options={detourCoreOptions} />
                </>
              )}
            </GoogleMap>
          )}
        </main>
      </div>
    </div>
  );
}
