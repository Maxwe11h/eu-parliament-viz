"use client";
import { Box, HStack, Spinner, Text, VStack, Input, InputGroup, InputLeftElement } from '@chakra-ui/react';
import * as d3 from 'd3';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import * as topojson from 'topojson-client';
// world-countries provides metadata to determine European countries
import worldCountries from 'world-countries';
import ViewToggle from './ViewToggle';
import { CountryKey } from '@/types';
import Timeline, { TIMELINE_MAX_YEAR, TIMELINE_MIN_YEAR } from './Timeline';
import { useData } from './DataContext';
import { majoritySocialCategory } from '@/lib/analytics';
import { categoryPalette } from '@/lib/colors';
import { getCountryFreedomYear, isCountryFree, NOT_FREE_COLOR } from '@/lib/democracy';

// ISO alpha-2 to our country keys
const keyByISO: Partial<Record<string, CountryKey>> = {
  FR: 'france', DE: 'germany', IE: 'ireland', IT: 'italy', PT: 'portugal', ES: 'spain',
  AT: 'austria', BE: 'belgium', BG: 'bulgaria', HR: 'croatia', CY: 'cyprus', CZ: 'czech-republic',
  DK: 'denmark', EE: 'estonia', FI: 'finland', GR: 'greece', HU: 'hungary',
  LV: 'latvia', LT: 'lithuania', LU: 'luxembourg', MT: 'malta', NL: 'netherlands',
  PL: 'poland', RO: 'romania', SK: 'slovakia', SI: 'slovenia', SE: 'sweden'
};

// Build a mapping from numeric (cca3 numeric) to alpha-2 using world-countries
// world-countries entries may have 'ccn3' (numeric string) and 'cca2'.
const isoNumToAlpha2: Record<number, string> = {};
const europeanAlpha2 = new Set<string>();
for (const c of worldCountries) {
  if (c.region === 'Europe') {
    europeanAlpha2.add(c.cca2);
  }
  if (c.ccn3) {
    const num = Number(c.ccn3);
    if (!Number.isNaN(num)) isoNumToAlpha2[num] = c.cca2;
  }
}
// Explicitly exclude Russia (RU) from rendering despite being partly in Europe region
europeanAlpha2.delete('RU');
// Explicit ensure our six exist even if mapping fails.
['FR','DE','IE','IT','PT','ES','AT','BE','BG','HR','CY','CZ','DK','EE','FI','GR','HU','LV','LT','LU','MT','NL','PL','RO','SK','SI','SE'].forEach(code=>{ /* ensure presence */ });

const WIDTH = 1200; const HEIGHT = 700; // logical viewport

export default function MapEurope({ selected, onSelect, year, onYearChange, timelineRightOffset }: { selected?: CountryKey; onSelect: (c: CountryKey)=>void; year: number; onYearChange: (y:number)=>void; timelineRightOffset?: string | number }) {
  const ref = useRef<SVGSVGElement>(null);
  const BASE_SCALE = 1;
  const [scale,setScale]=useState<number>(BASE_SCALE);
  const [tx,setTx]=useState<number>(0); const [ty,setTy]=useState<number>(0);
  const dragging = useRef<{x:number;y:number}|null>(null);
  const [hoverName,setHoverName]=useState<string|null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverPos,setHoverPos]=useState<{x:number;y:number}|null>(null);
  // Access all data for coloring
  const { allData } = useData();
  const [legendOpen, setLegendOpen] = useState(true);
  // rAF throttling for tooltip position updates
  const rAF = useRef<number|null>(null);
  const pendingPos = useRef<{x:number;y:number}|null>(null);
  const selectedFreedomYear = selected ? getCountryFreedomYear(selected) : undefined;

  type CountryFeature = any;
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearQuery, setYearQuery] = useState(year.toString());

  useEffect(()=>{
    setYearQuery(year.toString());
  },[year]);

  const applyYearQuery = () => {
    const trimmed = yearQuery.trim();
    if (trimmed.length === 0) {
      setYearQuery(year.toString());
      return;
    }
    const requiredDigits = TIMELINE_MAX_YEAR.toString().length;
    if (trimmed.length < requiredDigits) {
      setYearQuery(year.toString());
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      setYearQuery(year.toString());
      return;
    }
    const normalized = clamp(Math.round(parsed), TIMELINE_MIN_YEAR, TIMELINE_MAX_YEAR);
    setYearQuery(normalized.toString());
    if (normalized !== year) {
      onYearChange(normalized);
    }
  };

  const handleYearInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyYearQuery();
    }
  };

  const handleYearInputBlur = () => {
    applyYearQuery();
  };

  // Load world atlas topojson dynamically from CDN (client-side)
  useEffect(()=>{
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
  // Use 50m resolution dataset (lighter, better performance)
  const resp = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const topo = await resp.json();
  const feats = topojson.feature(topo, topo.objects.countries).features;
  if (!cancelled) setCountries(feats);
  // Store topo for mesh borders later
  (ref.current as any)._topology = topo;
      } catch(e:any) {
        if (!cancelled) setError(e.message || 'Failed to load map');
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return ()=>{ cancelled = true; };
  },[]);

  useEffect(()=>{
    const svg = d3.select(ref.current!);
    svg.selectAll('*').remove();
    if (loading || error || countries.length===0) return;

    const getFillColor = (key?: CountryKey) => {
      if (!key) return '#CCCCCC';
      if (!isCountryFree(key, year)) return NOT_FREE_COLOR;
      const maj = majoritySocialCategory(allData, key, year);
      const color = maj.category ? categoryPalette[maj.category] : undefined;
      return color || '#000000';
    };

    const deriveSelectionStroke = (fill: string) => {
      const base = d3.color(fill);
      if (!base) return '#000000';
      const hsl = d3.hsl(base as any);
      hsl.s = Math.min(1, hsl.s + 0.12);
      hsl.l = Math.max(0, Math.min(1, hsl.l * 0.55));
      return hsl.formatHex();
    };

    // ocean first (behind everything) and ignore mouse events
    // Ocean background fill entire SVG area
    // Ocean (background) now white
    svg.append('rect')
      .attr('x',0).attr('y',0)
      .attr('width',WIDTH)
      .attr('height',HEIGHT)
      .attr('fill','#FFFFFF')
      .style('pointer-events','none');

    const g = svg.append('g').attr('transform',`translate(${tx},${ty}) scale(${scale})`);
  // Slightly closer base zoom (increase scale) and slight northward shift for better Europe centering
  // Shift projection slightly right and down by adjusting translate
  // Restore fixed projection (zoom handled via <g> transform)
  // Adjusted: slightly zoomed out (scale 600 instead of 650) and shifted upward (translate Y +10 instead of +40)
  const projection = d3.geoMercator().center([15,52]).scale(600).translate([WIDTH/2 + 60, HEIGHT/2 + 30]);
  const path = d3.geoPath(projection as any);

  // draw countries
    // Keep all European countries (region === Europe). Filter using world-countries derived set.
    const euroCountries = countries.filter((d:any)=>{
      const alpha2 = isoNumToAlpha2[Number(d.id)];
      return alpha2 && europeanAlpha2.has(alpha2);
    });
  // (No fitExtent) Keep fixed projection for consistent manual zoom/pan transforms.

    const countryPaths = g.selectAll<SVGPathElement, CountryFeature>('path.country')
      .data(euroCountries)
      .enter()
      .append('path')
      .attr('class','country')
      .attr('d',(d:any)=>path(d))
      .attr('fill',(d:any)=>{
        const alpha2 = isoNumToAlpha2[Number(d.id)];
        const key = alpha2 ? keyByISO[alpha2] : undefined;
        return getFillColor(key);
      })
      .attr('stroke','none')
       .on('mouseenter', (event: MouseEvent, d: CountryFeature)=>{
        const alpha2 = isoNumToAlpha2[Number(d.id)];
        const key = alpha2 ? keyByISO[alpha2] : undefined;
        const tgt = d3.select(event.currentTarget as Element);
        if (key) {
          if (!isCountryFree(key, year)) {
            tgt.attr('fill', NOT_FREE_COLOR);
          } else {
            const base = getFillColor(key);
            const darkened = d3.color(base);
            if (darkened) {
              darkened.opacity = 1;
              const rgb = d3.rgb(darkened as any);
              tgt.attr('fill', d3.rgb(Math.max(0, rgb.r-30), Math.max(0, rgb.g-30), Math.max(0, rgb.b-30)).toString());
            } else {
              tgt.attr('fill','#222222');
            }
          }
        } else {
          tgt.attr('fill','#BBBBBB');
        }
         // Set hover name using worldCountries metadata
         if (alpha2) {
           const meta = worldCountries.find((c: any)=>c.cca2===alpha2); // world-countries lacks TS types in this build
           if (meta && containerRef.current) {
             const rect = containerRef.current.getBoundingClientRect();
             setHoverName(meta.name.common);
             setHoverPos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
           }
         }
      })
      .on('mouseleave', (event: MouseEvent, d: CountryFeature)=>{
        const alpha2 = isoNumToAlpha2[Number(d.id)];
        const key = alpha2 ? keyByISO[alpha2] : undefined;
        const tgt = d3.select(event.currentTarget as Element);
        if (key) {
          tgt.attr('fill', getFillColor(key));
        } else {
          tgt.attr('fill', '#CCCCCC');
        }
         setHoverName(null); setHoverPos(null);
      })
      .on('click', (_: MouseEvent, d: CountryFeature)=>{
        const alpha2 = isoNumToAlpha2[Number(d.id)];
        const key = (alpha2 ? keyByISO[alpha2] : undefined) as CountryKey | undefined;
        if (key) onSelect(key);
      });

    // Internal borders mesh (between countries only, excluding exterior coastlines)
    const topoData: any = (ref.current as any)._topology;
    if (topoData) {
      // @ts-ignore topojson.mesh available at runtime; types may not expose
      const internal = (topojson as any).mesh(topoData, topoData.objects.countries, (a: any, b: any) => a !== b);
      // Filter mesh arcs to only those between European countries excluding Russia
      // The mesh includes all shared boundaries; we'll rely on clipping via path
      g.append('path')
        .attr('d', path(internal as any)!)
        .attr('fill','none')
        .attr('stroke','#FFFFFF')
        .attr('stroke-width',2)
        .attr('vector-effect','non-scaling-stroke')
        .attr('stroke-linejoin','round')
        .attr('stroke-linecap','round')
        .attr('shape-rendering','geometricPrecision');
    }

    const selectionFill = selected ? getFillColor(selected) : undefined;
    const selectionStroke = selectionFill ? deriveSelectionStroke(selectionFill) : undefined;
    countryPaths.attr('stroke',(d:any)=>{
      const alpha2 = isoNumToAlpha2[Number(d.id)];
      const key = alpha2 ? keyByISO[alpha2] : undefined;
      return selected && key === selected && selectionStroke ? selectionStroke : 'none';
    }).attr('stroke-width',(d:any)=>{
      const alpha2 = isoNumToAlpha2[Number(d.id)];
      const key = alpha2 ? keyByISO[alpha2] : undefined;
      return selected && key === selected ? 3 : 0;
    }).attr('vector-effect','non-scaling-stroke');

    if (selected && selectionStroke) {
      const selectedFeature = euroCountries.find((d:any)=>{
        const alpha2 = isoNumToAlpha2[Number(d.id)];
        const key = alpha2 ? keyByISO[alpha2] : undefined;
        return key === selected;
      });
      if (selectedFeature) {
        g.append('path')
          .attr('d', path(selectedFeature as any)!)
          .attr('fill','none')
          .attr('stroke', selectionStroke)
          .attr('stroke-width',4)
          .attr('vector-effect','non-scaling-stroke')
          .attr('pointer-events','none');
      }
    }

    // simple drag panning (prevent text selection while dragging)
  svg.on('mousedown', (event: MouseEvent)=>{ event.preventDefault(); dragging.current = { x: event.clientX, y: event.clientY }; });
      svg.on('mousemove', (event: MouseEvent)=>{
        if (dragging.current) {
          const dx = event.clientX - dragging.current.x;
          const dy = event.clientY - dragging.current.y;
          setTx((prev:number)=> prev+dx);
          setTy((prev:number)=> prev+dy);
          dragging.current = { x: event.clientX, y: event.clientY };
        }
        if (hoverName && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          pendingPos.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
          if (!rAF.current) {
            rAF.current = requestAnimationFrame(()=>{
              if (pendingPos.current) setHoverPos(pendingPos.current);
              rAF.current = null;
            });
          }
        }
      });
    svg.on('mouseup', ()=>{ dragging.current = null; });
    svg.on('mouseleave', ()=>{ dragging.current = null; });
  },[countries, selected, scale, tx, ty, loading, error, year, allData]);

  const overlayBadgeWidth = 320;

  return (
    <VStack align="stretch" spacing={0} h="100%" flex={1}>
  <Box ref={containerRef} position="relative" flex={1} h="100%" minH={0} border="4px solid black" style={{ userSelect:'none' }}>
        {error && <Text color="red.600" p={4}>{error}</Text>}
        {loading && !error && <Spinner position='absolute' left='50%' top='50%' />}
  <svg ref={ref} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display:'block', background:'#FFFFFF', visibility: loading||error?'hidden':'visible' }} />
  {hoverName && hoverPos && (
    <Box position="absolute" pointerEvents="none" style={{ left: hoverPos.x, top: hoverPos.y }} bg="black" color="white" px={2} py={1} fontSize="xs" borderRadius="4px" boxShadow="md" zIndex={10} whiteSpace="nowrap" transform="translate(8px,8px)">
      {hoverName}
    </Box>
  )}
  {/* Title overlay and legend */}
  <Box position="absolute" top={4} left={4} display="flex" flexDir="column" gap={2} zIndex={6}>
          <Box
            bg="white"
            border="2px solid black"
            borderRadius="18px"
            boxShadow="md"
            px={4}
            py={2}
            width={`${overlayBadgeWidth}px`}
            textAlign="center"
          >
            <Text fontWeight="semibold">European Parliamentary Visualizer</Text>
          </Box>
          <ViewToggle width={`${overlayBadgeWidth}px`} />
          <Box
            bg="white"
            border="2px solid black"
            borderRadius="10px"
            boxShadow="sm"
            px={3}
            py={2}
            display="inline-block"
            alignSelf="flex-start"
            cursor="pointer"
            onClick={()=>setLegendOpen(o=>!o)}
            aria-expanded={legendOpen}
            w="fit-content"
          >
            <HStack spacing={2} mb={legendOpen ? 2 : 0}>
              <Box as="span" aria-hidden="true" width="10px" height="10px" display="inline-block" transform={legendOpen? 'rotate(90deg)' : 'rotate(0deg)'} transition="transform 120ms ease">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l8 7-8 7z"/></svg>
              </Box>
              <Text fontWeight="semibold" fontSize="sm">Political Alignment Legend</Text>
            </HStack>
            {legendOpen && (
              <VStack align="start" spacing={1}>
                {[
                  ...(['Far Left','Left','Centre-Left','Centre','Centre-Right','Right','Far Right'] as const).map(cat => ({
                    label: cat,
                    color: categoryPalette[cat]
                  })),
                  { label: 'No Parliament', color: NOT_FREE_COLOR },
                  { label: 'Non-EU nations', color: '#CCCCCC' }
                ].map(item => (
                  <HStack key={item.label} spacing={2}>
                    <Box width="12px" height="12px" borderRadius="2px" bg={item.color} border="1px solid black" />
                    <Text fontSize="sm">{item.label}</Text>
                  </HStack>
                ))}
              </VStack>
            )}
          </Box>
        </Box>
        {/* Timeline overlay (respect right offset when a panel is open) */}
        <Box position="absolute" left={0} right={timelineRightOffset ?? 0} bottom={0} px={4} pb={3} display="flex" justifyContent="center" zIndex={20} pointerEvents="auto" overflow="visible" style={{ transition: 'right 220ms ease-out' }}>
          <Box maxW="980px" width="100%" display="flex" alignItems="center" gap={2}>
            {/* Inline year label */}
            <Box
              bg="white"
              color="black"
              border="2px solid black"
              borderRadius="12px"
              boxShadow="sm"
              px={4}
              py={2}
              mb={0}
              height="54px"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
              textAlign="center"
              minW="160px"
              gap={0}
            >
              <InputGroup size="md" width="auto" display="flex" alignItems="center" justifyContent="center" mb={0}>
                <InputLeftElement
                  pointerEvents="none"
                  height="100%"
                  color="gray.500"
                  top="50%"
                  transform="translateY(-50%)"
                  width="18px"
                  left="2px"
                  display="flex"
                  justifyContent="center"
                >
                  <Box as="span" display="inline-flex" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="7" />
                      <line x1="17" y1="17" x2="21" y2="21" />
                    </svg>
                  </Box>
                </InputLeftElement>
                <Input
                  type="number"
                  variant="unstyled"
                  fontWeight="extrabold"
                  fontSize="lg"
                  letterSpacing="-0.02em"
                  value={yearQuery}
                  onChange={(event)=>setYearQuery(event.target.value)}
                  onKeyDown={handleYearInputKeyDown}
                  onBlur={handleYearInputBlur}
                  min={TIMELINE_MIN_YEAR}
                  max={TIMELINE_MAX_YEAR}
                  step={1}
                  inputMode="numeric"
                  aria-label="Search year"
                  paddingLeft="22px"
                  width="88px"
                  height="32px"
                  color="black"
                  _placeholder={{ color: 'gray.400' }}
                />
              </InputGroup>
              <Text fontSize="xs" color="gray.600" lineHeight="1" mt={0} pb={2}>Selected Year</Text>
            </Box>
            <Box flex={1} minW={0}>
              <Timeline year={year} onChange={onYearChange} minTickYear={selectedFreedomYear} />
            </Box>
          </Box>
        </Box>
      </Box>
  </VStack>
  );
}

function clamp(v:number, min:number, max:number){
  return Math.max(min, Math.min(max, v));
}
