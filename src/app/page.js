// src/app/page.js
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const DISTRICTS = ["중구", "남구", "동구", "북구", "울주군"];
const ULSAN_CENTER = [35.5383, 129.3111];

export const COLORS = {
  primary: "#2B83F6", // 주요 액센트 색상
  optimal: "#8B5CF6", // 최적 위치 색상
  public: "#14B8A6", // 공영 주차장 색상
  circle: "#FF0000", // 원형 표시 색상
};

const Map = dynamic(() => import("../components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-white flex items-center justify-center text-primary">
      지도 로딩중...
    </div>
  ),
});

const parseMapHtml = async () => {
  try {
    const response = await fetch("/predicted_parking_locations_by_sub.html");
    const html = await response.text();

    const optimalLocations = [];
    const nearestPublicParkings = [];
    const lines = [];
    const tempCircles = []; // 임시 원 데이터 저장

    // 선분(라인) 정보 추출 - 패턴 수정
    const linePattern =
      /var\s+poly_line_[^=]+=\s*L\.polyline\(\s*\[\s*\[\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*\]\s*,\s*\[\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*\]\s*\],\s*({[^}]+})/g;
    let lineMatch;
    while ((lineMatch = linePattern.exec(html)) !== null) {
      const [_, startLat, startLng, endLat, endLng, styleStr] = lineMatch;
      lines.push({
        id: `line_${lines.length + 1}`,
        start: {
          lat: parseFloat(startLat),
          lng: parseFloat(startLng),
        },
        end: {
          lat: parseFloat(endLat),
          lng: parseFloat(endLng),
        },
        style: {
          color: "#6B46C1", // 보라색을 더 진하게
          weight: 3.5, // 선 두께 증가
          opacity: 1, // 불투명도 증가
          dashArray: "10, 5", // 점선 패턴 추가
        },
      });
    }

    // 마커 정보 추출 - 패턴 및 구 정보 추출 수정
    const markerPattern =
      /var\s+marker_[^=]+=\s*L\.marker\(\s*\[\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*\][^>]*>([^<]*)<\/div>/g;
    let markerMatch;
    while ((markerMatch = markerPattern.exec(html)) !== null) {
      const [_, lat, lng, popupContent] = markerMatch;

      if (popupContent.includes("가장 가까운 기존 주차장")) {
        // 거리 정보 추출
        const distanceMatch = popupContent.match(/거리:\s*([\d.]+)m/);
        const distance = distanceMatch ? parseFloat(distanceMatch[1]) : null;

        nearestPublicParkings.push({
          id: `private_${nearestPublicParkings.length + 1}`,
          district: "", // 이전 마커의 구 정보를 활용해야 함
          location: {
            lat: parseFloat(lat),
            lng: parseFloat(lng),
          },
          address: popupContent.trim(),
          distance: distance,
        });
      } else {
        // 구 정보 추출 개선 (울주군 포함)
        const districtMatch = popupContent.match(/([가-힣]+(구|군))/);
        const district = districtMatch ? districtMatch[0] : "";

        // '클러스터'를 '예측입지'로 변경
        const modifiedAddress = popupContent.replace(/클러스터/g, "예측입지");

        optimalLocations.push({
          id: `optimal_${optimalLocations.length + 1}`,
          district: district,
          location: {
            lat: parseFloat(lat),
            lng: parseFloat(lng),
          },
          address: modifiedAddress,
        });

        // 이전에 추가된 가까운 주차장의 구 정보 업데이트
        if (nearestPublicParkings.length > 0) {
          nearestPublicParkings[nearestPublicParkings.length - 1].district =
            district;
        }
      }
    }

    // 불법 주정차 단속 위치 추출
    const circlePattern =
      /var\s+circle_marker_[^=]+=\s*L\.circleMarker\(\s*\[\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*\][^}]*"radius":\s*(\d+\.?\d*)[^}]*\}/g;
    let circleMatch;

    // 모든 원의 위치와 크기 수집
    while ((circleMatch = circlePattern.exec(html)) !== null) {
      const [_, lat, lng, radius] = circleMatch;
      tempCircles.push({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius: parseFloat(radius) * 50, // HTML의 radius 값을 50배로 scaling
        fillOpacity: 0.25, // 채우기 투명도 감소
        strokeOpacity: 0.8, // 테두리 투명도 설정
        strokeWeight: 1, // 테두리 두께 설정
      });
    }

    // 가까운 원들 병합
    const DISTANCE_THRESHOLD = 0.002; // 약 200m
    const mergedCircles = [];

    tempCircles.forEach((circle) => {
      let found = false;

      for (let existing of mergedCircles) {
        const distance = Math.sqrt(
          Math.pow(circle.lat - existing.lat, 2) +
            Math.pow(circle.lng - existing.lng, 2)
        );

        if (distance < DISTANCE_THRESHOLD) {
          // 위치를 radius 가중 평균으로 업데이트
          const totalRadius = existing.radius + circle.radius;
          existing.lat =
            (existing.lat * existing.radius + circle.lat * circle.radius) /
            totalRadius;
          existing.lng =
            (existing.lng * existing.radius + circle.lng * circle.radius) /
            totalRadius;
          existing.radius = totalRadius; // radius 합산
          found = true;
          break;
        }
      }

      if (!found) {
        mergedCircles.push({ ...circle });
      }
    });

    // 최종 circles 배열 생성
    const circles = mergedCircles.map((circle, index) => ({
      id: `circle_${index + 1}`,
      lat: circle.lat,
      lng: circle.lng,
      radius: circle.radius,
      fillOpacity: circle.fillOpacity || 0.25,
      strokeOpacity: circle.strokeOpacity || 0.8,
      strokeWeight: circle.strokeWeight || 1,
      color: "#FF0000", // 빨간색 유지
      weight: 1, // 테두리 두께
      fill: true, // 채우기 유지
    }));

    return {
      optimalLocations,
      nearestPublicParkings,
      circles,
      lines,
    };
  } catch (error) {
    console.error("Error parsing map HTML:", error);
    return {
      optimalLocations: [],
      nearestPublicParkings: [],
      circles: [],
      lines: [],
    };
  }
};

// 기존 공영주차장 데이터 로드
const generatePublicParkings = async () => {
  try {
    const response = await fetch("/parking-data.json");
    if (!response.ok) {
      throw new Error("Failed to fetch parking-public data");
    }
    return await response.json();
  } catch (error) {
    console.error("Error loading public parking data:", error);
    return [];
  }
};

  // ParkingLotCard 컴포넌트 수정
  const ParkingLotCard = ({ parkingLot, onSelect, type }) => (
    <div
      className={`p-3 bg-white border rounded-lg hover:bg-light transition-colors duration-200 cursor-pointer shadow-sm ${
        type === "optimal" ? "border-optimal/30" : "border-public/30"
      }`}
      onClick={() => onSelect(parkingLot.id)}
    >
      <div className="flex items-start justify-between">
        <p className="font-medium text-dark">{parkingLot.address}</p>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            type === "optimal"
              ? "bg-optimal/10 text-optimal text-dark/60"
              : "bg-public/10 text-public text-dark/60"
          }`}
        >
          {type === "optimal" ? "예측 입지" : "가까운 공영 주차장"}
        </span>
      </div>
      <p className="text-sm text-dark/80 mt-1">지역구: {parkingLot.district}</p>
    </div>
  );

export default function Home() {
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [optimalLocations, setOptimalLocations] = useState([]);
  const [publicParkings, setPublicParkings] = useState([]);
  const [nearestPublicParkings, setNearestPublicParkings] = useState([]);
  const [circles, setCircles] = useState([]);
  const [lines, setLines] = useState([]);
  const [selectedParkingLot, setSelectedParkingLot] = useState(null);
  const [showCircles, setShowCircles] = useState(true); // 원 표시 여부 상태 추가

  useEffect(() => {
    const initializeData = async () => {
      try {
        const [parsedData, publicData] = await Promise.all([
          parseMapHtml(),
          generatePublicParkings(),
        ]);

        setOptimalLocations(parsedData.optimalLocations);
        setNearestPublicParkings(parsedData.nearestPublicParkings);
        setCircles(parsedData.circles);
        setLines(parsedData.lines);
        setPublicParkings(publicData);
      } catch (error) {
        console.error("Error initializing data:", error);
      }
    };

    initializeData();
  }, []);


  const filteredNearestPublicParkings =
    selectedDistrict === "all"
      ? nearestPublicParkings
      : nearestPublicParkings.filter((item) =>
          item.district.includes(selectedDistrict)
        );

  const filteredOptimalLocations =
    selectedDistrict === "all"
      ? optimalLocations
      : optimalLocations.filter((item) =>
          item.district.includes(selectedDistrict)
        );

  // 선분 필터링 로직
  const filteredLines =
    selectedDistrict === "all"
      ? lines
      : lines.filter((line) => {
          // 선분의 시작점이 필터링된 최적 입지에 포함되는지 확인
          return filteredOptimalLocations.some(
            (location) =>
              Math.abs(location.location.lat - line.start.lat) < 0.0001 &&
              Math.abs(location.location.lng - line.start.lng) < 0.0001
          );
        });

  return (
    <div className="flex h-screen bg-white">
      <div className="w-80 border-r border-border p-4 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-dark">
          공영주차장 최적 입지 분석
        </h2>

        {/* 토글 버튼 추가 */}
        <div className="mb-4">
          <button
            className={`px-4 py-2 rounded-lg w-full ${
              showCircles
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-blue-500 text-white hover:bg-blue-400"
            } transition-colors duration-200`}
            onClick={() => setShowCircles(!showCircles)}
          >
            {showCircles ? "단속 지점 숨기기" : "단속 지점 표시"}
          </button>
        </div>

        <div className="mb-6">
          <select
            className="w-full p-2 border border-border rounded bg-white text-dark focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
          >
            <option value="all">전체 지역구</option>
            {DISTRICTS.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6 bg-light border border-border p-4 rounded-lg">
          <h3 className="font-bold mb-2 text-dark">
            {selectedDistrict === "all"
              ? "전체 통계"
              : `${selectedDistrict} 통계`}
          </h3>
          <div className="text-dark/80">
            <p>예측 입지 수: {filteredOptimalLocations.length}개</p>
            <p>
              가까운 공영 주차장 수: {filteredNearestPublicParkings.length}개
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-dark">예측 입지 목록</h3>
            <span className="text-sm text-dark/60">
              {filteredOptimalLocations.length}개
            </span>
          </div>
          <div className="space-y-2">
            {filteredOptimalLocations.map((location) => (
              <ParkingLotCard
                key={location.id}
                parkingLot={location}
                onSelect={setSelectedParkingLot}
                type="optimal"
              />
            ))}
          </div>
        </div>

        <div className="my-4 border-t border-border"></div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-dark">가까운 공영 주차장 목록</h3>
            <span className="text-sm text-dark/60">
              {filteredNearestPublicParkings.length}개
            </span>
          </div>
          <div className="space-y-2">
            {filteredNearestPublicParkings.map((parking) => (
              <ParkingLotCard
                key={parking.id}
                parkingLot={parking}
                onSelect={setSelectedParkingLot}
                type="public"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1">
        <Map
          center={ULSAN_CENTER}
          optimalLocations={filteredOptimalLocations}
          publicParkings={publicParkings}
          nearestPublicParkings={filteredNearestPublicParkings}
          circles={circles}
          colors={COLORS}
          lines={filteredLines}
          selectedParkingLot={selectedParkingLot}
          showCircles={showCircles}ㅌ
        />
      </div>
    </div>
  );
}
