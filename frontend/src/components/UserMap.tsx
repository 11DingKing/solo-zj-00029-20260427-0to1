'use client';

import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

interface VisitedCity {
  count: number;
  latitude: number | null;
  longitude: number | null;
}

interface UserMapProps {
  visitedCities: Record<string, VisitedCity>;
}

const CITY_COLORS = [
  '#0ea5e9',
  '#f97316',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#14b8a6',
  '#84cc16',
  '#e11d48',
  '#6366f1',
];

const getColorByCount = (count: number, maxCount: number): string => {
  const ratio = Math.min(count / Math.max(maxCount, 1), 1);
  const index = Math.floor(ratio * (CITY_COLORS.length - 1));
  return CITY_COLORS[index];
};

const createCustomIcon = (city: string, count: number, color: string) => {
  return L.divIcon({
    className: 'custom-city-marker',
    html: `<div style="
      background: ${color};
      color: white;
      min-width: 40px;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-align: center;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      border: 2px solid white;
    ">
      <div>${city}</div>
      <div style="font-size: 10px; opacity: 0.9;">${count}次</div>
    </div>`,
    iconSize: [80, 40],
    iconAnchor: [40, 20],
    popupAnchor: [0, -20],
  });
};

export default function UserMap({ visitedCities }: UserMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { validCities, maxCount, center, bounds } = useMemo(() => {
    const cities = Object.entries(visitedCities).filter(
      ([_, info]) => info.latitude !== null && info.longitude !== null
    );

    if (cities.length === 0) {
      return {
        validCities: [],
        maxCount: 0,
        center: [35.8617, 104.1954] as [number, number],
        bounds: null,
      };
    }

    let maxCount = 0;
    const lats: number[] = [];
    const lngs: number[] = [];

    cities.forEach(([_, info]) => {
      if (info.count > maxCount) maxCount = info.count;
      lats.push(info.latitude!);
      lngs.push(info.longitude!);
    });

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    return {
      validCities: cities,
      maxCount,
      center: [centerLat, centerLng] as [number, number],
      bounds: {
        minLat,
        maxLat,
        minLng,
        maxLng,
      },
    };
  }, [visitedCities]);

  const zoom = useMemo(() => {
    if (validCities.length === 0) return 4;
    if (validCities.length === 1) return 10;

    if (!bounds) return 4;

    const latDiff = bounds.maxLat - bounds.minLat;
    const lngDiff = bounds.maxLng - bounds.minLng;

    if (latDiff > 30 || lngDiff > 60) return 4;
    if (latDiff > 15 || lngDiff > 30) return 5;
    if (latDiff > 8 || lngDiff > 15) return 6;
    if (latDiff > 4 || lngDiff > 8) return 7;
    return 9;
  }, [validCities, bounds]);

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-xl">
        <MapPin className="w-8 h-8 text-primary-600 animate-pulse" />
      </div>
    );
  }

  if (validCities.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-xl">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">该用户没有地理位置数据</p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {validCities.map(([city, info], index) => {
        const color = getColorByCount(info.count, maxCount);
        const radius = Math.max(15, Math.min(50, info.count * 5 + 15));

        return (
          <div key={city}>
            <Circle
              center={[info.latitude!, info.longitude!]}
              radius={radius * 1000}
              fillColor={color}
              fillOpacity={0.3}
              color={color}
              weight={2}
              opacity={0.6}
            />
            <Marker
              position={[info.latitude!, info.longitude!]}
              icon={createCustomIcon(city, info.count, color)}
            >
              <Popup>
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900">{city}</h4>
                  <p className="text-sm text-gray-600">去过 {info.count} 次</p>
                </div>
              </Popup>
            </Marker>
          </div>
        );
      })}
    </MapContainer>
  );
}
