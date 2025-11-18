"use client";
import { Box, VStack, Spinner, Text } from '@chakra-ui/react';
import * as d3 from 'd3';
import { useEffect, useRef, useState } from 'react';
import { feature } from 'topojson-client';
import { CountryKey } from '@/types';

// ISO alpha-2 to our country keys
const keyByISO: Partial<Record<string, CountryKey>> = {
  FR: 'france', DE: 'germany', IE: 'ireland', IT: 'italy', PT: 'portugal', ES: 'spain'
};

// ISO 3166-1 numeric to alpha-2 for our six target countries (from world-atlas ids)
const isoNumToAlpha2: Record<number, string> = {
  250: 'FR', // France
  276: 'DE', // Germany
  372: 'IE', // Ireland
  380: 'IT', // Italy
  620: 'PT', // Portugal
  724: 'ES', // Spain
};

const WIDTH = 1200; const HEIGHT = 700; // logical viewport

export default function MapEurope({ selected, onSelect }: { selected?: CountryKey; onSelect: (c: CountryKey)=>void }) {
  const ref = useRef<SVGSVGElement>(null);
  const BASE_SCALE = 1;
  const [scale,setScale]=useState<number>(BASE_SCALE);
  const [tx,setTx]=useState<number>(0); const [ty,setTy]=useState<number>(0);
  const dragging = useRef<{x:number;y:number}|null>(null);

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
        const resp = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const topo = await resp.json();
        const feats = feature(topo, topo.objects.countries).features;
        if (!cancelled) setCountries(feats);
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
    svg.append('rect')
      .attr('x',0).attr('y',0)
      .attr('width',WIDTH)
      .attr('height',HEIGHT)
      .attr('fill','var(--ocean)')
      .style('pointer-events','none');

    const g = svg.append('g').attr('transform',`translate(${tx},${ty}) scale(${scale})`);
  // Slightly closer base zoom (increase scale) and slight northward shift for better Europe centering
  // Shift projection slightly right and down by adjusting translate
    const projection = d3.geoMercator().center([15,52]).scale(650).translate([WIDTH/2 + 60, HEIGHT/2 + 40]);
    const path = d3.geoPath(projection as any);

  // draw countries
    g.selectAll<SVGPathElement, CountryFeature>('path.country')
      .data(countries)
      .enter()
      .append('path')
      .attr('class','country')
      .attr('d',(d:any)=>path(d))
      .attr('fill',(d:any)=>{
        const alpha2 = isoNumToAlpha2[Number(d.id)];
        const key = alpha2 ? keyByISO[alpha2] : undefined;
        if (!key) return 'var(--land-gray)';
        if (selected && key===selected) return 'var(--eu-green-dark)';
        return 'var(--eu-green)';
      })
      .attr('stroke','#111')
      .attr('stroke-width',0.5)
      .on('mouseenter', (event: MouseEvent, d: CountryFeature)=>{
        const alpha2 = isoNumToAlpha2[Number(d.id)];
        const key = alpha2 ? keyByISO[alpha2] : undefined;
        const tgt = d3.select(event.currentTarget as Element);
        if (!key) return tgt.attr('fill','var(--land-gray)');
        tgt.attr('fill', key && selected && key===selected ? 'var(--eu-green-dark)':'var(--eu-green-light)');
      })
      .on('mouseleave', (event: MouseEvent, d: CountryFeature)=>{
        const alpha2 = isoNumToAlpha2[Number(d.id)];
        const key = alpha2 ? keyByISO[alpha2] : undefined;
        const tgt = d3.select(event.currentTarget as Element);
        if (!key) return tgt.attr('fill','var(--land-gray)');
        tgt.attr('fill', (key && selected && key===selected)? 'var(--eu-green-dark)':'var(--eu-green)');
      })
      .on('click', (_: MouseEvent, d: CountryFeature)=>{
        const alpha2 = isoNumToAlpha2[Number(d.id)];
        const key = (alpha2 ? keyByISO[alpha2] : undefined) as CountryKey | undefined;
        if (key) onSelect(key);
      });

    // simple drag panning
  svg.on('mousedown', (event: MouseEvent)=>{ dragging.current = { x: event.clientX, y: event.clientY }; });
    svg.on('mousemove', (event: MouseEvent)=>{
      if (!dragging.current) return;
      const dx = event.clientX - dragging.current.x;
      const dy = event.clientY - dragging.current.y;
      // Stricter bounds; also scale-aware so you can't pan too far when zoomed out
      const maxX = 250 / scale; const maxY = 180 / scale;
  const maxPanX = 250 / scale; // stricter and scale-aware
  const maxPanY = 180 / scale;
  setTx((prev:number)=> clamp(prev+dx, -maxPanX, maxPanX));
  setTy((prev:number)=> clamp(prev+dy, -maxPanY, maxPanY));
      dragging.current = { x: event.clientX, y: event.clientY };
    });
    svg.on('mouseup', ()=>{ dragging.current = null; });
    svg.on('mouseleave', ()=>{ dragging.current = null; });
  },[countries, selected, scale, tx, ty, loading, error]);

  return (
    <VStack align="stretch" spacing={0} h="100%" flex={1}>
      <Box position="relative" flex={1} h="100%" minH={0}>
        {error && <Text color="red.600" p={4}>{error}</Text>}
        {loading && !error && <Spinner position='absolute' left='50%' top='50%' />}
  <svg ref={ref} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display:'block', background:'var(--ocean)', visibility: loading||error?'hidden':'visible' }} />
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
