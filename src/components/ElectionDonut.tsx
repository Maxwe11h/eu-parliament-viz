"use client";
import { Box, HStack, Text } from '@chakra-ui/react';
import * as d3 from 'd3';
import { useEffect, useMemo, useRef, useState } from 'react';
import { YearData } from '@/types';
import { categoryPalette } from '@/lib/colors';

export default function ElectionDonut({ data }: { data?: YearData }){
  const ref = useRef<SVGSVGElement>(null);

  const { socialSlices } = useMemo(()=>{
    const total = data?.total ?? 0;
    const parties = (data?.parties ?? []).filter(p => (p.votes ?? 0) > 0);
    const partiesByCategory = d3.group(parties, p => p.socialCategory ?? 'Uncategorized');
    const order = ['Far Left','Left','Centre-Left','Centre','Centre-Right','Right','Far Right','Uncategorized'];
    const bySocial = Array.from(partiesByCategory, ([cat, items])=>{
      const value = d3.sum(items, p=>p.votes || 0);
      const pct = total ? (value/total)*100 : 0;
      return {
        key: cat,
        label: cat,
        value,
        pct,
        color: categoryPalette[cat] || '#888',
        parties: items
      };
    }).filter(d=>d.value>0)
      .sort((a,b)=> order.indexOf(a.key) - order.indexOf(b.key));

    return { socialSlices: bySocial } as const;
  },[data]);

  useEffect(()=>{
    const svg = d3.select(ref.current!);
    svg.selectAll('*').remove();
  const width = 520;
  const margin = 4; // tighter margin
  const outerR = (width/2) - margin;
  const innerR = outerR * 0.45; // smaller hole
  const height = outerR + margin; // remove extra bottom padding
    svg.attr('viewBox', `0 0 ${width} ${height}`);
  const g = svg.append('g').attr('transform',`translate(${width/2},${outerR + margin})`);

  const series = socialSlices;
  if (!series || series.length === 0) return;

    const pie = d3.pie<any>()
      .value((d:any)=>d.value)
      .startAngle(-Math.PI/2)
      .endAngle(Math.PI/2)
      .padAngle(0.004)
      .sort(null);
    const arc = d3.arc<any>().innerRadius(innerR).outerRadius(outerR);

  const root = g.append('g');
    const arcs = root.selectAll('path.slice').data(pie(series)).enter().append('path')
      .attr('class','slice')
      .attr('d', arc as any)
      .attr('fill', (d:any)=>d.data.color)
  .attr('stroke', '#000')
  .attr('stroke-width', 1.5)
      .attr('opacity', 0.95);

    // tooltip
    const tooltip = d3.create('div')
      .style('position','absolute')
      .style('pointer-events','none')
      .style('background','rgba(0,0,0,0.8)')
      .style('color','#fff')
      .style('padding','6px 8px')
      .style('border-radius','6px')
      .style('font-size','12px')
      .style('transform','translate(-50%,-120%)')
      .style('opacity','0');
    (svg.node()?.parentElement as HTMLElement).appendChild(tooltip.node()!);

    arcs.on('mouseenter', function(event: any, d:any){
      const pts = d.data.parties
        .slice()
        .sort((a:any,b:any)=> (b.votes||0) - (a.votes||0))
        .map((p:any)=>`• ${p.englishName ?? p.acronym} — ${p.pct.toFixed(1)}%`);
      const lines = [`${d.data.label}: ${d.data.pct.toFixed(1)}% (${d.data.value})`, ...pts];
      tooltip.style('opacity','1').html(lines.join('<br/>'));
    }).on('mousemove', function(event:any){
      const vw = window.innerWidth;
      const desiredX = event.clientX;
      const clampMargin = 20;
      const boxWidth = 260; // fixed width
      const left = Math.min(vw - clampMargin, Math.max(clampMargin, desiredX));
      tooltip.style('width', boxWidth+'px')
        .style('left', left+'px')
        .style('top', `${event.clientY}px`)
        .style('transform','translate(-50%,-110%)');
    }).on('mouseleave', function(){
      tooltip.style('opacity','0');
    });

    // no center label per request

  },[socialSlices]);

  return (
    <Box>
      <HStack mb={0} justify="space-between">
        <Text fontWeight="bold" fontSize="md" lineHeight="1.1">Election Results</Text>
      </HStack>
      <Text fontSize="xs" color="gray.600" mb={1} mt={0} lineHeight="1.1">Visualised by social alignment</Text>
      <svg ref={ref} width="100%" viewBox="0 0 520 280" />
    </Box>
  );
}
