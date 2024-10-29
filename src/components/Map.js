// src/components/Map.js
"use client";

import { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// SVG를 Base64로 인코딩하는 함수
function svgToDataUrl(svgStr) {
  try {
    const encoded = btoa(unescape(encodeURIComponent(svgStr)));
    return `data:image/svg+xml;base64,${encoded}`;
  } catch (e) {
    console.error("SVG encoding error:", e);
    return "";
  }
}

// 최적 입지용 마커 아이콘 (별 모양)
const createOptimalIcon = (color) => {
  return L.icon({
    iconUrl:
      svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M12 0L14.59 7.12L22 7.64L16.55 12.47L18.18 20L12 16.48L5.82 20L7.45 12.47L2 7.64L9.41 7.12L12 0Z"
    fill="${color}" 
    stroke="#ffffff" 
    stroke-width="1"/>
  </svg>`),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// 공영주차장용 마커 아이콘 (사각형)
const createPublicIcon = (color) => {
  return L.icon({
    iconUrl:
      svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <rect x="2" y="2" width="20" height="20" rx="4"
    fill="${color}" 
    stroke="#ffffff" 
    stroke-width="2"/>
  </svg>`),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// 가까운 공영 주차장용 마커 아이콘
const createPrivateIcon = (color) => {
  return L.icon({
    iconUrl:
      svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)" />
        </filter>
        <path d="M15 0C6.716 0 0 6.716 0 15c0 9 15 25 15 25s15-16 15-25c0-8.284-6.716-15-15-15z" 
          fill="#2B83F6"
          stroke="#ffffff"
          stroke-width="1.5"
          filter="url(#shadow)"
        />
        <circle cx="15" cy="15" r="4.5" fill="white"/>
      </svg>`),
    iconSize: [24, 32], // 전체 크기 줄임
    iconAnchor: [12, 32],
    popupAnchor: [0, -32],
  });
};

import React from "react";

const MapLegend = ({ colors }) => (
  <div className="absolute bottom-4 right-4 z-[1000] bg-white p-3 rounded-lg shadow-lg">
    <h4 className="text-sm font-bold mb-2 text-dark">범례</h4>
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path
            d="M12 0L14.59 7.12L22 7.64L16.55 12.47L18.18 20L12 16.48L5.82 20L7.45 12.47L2 7.64L9.41 7.12L12 0Z"
            fill={colors.optimal}
          />
        </svg>
        <span className="text-xs text-dark">예측 최적 입지</span>
      </div>
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24">
          <rect
            x="2"
            y="2"
            width="20"
            height="20"
            rx="4"
            fill={colors.public}
          />
        </svg>
        <span className="text-xs text-dark">기존 공영주차장</span>
      </div>
      <div className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
        >
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="1"
              stdDeviation="1"
              floodColor="rgba(0,0,0,0.3)"
            />
          </filter>
          <path
            d="M8 0C3.6 0 0 3.6 0 8c0 4.8 8 13.3 8 13.3S16 12.8 16 8c0-4.4-3.6-8-8-8z"
            fill="#2B83F6"
            stroke="#ffffff"
            strokeWidth="1"
            filter="url(#shadow)"
          />
          <circle cx="8" cy="8" r="2.5" fill="white" />
        </svg>
        <span className="text-xs text-dark">가까운 공영 주차장</span>
      </div>
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24">
          <line
            x1="2"
            y1="12"
            x2="22"
            y2="12"
            stroke="purple"
            strokeWidth="2"
            strokeDasharray="4,4"
          />
        </svg>
        <span className="text-xs text-dark">거리 연결선</span>
      </div>
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r="8"
            fill={colors.circle}
            fillOpacity="0.3"
            stroke={colors.circle}
          />
        </svg>
        <span className="text-xs text-dark">불법 주정차 단속 위치</span>
      </div>
    </div>
  </div>
);

const ParkingLotPopup = ({ parkingLot, type }) => {
  const getLocation = () => {
    if (type === "public") {
      return { lat: parkingLot.lat, lng: parkingLot.lng };
    }
    return parkingLot.location;
  };

  const location = getLocation();
  const distance = parkingLot.distance
    ? ` (거리: ${parkingLot.distance}m)`
    : "";

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-dark">
          {type === "optimal" && "예측 최적 입지"}
          {type === "public" && "기존 공영주차장"}
          {type === "private" && "가까운 공영 주차장"}
        </h3>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            type === "optimal"
              ? "bg-optimal/10 text-optimal"
              : type === "public"
              ? "bg-public/10 text-public"
              : "bg-private/10 text-private"
          }`}
        >
          {type === "optimal"
            ? "예측"
            : type === "public"
            ? "공영"
            : "가까운 공영"}
          {distance}
        </span>
      </div>
      <div className="text-sm text-dark/80">
        {parkingLot.address && <p>주소: {parkingLot.address}</p>}
        {parkingLot.district && <p>지역구: {parkingLot.district}</p>}
        <p>
          위치: {location.lat}, {location.lng}
        </p>
      </div>
    </div>
  );
};

export default function Map({
  center,
  optimalLocations,
  publicParkings,
  nearestPublicParkings,
  circles,
  lines,
  colors,
  selectedParkingLot,
}) {
  const mapRef = useRef(null);
  const markerRefs = useRef({});

  useEffect(() => {
    if (selectedParkingLot && markerRefs.current[selectedParkingLot]) {
      markerRefs.current[selectedParkingLot].openPopup();

      const selected = [
        ...optimalLocations,
        ...(Array.isArray(publicParkings) ? publicParkings : []),
        ...nearestPublicParkings,
      ].find((lot) => lot.id === selectedParkingLot);

      if (selected && mapRef.current) {
        const lat = selected.location ? selected.location.lat : selected.lat;
        const lng = selected.location ? selected.location.lng : selected.lng;
        mapRef.current.setView([lat, lng], 15);
      }
    }
  }, [
    selectedParkingLot,
    optimalLocations,
    publicParkings,
    nearestPublicParkings,
  ]);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={13}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {/* 선분 표시 */}
        {lines &&
          lines.map((line, index) => (
            <Polyline
              key={`line_${index}`}
              positions={[
                [line.start.lat, line.start.lng],
                [line.end.lat, line.end.lng],
              ]}
              pathOptions={{
                color: "purple",
                weight: 2.5,
                opacity: 0.8,
              }}
            />
          ))}

        {/* 빨간색 원형 */}
        {circles &&
          circles.map((circle) => (
            <Circle
              key={circle.id}
              center={[circle.lat, circle.lng]}
              radius={50}
              pathOptions={{
                color: colors.circle,
                fillColor: colors.circle,
                fillOpacity: 0.3,
              }}
            />
          ))}

        {/* 최적 입지 마커 */}
        {optimalLocations.map((location) => (
          <Marker
            key={location.id}
            position={[location.location.lat, location.location.lng]}
            icon={createOptimalIcon(colors.optimal)}
            ref={(ref) => {
              if (ref) {
                markerRefs.current[location.id] = ref;
              }
            }}
          >
            <Popup>
              <ParkingLotPopup parkingLot={location} type="optimal" />
            </Popup>
          </Marker>
        ))}

        {/* 기존 공영주차장 마커 */}
        {Array.isArray(publicParkings) &&
          publicParkings.map((parking) => (
            <Marker
              key={parking.id}
              position={[parking.lat, parking.lng]}
              icon={createPublicIcon(colors.public)}
              ref={(ref) => {
                if (ref) {
                  markerRefs.current[parking.id] = ref;
                }
              }}
            >
              <Popup>
                <ParkingLotPopup parkingLot={parking} type="public" />
              </Popup>
            </Marker>
          ))}

        {/* 가까운 공영 주차장 마커 */}
        {nearestPublicParkings.map((parkingLot) => (
          <Marker
            key={parkingLot.id}
            position={[parkingLot.location.lat, parkingLot.location.lng]}
            icon={createPrivateIcon(colors.public)}
            ref={(ref) => {
              if (ref) {
                markerRefs.current[parkingLot.id] = ref;
              }
            }}
          >
            <Popup>
              <ParkingLotPopup parkingLot={parkingLot} type="private" />
            </Popup>
          </Marker>
        ))}

        <MapLegend colors={colors} />
      </MapContainer>
    </div>
  );
}
