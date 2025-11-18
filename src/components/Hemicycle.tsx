"use client";
import { Box } from '@chakra-ui/react';
import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import { YearData } from '@/types';

// Draw semicircular parliament (hemicycle). Seats grouped by party left->right.
export default function Hemicycle({ data }: { data?: YearData }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(()=>{
    const svg = d3.select(ref.current!);
    svg.selectAll('*').remove();
    if (!data) return;
    const width = 520, height = 300;
    const g = svg.append('g').attr('transform',`translate(${width/2},${height-10})`);

    const total = data.total || d3.sum(data.parties, p=>p.votes);
    const parties = data.parties;
    // Ensure each party with votes gets at least 1 seat in visualization
    const seatAlloc = parties.map(p=>({ p, seats: Math.max(1, Math.round((p.votes/total)*total)) }));
    // Adjust if rounding drifted
  let allocSum = d3.sum(seatAlloc, (d: { seats: number })=>d.seats);
    if (allocSum !== total) {
      const diff = total - allocSum;
      // distribute diff across parties with largest remainder potential
      for (let i=0;i<Math.abs(diff);i++) seatAlloc[i % seatAlloc.length].seats += diff>0?1:-1;
    }
    const rows = Math.max(5, Math.min(10, Math.ceil(total/80))); // dynamic row count
    const maxSeatsInRow = Math.ceil(total/rows);
    const radiusStep = 16;
    const points: {x:number;y:number;color:string}[] = [];
    let seatIndexGlobal = 0;
    seatAlloc.forEach(({p,seats})=>{
      for (let s=0;s<seats;s++) {
        const row = Math.floor(seatIndexGlobal / maxSeatsInRow);
        const idxInRow = seatIndexGlobal % maxSeatsInRow;
        const radius = radiusStep*(rows-row);
        const angle = Math.PI * (idxInRow/(maxSeatsInRow-1));
        const x = Math.cos(angle)*radius;
        const y = -Math.sin(angle)*radius;
        points.push({x,y,color:p.color});
        seatIndexGlobal++;
      }
    });
    g.selectAll('circle.seat').data(points).enter().append('circle')
      .attr('class','seat')
      .attr('r',3.8)
  .attr('cx',(d:{x:number;y:number;color:string})=>d.x)
  .attr('cy',(d:{x:number;y:number;color:string})=>d.y)
  .attr('fill',(d:{x:number;y:number;color:string})=>d.color)
      .attr('opacity',0.9);
  },[data]);
  return (
    <Box>
      <svg ref={ref} width="100%" viewBox="0 0 520 300" />
    </Box>
  );
}
