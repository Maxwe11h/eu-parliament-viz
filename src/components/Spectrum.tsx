"use client";
import {
  Box,
  HStack,
  IconButton,
  Popover,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  Text
} from '@chakra-ui/react';
import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import { YearData } from '@/types';
import { FaInfoCircle } from 'react-icons/fa';

type PartyPoint = NonNullable<YearData>['parties'][number];

export default function Spectrum({ data, size = 520 }: { data?: YearData; size?: number }){
  const ref = useRef<SVGSVGElement>(null);
  useEffect(()=>{
    const svg = d3.select(ref.current!);
    svg.selectAll('*').remove();
  if (!data) return;
  const parties = data.parties.filter(p => (p.votes ?? 0) > 0);
  if (parties.length === 0) return;
    const width = size, height = size; // make square for compass grid
    const margin = 20;
    const g = svg.append('g').attr('transform',`translate(${margin},${margin})`);
    const inner = width - margin*2;
  // X = economic (Left/Right), Y = social (Authoritarian/Libertarian)
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

    // custom tooltip (timeline-style)
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
    // Append to body so fixed positioning uses viewport and avoids transformed ancestor issues
    document.body.appendChild(tooltip.node()!);

    circles.on('mouseenter', function (event, d: PartyPoint){
      const header = d.englishName ?? d.acronym;
        const acronymLine = d.englishName && d.englishName !== d.acronym ? `<div style="color:#bbb;font-size:11px;">${d.acronym}</div>` : '';
        const sub = `${d.socialCategory ?? 'Uncategorized'} • ${d.pct.toFixed(1)}%`;
      tooltip.style('opacity','1').style('width','').html(`
        <div style="font-weight:700;color:#fff;text-overflow:ellipsis;overflow:hidden;max-width:100%">${header}</div>
          ${acronymLine}
        <div style="color:${d.color};text-overflow:ellipsis;overflow:hidden;max-width:100%;margin-top:4px">${sub}</div>
      `);
      // no width lock: each hover sizes independently
    }).on('mousemove', function(event){
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const margin = 8;
      const desiredX = event.clientX;
      const desiredY = event.clientY - 10; // above cursor
      const widthPx = (tooltip.node() as HTMLDivElement).getBoundingClientRect().width || 0;
      const half = widthPx/2;
      let left = desiredX;
      if (left - half < margin) left = margin + half;
      if (left + half > vw - margin) left = vw - margin - half;
      tooltip.style('left', `${left}px`).style('top', `${Math.max(margin, desiredY)}px`).style('transform','translate(-50%,-100%)');
    }).on('mouseleave', function(){
      tooltip.style('opacity','0');
    });
    // cleanup tooltip on unmount or data change
    return () => { try { tooltip.remove(); } catch {} };
  },[data, size]);
  return (
    <Box p={2} m={0}>
      <HStack align="flex-start" justify="space-between" px={3} spacing={3} mb={1}>
        <Box>
          <Text fontWeight="bold" lineHeight="1.1">Political Spectrum</Text>
          <Text fontSize="xs" color="gray.600" mt={0} lineHeight="1.1">
            X-axis displays social policy alignment and Y-axis displays economic policy alignment
          </Text>
        </Box>
        <SpectrumInfoPopover />
      </HStack>
      <svg ref={ref} width="100%" viewBox={`0 0 ${size} ${size}`} />
    </Box>
  );
}

function SpectrumInfoPopover() {
  return (
    <Popover placement="left-start" trigger="click">
      <PopoverTrigger>
        <IconButton
          aria-label="Political spectrum info"
          icon={<FaInfoCircle />}
          size="sm"
          variant="ghost"
          border="1px solid black"
          borderRadius="999px"
          color="black"
          _hover={{ bg: 'gray.100' }}
        />
      </PopoverTrigger>
      <PopoverContent border="2px solid" borderColor="black" borderRadius="20px" boxShadow="xl" maxW="340px">
        <PopoverCloseButton />
        <PopoverBody fontSize="sm" color="gray.700" lineHeight="1.4">
          <Text fontWeight="semibold" mb={2} color="gray.800">Reading the spectrum</Text>
          <Text>
            The horizontal axis plots parties from economic left (state intervention, redistribution) to economic right
            (market liberalism, deregulation). The vertical axis spans social policy, with authoritarian preferences at the
            top (law-and-order, central authority) and libertarian preferences at the bottom (individual freedoms, civil
            liberties). Circle size reflects share of the legislature in the selected election year.
          </Text>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
