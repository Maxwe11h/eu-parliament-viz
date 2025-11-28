"use client";

import { Box, Flex, Text, Tooltip } from '@chakra-ui/react';
import * as d3 from 'd3';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CountryKey, YearData } from '@/types';
import {
  getCountryAbbreviation,
  getCountryFlagEmoji,
  getCountryFlagUrl,
  getCountryLabel,
  orderedCountryKeys
} from '@/lib/countryMeta';
import { categoryPalette } from '@/lib/colors';
import { majoritySocialCategory } from '@/lib/analytics';

const LEANING_SEGMENTS = ['Far Left', 'Left', 'Centre-Left', 'Centre', 'Centre-Right', 'Right', 'Far Right'] as const;
type SegmentKey = (typeof LEANING_SEGMENTS)[number];

type EuropeanComparisonProps = {
  allData: Record<CountryKey, YearData[]>;
  year: number;
  onToggleCountry?: (country: CountryKey) => void;
};

type BubbleDatum = {
  key: CountryKey;
  label: string;
  abbreviation: string;
  flag: string;
  flagUrl?: string;
  percentage: number;
  category: SegmentKey;
  color: string;
};

type BubbleWithPosition = BubbleDatum & { x: number; y: number; size: number };
type PlacementSnapshot = { segment: SegmentKey; angle: number; radiusFactor: number };
type SegmentArc = { segment: SegmentKey; startAngle: number; endAngle: number; path: string };
type SegmentLabel = { segment: SegmentKey; x: number; y: number };
type GeometrySnapshot = {
  positions: BubbleWithPosition[];
  arcs: SegmentArc[];
  labels: SegmentLabel[];
  height: number;
  centerX: number;
  centerY: number;
  outerRadius: number;
  innerRadius: number;
  placement: Map<CountryKey, PlacementSnapshot>;
};

const BUBBLE_MIN = 20;
const BUBBLE_MAX = 60;
const MIN_CANVAS_HEIGHT = 420;
const BORDER_MARGIN = 8;
const COLLISION_PADDING = 1.5;
const VISUAL_MAX_WIDTH = 900;

const FLAG_BACKGROUND_OVERRIDES: Partial<Record<CountryKey, { backgroundSize?: string; backgroundPosition?: string }>> = {
  ireland: {
    backgroundSize: '190%',
    backgroundPosition: 'center'
  }
};

export default function EuropeanComparison({ allData, year, onToggleCountry }: EuropeanComparisonProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const previousPlacementRef = useRef<Map<CountryKey, PlacementSnapshot>>(new Map());
  const [width, setWidth] = useState(0);
  const drawingWidth = width > 0 ? Math.min(width, VISUAL_MAX_WIDTH) : 0;

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const updateWidth = () => setWidth(node.getBoundingClientRect().width);
    updateWidth();
    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const displayOrder = useMemo(() => {
    const keys = Object.keys(allData) as CountryKey[];
    const ordered = orderedCountryKeys.filter(key => keys.includes(key));
    const extras = keys.filter(key => !orderedCountryKeys.includes(key)).sort();
    return [...ordered, ...extras];
  }, [allData]);

  const bubbles = useMemo<BubbleDatum[]>(() => {
    return displayOrder.map(key => {
      const summary = majoritySocialCategory(allData, key, year);
      const category = normalizeSegment(summary.category);
      return {
        key,
        label: getCountryLabel(key),
        abbreviation: getCountryAbbreviation(key),
        flag: getCountryFlagEmoji(key),
        flagUrl: getCountryFlagUrl(key, 160),
        percentage: summary.percentage ?? 0,
        category,
        color: categoryPalette[category] || '#1a202c'
      };
    });
  }, [allData, displayOrder, year]);

  const geometry = useMemo<GeometrySnapshot>(() => {
    if (!drawingWidth) {
      return {
        positions: [] as BubbleWithPosition[],
        arcs: [],
        labels: [],
        height: MIN_CANVAS_HEIGHT,
        centerX: 0,
        centerY: MIN_CANVAS_HEIGHT - 60,
        outerRadius: 0,
        innerRadius: 0,
        placement: new Map<CountryKey, PlacementSnapshot>()
      };
    }

    const previousPlacement = previousPlacementRef.current;
  const wedgeAngle = Math.PI / LEANING_SEGMENTS.length;
    const orientationOffset = Math.PI / 2; // rotate semicircle vertically
    const margin = 48;
  const maxRadiusFromWidth = Math.max(drawingWidth / 2 - margin, 180);
    const outerRadius = Math.min(maxRadiusFromWidth, 540);
    const innerRadius = outerRadius * 0.22; // smaller inner circle
    const topMargin = 30;
    const bottomMargin = 5;
    const cy = outerRadius + topMargin;
    const canvasHeight = Math.max(MIN_CANVAS_HEIGHT, cy + bottomMargin);
  const cx = drawingWidth / 2;

    const arcGen = d3
      .arc<{ startAngle: number; endAngle: number }>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

    const baseStart = -Math.PI + orientationOffset;
    const arcs = LEANING_SEGMENTS.map((segment, index) => {
      const startAngle = baseStart + index * wedgeAngle;
      const endAngle = startAngle + wedgeAngle;
      return {
        segment,
        startAngle,
        endAngle,
        path: arcGen({ startAngle, endAngle }) || ''
      };
    });

    const labelRadius = outerRadius + 52;
    const labels = arcs.map(arc => {
      const mid = (arc.startAngle + arc.endAngle) / 2 - orientationOffset;
      const yOffset = arc.segment === 'Centre' ? +32 : 0;
      return {
        segment: arc.segment,
        x: cx + labelRadius * Math.cos(mid),
        y: cy + labelRadius * Math.sin(mid) + yOffset
      };
    });

    const grouped = new Map<SegmentKey, BubbleDatum[]>();
    bubbles.forEach(bubble => {
      const arr = grouped.get(bubble.category) || [];
      arr.push(bubble);
      grouped.set(bubble.category, arr);
    });

    const basePerRing = Math.max(3, Math.floor((wedgeAngle * outerRadius) / (BUBBLE_MIN + 28)));
    const anglePadding = wedgeAngle * 0.08;
    const positions: BubbleWithPosition[] = [];

    arcs.forEach(section => {
      const entries = grouped.get(section.segment) || [];
      if (!entries.length) return;

      const sortedEntries: BubbleDatum[] = sortEntriesWithMemory(
        entries,
        section.segment,
        previousPlacement,
        displayOrder
      );
      const rings = Math.max(1, Math.ceil(sortedEntries.length / basePerRing));
      const ringGap = (outerRadius - innerRadius) / Math.max(1, rings);
      const segmentConstraint = {
        minAngle: section.startAngle + anglePadding * 0.6,
        maxAngle: section.endAngle - anglePadding * 0.6
      };

  sortedEntries.forEach((bubble: BubbleDatum, idx: number) => {
        const size = bubbleSize(bubble.percentage);
        const ring = Math.floor(idx / basePerRing);
        const ringStartIndex = ring * basePerRing;
        const slotsInRing = Math.min(basePerRing, sortedEntries.length - ringStartIndex);
        const slot = idx - ringStartIndex;
        const effectiveAngle = Math.max(wedgeAngle - anglePadding * 2, 0.01);
        const angleStep = effectiveAngle / Math.max(slotsInRing, 1);
        const baseAngle = section.startAngle + anglePadding + angleStep * (slot + 0.5);
        const angleJitter = (randomBetween(hashString(`${bubble.key}-angle`), slot, -0.5, 0.5)) * angleStep * 0.35;
        const slotAngle = clamp(baseAngle + angleJitter, segmentConstraint.minAngle, segmentConstraint.maxAngle);

        const memory = previousPlacement.get(bubble.key);
        const hasMemory = memory && memory.segment === section.segment;
        const blendedAngle = hasMemory ? blendAngles(memory!.angle, slotAngle, 0.25) : slotAngle;
        const constrainedAngle = clamp(blendedAngle, segmentConstraint.minAngle, segmentConstraint.maxAngle);
        const angle = constrainedAngle - orientationOffset;

        const baseRadius = outerRadius - ringGap * ring - ringGap / 2;
        const radiusJitter = (randomBetween(hashString(`${bubble.key}-radius`), ring, -0.5, 0.5)) * ringGap * 0.45;
        const slotRadius = clamp(
          baseRadius + radiusJitter,
          innerRadius + size / 2 + BORDER_MARGIN,
          outerRadius - size / 2 - BORDER_MARGIN
        );

        const radiusRange = Math.max(1, outerRadius - innerRadius);
        const memoryRadius = hasMemory
          ? clamp(
              innerRadius + clamp(memory!.radiusFactor, 0, 1) * radiusRange,
              innerRadius + size / 2 + BORDER_MARGIN,
              outerRadius - size / 2 - BORDER_MARGIN
            )
          : slotRadius;
        const radius = hasMemory ? blendValues(memoryRadius, slotRadius, 0.35) : slotRadius;

        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);

        positions.push({
          ...bubble,
          x,
          y,
          size
        });
      });
    });

    const resolvedPositions = resolveCollisions(positions, {
      arcs,
      centerX: cx,
      centerY: cy,
      innerRadius,
      outerRadius,
      orientationOffset,
      anglePadding,
      borderMargin: BORDER_MARGIN
    });

    const placementSnapshot = buildPlacementSnapshot(
      resolvedPositions,
      cx,
      cy,
      orientationOffset,
      innerRadius,
      outerRadius
    );

    return {
      positions: resolvedPositions,
      arcs,
      labels,
      height: canvasHeight,
      centerX: cx,
      centerY: cy,
      outerRadius,
      innerRadius,
      placement: placementSnapshot
    };
  }, [bubbles, drawingWidth, displayOrder]);

  const { positions: layout, arcs, labels, height: canvasHeight, centerX, centerY, placement } = geometry;
  const hasMeasurement = width > 0;
  const innerWidthPx = hasMeasurement ? `${drawingWidth}px` : '100%';
  const svgWidthValue = hasMeasurement ? drawingWidth : Math.max(width, 1) || 1;

  useEffect(() => {
    previousPlacementRef.current = placement;
  }, [placement]);

  return (
    <Box px={{ base: 2, md: 4 }} py={{ base: 4, md: 6 }} width="100%">
      <Box border="2px solid" borderColor="black" borderRadius="32px" bg="white" overflow="hidden">
        <Box borderBottom="2px solid" borderColor="black" px={{ base: 4, md: 6 }} py={2}>
          <Text fontWeight="bold" fontSize="lg">European Comparison</Text>
          <Text fontSize="sm" color="gray.600">Countries grouped by majority social alignment</Text>
        </Box>
        <Box px={{ base: 2, md: 6 }} py={{ base: 4, md: 6 }}>
          <Box position="relative" height={`${canvasHeight}px`} ref={canvasRef}>
            <Box position="absolute" inset={0} pointerEvents="none" display="flex" justifyContent="center">
              <Box position="relative" width={innerWidthPx} height="100%">
                <svg
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${svgWidthValue} ${canvasHeight}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  <g transform={`translate(${centerX}, ${centerY})`}>
                    {arcs.map(arc => (
                      <path
                        key={arc.segment}
                        d={arc.path}
                        fill={withAlpha(categoryPalette[arc.segment], 0.18)}
                        stroke="#111"
                        strokeWidth={1.5}
                      />
                    ))}
                  </g>
                  {labels.map(label => (
                    <text
                      key={label.segment}
                      x={label.x}
                      y={label.y}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={600}
                      fill="#1a202c"
                    >
                      {label.segment}
                    </text>
                  ))}
                </svg>
              </Box>
            </Box>
            <Box position="absolute" inset={0} pointerEvents="none" display="flex" justifyContent="center">
              <Box position="relative" width={innerWidthPx} height="100%">
                {layout.map((bubble: BubbleWithPosition) => (
                  <CountryBubble key={bubble.key} bubble={bubble} onToggleCountry={onToggleCountry} />
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function CountryBubble({ bubble, onToggleCountry }: { bubble: BubbleWithPosition; onToggleCountry?: (country: CountryKey) => void }) {
  const { key, x, y, size, label, flag, flagUrl, percentage, color } = bubble;
  const flagStyle = FLAG_BACKGROUND_OVERRIDES[key] || {};

  return (
    <Tooltip label={`${label} • ${percentage.toFixed(1)}%`} openDelay={150} placement="top" hasArrow>
      <Box
        position="absolute"
        left={0}
        top={0}
    width={`${size}px`}
    height={`${size}px`}
  borderRadius="full"
  border="1px solid #0f0f0f"
  boxShadow={`0 6px 18px rgba(0, 0, 0, 0.18), 0 0 0 3px ${color}, 0 0 0 6px rgba(255, 255, 255, 0.35)`}
        bg={flagUrl ? 'transparent' : 'white'}
        overflow="hidden"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
        gap={0}
        style={{
          backgroundImage: flagUrl ? `url(${flagUrl})` : undefined,
          backgroundSize: flagStyle.backgroundSize ?? 'cover',
          backgroundPosition: flagStyle.backgroundPosition ?? 'center',
          backgroundRepeat: 'no-repeat',
          transform: `translate(${x - size / 2}px, ${y - size / 2}px)`,
          transition: 'transform 320ms cubic-bezier(0.4, 0, 0.2, 1), width 320ms ease, height 320ms ease'
        }}
        cursor="pointer"
        role="button"
        aria-label={`Select ${label}`}
        onClick={() => onToggleCountry?.(key)}
        pointerEvents="auto"
      >
        {!flagUrl && (
          <Flex
            position="relative"
            zIndex={1}
            direction="column"
            align="center"
            justify="center"
            height="100%"
          >
            <Text fontSize={size > 60 ? '2xl' : 'xl'} lineHeight="1">
              {flag}
            </Text>
          </Flex>
        )}
      </Box>
    </Tooltip>
  );
}

function bubbleSize(percentage: number) {
  if (!Number.isFinite(percentage)) return BUBBLE_MIN;
  const clamped = clamp(percentage, 4, 55);
  const t = (clamped - 4) / (55 - 4);
  return Math.round(BUBBLE_MIN + t * (BUBBLE_MAX - BUBBLE_MIN));
}

function normalizeSegment(value?: string | null): SegmentKey {
  if (value && (LEANING_SEGMENTS as readonly string[]).includes(value)) {
    return value as SegmentKey;
  }
  return 'Centre';
}

function withAlpha(hex: string | undefined, alpha: number) {
  if (!hex) return `rgba(17, 17, 17, ${alpha})`;
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = Math.imul(31, hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

function randomBetween(seed: number, iteration: number, min: number, max: number) {
  const rng = mulberry32(seed + iteration * 9973);
  return min + rng() * (max - min);
}

function mulberry32(seed: number) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sortEntriesWithMemory(
  entries: BubbleDatum[],
  segment: SegmentKey,
  placement: Map<CountryKey, PlacementSnapshot>,
  displayOrder: CountryKey[]
) {
  if (entries.length <= 1) return entries.slice();
  const orderIndex = new Map<CountryKey, number>();
  displayOrder.forEach((key, idx) => orderIndex.set(key, idx));
  return [...entries].sort((a, b) => {
    const aPrev = placement.get(a.key);
    const bPrev = placement.get(b.key);
    const aValid = aPrev && aPrev.segment === segment;
    const bValid = bPrev && bPrev.segment === segment;
    if (aValid && bValid && aPrev!.angle !== bPrev!.angle) {
      return aPrev!.angle - bPrev!.angle;
    }
    if (aValid && !bValid) return -1;
    if (!aValid && bValid) return 1;
    const baseDiff = (orderIndex.get(a.key) ?? 0) - (orderIndex.get(b.key) ?? 0);
    if (baseDiff !== 0) return baseDiff;
    return a.key.localeCompare(b.key);
  });
}

type CollisionOptions = {
  arcs: SegmentArc[];
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
  orientationOffset: number;
  anglePadding: number;
  borderMargin: number;
};

function resolveCollisions(positions: BubbleWithPosition[], options: CollisionOptions) {
  if (!positions.length) return positions;
  const nodes = positions.map(position => ({ ...position }));
  const constraints = new Map<SegmentKey, { minAngle: number; maxAngle: number }>();
  options.arcs.forEach(arc => {
    constraints.set(arc.segment, {
      minAngle: arc.startAngle + options.anglePadding * 0.6,
      maxAngle: arc.endAngle - options.anglePadding * 0.6
    });
  });

  const maxIterations = 6;
  for (let iter = 0; iter < maxIterations; iter++) {
    let adjusted = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (a.category !== b.category) continue;
  const minDist = (a.size + b.size) / 2 + COLLISION_PADDING;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        if (dist === 0) {
          const dir = pairUnitVector(a.key, b.key);
          dx = dir.x;
          dy = dir.y;
          dist = 1;
        }
        if (dist < minDist) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
          adjusted = true;
        }
      }
    }
  nodes.forEach(node => clampNodeToSegment(node, constraints, options));
    if (!adjusted) break;
  }

  return nodes;
}

function clampNodeToSegment(
  node: BubbleWithPosition,
  constraints: Map<SegmentKey, { minAngle: number; maxAngle: number }>,
  options: CollisionOptions
) {
  const dx = node.x - options.centerX;
  const dy = node.y - options.centerY;
  let radius = Math.hypot(dx, dy);
  let angle = Math.atan2(dy, dx) + options.orientationOffset;
  const constraint = constraints.get(node.category);
  if (constraint) {
    angle = clamp(angle, constraint.minAngle, constraint.maxAngle);
  }
  radius = clamp(
    radius,
    options.innerRadius + node.size / 2 + options.borderMargin,
    options.outerRadius - node.size / 2 - options.borderMargin
  );
  const finalAngle = angle - options.orientationOffset;
  node.x = options.centerX + radius * Math.cos(finalAngle);
  node.y = options.centerY + radius * Math.sin(finalAngle);
}

function pairUnitVector(aKey: CountryKey, bKey: CountryKey) {
  const hash = hashString(`${aKey}-${bKey}`);
  const angle = ((hash % 3600) / 3600) * Math.PI * 2;
  return {
    x: Math.cos(angle),
    y: Math.sin(angle)
  };
}

function buildPlacementSnapshot(
  positions: BubbleWithPosition[],
  centerX: number,
  centerY: number,
  orientationOffset: number,
  innerRadius: number,
  outerRadius: number
) {
  const snapshot = new Map<CountryKey, PlacementSnapshot>();
  const radiusRange = Math.max(1, outerRadius - innerRadius);
  positions.forEach(position => {
    const dx = position.x - centerX;
    const dy = position.y - centerY;
    const angle = Math.atan2(dy, dx) + orientationOffset;
    const radius = Math.hypot(dx, dy);
    const radiusFactor = clamp((radius - innerRadius) / radiusRange, 0, 1);
    snapshot.set(position.key, {
      segment: position.category,
      angle,
      radiusFactor
    });
  });
  return snapshot;
}

function blendAngles(from: number, to: number, factor: number) {
  const t = clamp(factor, 0, 1);
  if (t <= 0) return from;
  if (t >= 1) return to;
  const x = Math.cos(from) * (1 - t) + Math.cos(to) * t;
  const y = Math.sin(from) * (1 - t) + Math.sin(to) * t;
  return Math.atan2(y, x);
}

function blendValues(from: number, to: number, factor: number) {
  const t = clamp(factor, 0, 1);
  return from * (1 - t) + to * t;
}


