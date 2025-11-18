"use client";
import { Box, VStack, Spinner, Text } from '@chakra-ui/react';
import * as d3 from 'd3';
import { useEffect, useRef, useState } from 'react';
import * as topojson from 'topojson-client';
// world-countries provides metadata to determine European countries
import worldCountries from 'world-countries';
import { CountryKey } from '@/types';

// ISO alpha-2 to our country keys
const keyByISO: Partial<Record<string, CountryKey>> = {
  FR: 'france', DE: 'germany', IE: 'ireland', IT: 'italy', PT: 'portugal', ES: 'spain'
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
['FR','DE','IE','IT','PT','ES'].forEach(code=>{ /* no-op ensure presence */ });

const WIDTH = 1200; const HEIGHT = 700; // logical viewport

export default function MapEurope({ selected, onSelect }: { selected?: CountryKey; onSelect: (c: CountryKey)=>void }) {
  const ref = useRef<SVGSVGElement>(null);
  const BASE_SCALE = 1;
  const [scale,setScale]=useState<number>(BASE_SCALE);
  const [tx,setTx]=useState<number>(0); const [ty,setTy]=useState<number>(0);
  const dragging = useRef<{x:number;y:number}|null>(null);
  const [hoverName,setHoverName]=useState<string|null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverPos,setHoverPos]=useState<{x:number;y:number}|null>(null);
  // rAF throttling for tooltip position updates
  const rAF = useRef<number|null>(null);
  const pendingPos = useRef<{x:number;y:number}|null>(null);

  type CountryFeature = any;
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const projection = d3.geoMercator().center([15,52]).scale(650).translate([WIDTH/2 + 60, HEIGHT/2 + 40]);
  const path = d3.geoPath(projection as any);

  // draw countries
    // Keep all European countries (region === Europe). Filter using world-countries derived set.
    const euroCountries = countries.filter((d:any)=>{
      const alpha2 = isoNumToAlpha2[Number(d.id)];
      return alpha2 && europeanAlpha2.has(alpha2);
    });
  // (No fitExtent) Keep fixed projection for consistent manual zoom/pan transforms.

    g.selectAll<SVGPathElement, CountryFeature>('path.country')
      .data(euroCountries)
      .enter()
      .append('path')
      .attr('class','country')
      .attr('d',(d:any)=>path(d))
      .attr('fill',(d:any)=>{
        const alpha2 = isoNumToAlpha2[Number(d.id)];
        const key = alpha2 ? keyByISO[alpha2] : undefined;
        // Data countries (our six) black, others light grey
        return key ? '#000000' : '#CCCCCC';
      })
      // No stroke on individual country paths (internal borders drawn separately)
      .attr('stroke','none')
       .on('mouseenter', (event: MouseEvent, d: CountryFeature)=>{
        const alpha2 = isoNumToAlpha2[Number(d.id)];
        const key = alpha2 ? keyByISO[alpha2] : undefined;
        const tgt = d3.select(event.currentTarget as Element);
        if (key) {
          tgt.attr('fill','#222222');
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
        tgt.attr('fill', key ? '#000000' : '#CCCCCC');
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

    // simple drag panning
  svg.on('mousedown', (event: MouseEvent)=>{ dragging.current = { x: event.clientX, y: event.clientY }; });
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
  },[countries, selected, scale, tx, ty, loading, error]);

  return (
    <VStack align="stretch" spacing={0} h="100%" flex={1}>
  <Box ref={containerRef} position="relative" flex={1} h="100%" minH={0}>
        {error && <Text color="red.600" p={4}>{error}</Text>}
        {loading && !error && <Spinner position='absolute' left='50%' top='50%' />}
  <svg ref={ref} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display:'block', background:'#FFFFFF', visibility: loading||error?'hidden':'visible' }} />
  {hoverName && hoverPos && (
    <Box position="absolute" pointerEvents="none" style={{ left: hoverPos.x, top: hoverPos.y }} bg="black" color="white" px={2} py={1} fontSize="xs" borderRadius="4px" boxShadow="md" zIndex={10} whiteSpace="nowrap" transform="translate(8px,8px)">
      {hoverName}
    </Box>
  )}
  <Box position="absolute" bottom={8} right={8} display="flex" gap={2}>
          <button className="btn" aria-label="Zoom in" onClick={()=>setScale((s:number)=>Math.min(4,s*1.2))}>+</button>
          <button className="btn" aria-label="Zoom out" onClick={()=>setScale((s:number)=>Math.max(BASE_SCALE,s/1.2))}>-</button>
        </Box>
      </Box>
  </VStack>
  );
}

function clamp(v:number, min:number, max:number){
  return Math.max(min, Math.min(max, v));
}
