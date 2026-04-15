'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

// Fallback points in case live Directions fails.
const FALLBACK_START_POINT = { lat: 12.9752, lng: 77.6033 };
const FALLBACK_END_POINT = { lat: 12.9704, lng: 77.5946 };
const FALLBACK_HAZARD_POINT = { lat: 12.9721, lng: 77.5982 };

const FALLBACK_STANDARD_ROUTE_PATH = [
  FALLBACK_START_POINT,
  { lat: 12.9729, lng: 77.6000 },
  { lat: 12.9700, lng: 77.5966 },
  { lat: 12.9704, lng: 77.5946 },
  FALLBACK_END_POINT,
];

const FALLBACK_DETOUR_ROUTE_PATH = [
  FALLBACK_START_POINT,
  { lat: 12.9782, lng: 77.5960 },
  { lat: 12.9760, lng: 77.5905 },
  { lat: 12.9698, lng: 77.5872 },
  { lat: 12.9704, lng: 77.5946 },
  FALLBACK_END_POINT,
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
  const [startText, setStartText] = useState('MG Road Metro Station, Bengaluru');
  const [destinationText, setDestinationText] = useState('Cubbon Park, Bengaluru');

  // routeState: 'standard' | 'detour'
  const [routeState, setRouteState] = useState('standard');
  const [terminalText, setTerminalText] = useState('SYSTEM: Standing by. Route is clear.');
  const [isRouting, setIsRouting] = useState(false);

  const [startPoint, setStartPoint] = useState(FALLBACK_START_POINT);
  const [endPoint, setEndPoint] = useState(FALLBACK_END_POINT);
  const [hazardPoint, setHazardPoint] = useState(FALLBACK_HAZARD_POINT);
  const [standardPath, setStandardPath] = useState(FALLBACK_STANDARD_ROUTE_PATH);
  const [detourPath, setDetourPath] = useState(FALLBACK_DETOUR_ROUTE_PATH);

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

  const getDirectionsService = useCallback(() => {
    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      return null;
    }
    return new window.google.maps.DirectionsService();
  }, []);

  const latLngToLiteral = (latLng) => ({ lat: latLng.lat(), lng: latLng.lng() });

  const pickHazardPoint = (path) => {
    if (!path || path.length < 3) return FALLBACK_HAZARD_POINT;
    const idx = Math.min(path.length - 2, Math.max(1, Math.floor(path.length * 0.55)));
    return path[idx];
  };

  const routeToPath = (route) => {
    if (!route || !route.overview_path || route.overview_path.length === 0) return [];
    return route.overview_path.map(latLngToLiteral);
  };

  const requestRoute = useCallback(
    (request) => new Promise((resolve, reject) => {
      const service = getDirectionsService();
      if (!service) {
        reject(new Error('Maps service not available'));
        return;
      }
      service.route(request, (result, status) => {
        if (status === 'OK' && result && result.routes && result.routes.length > 0) {
          resolve(result.routes[0]);
          return;
        }
        reject(new Error(`Directions failed: ${status}`));
      });
    }),
    [getDirectionsService],
  );

  const buildBaseDirectionsRequest = useCallback(() => {
    if (typeof window === 'undefined' || !window.google || !window.google.maps) return null;
    return {
      origin: startText,
      destination: destinationText,
      travelMode: window.google.maps.TravelMode.WALKING,
      region: 'IN',
      provideRouteAlternatives: false,
    };
  }, [startText, destinationText]);

  const computeStandardRoute = useCallback(async () => {
    const baseRequest = buildBaseDirectionsRequest();
    if (!baseRequest) return;

    setIsRouting(true);
    try {
      const route = await requestRoute(baseRequest);
      const path = routeToPath(route);
      if (path.length > 1) {
        setStandardPath(path);
        setHazardPoint(pickHazardPoint(path));
      }

      const leg = route.legs && route.legs[0];
      if (leg) {
        setStartPoint(latLngToLiteral(leg.start_location));
        setEndPoint(latLngToLiteral(leg.end_location));
      }

      if (!hazardTriggered) {
        setTerminalText('SYSTEM: Route updated. Current path is clear.');
      }
    } catch {
      // Keep fallbacks so demo always works.
      setStandardPath(FALLBACK_STANDARD_ROUTE_PATH);
      setHazardPoint(FALLBACK_HAZARD_POINT);
      setStartPoint(FALLBACK_START_POINT);
      setEndPoint(FALLBACK_END_POINT);
      if (!hazardTriggered) {
        setTerminalText('SYSTEM: Using fallback route. Check Directions API access.');
      }
    } finally {
      setIsRouting(false);
    }
  }, [buildBaseDirectionsRequest, hazardTriggered, requestRoute]);

  const computeDetourRoute = useCallback(async () => {
    const baseRequest = buildBaseDirectionsRequest();
    if (!baseRequest) return;

    const offsetWaypoint = {
      lat: hazardPoint.lat + 0.006,
      lng: hazardPoint.lng - 0.008,
    };

    setIsRouting(true);
    try {
      const route = await requestRoute({
        ...baseRequest,
        waypoints: [{ location: offsetWaypoint, stopover: false }],
      });

      const path = routeToPath(route);
      if (path.length > 1) {
        setDetourPath(path);
      } else {
        setDetourPath(FALLBACK_DETOUR_ROUTE_PATH);
      }
    } catch {
      setDetourPath(FALLBACK_DETOUR_ROUTE_PATH);
    } finally {
      setIsRouting(false);
    }
  }, [buildBaseDirectionsRequest, hazardPoint, requestRoute]);

  useEffect(() => {
    if (!isLoaded) return;
    computeStandardRoute();
  }, [isLoaded, computeStandardRoute]);

  useEffect(() => {
    if (!isLoaded || hazardTriggered) return;
    if (!startText.trim() || !destinationText.trim()) return;

    const handle = setTimeout(() => {
      computeStandardRoute();
    }, 700);

    return () => clearTimeout(handle);
  }, [isLoaded, startText, destinationText, hazardTriggered, computeStandardRoute]);

  const onTriggerHazard = async () => {
    if (hazardTriggered) return;
    await computeDetourRoute();
    setRouteState('detour');
    setTerminalText('ALERT: Unsafe condition detected ahead. Rerouting to safe detour...');
  };

  const onResetRoute = () => {
    setRouteState('standard');
    setTerminalText('SYSTEM: Route reset to standard path.');
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
        <aside className="w-full max-w-md border-r border-slate-800 bg-slate-900/40 p-5 flex flex-col gap-5" aria-label="Route control panel">
          <div>
            <div className="text-xs tracking-widest text-slate-400">SAFEPATH AI</div>
            <h1 className="text-2xl font-semibold">Commuter Safety Dashboard</h1>
            <p className="mt-1 text-sm text-slate-300">
              Dark-mode routing demo with hazard reroute visualization.
            </p>
          </div>

          {/* Controls */}
          <form className="rounded-xl border border-slate-800 bg-slate-950/30 p-4" aria-label="Routing controls" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="start-location" className="block text-xs text-slate-400">Start Location</label>
            <input
              id="start-location"
              name="startLocation"
              value={startText}
              onChange={(e) => setStartText(e.target.value)}
              placeholder="Enter start"
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-slate-600"
              aria-describedby="routing-hint"
            />

            <label htmlFor="destination" className="mt-4 block text-xs text-slate-400">Destination</label>
            <input
              id="destination"
              name="destination"
              value={destinationText}
              onChange={(e) => setDestinationText(e.target.value)}
              placeholder="Enter destination"
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-slate-600"
              aria-describedby="routing-hint"
            />

            <p id="routing-hint" className="mt-2 text-xs text-slate-400">
              Route auto-refreshes as you type. Use the hazard button to simulate an unsafe segment.
            </p>

            <button
              type="button"
              onClick={onTriggerHazard}
              disabled={hazardTriggered}
              aria-pressed={hazardTriggered}
              className={
                'mt-4 w-full rounded-lg px-4 py-3 text-sm font-semibold transition ' +
                (hazardTriggered
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-red-500/90 hover:bg-red-500 text-white shadow-lg shadow-red-500/20')
              }
            >
              Trigger Hazard Alert
            </button>

            <button
              type="button"
              onClick={onResetRoute}
              disabled={!hazardTriggered}
              aria-pressed={!hazardTriggered}
              className={
                'mt-2 w-full rounded-lg px-4 py-2 text-sm font-medium transition ' +
                (!hazardTriggered
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-100')
              }
            >
              Reset To Standard Route
            </button>
          </form>

          {/* AI Terminal */}
          <section className="rounded-xl border border-slate-800 bg-black/40 p-4 flex-1" aria-label="AI terminal status">
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
            <div className="mt-3 font-mono text-sm leading-relaxed text-slate-100 whitespace-pre-wrap" role="status" aria-live="polite" aria-atomic="true">
              {terminalText}
              {isRouting ? '\n\nSYSTEM: Computing route...' : ''}
            </div>
          </section>
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
              <MarkerF position={startPoint} label="A" />
              <MarkerF position={endPoint} label="B" />

              {/* Standard route */}
              {!hazardTriggered && (
                <PolylineF path={standardPath} options={standardPolylineOptions} />
              )}

              {/* Hazard + detour route */}
              {hazardTriggered && (
                <>
                  <MarkerF position={hazardPoint} icon={buildHazardIcon()} />

                  {/* Glowing detour */}
                  <PolylineF path={detourPath} options={detourGlowOptions} />
                  <PolylineF path={detourPath} options={detourCoreOptions} />
                </>
              )}
            </GoogleMap>
          )}
        </main>
      </div>
    </div>
  );
}
