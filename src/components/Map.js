// src/components/Map.js
"use client";

import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
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

// 민간주차장용 마커 아이콘 (원형)
const createPrivateIcon = (color) => {
  return L.icon({
    iconUrl:
      svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
     <circle cx="12" cy="12" r="10"
     fill="${color}" 
     stroke="#ffffff" 
     stroke-width="2"/>
   </svg>`),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const ParkingLotPopup = ({ parkingLot, type }) => (
  <div className="p-2">
    <h3 className="font-bold mb-2 text-dark">
      {type === "optimal" && "예측 최적 입지"}
      {type === "public" && "기존 공영주차장"}
      {type === "private" && "민간주차장"}
    </h3>
    <div className="text-sm text-dark/80">
      <p>주소: {parkingLot.address}</p>
      <p>지역구: {parkingLot.district}</p>
      <p>
        위치: {parkingLot.location.lat}, {parkingLot.location.lng}
      </p>
    </div>
  </div>
);

export default function Map({
  center,
  optimalLocations,
  publicParkings,
  privateParkings,
  colors,
  selectedParkingLot,
}) {
  const mapRef = useRef(null);
  const markerRefs = useRef({});

  // 선택된 주차장이 변경될 때 해당 마커의 팝업 열기
  useEffect(() => {
    if (selectedParkingLot && markerRefs.current[selectedParkingLot]) {
      markerRefs.current[selectedParkingLot].openPopup();

      // 선택된 주차장 찾기 (모든 타입에서 검색)
      const selected = [
        ...optimalLocations,
        ...publicParkings,
        ...privateParkings,
      ].find((lot) => lot.id === selectedParkingLot);

      if (selected && mapRef.current) {
        mapRef.current.setView(
          [selected.location.lat, selected.location.lng],
          15
        );
      }
    }
  }, [selectedParkingLot, optimalLocations, publicParkings, privateParkings]);

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
        {publicParkings.map((parking) => (
          <Marker
            key={parking.id}
            position={[parking.location.lat, parking.location.lng]}
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

        {/* 민간 주차장 마커 */}
        {privateParkings.map((parkingLot) => (
          <Marker
            key={parkingLot.id}
            position={[parkingLot.location.lat, parkingLot.location.lng]}
            icon={createPrivateIcon(colors.private)}
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
      </MapContainer>
    </div>
  );
}
