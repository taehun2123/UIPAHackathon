// src/app/page.js
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const DISTRICTS = ['중구', '남구', '동구', '북구', '울주군'];
const ULSAN_CENTER = [35.5383, 129.3111];

export const COLORS = {
  primary: '#2B83F6',     // 주요 액센트 색상
  optimal: '#8B5CF6',     // 최적 위치 색상
  public: '#14B8A6',      // 공영 주차장 색상
  private: '#FF4444'      // 민간 주차장 색상
};

const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-white flex items-center justify-center text-primary">
      지도 로딩중...
    </div>
  )
});

// 최적 위치 데이터 로드
const generateOptimalLocations = async () => {
  try {
    const response = await fetch('/parking_candidates.json');
    if (!response.ok) {
      throw new Error('Failed to fetch parking candidates');
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading optimal locations:', error);
    return [];
  }
};

// 기존 공영주차장 데이터 생성 (임시)
const generatePublicParkings = () => {
  return Array(10).fill().map((_, i) => ({
    id: `public_${i}`,
    district: DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)],
    location: {
      lat: 35.53 + (Math.random() * 0.1),
      lng: 129.31 + (Math.random() * 0.1)
    },
    address: `울산시 기존 공영주차장 ${i + 1}`
  }));
};

// 민간주차장 데이터 생성 (임시)
const generatePrivateParkings = () => {
  let id = 1;
  const data = [];
  
  DISTRICTS.forEach(district => {
    for (let i = 0; i < 10; i++) {
      data.push({
        id: `private_${id++}`,
        district,
        location: {
          lat: 35.53 + (Math.random() * 0.1),
          lng: 129.31 + (Math.random() * 0.1)
        },
        address: `울산시 ${district} 민간주차장 ${i + 1}`
      });
    }
  });
  
  return data;
};

const ParkingLotCard = ({ parkingLot, onSelect, type }) => (
  <div 
    className={`p-3 bg-white border rounded-lg hover:bg-light transition-colors duration-200 cursor-pointer shadow-sm ${
      type === 'optimal' ? 'border-optimal/30' : 'border-private/30'
    }`}
    onClick={() => onSelect(parkingLot.id)}
  >
    <div className="flex items-start justify-between">
      <p className="font-medium text-dark">{parkingLot.address}</p>
      <span className={`text-xs px-2 py-1 rounded-full ${
        type === 'optimal' ? 'bg-optimal/10 text-optimal text-dark/60' : 'bg-private/10 text-private text-dark/60'
      }`}>
        {type === 'optimal' ? '예측 입지' : '민간 주차장'}
      </span>
    </div>
    <p className="text-sm text-dark/80 mt-1">지역구: {parkingLot.district}</p>
  </div>
);


export default function Home() {
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [optimalLocations, setOptimalLocations] = useState([]);
  const [publicParkings, setPublicParkings] = useState([]);
  const [privateParkings, setPrivateParkings] = useState([]);
  const [selectedParkingLot, setSelectedParkingLot] = useState(null);

  useEffect(() => {
    const initializeData = async () => {
      const optimalData = await generateOptimalLocations();
      const publicData = generatePublicParkings();
      const privateData = generatePrivateParkings();
      
      setOptimalLocations(optimalData);
      setPublicParkings(publicData);
      setPrivateParkings(privateData);
    };

    initializeData();
  }, []);

  const filteredPrivateParkings = selectedDistrict === 'all'
    ? privateParkings
    : privateParkings.filter(item => item.district.includes(selectedDistrict));

  const filteredOptimalLocations = selectedDistrict === 'all'
    ? optimalLocations
    : optimalLocations.filter(item => item.district.includes(selectedDistrict));

    return (
      <div className="flex h-screen bg-white">
        <div className="w-80 border-r border-border p-4 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4 text-dark">공영주차장 최적 입지 분석</h2>
          
          <div className="mb-6">
            <select 
              className="w-full p-2 border border-border rounded bg-white text-dark focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
            >
              <option value="all">전체 지역구</option>
              {DISTRICTS.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>
    
          <div className="mb-6 bg-light border border-border p-4 rounded-lg">
            <h3 className="font-bold mb-2 text-dark">
              {selectedDistrict === 'all' ? '전체 통계' : `${selectedDistrict} 통계`}
            </h3>
            <div className="text-dark/80">
              <p>예측 입지 수: {filteredOptimalLocations.length}개</p>
              <p>민간 주차장 수: {filteredPrivateParkings.length}개</p>
            </div>
          </div>
    
          {/* 예측 입지 목록 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-dark">예측 입지 목록</h3>
              <span className="text-sm text-dark/60">{filteredOptimalLocations.length}개</span>
            </div>
            <div className="space-y-2">
              {filteredOptimalLocations.map(location => (
                <ParkingLotCard 
                  key={location.id} 
                  parkingLot={location}
                  onSelect={setSelectedParkingLot}
                  type="optimal"
                />
              ))}
            </div>
          </div>
    
          {/* 구분선 */}
          <div className="my-4 border-t border-border"></div>
    
          {/* 민간 주차장 목록 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-dark">민간 주차장 목록</h3>
              <span className="text-sm text-dark/60">{filteredPrivateParkings.length}개</span>
            </div>
            <div className="space-y-2">
              {filteredPrivateParkings.map(parking => (
                <ParkingLotCard 
                  key={parking.id} 
                  parkingLot={parking}
                  onSelect={setSelectedParkingLot}
                  type="private"
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
            privateParkings={filteredPrivateParkings}
            colors={COLORS}
            selectedParkingLot={selectedParkingLot}
          />
        </div>
      </div>
    );
}