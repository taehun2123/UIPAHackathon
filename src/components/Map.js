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
  const encoded =
    typeof window !== "undefined"
      ? window.btoa(svgStr)
      : Buffer.from(svgStr).toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
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

// 범례 컴포넌트 수정
const MapLegend = ({ colors, showCircles }) => (
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
        <svg width="16" height="20" viewBox="0 0 30 40">
          <path
            d="M15 0C6.716 0 0 6.716 0 15c0 9 15 25 15 25s15-16 15-25c0-8.284-6.716-15-15-15z"
            fill={colors.primary}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <circle cx="15" cy="15" r="4.5" fill="white" />
        </svg>
        <span className="text-xs text-dark">가까운 공영 주차장</span>
      </div>
      {showCircles && (
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
      )}
    </div>
  </div>
);

// ParkingLotPopup 컴포넌트 수정
const ParkingLotPopup = ({
  parkingLot,
  type,
  nearestPublicParkings,
  lines,
  publicParkings,
}) => {
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
        {parkingLot.address && <p>이름: {parkingLot.address}</p>}
        {parkingLot.district && <p>지역구: {parkingLot.district}</p>}
        <p>
          위치: {location.lat}, {location.lng}
        </p>
      </div>

      {/* 최적입지일 경우에만 추가 메시지 표시 */}
      {type === "optimal" && (
        <div className="mt-2 p-2 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-600">
            {/* 현재 최적 입지와 연결된 선분 찾기 */}
            {(() => {
              const connectedLine = lines.find(
                (line) =>
                  line.start.lat === parkingLot.location.lat &&
                  line.start.lng === parkingLot.location.lng
              );

              if (!connectedLine) return "해당 입지 근처에 새로운 공영주차장 개발 방안이 필요합니다!";

              // 선분의 끝점과 연결된 가까운 공영주차장 찾기
              const nearestParking = nearestPublicParkings.find(
                (parking) =>
                  parking.location.lat === connectedLine.end.lat &&
                  parking.location.lng === connectedLine.end.lng
              );

              const publicParking = publicParkings.find(
                (parking) =>
                  parking.lat === nearestParking.location.lat &&
                  parking.lng === nearestParking.location.lng
              );
            

              if (!nearestParking) return "해당 입지 근처에 새로운 공영주차장 개발 방안이 필요합니다!";

              return nearestParking.distance <= 600
                ? `${publicParking.address ? publicParking.address : ""} 공영주차장의 확장 및 홍보 방안이 필요합니다!`
                : "해당 입지 근처에 새로운 공영주차장 개발 방안이 필요합니다!";
            })()}
          </p>
        </div>
      )}
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
  showCircles,
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

        {/* 선분 */}
        {lines &&
          lines.map((line, index) => (
            <Polyline
              key={`line_${index}`}
              positions={[
                [line.start.lat, line.start.lng],
                [line.end.lat, line.end.lng],
              ]}
              pathOptions={line.style}
            />
          ))}

        {/* 원형 - showCircles 상태에 따라 조건부 렌더링 */}
        {showCircles &&
          circles &&
          circles.map((circle) => (
            <Circle
              key={circle.id}
              center={[circle.lat, circle.lng]}
              radius={circle.radius}
              pathOptions={{
                color: circle.color,
                fillColor: circle.color,
                fillOpacity: circle.fillOpacity,
                weight: circle.strokeWeight,
                opacity: circle.strokeOpacity,
              }}
            >
              <Popup>
                <div className="text-sm">
                  이 지역의 불법 주정차 단속 빈도가 높습니다
                </div>
              </Popup>
            </Circle>
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
              <ParkingLotPopup
                parkingLot={location}
                type="optimal"
                nearestPublicParkings={nearestPublicParkings}
                lines={lines}
                publicParkings={publicParkings}
              />
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

        <MapLegend colors={colors} showCircles={showCircles} />
      </MapContainer>
    </div>
  );
}
