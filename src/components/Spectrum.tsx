"use client";
import { Box, Text } from '@chakra-ui/react';
import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import { YearData } from '@/types';

type PartyPoint = NonNullable<YearData>['parties'][number];

export default function Spectrum({ data }: { data?: YearData }){
  const ref = useRef<SVGSVGElement>(null);
  useEffect(()=>{
    const svg = d3.select(ref.current!);
    svg.selectAll('*').remove();
  if (!data) return;
  const parties = data.parties.filter(p => (p.votes ?? 0) > 0);
  if (parties.length === 0) return;
    const width = 520, height = 520; // make square for compass grid
    const margin = 20;
    const g = svg.append('g').attr('transform',`translate(${margin},${margin})`);
    const inner = width - margin*2;
    const x = d3.scaleLinear().domain([-10,10]).range([0, inner]);
    const y = d3.scaleLinear().domain([-10,10]).range([inner,0]);

    // quadrant shading (top authoritarian red/blue; bottom libertarian green/purple)
    const quad = g.append('g');
    const half = inner/2;
    quad.append('rect').attr('x',0).attr('y',0).attr('width',half).attr('height',half).attr('fill','#ef4444').attr('fill-opacity',0.35); // top-left Authoritarian Left
    quad.append('rect').attr('x',half).attr('y',0).attr('width',half).attr('height',half).attr('fill','#3b82f6').attr('fill-opacity',0.35); // top-right Authoritarian Right
    quad.append('rect').attr('x',0).attr('y',half).attr('width',half).attr('height',half).attr('fill','#8dd48d').attr('fill-opacity',0.35); // bottom-left Libertarian Left (green)
    quad.append('rect').attr('x',half).attr('y',half).attr('width',half).attr('height',half).attr('fill','#c3a3e6').attr('fill-opacity',0.35); // bottom-right Libertarian Right (purple)

    // grid lines
    const grid = g.append('g').attr('stroke','#666').attr('stroke-width',0.5).attr('opacity',0.35);
    for (let i=1;i<20;i++) { // internal vertical lines
      const pos = (inner/20)*i;
      grid.append('line').attr('x1',pos).attr('y1',0).attr('x2',pos).attr('y2',inner);
      grid.append('line').attr('x1',0).attr('y1',pos).attr('x2',inner).attr('y2',pos);
    }

    // central cross (thicker)
    g.append('line').attr('x1',half).attr('y1',0).attr('x2',half).attr('y2',inner).attr('stroke','#111').attr('stroke-width',2);
    g.append('line').attr('x1',0).attr('y1',half).attr('x2',inner).attr('y2',half).attr('stroke','#111').attr('stroke-width',2);

    // labels (matching screenshot style)
    g.append('text').attr('x',half).attr('y',-8).attr('text-anchor','middle').attr('font-weight',600).text('Authoritarian');
    g.append('text').attr('x',half).attr('y',inner+18).attr('text-anchor','middle').attr('font-weight',600).text('Libertarian');
    g.append('text')
      .attr('transform',`translate(-12,${half}) rotate(-90)`) // vertical
      .attr('text-anchor','middle')
      .attr('dominant-baseline','middle')
      .attr('font-weight',600)
      .text('Left');
    g.append('text')
      .attr('transform',`translate(${inner+12},${half}) rotate(90)`) // vertical
      .attr('text-anchor','middle')
      .attr('dominant-baseline','middle')
      .attr('font-weight',600)
      .text('Right');

  const minR = 6, maxR = 32; // slightly larger range for square space
  const maxPct = d3.max(parties, (p:PartyPoint)=>p.pct) || 1;
    const r = d3.scaleSqrt().domain([0,maxPct]).range([minR,maxR]);

  const circles = g.selectAll('circle.party')
  .data(parties)
      .enter()
      .append('circle')
      .attr('class','party')
  .attr('cx',(p:PartyPoint)=>x(p.econ ?? 0))
  .attr('cy',(p:PartyPoint)=>y(p.social ?? 0))
  .attr('r',(p:PartyPoint)=>r(p.pct))
  .attr('fill',(p:PartyPoint)=>p.color)
      .attr('fill-opacity',0.85)
      .attr('stroke','#111');

    // custom tooltip
    const tooltip = d3.create('div')
      .style('position','absolute')
      .style('pointer-events','none')
      .style('background','rgba(0,0,0,0.75)')
      .style('color','#fff')
      .style('padding','6px 8px')
      .style('border-radius','6px')
      .style('font-size','12px')
      .style('transform','translate(-50%,-120%)')
      .style('opacity','0');

    (svg.node()?.parentElement as HTMLElement).appendChild(tooltip.node()!);

    circles.on('mouseenter', function (event, d: PartyPoint){
      const social = d.socialCategory ? ` (${d.socialCategory})` : '';
      tooltip.style('opacity','1').text(`${d.englishName ?? d.acronym}${social}: ${d.pct.toFixed(1)}%`);
    }).on('mousemove', function(event){
      tooltip.style('left', `${event.clientX}px`).style('top', `${event.clientY}px`);
    }).on('mouseleave', function(){
      tooltip.style('opacity','0');
    });
  },[data]);
  return (
    <Box p={2} m={0}>
      <Text fontWeight="bold" px={3} mb={0} lineHeight="1.1">Political Spectrum</Text>
  <Text fontSize="xs" color="gray.600" px={3} mb={3} mt={0} lineHeight="1.1">X-axis displays social policy alignment and Y-axis displays economic policy alignment</Text>
      <svg ref={ref} width="100%" viewBox="0 0 520 520" />
    </Box>
  );
}
