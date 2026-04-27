'use client';

import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import type { ScheduleNode } from '@/types';
import { getImageUrl } from '@/lib/api';
import { MapPin, Calendar } from 'lucide-react';

const createCustomIcon = (index: number) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: #0ea5e9;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${index + 1}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

interface DiaryMapProps {
  nodes: ScheduleNode[];
}

export default function DiaryMap({ nodes }: DiaryMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const validNodes = useMemo(() => {
    return nodes.filter((node) => node.latitude !== null && node.longitude !== null);
  }, [nodes]);

  const positions = useMemo(() => {
    return validNodes.map((node) => [node.latitude!, node.longitude!] as [number, number]);
  }, [validNodes]);

  const mapCenter = useMemo(() => {
    if (validNodes.length === 0) return [35.8617, 104.1954] as [number, number];
    
    const lats = validNodes.map((n) => n.latitude!);
    const lngs = validNodes.map((n) => n.longitude!);
    const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
    
    return [centerLat, centerLng] as [number, number];
  }, [validNodes]);

  const zoom = useMemo(() => {
    if (validNodes.length <= 1) return 12;
    if (validNodes.length <= 3) return 10;
    return 8;
  }, [validNodes]);

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-xl">
        <MapPin className="w-8 h-8 text-primary-600 animate-pulse" />
      </div>
    );
  }

  if (validNodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-xl">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">该日记没有地理位置数据</p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {positions.length > 1 && (
        <Polyline
          positions={positions}
          color="#0ea5e9"
          weight={4}
          opacity={0.8}
          smoothFactor={1}
        />
      )}
      
      {validNodes.map((node, index) => (
        <Marker
          key={node.id}
          position={[node.latitude!, node.longitude!]}
          icon={createCustomIcon(index)}
        >
          <Popup>
            <div className="min-w-48">
              <div className="font-semibold text-gray-900 mb-2">
                {index + 1}. {node.location_name}
              </div>
              
              {node.node_date && (
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <Calendar className="w-3.5 h-3.5 mr-1" />
                  {node.node_date}
                </div>
              )}
              
              {node.description && (
                <div className="text-sm text-gray-600 mb-3 line-clamp-3">
                  {node.description.length > 100 
                    ? node.description.substring(0, 100) + '...' 
                    : node.description}
                </div>
              )}
              
              {node.images && node.images.length > 0 && (
                <div className="flex gap-1 overflow-x-auto pb-2">
                  {node.images.slice(0, 3).map((img) => (
                    <img
                      key={img.id}
                      src={getImageUrl(img.image_url)}
                      alt={node.location_name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ))}
                  {node.images.length > 3 && (
                    <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-sm text-gray-500">
                      +{node.images.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
