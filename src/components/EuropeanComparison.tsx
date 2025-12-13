"use client";

import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Popover,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  HStack,
  VStack,
  Tooltip,
  Tr
} from '@chakra-ui/react';
import * as d3 from 'd3';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CountryKey, GenderYearData, YearData } from '@/types';
import {
  getCountryAbbreviation,
  getCountryFlagEmoji,
  getCountryFlagUrl,
  getCountryLabel,
  orderedCountryKeys
} from '@/lib/countryMeta';
import { majoritySocialCategory } from '@/lib/analytics';
import { getGenderColor, getGenderYearDataForCountry, genderGradientStops } from '@/lib/gender';
import { FaInfoCircle } from 'react-icons/fa';
import { useData } from './DataContext';

const LEANING_SEGMENTS = ['Far Left', 'Left', 'Centre-Left', 'Centre', 'Centre-Right', 'Right', 'Far Right'] as const;
type SegmentKey = (typeof LEANING_SEGMENTS)[number];

type EuropeanComparisonProps = {
  allData: Record<CountryKey, YearData[]>;
  genderData: Record<CountryKey, GenderYearData[]>;
  year: number;
  populations: Partial<Record<CountryKey, number>>;
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
  population?: number;
};

type BubbleWithPosition = BubbleDatum & { x: number; y: number; size: number };
type SegmentArc = { segment: SegmentKey; startAngle: number; endAngle: number; path: string };
type SegmentLabel = { segment: SegmentKey; x: number; y: number };
type GeometrySnapshot = {
  targets: BubbleWithPosition[];
  arcs: SegmentArc[];
  labels: SegmentLabel[];
  height: number;
  centerX: number;
  centerY: number;
  outerRadius: number;
  innerRadius: number;
  signature: string;
};

type PopulationRange = { min: number; max: number } | null;
type PopulationRowInfo = { key: CountryKey; label: string; population: number };
type PopulationTableData = { rows: PopulationRowInfo[] };
type LegendItem = { segment: SegmentKey; color: string };

const BUBBLE_MIN = 20;
const BUBBLE_MAX = 60;
const MIN_CANVAS_HEIGHT = 420;
const BORDER_MARGIN = 8;
const COLLISION_PADDING = 1.5;
const VISUAL_MAX_WIDTH = 900;
const SEGMENT_FILL_ALPHA = 0.45;
const SEGMENT_STROKE_ALPHA = 0.65;
const SEGMENT_STROKE_WIDTH = 2.2;
const LABEL_EDGE_PADDING = 32;
const ANIMATION_DURATION = 80;
const GENDER_MAX = 50;

const FLAG_BACKGROUND_OVERRIDES: Partial<Record<CountryKey, { backgroundSize?: string; backgroundPosition?: string }>> = {
  ireland: {
    backgroundSize: '190%',
    backgroundPosition: 'center'
  }
};

export default function EuropeanComparison({ allData, genderData, year, populations, onToggleCountry }: EuropeanComparisonProps) {
  const { dataView, categoryPalette, paletteOrientation, setPaletteOrientation } = useData();
  const canvasRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const latestLayoutRef = useRef<BubbleWithPosition[]>([]);
  const handledSignatureRef = useRef<string>('');
  const [width, setWidth] = useState(0);
  const [layout, setLayout] = useState<BubbleWithPosition[]>([]);
  const lens: 'political' | 'gender' = dataView;
  const measuredWidth = width > 0 ? width : 0;
  const drawingWidth = measuredWidth > 0 ? Math.min(measuredWidth, VISUAL_MAX_WIDTH) : 0;
  const populationFormatter = useMemo(() => new Intl.NumberFormat('en-US'), []);
  const headerSubtitle = lens === 'gender'
    ? 'Female parliamentary share (0–50% scale)'
    : 'Countries grouped by majority social alignment • bubbles scale with national population';

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

  const populationRange = useMemo<PopulationRange>(() => {
    const values = displayOrder
      .map(key => populations[key])
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
    if (!values.length) return null;
    return {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }, [displayOrder, populations]);

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
        color: categoryPalette[category] || '#1a202c',
        population: populations[key]
      };
    });
  }, [allData, displayOrder, populations, year, categoryPalette]);

  const genderEntries = useMemo(() => {
    return displayOrder
      .map(key => {
        const entry = getGenderYearDataForCountry(genderData, key, year);
        if (!entry) return null;
        return {
          key,
          label: getCountryLabel(key),
          pct: entry.femalePct,
          population: populations[key],
          flagUrl: getCountryFlagUrl(key, 160),
          flag: getCountryFlagEmoji(key)
        } as GenderBarEntry;
      })
      .filter((v): v is GenderBarEntry => v !== null);
  }, [displayOrder, year, genderData, populations]);

  const populationTable = useMemo<PopulationTableData>(() => {
    const rows = displayOrder
      .map(key => {
        const value = populations[key];
        if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
          return null;
        }
        return { key, label: getCountryLabel(key), population: value } as PopulationRowInfo;
      })
      .filter((row): row is PopulationRowInfo => row !== null)
      .sort((a, b) => b.population - a.population);
    return { rows };
  }, [displayOrder, populations]);
  const hasPopulationTable = populationTable.rows.length > 0;

  const geometry = useMemo<GeometrySnapshot>(() => {
    if (!drawingWidth) {
      return {
        targets: [] as BubbleWithPosition[],
        arcs: [],
        labels: [],
        height: MIN_CANVAS_HEIGHT,
        centerX: 0,
        centerY: MIN_CANVAS_HEIGHT - 60,
        outerRadius: 0,
        innerRadius: 0,
        signature: ''
      };
    }

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
      const rawX = cx + labelRadius * Math.cos(mid);
      const yOffset = arc.segment === 'Centre' ? +32 : 0;
      const maxLabelX = Math.max(LABEL_EDGE_PADDING, drawingWidth - LABEL_EDGE_PADDING);
      return {
        segment: arc.segment,
        x: clamp(rawX, LABEL_EDGE_PADDING, maxLabelX),
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

      const sortedEntries: BubbleDatum[] = sortEntries(entries, displayOrder);
      const rings = Math.max(1, Math.ceil(sortedEntries.length / basePerRing));
      const ringGap = (outerRadius - innerRadius) / Math.max(1, rings);
      const segmentConstraint = {
        minAngle: section.startAngle + anglePadding * 0.6,
        maxAngle: section.endAngle - anglePadding * 0.6
      };

      sortedEntries.forEach((bubble, idx) => {
        const size = bubbleSize(bubble.population, populationRange, bubble.percentage);
        const ring = Math.floor(idx / basePerRing);
        const ringStartIndex = ring * basePerRing;
        const slotsInRing = Math.min(basePerRing, sortedEntries.length - ringStartIndex);
        const slot = idx - ringStartIndex;
        const effectiveAngle = Math.max(wedgeAngle - anglePadding * 2, 0.01);
        const angleStep = effectiveAngle / Math.max(slotsInRing, 1);
        const baseAngle = section.startAngle + anglePadding + angleStep * (slot + 0.5);
        const angleJitter = (randomBetween(hashString(`${bubble.key}-angle`), slot, -0.4, 0.4)) * angleStep * 0.25;
        const slotAngle = clamp(baseAngle + angleJitter, segmentConstraint.minAngle, segmentConstraint.maxAngle);
        const angle = slotAngle - orientationOffset;

        const baseRadius = outerRadius - ringGap * ring - ringGap / 2;
        const radiusJitter = (randomBetween(hashString(`${bubble.key}-radius`), ring, -0.45, 0.45)) * ringGap * 0.4;
        const radius = clamp(
          baseRadius + radiusJitter,
          innerRadius + size / 2 + BORDER_MARGIN,
          outerRadius - size / 2 - BORDER_MARGIN
        );

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

    const resolvedTargets = resolveCollisions(positions, {
      arcs,
      centerX: cx,
      centerY: cy,
      innerRadius,
      outerRadius,
      orientationOffset,
      anglePadding,
      borderMargin: BORDER_MARGIN
    });

    const signature = resolvedTargets
      .map(node => `${node.key}:${node.x.toFixed(2)}:${node.y.toFixed(2)}:${node.size}`)
      .join('|');

    return {
      targets: resolvedTargets,
      arcs,
      labels,
      height: canvasHeight,
      centerX: cx,
      centerY: cy,
      outerRadius,
      innerRadius,
      signature
    };
  }, [bubbles, drawingWidth, displayOrder, populationRange]);

  const { targets, arcs, labels, height: canvasHeight, centerX, centerY, signature } = geometry;
  const hasMeasurement = width > 0;
  const fallbackWidth = 960;
  const resolvedWidth = hasMeasurement ? Math.max(width, 1) : fallbackWidth;
  const innerWidthPx = `${Math.min(resolvedWidth, VISUAL_MAX_WIDTH)}px`;
  const svgWidthValue = Math.min(resolvedWidth, VISUAL_MAX_WIDTH);
  const genderWidth = hasMeasurement ? Math.max(width, 1) : fallbackWidth;

  useEffect(() => {
    latestLayoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    if (signature === handledSignatureRef.current) {
      return;
    }
    handledSignatureRef.current = signature;

    const targetPositions = targets;

    if (!targetPositions.length) {
      setLayout([]);
      latestLayoutRef.current = [];
      return;
    }

    const previousMap = new Map(latestLayoutRef.current.map(position => [position.key, position]));
    if (!previousMap.size) {
      setLayout(targetPositions);
      latestLayoutRef.current = targetPositions;
      return;
    }

  const duration = ANIMATION_DURATION;
    const animationEntries = targetPositions.map(target => {
      const previous = previousMap.get(target.key);
      return {
        target,
        startX: previous?.x ?? centerX,
        startY: previous?.y ?? centerY,
        startSize: previous?.size ?? target.size
      };
    });

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const startTime = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = easeInOutCubic(progress);
      const framePositions = animationEntries.map(entry => ({
        ...entry.target,
        x: lerp(entry.startX, entry.target.x, eased),
        y: lerp(entry.startY, entry.target.y, eased),
        size: lerp(entry.startSize, entry.target.size, eased)
      }));
      setLayout(framePositions);
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        animationFrameRef.current = null;
        latestLayoutRef.current = framePositions;
      }
    };

    step(startTime);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [targets, signature, centerX, centerY]);

  const genderChartHeight = 480;
  const legendItems = LEANING_SEGMENTS.map(segment => ({
    segment,
    color: categoryPalette[segment] || '#1a202c'
  }));

  return (
    <Box px={{ base: 2, md: 4 }} py={{ base: 4, md: 6 }} width="100%">
      <Box border="2px solid" borderColor="black" borderRadius="32px" bg="white" overflow="hidden">
        <Box borderBottom="2px solid" borderColor="black" px={{ base: 4, md: 6 }} py={2}>
          <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap={3} flexWrap="wrap">
            <Box>
              <Text fontWeight="bold" fontSize="lg">European Comparison</Text>
              <Text fontSize="sm" color="gray.600">{headerSubtitle}</Text>
            </Box>
            <Flex gap={2} align="center">
              <Text fontSize="sm" color="gray.700" fontWeight="semibold">
                {lens === 'gender' ? 'Gender view' : 'Political view'}
              </Text>
              <LegendPopover
                items={legendItems}
                paletteOrientation={paletteOrientation}
                setPaletteOrientation={setPaletteOrientation}
              />
              {hasPopulationTable && (
                <PopulationReferencePopover rows={populationTable.rows} formatter={populationFormatter} />
              )}
            </Flex>
          </Flex>
        </Box>
        <Box px={{ base: 2, md: 6 }} py={{ base: 4, md: 6 }}>
          <Box
            position="relative"
            height={lens === 'political' ? `${canvasHeight}px` : `${genderChartHeight}px`}
            ref={canvasRef}
          >
            {lens === 'political' ? (
              <>
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
                            fill={withAlpha(categoryPalette[arc.segment], SEGMENT_FILL_ALPHA)}
                            stroke={withAlpha(categoryPalette[arc.segment], SEGMENT_STROKE_ALPHA)}
                            strokeWidth={SEGMENT_STROKE_WIDTH}
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
              </>
            ) : (
              <GenderBarComparison
                entries={genderEntries as GenderBarEntry[]}
                width={genderWidth}
                containerWidth="100%"
                populationRange={populationRange}
                onToggleCountry={onToggleCountry}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function CountryBubble({ bubble, onToggleCountry }: { bubble: BubbleWithPosition; onToggleCountry?: (country: CountryKey) => void }) {
  const { key, x, y, size, label, flag, flagUrl, color } = bubble;
  const flagStyle = FLAG_BACKGROUND_OVERRIDES[key] || {};

  return (
    <Tooltip label={label} openDelay={150} placement="top" bg="gray.900" color="white" fontWeight="bold">
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

type GenderBarEntry = { key: CountryKey; label: string; pct: number; population?: number; flagUrl?: string; flag: string };

function GenderBarComparison({ entries, width, containerWidth, populationRange, onToggleCountry }: { entries: GenderBarEntry[]; width: number; containerWidth: string | number; populationRange: PopulationRange; onToggleCountry?: (country: CountryKey) => void }) {
  const chartHeight = 480;
  const leftPad = 56;
  const rightPad = 56;
  const barHeight = 16;
  const deadZonePadding = 10;
  const effectiveWidth = width > 0 ? width -4 : 960;
  const usableWidth = Math.max(effectiveWidth - leftPad - rightPad, 1);
  const bandY = chartHeight * 0.64;
  const tickYOffset = -27;
  const bandHalfHeight = 220;
  const pad = 3;
  const baseLaneOffset = 120;

  if (!entries.length) {
    return (
      <Box border="1px dashed" borderColor="gray.300" borderRadius="20px" p={6} textAlign="center" color="gray.600">
        No gender data available for the selected year.
      </Box>
    );
  }

  const tickValues = Array.from({ length: GENDER_MAX / 10 + 1 }, (_, idx) => idx * 10);
  const populationWeighted = entries
    .map(entry => (typeof entry.population === 'number' && entry.population > 0 ? entry : null))
    .filter((v): v is GenderBarEntry => v !== null);
  const weightedTotal = populationWeighted.reduce((sum, entry) => sum + entry.pct * (entry.population as number), 0);
  const populationSum = populationWeighted.reduce((sum, entry) => sum + (entry.population as number), 0);
  const unweightedAverage = entries.reduce((sum, entry) => sum + entry.pct, 0) / entries.length;
  const averagePct = populationSum > 0 ? weightedTotal / populationSum : unweightedAverage;
  const clampedAverage = clamp(averagePct, 0, GENDER_MAX);
  const averageX = leftPad + (clampedAverage / GENDER_MAX) * usableWidth;

  // Build initial nodes
  const nodes = entries.map((entry, idx) => {
    const clamped = clamp(entry.pct, 0, GENDER_MAX);
    const ratio = clamped / GENDER_MAX;
    const baseX = leftPad + ratio * usableWidth;
    const size = bubbleSize(entry.population, populationRange, entry.pct);
    const jitterX = ((hashString(`${entry.key}-x`) % 100) / 100 - 0.5) * Math.min(18, size * 0.28);
    const jitterY = ((hashString(`${entry.key}-y`) % 100) / 100 - 0.5) * 10;
    const laneDirection = -1; // keep bubbles above the bar
    const baseY = bandY + laneDirection * (baseLaneOffset + (idx % 4) * 8);
    return {
      entry,
      x: baseX + jitterX,
      y: baseY + jitterY,
      size
    };
  });

  // Resolve overlaps with simple force iterations
  for (let iter = 0; iter < 10; iter++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const minDist = (a.size + b.size) / 2 + pad;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        if (dist === 0) {
          dist = 0.001;
          dx = 0.001;
          dy = 0.001;
        }
        if (dist < minDist) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
          moved = true;
        }
      }
    }
    // Clamp inside bounds each iteration
    nodes.forEach(node => {
      const radius = node.size / 2;
      node.x = clamp(node.x, leftPad + radius, leftPad + usableWidth - radius);
      const minY = bandY - bandHalfHeight + radius;
      const maxY = bandY - (barHeight / 2 + deadZonePadding + radius);
      node.y = clamp(node.y, minY, maxY);
    });
    if (!moved) break;
  }

  return (
    <Box position="relative" height={`${chartHeight}px`} width={containerWidth}>
      <Box
        position="absolute"
        left={`${leftPad}px`}
        right={`${rightPad}px`}
        top={`${bandY - barHeight / 2}px`}
        height={`${barHeight}px`}
        borderRadius="12px"
        border="1px solid #f4cfe0"
        bg={`linear-gradient(90deg, ${genderGradientStops.start} 0%, ${genderGradientStops.end} 100%)`}
      />
      {tickValues.map(tick => {
        const ratio = tick / GENDER_MAX;
        const x = leftPad + ratio * usableWidth;
        return (
          <Box
            key={tick}
            position="absolute"
            left={`${x}px`}
            top={`${bandY - barHeight / 2 + tickYOffset}px`}
            transform="translateX(-50%)"
            display="flex"
            flexDirection="column"
            alignItems="center"
          >
            <Text mb={1} fontSize="xs" color="gray.700" textAlign="center">
              {tick}%
            </Text>
            <Box width="2px" height="28px" bg="gray.700" opacity={0.7} />
          </Box>
        );
      })}
      <Box position="absolute" left={`${averageX}px`} top={`${bandY + barHeight / 2 + 10}px`} transform="translateX(-50%)" textAlign="center" pointerEvents="none">
        <Box
          width="0"
          height="0"
          borderLeft="8px solid transparent"
          borderRight="8px solid transparent"
          borderTop="12px solid black"
          mx="auto"
        />
        <Text mt={1} fontSize="xs" fontWeight="semibold" color="gray.800">
          EU avg {clampedAverage.toFixed(1)}%
        </Text>
      </Box>
      {nodes.map(node => {
        const { entry, x, y, size } = node;
        const color = getGenderColor(entry.pct);
        const flagStyle = FLAG_BACKGROUND_OVERRIDES[entry.key] || {};
        return (
          <Tooltip key={entry.key} label={`${entry.label} • ${entry.pct.toFixed(1)}% women`} openDelay={80} bg="gray.900" color="white" fontWeight="bold">
            <Box
              position="absolute"
              left={`${x}px`}
              top={`${y}px`}
              transform="translate(-50%, -50%)"
              width={`${size}px`}
              height={`${size}px`}
              borderRadius="50%"
              bg={entry.flagUrl ? 'transparent' : color}
              border="1px solid #1a1a1a"
              boxShadow={`0 6px 18px rgba(0, 0, 0, 0.2), 0 0 0 3px ${color}, 0 0 0 6px rgba(255, 255, 255, 0.35)`}
              cursor={onToggleCountry ? 'pointer' : 'default'}
              onClick={() => onToggleCountry?.(entry.key)}
              transition="transform 280ms cubic-bezier(0.4, 0, 0.2, 1), width 280ms ease, height 280ms ease"
              style={{
                backgroundImage: entry.flagUrl ? `url(${entry.flagUrl})` : undefined,
                backgroundSize: flagStyle.backgroundSize ?? 'cover',
                backgroundPosition: flagStyle.backgroundPosition ?? 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              {!entry.flagUrl && (
                <Flex
                  position="relative"
                  zIndex={1}
                  direction="column"
                  align="center"
                  justify="center"
                  height="100%"
                >
                  <Text fontSize={size > 60 ? '2xl' : 'xl'} lineHeight="1">
                    {entry.flag}
                  </Text>
                </Flex>
              )}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

type LegendPopoverProps = {
  items: LegendItem[];
  paletteOrientation: 'american' | 'european';
  setPaletteOrientation: (o: 'american' | 'european') => void;
};

type PopulationReferencePopoverProps = {
  rows: PopulationRowInfo[];
  formatter: Intl.NumberFormat;
};

function PopulationReferencePopover({ rows, formatter }: PopulationReferencePopoverProps) {
  return (
    <Popover placement="bottom-end" trigger="click">
      <PopoverTrigger>
        <Button
          size="sm"
          variant="ghost"
          border="1px solid"
          borderColor="black"
          borderRadius="999px"
          leftIcon={<FaInfoCircle />}
        >
          Population table
        </Button>
      </PopoverTrigger>
      <PopoverContent border="2px solid" borderColor="black" borderRadius="24px" boxShadow="xl" maxW="360px">
        <PopoverBody p={0}>
          <Flex align="center" justify="space-between" px={4} pt={4} pb={2} borderBottom="1px solid" borderColor="gray.200">
            <Text fontWeight="semibold" fontSize="sm" color="gray.700">
              Population reference
            </Text>
            <PopoverCloseButton position="static" transform="none" borderRadius="999px" size="sm" />
          </Flex>
          <Box maxH="260px" overflowY="auto">
            <Table size="sm" variant="simple">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Country</Th>
                  <Th isNumeric>Population</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map(row => (
                  <Tr key={row.key} _hover={{ bg: 'gray.50' }}>
                    <Td fontWeight="medium">{row.label}</Td>
                    <Td isNumeric>{formatter.format(row.population)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

function LegendPopover({ items, paletteOrientation, setPaletteOrientation }: LegendPopoverProps) {
  return (
    <Popover placement="bottom-end" trigger="click">
      <PopoverTrigger>
        <Button
          size="sm"
          variant="ghost"
          border="1px solid"
          borderColor="black"
          borderRadius="999px"
          leftIcon={<FaInfoCircle />}
        >
          Legend
        </Button>
      </PopoverTrigger>
      <PopoverContent border="2px solid" borderColor="black" borderRadius="24px" boxShadow="xl" maxW="320px">
        <PopoverBody p={0}>
          <Flex align="center" justify="space-between" px={4} pt={4} pb={2} borderBottom="1px solid" borderColor="gray.200">
            <Text fontWeight="semibold" fontSize="sm" color="gray.700">
              Political legend
            </Text>
            <PopoverCloseButton position="static" transform="none" borderRadius="999px" size="sm" />
          </Flex>
          <Box px={4} py={3}>
            <HStack
              spacing={2}
              align="center"
              mb={3}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Text fontSize="xs" color="gray.700">Color convention</Text>
              <ButtonGroup size="xs" isAttached variant="outline">
                <Button
                  variant={paletteOrientation === 'european' ? 'solid' : 'ghost'}
                  colorScheme="gray"
                  onClick={() => setPaletteOrientation('european')}
                >
                  European
                </Button>
                <Button
                  variant={paletteOrientation === 'american' ? 'solid' : 'ghost'}
                  colorScheme="gray"
                  onClick={() => setPaletteOrientation('american')}
                >
                  American
                </Button>
              </ButtonGroup>
            </HStack>
            <VStack align="stretch" spacing={2}>
              {items.map(item => (
                <HStack key={item.segment} spacing={3} align="center">
                  <Box width="14px" height="14px" borderRadius="3px" bg={item.color} border="1px solid black" />
                  <Text fontWeight="semibold" fontSize="sm" color="gray.800">{item.segment}</Text>
                </HStack>
              ))}
            </VStack>
          </Box>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

function bubbleSize(population: number | undefined, range: PopulationRange, percentage: number) {
  if (range && typeof population === 'number' && population > 0) {
    const safeMin = Math.max(range.min, 1);
    const safeMax = Math.max(range.max, safeMin + 1);
    const logMin = Math.log(safeMin);
    const logMax = Math.log(safeMax);
    const logValue = Math.log(population);
    const normalized = logMax - logMin === 0 ? 0.5 : (logValue - logMin) / (logMax - logMin);
    const t = clamp(normalized, 0, 1);
    return Math.round(BUBBLE_MIN + t * (BUBBLE_MAX - BUBBLE_MIN));
  }
  return bubbleSizeFromPercentage(percentage);
}

function bubbleSizeFromPercentage(percentage: number) {
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

function sortEntries(entries: BubbleDatum[], displayOrder: CountryKey[]) {
  if (entries.length <= 1) return entries.slice();
  const orderIndex = new Map<CountryKey, number>();
  displayOrder.forEach((key, idx) => orderIndex.set(key, idx));
  return [...entries].sort((a, b) => {
    const diff = (orderIndex.get(a.key) ?? Number.POSITIVE_INFINITY) -
      (orderIndex.get(b.key) ?? Number.POSITIVE_INFINITY);
    if (diff !== 0) return diff;
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

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}


