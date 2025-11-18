"use client";
import { HStack, Slider, SliderTrack, SliderFilledTrack, SliderThumb, Text, Box } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { useData } from './DataContext';
import { majoritySocialCategory } from '@/lib/analytics';
import { categoryPalette } from '@/lib/colors';

export default function Timeline({ year, onChange }: { year: number; onChange: (y:number)=>void }) {
  const { allData, country } = useData();
  const electionYears = useMemo(()=>{
    if (!country) return [] as number[];
    const years = (allData[country] || []).map(d=>d.year);
    // Remove duplicates (e.g., Ireland 1982 has two elections)
    return [...new Set(years)];
  },[allData, country]);
  
  const tickData = useMemo(()=>{
    if (!country) return new Map<number, { color: string; partyName?: string; percentage?: number }>();
    const m = new Map<number, { color: string; partyName?: string; percentage?: number }>();
    for (const y of electionYears) {
      const maj = majoritySocialCategory(allData, country, y);
      const color = maj.category ? categoryPalette[maj.category] || '#666' : '#666';
      m.set(y, { 
        color, 
        partyName: maj.partyName, 
        percentage: maj.percentage 
      });
    }
    return m;
  },[allData, country, electionYears]);

  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  return (
  <HStack pt={3} pb={1} px={0} border="2px solid" borderColor="black" bg="white" align="center" spacing={3}>
      <Text fontWeight="medium" pl={3} lineHeight={1}>1950</Text>
      <Box position="relative" flex={1} height="44px">
        {/* Clickable pin heads overlay - positioned above SVG */}
        {electionYears.map((y)=>{
          const t = (y-1950)/(2025-1950);
          const leftPercent = t * 100; // Match slider's exact positioning (0-100%)
          const data = tickData.get(y);
          const color = data?.color || '#666';
          return (
            <Box
              key={`pin-${y}`}
              position="absolute"
              left={`${leftPercent}%`}
              top="5px"
              width="8px"
              height="8px"
              borderRadius="50%"
              transform="translate(-50%, -50%)"
              cursor="pointer"
              onClick={(e) => {
                e.stopPropagation();
                onChange(y);
              }}
              onMouseEnter={() => setHoveredYear(y)}
              onMouseLeave={() => setHoveredYear(null)}
              zIndex={2}
            />
          );
        })}
        {/* Hover tooltip */}
        {hoveredYear !== null && (() => {
          const data = tickData.get(hoveredYear);
          return (
            <Box
              position="absolute"
              left={`${((hoveredYear-1950)/(2025-1950)) * 100}%`}
              top="-4px"
              transform="translate(-50%, -100%)"
              bg="black"
              color="white"
              px={3}
              py={3}
              borderRadius="4px"
              fontSize="sm"
              whiteSpace="nowrap"
              zIndex={3}
              pointerEvents="none"
            >
              <div style={{ fontWeight: 'bold' }}>{hoveredYear}</div>
              {data?.partyName && (
                <div style={{ fontSize: '0.85em', color: data.color }}>
                  {data.partyName}: {data.percentage?.toFixed(1)}%
                </div>
              )}
            </Box>
          );
        })()}
        {/* ticks - visual only */}
        <Box position="absolute" left={0} right={0} top={0} bottom={0} pointerEvents="none" zIndex={1}>
          <svg width="100%" height="100%" viewBox="0 0 1000 44" preserveAspectRatio="none">
            {electionYears.map((y,i)=>{
              const t = (y-1950)/(2025-1950);
              const x = t * 1000; // Match 0-100% positioning in viewBox coordinates
              const data = tickData.get(y);
              const color = data?.color || '#666';
              return (
                <g key={y}>
                  {/* Very short stem below track */}
                  <line x1={x} y1={5} x2={x} y2={22} stroke={color} strokeWidth={1} />
                  <circle cx={x} cy={5} r={4} fill={color} />
                </g>
              );
            })}
          </svg>
        </Box>
        <Slider aria-label='timeline' min={1950} max={2025} step={1} value={year} onChange={onChange} mt={4}>
          <SliderTrack bg='black'>
            <SliderFilledTrack bg='black' />
          </SliderTrack>
          <SliderThumb bg='transparent' boxSize='24px' _focus={{ boxShadow: 'none' }} _active={{ boxShadow: 'none' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" style={{ transform: 'translateY(7px)' }}>
              <path d="M12 4 L20 16 L4 16 Z" fill="black" />
            </svg>
          </SliderThumb>
        </Slider>
      </Box>
      <Text fontWeight="medium" pr={3} lineHeight={1}>2025</Text>
    </HStack>
  );
}
