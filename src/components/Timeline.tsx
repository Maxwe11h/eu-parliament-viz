"use client";
import { HStack, Slider, SliderTrack, SliderFilledTrack, SliderThumb, Box, Heading } from '@chakra-ui/react';
import { useMemo, useRef, useState, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from './DataContext';
import { majoritySocialCategory } from '@/lib/analytics';
import { getGenderColor, getGenderYearDataForCountry } from '@/lib/gender';

export const TIMELINE_MIN_YEAR = 1950;
export const TIMELINE_MAX_YEAR = 2025;
const TIMELINE_SPAN = TIMELINE_MAX_YEAR - TIMELINE_MIN_YEAR;
const ALL_TIMELINE_YEARS = Array.from({ length: TIMELINE_MAX_YEAR - TIMELINE_MIN_YEAR + 1 }, (_, idx) => TIMELINE_MIN_YEAR + idx);
const getYearRatio = (value: number) => {
  if (TIMELINE_SPAN === 0) return 0;
  return (value - TIMELINE_MIN_YEAR) / TIMELINE_SPAN;
};

type TickHeightConfig = {
  decade: number;
  year: number;
};

type TimelineProps = {
  year: number;
  onChange: (y: number) => void;
  minTickYear?: number;
  showElectionPins?: boolean;
  borderless?: boolean;
  tickHeights?: TickHeightConfig;
};

const DEFAULT_TICK_HEIGHTS: TickHeightConfig = { decade: 9, year: 6 };

export default function Timeline({ year, onChange, minTickYear, showElectionPins = true, borderless = false, tickHeights = DEFAULT_TICK_HEIGHTS }: TimelineProps) {
  const { allData, genderData, country, dataView, categoryPalette } = useData();
  const electionYears = useMemo(()=>{
    if (!country) return [] as number[];
    if (dataView === 'gender') {
      const years = (genderData[country] || []).map(d=>d.year);
      return [...new Set(years)].filter((y)=> y >= TIMELINE_MIN_YEAR && y <= TIMELINE_MAX_YEAR).sort((a,b)=>a-b);
    }
    const years = (allData[country] || []).map(d=>d.year);
    // Remove duplicates (e.g., Ireland 1982 has two elections)
    return [...new Set(years)].filter((y)=> y >= TIMELINE_MIN_YEAR && y <= TIMELINE_MAX_YEAR);
  },[allData, genderData, country, dataView]);
  const activeElectionYears = showElectionPins ? electionYears : [];
  const clampedMinTickYear = useMemo(()=>{
    if (typeof minTickYear !== 'number') return TIMELINE_MIN_YEAR;
    if (Number.isNaN(minTickYear)) return TIMELINE_MIN_YEAR;
    return Math.min(TIMELINE_MAX_YEAR, Math.max(TIMELINE_MIN_YEAR, Math.round(minTickYear)));
  },[minTickYear]);
  const visibleElectionYears = useMemo(()=>{
    return activeElectionYears.filter((y)=> y >= clampedMinTickYear);
  },[activeElectionYears, clampedMinTickYear]);
  
  const tickData = useMemo(()=>{
    if (!country) return new Map<number, { color: string; partyName?: string; percentage?: number; collection?: 'Left'|'Centre'|'Right' }>();
    const m = new Map<number, { color: string; partyName?: string; percentage?: number; collection?: 'Left'|'Centre'|'Right' }>();
    if (dataView === 'gender') {
      for (const y of activeElectionYears) {
        const entry = getGenderYearDataForCountry(genderData, country, y);
        if (!entry) continue;
        m.set(y, {
          color: getGenderColor(entry.femalePct),
          partyName: 'Women',
          percentage: entry.femalePct
        });
      }
    } else {
      for (const y of activeElectionYears) {
        const maj = majoritySocialCategory(allData, country, y);
        const color = maj.category ? categoryPalette[maj.category] || '#666' : '#666';
        m.set(y, { 
          color, 
          partyName: maj.partyName, 
          percentage: maj.percentage,
          collection: (maj as any).collection
        });
      }
    }
    return m;
  },[allData, genderData, country, activeElectionYears, dataView, categoryPalette]);

  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  useEffect(()=>{
    if (hoveredYear !== null && hoveredYear < clampedMinTickYear) {
      setHoveredYear(null);
    }
  },[hoveredYear, clampedMinTickYear]);
  useEffect(()=>{
    if (!showElectionPins) setHoveredYear(null);
  },[showElectionPins]);
  const trackRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const sliderTrackRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<{ offsetLeft: number; width: number; offsetTop: number; height: number }>({ offsetLeft: 0, width: 0, offsetTop: 0, height: 0 });

  // Ensure we can portal into document.body after mount (avoids SSR mismatch)
  const [portalReady, setPortalReady] = useState(false);
  useEffect(()=>{ setPortalReady(true); },[]);

  // After tooltip mounts, we re-clamp using its actual width to prevent left overflow
  const [tooltipCenterOverride, setTooltipCenterOverride] = useState<number | null>(null);
  useLayoutEffect(()=>{
    if (!portalReady || hoveredYear === null) return;
    const trackRect = sliderTrackRef.current?.getBoundingClientRect();
    if (!trackRect) return;
    const t = getYearRatio(hoveredYear);
    const pinViewportX = trackRect.left + t * trackRect.width;
  const outerRect = outerRef.current?.getBoundingClientRect();
    const width = tooltipRef.current?.getBoundingClientRect().width;
    if (!width) return; // wait for next paint
    const half = width / 2;
    let center = pinViewportX;
    const inset = 8; // keep tooltip slightly inside timeline edges
    const leftEdge = outerRect ? outerRect.left + inset : 8;
    const rightEdge = outerRect ? outerRect.right - inset : (window.innerWidth || document.documentElement.clientWidth) - 8;
    const minCenter = leftEdge + half;
    const maxCenter = rightEdge - half;
    if (center < minCenter) center = minCenter;
    if (center > maxCenter) center = maxCenter;
    setTooltipCenterOverride(center);
  },[portalReady, hoveredYear]);

  // Recalculate on resize (viewport or track changes)
  useEffect(()=>{
    if (!portalReady || hoveredYear === null) return;
    const onResize = () => {
      setTooltipCenterOverride(null); // trigger recompute in layout effect chain
      // Defer measurement to next animation frame so tooltip can reflow
      requestAnimationFrame(()=>{
        const trackRect = sliderTrackRef.current?.getBoundingClientRect();
        if (!trackRect || !tooltipRef.current) return;
        const t = getYearRatio(hoveredYear);
        const pinViewportX = trackRect.left + t * trackRect.width;
        const outerRect = outerRef.current?.getBoundingClientRect();
        const width = tooltipRef.current.getBoundingClientRect().width;
        const half = width / 2;
        let center = pinViewportX;
        const inset = 8; // keep tooltip slightly inside timeline edges
        const leftEdge = outerRect ? outerRect.left + inset : 8;
        const rightEdge = outerRect ? outerRect.right - inset : (window.innerWidth || document.documentElement.clientWidth) - 8;
        const minCenter = leftEdge + half;
        const maxCenter = rightEdge - half;
        if (center < minCenter) center = minCenter;
        if (center > maxCenter) center = maxCenter;
        setTooltipCenterOverride(center);
      });
    };
    window.addEventListener('resize', onResize);
    return ()=> window.removeEventListener('resize', onResize);
  },[portalReady, hoveredYear]);

  useLayoutEffect(()=>{
    function measure(){
      const container = trackRef.current;
      const trackEl = sliderTrackRef.current;
      if (!container || !trackEl) return;
      const cr = container.getBoundingClientRect();
      const tr = trackEl.getBoundingClientRect();
      setMetrics({
        offsetLeft: tr.left - cr.left,
        width: tr.width,
        offsetTop: tr.top - cr.top,
        height: tr.height,
      });
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    if (sliderTrackRef.current) ro.observe(sliderTrackRef.current);
    window.addEventListener('resize', measure);
    return ()=>{ window.removeEventListener('resize', measure); ro.disconnect(); };
  },[]);

  const outerRef = useRef<HTMLDivElement>(null);
  const svgWidth = Math.max(metrics.width, 1);
  const decadeTickHalf = tickHeights.decade;
  const yearTickHalf = tickHeights.year;
  return (
  <HStack
    ref={outerRef}
    pt={2}
    pb={0}
    px={0}
    align="center"
    spacing={3}
    borderRadius={borderless ? 0 : '12px'}
    boxShadow={borderless ? 'none' : 'lg'}
    border={borderless ? 'none' : '2px solid'}
    borderColor={borderless ? 'transparent' : 'gray.900'}
    bg={borderless ? 'transparent' : 'white'}
    overflow="visible"
    style={{ height: '54px', width: '100%' }}
  >
    <Heading as="h6" size="xs" pl={3} lineHeight={1} display="inline-flex" alignItems="center" style={{ transform:'translateY(-4px)' }}>{TIMELINE_MIN_YEAR}</Heading>
  <Box position="relative" flex={1} height="38px" ref={trackRef}>
  {/* Clickable pin heads overlay - positioned above SVG and track */}
      {showElectionPins && visibleElectionYears.map((y)=>{
          const t = getYearRatio(y);
          const leftPx = metrics.offsetLeft + t * metrics.width;
          const dotTop = metrics.offsetTop + (metrics.height/2) - 18 + 5; // adjusted for shorter height
          const data = tickData.get(y);
          const color = data?.color || '#666';
          return (
            <Box
              key={`pin-${y}`}
              position="absolute"
              left={`${leftPx}px`}
              top={`${dotTop}px`}
              width="8px"
              height="8px"
              borderRadius="50%"
              bg={color}
              border="1px solid"
              borderColor="white"
              transform="translate(-50%, -50%)"
              cursor="pointer"
              onClick={(e) => {
                e.stopPropagation();
                onChange(y);
              }}
              onMouseEnter={() => { setHoveredYear(y); }}
              onMouseLeave={() => { setHoveredYear(null); }}
              zIndex={4}
            />
          );
        })}
        {/* Hover tooltip: portal to body so it layers above CountryPanel; clamp only on LEFT to avoid off-page */}
        {showElectionPins && portalReady && hoveredYear !== null && (() => {
          const data = tickData.get(hoveredYear);
          const trackRect = sliderTrackRef.current?.getBoundingClientRect();
          if (!trackRect) return null;
          const t = getYearRatio(hoveredYear);
          const pinViewportX = trackRect.left + t * trackRect.width;
          const pinViewportY = trackRect.top + (trackRect.height / 2) - 22 + 5; // replicate local pin top logic in viewport coords
          const verticalOffset = 12;
          // Measure current tooltip width (may be 0 on first paint); we only clamp LEFT side
          const measuredWidth = tooltipRef.current?.offsetWidth || 0;
          const fallbackWidth = 240;
          const width = measuredWidth || fallbackWidth;
          const half = width / 2;
          const outerRect = outerRef.current?.getBoundingClientRect();
          const inset = 8; // keep tooltip slightly inside timeline edges
          const leftEdge = outerRect ? outerRect.left + inset : 8;
          const rightEdge = outerRect ? outerRect.right - inset : (window.innerWidth || document.documentElement.clientWidth) - 8;
          let centerViewport = tooltipCenterOverride ?? pinViewportX;
          if (tooltipCenterOverride == null) {
            const minCenter = leftEdge + half;
            const maxCenter = rightEdge - half;
            if (centerViewport < minCenter) centerViewport = minCenter;
            if (centerViewport > maxCenter) centerViewport = maxCenter;
          }

          const tooltipNode = (
            <Box
              ref={tooltipRef}
              position="fixed"
              top={`${pinViewportY - verticalOffset}px`}
              left={`${centerViewport}px`}
              transform="translate(-50%, -100%)"
              bg="black"
              color="white"
              px={4}
              py={3}
              borderRadius="8px"
              fontSize="sm"
              zIndex={2000}
              pointerEvents="none"
              display="flex"
              flexDirection="column"
              gap="2px"
              whiteSpace="nowrap"
              maxWidth="none"
              boxShadow="0 4px 12px rgba(0,0,0,0.35)"
            >
              <div style={{ fontWeight:'bold', fontSize:'0.95em', lineHeight:1 }}>{hoveredYear}</div>
              {data?.partyName && (
                <div style={{ fontSize:'0.8em', color: data.color, lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {(data.collection && data.collection !== data.partyName)
                    ? `${data.collection} - ${data.partyName}`
                    : data.partyName}
                  {`: ${data?.percentage?.toFixed(1)}%`}
                </div>
              )}
            </Box>
          );
          return createPortal(tooltipNode, document.body);
        })()}
        {/* subtle yearly ticks */}
        <Box position="absolute" left={`${metrics.offsetLeft}px`} width={`${Math.max(metrics.width,0)}px`} top={`${Math.max(0, metrics.offsetTop + (metrics.height/2) - 18)}px`} height="38px" pointerEvents="none" zIndex={0}>
          <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} 38`} preserveAspectRatio="none">
            {ALL_TIMELINE_YEARS.map((y)=>{
              const ratio = getYearRatio(y);
              const x = ratio * svgWidth;
              const isDecade = y % 10 === 0;
              const stroke = isDecade ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.25)';
              const strokeWidth = isDecade ? 1.1 : 0.6;
              const half = isDecade ? decadeTickHalf : yearTickHalf;
              const centerY = 18;
              return (
                <line
                  key={`year-baseline-${y}`}
                  x1={x}
                  x2={x}
                  y1={centerY - half}
                  y2={centerY + half}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  shapeRendering="crispEdges"
                />
              );
            })}
          </svg>
        </Box>
        {/* election ticks - visual only */}
        {showElectionPins && (
          <Box position="absolute" left={`${metrics.offsetLeft}px`} width={`${Math.max(metrics.width,0)}px`} top={`${Math.max(0, metrics.offsetTop + (metrics.height/2) - 18)}px`} height="38px" pointerEvents="none" zIndex={1}>
            <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} 38`} preserveAspectRatio="none">
              {visibleElectionYears.map((y)=>{
                const t = getYearRatio(y);
                const x = t * svgWidth;
                const data = tickData.get(y);
                const color = data?.color || '#666';
                return (
                  <g key={y}>
                    {/* Stem below track (rendered under the slider track via z-index) */}
                    <line x1={x} y1={5} x2={x} y2={18} stroke={color} strokeWidth={2} strokeLinecap="round" />
                  </g>
                );
              })}
            </svg>
          </Box>
        )}
        {/* Slider track over stems, under pin heads */}
        <Box position="relative" zIndex={2}>
          <Slider aria-label='timeline' min={TIMELINE_MIN_YEAR} max={TIMELINE_MAX_YEAR} step={1} value={year} onChange={onChange} mt={4}>
            <SliderTrack bg='black' ref={sliderTrackRef}>
              <SliderFilledTrack bg='black' />
            </SliderTrack>
            <SliderThumb bg='transparent' boxSize='24px' _focus={{ boxShadow: 'none' }} _active={{ boxShadow: 'none' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" style={{ transform: 'translateY(7px)' }}>
                <path d="M12 4 L20 16 L4 16 Z" fill="black" />
              </svg>
            </SliderThumb>
          </Slider>
        </Box>
      </Box>
  <Heading as="h6" size="xs" pr={3} lineHeight={1} display="inline-flex" alignItems="center" style={{ transform:'translateY(-4px)' }}>{TIMELINE_MAX_YEAR}</Heading>
    </HStack>
  );
}
