import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import {
  Play,
  Pause,
  RotateCcw,
  Compass,
  Navigation,
  Gauge,
  MapPin,
  Radio,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  RefreshCw,
  LocateFixed,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  Crosshair,
} from 'lucide-react';
import { KAWAI_COLORS } from '../constants/theme';
import { detailKoordinatKeAlamat } from '../utils/geocoding';

// --- DATA RUTE CONTOH BANJARMASIN (MASUK AKAL & JALUR RIIL) ---
export interface RouteWaypoint {
  lat: number;
  lng: number;
  name: string;
  note?: string;
}

export interface RouteOption {
  id: string;
  name: string;
  description: string;
  distanceKm: number;
  waypoints: RouteWaypoint[];
}

export const BANJARMASIN_ROUTES: RouteOption[] = [
  {
    id: 'route-1',
    name: 'Rute 1: Duta Mall → Siring → Kampus ULM',
    description: 'Koridor utama Jl. A. Yani, Menara Pandang Martapura, menuju Kayutangi',
    distanceKm: 5.4,
    waypoints: [
      { lat: -3.32688, lng: 114.60462, name: 'Duta Mall Banjarmasin', note: 'Titik Jemput (Jl. A. Yani Km 2)' },
      { lat: -3.32454, lng: 114.60128, name: 'RSUD Ulin Banjarmasin', note: 'Jl. A. Yani No. 43' },
      { lat: -3.3221, lng: 114.5982, name: 'Patung Bekantan Siring', note: 'Ikon Tepian Martapura' },
      { lat: -3.31825, lng: 114.59385, name: 'Menara Pandang & Siring', note: 'Jl. Kapten Pierre Tendean' },
      { lat: -3.3155, lng: 114.5912, name: 'Jembatan Merdeka & Sabilal', note: 'Masjid Raya Sabilal Muhtadin' },
      { lat: -3.3115, lng: 114.5901, name: 'Simpang Empat Pasar Lama', note: 'Kawasan Perdagangan' },
      { lat: -3.3032, lng: 114.5878, name: 'Jembatan Kayutangi', note: 'Penyeberangan Sungai Kuin' },
      { lat: -3.29851, lng: 114.58802, name: 'Gerbang Utama ULM Kayutangi', note: 'Tujuan (Jl. Brigjen Hasan Basry)' },
    ],
  },
  {
    id: 'route-2',
    name: 'Rute 2: Pasar Terapung Kuin → Sabilal → RSUD Ulin',
    description: 'Jalur wisata budaya sungai menuju pusat medis kota',
    distanceKm: 6.2,
    waypoints: [
      { lat: -3.2954, lng: 114.5712, name: 'Pasar Terapung Muara Kuin', note: 'Titik Jemput (Kuin Utara)' },
      { lat: -3.302, lng: 114.5768, name: 'Makam Sultan Suriansyah', note: 'Situs Bersejarah Banjar' },
      { lat: -3.3095, lng: 114.5835, name: 'Jl. S. Parman (Belitung)', note: 'Jalur Penghubung Barat' },
      { lat: -3.3164, lng: 114.5912, name: 'Masjid Raya Sabilal Muhtadin', note: 'Pusat Religi Kota' },
      { lat: -3.3215, lng: 114.5975, name: 'Siring 0 Kilometer', note: 'Eks Kantor Gubernur Kalsel' },
      { lat: -3.32454, lng: 114.60128, name: 'RSUD Ulin Banjarmasin', note: 'Tujuan Pengantaran' },
    ],
  },
  {
    id: 'route-3',
    name: 'Rute 3: Kawasan Bisnis Kuripan → Menara Pandang',
    description: 'Pusat kuliner & niaga Kuripan menuju tepian sungai Martapura',
    distanceKm: 3.1,
    waypoints: [
      { lat: -3.3221, lng: 114.6094, name: 'Sentra Kuliner Kuripan', note: 'Titik Jemput (Jl. Kuripan)' },
      { lat: -3.3235, lng: 114.6045, name: 'Jl. Veteran Melayu', note: 'Kawasan Niaga' },
      { lat: -3.3208, lng: 114.5985, name: 'Jembatan Dewi / A. Yani', note: 'Lintasan Penghubung' },
      { lat: -3.31825, lng: 114.59385, name: 'Menara Pandang Siring', note: 'Tujuan (Jl. Pierre Tendean)' },
    ],
  },
];

// Haversine distance in meters
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate direction / bearing in degrees (0 - 360)
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

interface LiveMapSimulatorProps {
  onClose?: () => void;
}

export const LiveMapSimulator: React.FC<LiveMapSimulatorProps> = ({ onClose }) => {
  // Mode selection: SIMULATION_MODE vs LIVE_GPS_MODE
  const [activeMode, setActiveMode] = useState<'SIMULATION_MODE' | 'LIVE_GPS_MODE'>('SIMULATION_MODE');

  // Selected route for simulation
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-1');
  const activeRoute = useMemo(
    () => BANJARMASIN_ROUTES.find((r) => r.id === selectedRouteId) || BANJARMASIN_ROUTES[0],
    [selectedRouteId]
  );

  // Simulation Status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED'
  const [simStatus, setSimStatus] = useState<'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED'>('IDLE');

  // Multiplier speed: 1x (36 km/h), 2x (72 km/h), 4x (144 km/h)
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  // Camera follow toggle
  const [isFollowVehicle, setIsFollowVehicle] = useState<boolean>(true);

  // Simulation metrics state
  const [distanceTraveledMeters, setDistanceTraveledMeters] = useState<number>(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(0);
  const [headingDegrees, setHeadingDegrees] = useState<number>(0);

  // Bottom control panel collapsed state (for clean view of map)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);

  // OpenStreetMap tile failure state
  const [isTileError, setIsTileError] = useState<boolean>(false);
  const [tileErrorCount, setTileErrorCount] = useState<number>(0);

  // Live GPS Mode State
  const [gpsLocation, setGpsLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
  } | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Refs for animation & Leaflet instances
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const traveledPolylineRef = useRef<L.Polyline | null>(null);
  const waypointMarkersRef = useRef<L.Marker[]>([]);
  const gpsMarkerRef = useRef<L.Marker | null>(null);
  const gpsCircleRef = useRef<L.Circle | null>(null);

  // Animation frame loop refs
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const currentDistanceTraveledRef = useRef<number>(0);
  const simStatusRef = useRef<'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED'>('IDLE');
  const speedMultiplierRef = useRef<number>(1);
  const isFollowVehicleRef = useRef<boolean>(true);

  // Sync refs with state
  useEffect(() => {
    simStatusRef.current = simStatus;
  }, [simStatus]);
  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier;
  }, [speedMultiplier]);
  useEffect(() => {
    isFollowVehicleRef.current = isFollowVehicle;
  }, [isFollowVehicle]);

  // Pre-calculate cumulative distances of waypoints in current route
  const routeSegmentDistances = useMemo(() => {
    const pts = activeRoute.waypoints;
    const segs: number[] = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const d = haversineMeters(pts[i].lat, pts[i].lng, pts[i + 1].lat, pts[i + 1].lng);
      segs.push(d);
      total += d;
    }
    return { segs, total };
  }, [activeRoute]);

  // Compute total distance & ETA
  const totalRouteMeters = routeSegmentDistances.total;
  const remainingMeters = Math.max(0, totalRouteMeters - distanceTraveledMeters);
  const effectiveSpeedKmh = speedMultiplier * 36; // Base 36 km/h * speedMultiplier
  const remainingMinutes =
    effectiveSpeedKmh > 0
      ? Math.max(0, Math.ceil((remainingMeters / 1000 / effectiveSpeedKmh) * 60))
      : 0;

  // Create Custom Motorcycle Leaflet DivIcon
  const createMotorcycleIcon = useCallback((heading: number) => {
    return L.divIcon({
      className: 'kawai-vehicle-marker-wrapper',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <!-- Radar pulse ring -->
          <div style="position: absolute; width: 42px; height: 42px; border-radius: 9999px; background: rgba(24, 184, 106, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <!-- Vehicle container with rotation -->
          <div style="transform: rotate(${heading}deg); transition: transform 0.15s ease-out; width: 34px; height: 34px; background: #17211B; border: 2.5px solid #18B86A; border-radius: 9999px; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 10;">
            <!-- Direction arrow pointer -->
            <div style="position: absolute; top: -5px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 7px solid #18B86A;"></div>
            <!-- Motor bike SVG symbol -->
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18.5" cy="17.5" r="3.5"/>
              <circle cx="5.5" cy="17.5" r="3.5"/>
              <circle cx="15" cy="5" r="1"/>
              <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
            </svg>
          </div>
          <!-- Plate tag badge -->
          <div style="position: absolute; bottom: -12px; background: #0E8F52; color: #FFFFFF; font-size: 8px; font-weight: 800; font-family: monospace; padding: 1px 4px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.4); white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.25); pointer-events: none;">
            DA 5110 KAW
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  }, []);

  // 1. INITIALIZE LEAFLET MAP
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create map instance centered at Banjarmasin
    const initialCenter: [number, number] = [
      activeRoute.waypoints[0].lat,
      activeRoute.waypoints[0].lng,
    ];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });

    // Custom positioned zoom controls
    L.control
      .zoom({
        position: 'topright',
      })
      .addTo(map);

    // OpenStreetMap Tile Layer with standard tile usage policy and attribution
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors | KAWAI 0511',
    });

    // Tile error listener for failure handling
    tileLayer.on('tileerror', (error) => {
      console.warn('OpenStreetMap tile loading error:', error);
      setIsTileError(true);
      setTileErrorCount((c) => c + 1);
    });

    tileLayer.on('tileload', () => {
      // Tile succeeded
    });

    tileLayer.addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Cleanup when component unmounts
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. RENDER ROUTE POLYLINES & WAYPOINT MARKERS
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous markers & polylines
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }
    if (traveledPolylineRef.current) {
      map.removeLayer(traveledPolylineRef.current);
      traveledPolylineRef.current = null;
    }
    waypointMarkersRef.current.forEach((m) => map.removeLayer(m));
    waypointMarkersRef.current = [];

    // LatLng array for polyline
    const latLngs = activeRoute.waypoints.map((wp) => [wp.lat, wp.lng] as [number, number]);

    // Base background route (light gray dashed)
    const basePolyline = L.polyline(latLngs, {
      color: '#17211B',
      weight: 6,
      opacity: 0.25,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Active route highlight (green Kawai)
    const activePolyline = L.polyline(latLngs, {
      color: '#18B86A',
      weight: 5,
      opacity: 0.9,
      dashArray: '4, 8',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    routePolylineRef.current = activePolyline;

    // Traveled line (solid emerald)
    const traveled = L.polyline([], {
      color: '#0E8F52',
      weight: 6,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);
    traveledPolylineRef.current = traveled;

    // Add Start & End & Intermediate Waypoint Markers
    const markers: L.Marker[] = [];
    activeRoute.waypoints.forEach((wp, index) => {
      const isStart = index === 0;
      const isEnd = index === activeRoute.waypoints.length - 1;

      const markerIcon = L.divIcon({
        className: 'kawai-waypoint-marker',
        html: `
          <div style="background: ${isStart ? '#18B86A' : isEnd ? '#E5484D' : '#FFFFFF'}; color: ${isStart || isEnd ? '#FFFFFF' : '#17211B'}; border: 2px solid ${isStart ? '#0E8F52' : isEnd ? '#B91C1C' : '#66736B'}; width: ${isStart || isEnd ? '28px' : '20px'}; height: ${isStart || isEnd ? '28px' : '20px'}; border-radius: 9999px; display: flex; align-items: center; justify-content: center; font-size: ${isStart || isEnd ? '11px' : '9px'}; font-weight: 800; box-shadow: 0 2px 6px rgba(0,0,0,0.25);">
            ${isStart ? 'A' : isEnd ? 'B' : index + 1}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([wp.lat, wp.lng], { icon: markerIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #17211B; line-height: 1.4;">
          <strong style="color: #0E8F52; font-size: 13px;">${wp.name}</strong><br/>
          <span style="color: #66736B;">${wp.note || ''}</span><br/>
          <span style="font-size: 10px; color: #A8B2AC;">Lat: ${wp.lat.toFixed(5)}, Lng: ${wp.lng.toFixed(5)}</span>
        </div>
      `);
      markers.push(marker);
    });
    waypointMarkersRef.current = markers;

    // Adjust map viewport to show the whole route with padding
    map.fitBounds(basePolyline.getBounds(), { padding: [50, 50], maxZoom: 16 });

    // Initialize or reset vehicle marker at start point
    const startPt = activeRoute.waypoints[0];
    const initialHeading =
      activeRoute.waypoints.length > 1
        ? calculateBearing(
            startPt.lat,
            startPt.lng,
            activeRoute.waypoints[1].lat,
            activeRoute.waypoints[1].lng
          )
        : 0;

    if (!vehicleMarkerRef.current) {
      const vMarker = L.marker([startPt.lat, startPt.lng], {
        icon: createMotorcycleIcon(initialHeading),
        zIndexOffset: 1000,
      }).addTo(map);
      vehicleMarkerRef.current = vMarker;
    } else {
      vehicleMarkerRef.current.setLatLng([startPt.lat, startPt.lng]);
      vehicleMarkerRef.current.setIcon(createMotorcycleIcon(initialHeading));
    }

    setHeadingDegrees(initialHeading);
    setDistanceTraveledMeters(0);
    currentDistanceTraveledRef.current = 0;
    setSimStatus('IDLE');
  }, [activeRoute, createMotorcycleIcon]);

  // 3. VEHICLE ANIMATION TICK ENGINE (SMOOTH SUB-TICK INTERPOLATION)
  const animateVehicle = useCallback(
    (timestamp: number) => {
      if (simStatusRef.current !== 'RUNNING') {
        lastTimeRef.current = null;
        return;
      }

      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      const deltaSec = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      // Base speed = 10 m/s (~36 km/h) * multiplier
      const speedMps = 10 * speedMultiplierRef.current;
      const stepDistance = speedMps * deltaSec;

      let newDistance = currentDistanceTraveledRef.current + stepDistance;
      const totalDist = routeSegmentDistances.total;

      if (newDistance >= totalDist) {
        newDistance = totalDist;
        currentDistanceTraveledRef.current = totalDist;
        setDistanceTraveledMeters(totalDist);
        setSimStatus('COMPLETED');
        setCurrentSpeedKmh(0);

        // Place at final waypoint
        const endWp = activeRoute.waypoints[activeRoute.waypoints.length - 1];
        if (vehicleMarkerRef.current) {
          vehicleMarkerRef.current.setLatLng([endWp.lat, endWp.lng]);
        }
        return;
      }

      currentDistanceTraveledRef.current = newDistance;
      setDistanceTraveledMeters(newDistance);
      setCurrentSpeedKmh(Math.round(speedMps * 3.6));

      // Locate current segment based on cumulative distances
      const waypoints = activeRoute.waypoints;
      const segs = routeSegmentDistances.segs;

      let accumulated = 0;
      let currentSegIndex = 0;
      let segProgressMeters = 0;

      for (let i = 0; i < segs.length; i++) {
        if (accumulated + segs[i] >= newDistance) {
          currentSegIndex = i;
          segProgressMeters = newDistance - accumulated;
          break;
        }
        accumulated += segs[i];
      }

      const ptA = waypoints[currentSegIndex];
      const ptB = waypoints[currentSegIndex + 1] || ptA;
      const segLength = segs[currentSegIndex] || 1;
      const fraction = Math.min(1, Math.max(0, segProgressMeters / segLength));

      // Linear interpolation between ptA and ptB
      const curLat = ptA.lat + (ptB.lat - ptA.lat) * fraction;
      const curLng = ptA.lng + (ptB.lng - ptA.lng) * fraction;

      // Bearing heading calculation
      const bearing = calculateBearing(ptA.lat, ptA.lng, ptB.lat, ptB.lng);
      setHeadingDegrees(Math.round(bearing));

      // Update vehicle marker on Leaflet map
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.setLatLng([curLat, curLng]);
        vehicleMarkerRef.current.setIcon(createMotorcycleIcon(bearing));
      }

      // Update traveled polyline
      if (traveledPolylineRef.current) {
        const traveledPts: [number, number][] = [];
        for (let j = 0; j <= currentSegIndex; j++) {
          traveledPts.push([waypoints[j].lat, waypoints[j].lng]);
        }
        traveledPts.push([curLat, curLng]);
        traveledPolylineRef.current.setLatLngs(traveledPts);
      }

      // Camera follow option
      if (isFollowVehicleRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.panTo([curLat, curLng], { animate: false });
      }

      // Next frame
      animationFrameRef.current = requestAnimationFrame(animateVehicle);
    },
    [activeRoute, routeSegmentDistances, createMotorcycleIcon]
  );

  // Trigger animation loop when status is RUNNING
  useEffect(() => {
    if (simStatus === 'RUNNING') {
      lastTimeRef.current = null;
      animationFrameRef.current = requestAnimationFrame(animateVehicle);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastTimeRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [simStatus, animateVehicle]);

  // CONTROLS HANDLERS
  const handleStart = () => {
    if (simStatus === 'COMPLETED') {
      handleReset();
    }
    setSimStatus('RUNNING');
  };

  const handlePause = () => {
    setSimStatus('PAUSED');
    setCurrentSpeedKmh(0);
  };

  const handleResume = () => {
    setSimStatus('RUNNING');
  };

  const handleReset = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    currentDistanceTraveledRef.current = 0;
    setDistanceTraveledMeters(0);
    setCurrentSpeedKmh(0);
    setSimStatus('IDLE');

    const startPt = activeRoute.waypoints[0];
    const initialHeading =
      activeRoute.waypoints.length > 1
        ? calculateBearing(
            startPt.lat,
            startPt.lng,
            activeRoute.waypoints[1].lat,
            activeRoute.waypoints[1].lng
          )
        : 0;

    setHeadingDegrees(initialHeading);

    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng([startPt.lat, startPt.lng]);
      vehicleMarkerRef.current.setIcon(createMotorcycleIcon(initialHeading));
    }

    if (traveledPolylineRef.current) {
      traveledPolylineRef.current.setLatLngs([]);
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([startPt.lat, startPt.lng], 15, { animate: true });
    }
  };

  const handleSpeedChange = (mult: number) => {
    setSpeedMultiplier(mult);
  };

  const handleToggleFollow = () => {
    setIsFollowVehicle((prev) => !prev);
  };

  // 4. LIVE GPS REAL INTEGRATION (ISOLATED FROM SIMULATION)
  const handleRequestLiveGps = async () => {
    setIsGpsLoading(true);
    setGpsError(null);

    if (typeof window === 'undefined' || !navigator || !navigator.geolocation) {
      setGpsError('Perangkat Anda tidak mendukung Geolocation API.');
      setIsGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        let revAddress = `Lokasi GPS (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
        try {
          const detail = await detailKoordinatKeAlamat(latitude, longitude);
          revAddress = detail.fullAddress;
        } catch {
          // Fallback reverse geocoding
        }

        setGpsLocation({
          lat: latitude,
          lng: longitude,
          accuracy,
          address: revAddress,
        });
        setIsGpsLoading(false);

        const map = mapInstanceRef.current;
        if (!map) return;

        // Clear existing GPS markers
        if (gpsMarkerRef.current) map.removeLayer(gpsMarkerRef.current);
        if (gpsCircleRef.current) map.removeLayer(gpsCircleRef.current);

        // Pulsing Blue GPS Marker
        const gpsIcon = L.divIcon({
          className: 'kawai-gps-user-marker',
          html: `
            <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background: rgba(47, 128, 237, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="width: 16px; height: 16px; background: #2F80ED; border: 3px solid #FFFFFF; border-radius: 9999px; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const gMarker = L.marker([latitude, longitude], { icon: gpsIcon }).addTo(map);
        gMarker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #17211B;">
            <strong style="color: #2F80ED;">📍 Posisi GPS Aktual Perangkat</strong><br/>
            <span>${revAddress}</span><br/>
            <span style="font-size: 10px; color: #66736B;">Akurasi: ±${Math.round(accuracy)} meter</span>
          </div>
        `);
        gpsMarkerRef.current = gMarker;

        // Accuracy circle
        const circle = L.circle([latitude, longitude], {
          radius: accuracy,
          color: '#2F80ED',
          fillColor: '#2F80ED',
          fillOpacity: 0.12,
          weight: 1.5,
        }).addTo(map);
        gpsCircleRef.current = circle;

        // Pan map smoothly to user location
        map.flyTo([latitude, longitude], 16, { animate: true, duration: 1.2 });
      },
      (err) => {
        setIsGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Izin akses lokasi ditolak oleh pengguna pada browser.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsError('Sinyal GPS tidak tersedia saat ini.');
        } else if (err.code === err.TIMEOUT) {
          setGpsError('Permintaan lokasi GPS melebihi batas waktu (timeout).');
        } else {
          setGpsError('Gagal mendeteksi lokasi GPS perangkat.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000,
      }
    );
  };

  const handleRetryTileLayer = () => {
    setIsTileError(false);
    if (tileLayerRef.current && mapInstanceRef.current) {
      tileLayerRef.current.redraw();
    }
  };

  return (
    <div className="relative w-full h-[620px] sm:h-[720px] bg-[#F0F5F2] rounded-3xl overflow-hidden border border-[#E4ECE7] shadow-lg flex flex-col font-sans select-none">
      {/* 1. TOP FLOATING BRAND & MODE BAR */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Brand & Mode Selector Pill */}
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-md border border-[#E4ECE7] flex items-center gap-2 pointer-events-auto">
          <div className="w-6 h-6 rounded-lg bg-[#18B86A] flex items-center justify-center text-white font-black text-[10px]">
            0511
          </div>
          <div>
            <span className="font-extrabold text-xs text-[#17211B] flex items-center gap-1">
              KAWAI 0511 <span className="text-[#18B86A]">Live Map</span>
            </span>
          </div>

          <div className="h-4 w-[1px] bg-[#E4ECE7] mx-1"></div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center bg-[#F0F5F2] p-0.5 rounded-lg text-[11px] font-semibold">
            <button
              onClick={() => setActiveMode('SIMULATION_MODE')}
              className={`px-2 py-1 rounded-md transition ${
                activeMode === 'SIMULATION_MODE'
                  ? 'bg-[#18B86A] text-white shadow-xs'
                  : 'text-[#66736B] hover:text-[#17211B]'
              }`}
            >
              Simulasi Rute
            </button>
            <button
              onClick={() => setActiveMode('LIVE_GPS_MODE')}
              className={`px-2 py-1 rounded-md transition flex items-center gap-1 ${
                activeMode === 'LIVE_GPS_MODE'
                  ? 'bg-[#2F80ED] text-white shadow-xs'
                  : 'text-[#66736B] hover:text-[#17211B]'
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>Live GPS Fisik</span>
            </button>
          </div>
        </div>

        {/* Right: Close or Status Indicator Badge */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="hidden sm:flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-[#E4ECE7] text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                activeMode === 'SIMULATION_MODE'
                  ? simStatus === 'RUNNING'
                    ? 'bg-[#18B86A] animate-pulse'
                    : 'bg-[#F5A623]'
                  : gpsLocation
                  ? 'bg-[#2F80ED] animate-pulse'
                  : 'bg-[#66736B]'
              }`}
            ></span>
            <span className="font-bold text-[#17211B]">
              {activeMode === 'SIMULATION_MODE'
                ? `SIMULASI: ${simStatus}`
                : gpsLocation
                ? 'GPS TERDETEKSI'
                : 'GPS STANDBY'}
            </span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="bg-white/95 hover:bg-white text-[#66736B] hover:text-[#17211B] px-2.5 py-1.5 rounded-xl shadow-md border border-[#E4ECE7] text-xs font-bold transition cursor-pointer"
            >
              Tutup
            </button>
          )}
        </div>
      </div>

      {/* 2. TILE ERROR WARNING BANNER */}
      {isTileError && (
        <div className="absolute top-16 left-3 right-3 z-[1000] bg-[#FFF8EB] border border-[#F5A623]/40 rounded-xl p-2.5 shadow-md flex items-center justify-between gap-2 text-xs text-[#7A4B00]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#F5A623] shrink-0" />
            <span>
              <strong>Perhatian:</strong> Beberapa tile OpenStreetMap gagal dimuat ({tileErrorCount} kegagalan).
              Jalur vektor simulasi lokal tetap beroperasi normal.
            </span>
          </div>
          <button
            onClick={handleRetryTileLayer}
            className="flex items-center gap-1 bg-[#F5A623] hover:bg-[#D98200] text-white px-2 py-1 rounded-lg font-bold text-[11px] transition shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Coba Lagi</span>
          </button>
        </div>
      )}

      {/* 3. LEAFLET MAP ELEMENT CONTAINER */}
      <div ref={mapContainerRef} className="w-full flex-1 z-0" />

      {/* 4. FLOATING ACTION TOOLS (Follow vehicle & Center route) */}
      <div className="absolute right-3 top-20 z-[999] flex flex-col gap-2">
        {activeMode === 'SIMULATION_MODE' && (
          <button
            onClick={handleToggleFollow}
            title={isFollowVehicle ? 'Nonaktifkan Kamera Mengikuti' : 'Aktifkan Kamera Mengikuti Motor'}
            className={`p-2.5 rounded-xl shadow-md border backdrop-blur-md transition flex items-center justify-center cursor-pointer ${
              isFollowVehicle
                ? 'bg-[#18B86A] text-white border-[#0E8F52]'
                : 'bg-white/95 text-[#66736B] border-[#E4ECE7] hover:text-[#17211B]'
            }`}
          >
            <Crosshair className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => {
            if (mapInstanceRef.current && routePolylineRef.current) {
              mapInstanceRef.current.fitBounds(routePolylineRef.current.getBounds(), {
                padding: [40, 40],
              });
            }
          }}
          title="Fokus Seluruh Rute"
          className="p-2.5 rounded-xl shadow-md border bg-white/95 text-[#66736B] border-[#E4ECE7] hover:text-[#17211B] backdrop-blur-md transition flex items-center justify-center cursor-pointer"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* 5. COLLAPSIBLE BOTTOM CONTROLS DOCK (KAWAI 0511 STYLE) */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md border border-[#E4ECE7] rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
          {/* Header Bar of Dock */}
          <div className="px-3.5 py-2.5 bg-[#F7FAF8] border-b border-[#E4ECE7] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#18B86A]"></span>
              <span className="font-extrabold text-xs text-[#17211B]">
                {activeMode === 'SIMULATION_MODE'
                  ? 'Panel Kontrol Simulasi KAWAI'
                  : 'Panel Live GPS Perangkat'}
              </span>
              <span className="text-[10px] text-[#66736B] bg-white border border-[#E4ECE7] px-1.5 py-0.5 rounded font-mono">
                {activeMode === 'SIMULATION_MODE'
                  ? `Koordinat: ${activeRoute.waypoints[0].name.split(' ')[0]}`
                  : 'HTML5 Geolocation'}
              </span>
            </div>

            <button
              onClick={() => setIsPanelCollapsed((prev) => !prev)}
              className="text-[#66736B] hover:text-[#17211B] p-1 rounded-lg hover:bg-[#E4ECE7]/50 transition flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
            >
              <span>{isPanelCollapsed ? 'Buka Panel' : 'Sembunyikan'}</span>
              {isPanelCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Expanded Dock Body */}
          {!isPanelCollapsed && (
            <div className="p-3.5 space-y-3">
              {/* === TAB 1: SIMULATION MODE CONTROLS === */}
              {activeMode === 'SIMULATION_MODE' && (
                <>
                  {/* Row 1: Route selection & Speed Multiplier */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-[#66736B] uppercase tracking-wider block mb-1">
                        Pilihan Rute Simulasi Banjarmasin
                      </label>
                      <select
                        value={selectedRouteId}
                        onChange={(e) => {
                          setSelectedRouteId(e.target.value);
                          handleReset();
                        }}
                        disabled={simStatus === 'RUNNING'}
                        className="w-full bg-[#F0F5F2] border border-[#D7E2DB] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#17211B] focus:outline-none focus:border-[#18B86A] transition disabled:opacity-50"
                      >
                        {BANJARMASIN_ROUTES.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.distanceKm} km)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Speed Multipliers */}
                    <div>
                      <label className="text-[10px] font-bold text-[#66736B] uppercase tracking-wider block mb-1">
                        Kecepatan Simulasi
                      </label>
                      <div className="flex items-center bg-[#F0F5F2] p-1 rounded-xl border border-[#D7E2DB] gap-1">
                        {[1, 2, 4].map((mult) => (
                          <button
                            key={mult}
                            onClick={() => handleSpeedChange(mult)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                              speedMultiplier === mult
                                ? 'bg-[#18B86A] text-white shadow-xs'
                                : 'text-[#66736B] hover:text-[#17211B] hover:bg-white'
                            }`}
                          >
                            {mult}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Live Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#F7FAF8] p-2.5 rounded-xl border border-[#E4ECE7]">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#66736B]">Status</span>
                      <span
                        className={`text-xs font-extrabold ${
                          simStatus === 'RUNNING'
                            ? 'text-[#18B86A]'
                            : simStatus === 'COMPLETED'
                            ? 'text-[#0E8F52]'
                            : 'text-[#F5A623]'
                        }`}
                      >
                        {simStatus}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#66736B]">Jarak Tempuh</span>
                      <span className="text-xs font-extrabold text-[#17211B]">
                        {(distanceTraveledMeters / 1000).toFixed(2)} / {(totalRouteMeters / 1000).toFixed(2)} km
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#66736B]">Kecepatan</span>
                      <span className="text-xs font-extrabold text-[#17211B]">
                        {currentSpeedKmh} km/jam
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#66736B]">Perkiraan Sisa Waktu</span>
                      <span className="text-xs font-extrabold text-[#0E8F52]">
                        {simStatus === 'COMPLETED'
                          ? 'Selesai'
                          : remainingMinutes > 0
                          ? `~${remainingMinutes} Menit`
                          : '< 1 Menit'}
                      </span>
                    </div>
                  </div>

                  {/* Row 3: Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {simStatus === 'IDLE' && (
                      <button
                        onClick={handleStart}
                        className="flex-1 bg-[#18B86A] hover:bg-[#0E8F52] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>MULAI SIMULASI</span>
                      </button>
                    )}

                    {simStatus === 'RUNNING' && (
                      <button
                        onClick={handlePause}
                        className="flex-1 bg-[#F5A623] hover:bg-[#D98200] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Pause className="w-4 h-4 fill-white" />
                        <span>JEDA</span>
                      </button>
                    )}

                    {simStatus === 'PAUSED' && (
                      <button
                        onClick={handleResume}
                        className="flex-1 bg-[#18B86A] hover:bg-[#0E8F52] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>LANJUTKAN</span>
                      </button>
                    )}

                    {simStatus === 'COMPLETED' && (
                      <button
                        onClick={handleStart}
                        className="flex-1 bg-[#18B86A] hover:bg-[#0E8F52] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>ULANGI SIMULASI</span>
                      </button>
                    )}

                    <button
                      onClick={handleReset}
                      className="bg-[#F0F5F2] hover:bg-[#E4ECE7] text-[#17211B] border border-[#D7E2DB] px-3.5 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>RESET</span>
                    </button>

                    <button
                      onClick={handleToggleFollow}
                      className={`px-3 py-2.5 rounded-xl font-bold text-xs border transition flex items-center gap-1.5 cursor-pointer ${
                        isFollowVehicle
                          ? 'bg-[#DDF8EA] text-[#0E8F52] border-[#18B86A]/40'
                          : 'bg-[#F0F5F2] text-[#66736B] border-[#D7E2DB]'
                      }`}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>IKUTI KENDARAAN: {isFollowVehicle ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>

                  {/* Safety & Isolation Disclaimer */}
                  <div className="text-[10px] text-[#66736B] flex items-center justify-between pt-1 border-t border-[#E4ECE7]">
                    <span>
                      ⚠️ <strong>Mode Simulasi:</strong> Posisi motor didasarkan pada perhitungan koordinat rute uji coba Kota Banjarmasin dan bukan GPS nyata.
                    </span>
                    <span className="font-mono text-[#0E8F52]">Heading: {headingDegrees}°</span>
                  </div>
                </>
              )}

              {/* === TAB 2: LIVE GPS PHYSICAL DEVICE MODE === */}
              {activeMode === 'LIVE_GPS_MODE' && (
                <div className="space-y-3">
                  <div className="p-3 bg-[#EBF3FD] border border-[#2F80ED]/30 rounded-xl flex items-start gap-2.5 text-xs text-[#1D5EAA]">
                    <Radio className="w-4 h-4 text-[#2F80ED] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[#17211B]">Mode GPS Nyata Perangkat:</strong>
                      <span>
                        Hanya menggunakan API Geolocation HTML5 resmi browser dengan persetujuan Anda.
                        Lokasi fisik Anda <strong>tidak pernah disimpan atau dikirim ke server</strong>.
                      </span>
                    </div>
                  </div>

                  {gpsError && (
                    <div className="p-2.5 bg-[#FEF2F2] border border-[#E5484D]/30 rounded-xl flex items-center gap-2 text-xs text-[#E5484D]">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{gpsError}</span>
                    </div>
                  )}

                  {gpsLocation && (
                    <div className="bg-[#F7FAF8] p-3 rounded-xl border border-[#E4ECE7] space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#17211B] flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#2F80ED]" />
                          <span>Lokasi Terdeteksi</span>
                        </span>
                        <span className="text-[10px] text-[#66736B] font-mono">
                          ±{Math.round(gpsLocation.accuracy || 0)}m Akurasi
                        </span>
                      </div>
                      <p className="text-[#66736B] text-[11px] leading-relaxed">{gpsLocation.address}</p>
                      <p className="text-[10px] font-mono text-[#A8B2AC]">
                        Lat: {gpsLocation.lat.toFixed(6)}, Lng: {gpsLocation.lng.toFixed(6)}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRequestLiveGps}
                      disabled={isGpsLoading}
                      className="flex-1 bg-[#2F80ED] hover:bg-[#1C68D0] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <LocateFixed className={`w-4 h-4 ${isGpsLoading ? 'animate-spin' : ''}`} />
                      <span>{isGpsLoading ? 'Meminta Izin Lokasi...' : 'Gunakan Lokasi Saya'}</span>
                    </button>

                    <button
                      onClick={() => setActiveMode('SIMULATION_MODE')}
                      className="bg-[#F0F5F2] hover:bg-[#E4ECE7] text-[#17211B] border border-[#D7E2DB] px-3.5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
                    >
                      Kembali ke Simulasi
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
