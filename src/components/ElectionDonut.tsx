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

    // tooltip (timeline-style)
    const tooltip = d3.create('div')
      .style('position','fixed')
      .style('pointer-events','none')
      .style('background','black')
      .style('color','#fff')
      .style('padding','10px')
      .style('border-radius','10px')
      .style('font-size','12px')
      .style('line-height','1.15')
      .style('box-sizing','border-box')
      .style('transform','translate(-50%,-100%)')
      .style('opacity','0')
      .style('z-index','2000')
      .style('box-shadow','0 4px 12px rgba(0,0,0,0.35)')
      .style('white-space','nowrap')
      .style('overflow','hidden');
    const containerEl = svg.node()?.parentElement as HTMLElement;
    if (containerEl && getComputedStyle(containerEl).position === 'static') {
      containerEl.style.position = 'relative';
    }
    // Use body for fixed-positioned tooltip so it anchors to viewport
    document.body.appendChild(tooltip.node()!);

    arcs.on('mouseenter', function(event: any, d:any){
      const header = `${d.data.label}`;
      const sub = `${d.data.pct.toFixed(1)}% of votes`;
      const parties = d.data.parties
        .slice()
        .sort((a:any,b:any)=> (b.votes||0) - (a.votes||0))
        .map((p:any)=>`<span style=\"color:#ddd;display:block;text-overflow:ellipsis;overflow:hidden\">• ${p.englishName ?? p.acronym} — ${p.pct.toFixed(1)}%</span>`)
        .join('');
      tooltip.style('opacity','1').style('width','').html(`
        <div style=\"font-weight:700;color:#fff;text-overflow:ellipsis;overflow:hidden;max-width:100%\">${header}</div>
        <div style=\"color:${d.data.color};text-overflow:ellipsis;overflow:hidden;max-width:100%;margin-top:4px\">${sub}</div>
        <div style=\"margin-top:6px\">${parties}</div>
      `);
      // no width lock: each hover sizes independently
    }).on('mousemove', function(event:any){
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const margin = 8;
      const desiredX = event.clientX;
      const desiredY = event.clientY - 10;
      const widthPx = (tooltip.node() as HTMLDivElement).getBoundingClientRect().width || 0;
      const half = widthPx/2;
      let left = desiredX;
      if (left - half < margin) left = margin + half;
      if (left + half > vw - margin) left = vw - margin - half;
      tooltip.style('left', left+'px').style('top', `${Math.max(margin, desiredY)}px`).style('transform','translate(-50%,-100%)');
    }).on('mouseleave', function(){
      tooltip.style('opacity','0');
    });

    // no center label per request

    return () => { try { tooltip.remove(); } catch {} };
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
