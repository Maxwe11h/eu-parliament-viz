"use client";

import { Box, Flex, Text } from '@chakra-ui/react';
import { YearData } from '@/types';
import { categoryPalette } from '@/lib/colors';
import { getDetailedLeaningTotals } from '@/lib/analytics';

const CHART_HEIGHT = 240;
const ORDER: Array<'Far Left' | 'Left' | 'Centre-Left' | 'Centre' | 'Centre-Right' | 'Right' | 'Far Right'> = [
  'Far Left',
  'Left',
  'Centre-Left',
  'Centre',
  'Centre-Right',
  'Right',
  'Far Right'
];
const ABBR: Record<(typeof ORDER)[number], string> = {
  'Far Left': 'FL',
  'Left': 'L',
  'Centre-Left': 'CL',
  'Centre': 'C',
  'Centre-Right': 'CR',
  'Right': 'R',
  'Far Right': 'FR'
};
const TICKS = [100, 75, 50, 25, 0];

export default function LeaningBarChart({ data }: { data?: YearData }) {
  const distribution = getDetailedLeaningTotals(data);
  const hasData = distribution.some(segment => segment.votes > 0);

  const ordered = ORDER.map(label => distribution.find(segment => segment.label === label) || {
    label,
    votes: 0,
    percentage: 0
  });

  return (
    <Box p={2}>
      <Text fontWeight="bold" fontSize="md">Ideological lean</Text>
      <Text fontSize="xs" color="gray.600" mb={4}>Percent of votes by political leaning</Text>
      {!hasData ? (
        <Text fontSize="sm" color="gray.500">Insufficient ideological data for this election year.</Text>
      ) : (
        <Box maxW="960px" mx="auto">
          <Flex gap={{ base: 2, md: 4 }} align="flex-end">
            <Box
              height={`${CHART_HEIGHT}px`}
              width={{ base: '44px', md: '56px' }}
              display="flex"
              flexDirection="column"
              justifyContent="space-between"
              alignItems="flex-end"
              mr={-10}
              transform="translate(-36px, -36px)"
            >
              {TICKS.map(tick => (
                <Text
                  key={`axis-${tick}`}
                  fontSize="xs"
                  color="gray.600"
                  fontWeight="semibold"
                  lineHeight="1"
                >
                  {tick}%
                </Text>
              ))}
            </Box>
            <Box flex="1">
              <Box position="relative" height={`${CHART_HEIGHT}px`} borderLeft="2px solid black" borderBottom="2px solid black">
                {TICKS.filter(tick => tick > 0).map(tick => (
                  <Box
                    key={`grid-${tick}`}
                    position="absolute"
                    left="0"
                    right="0"
                    bottom={`${tick}%`}
                    borderTop="1px dashed rgba(0,0,0,0.15)"
                  />
                ))}
                <Box position="absolute" inset="0" px={{ base: 3, md: 6 }}>
                  <Box
                    display="grid"
                    gridTemplateColumns={`repeat(${ordered.length}, minmax(0, 1fr))`}
                    alignItems="end"
                    justifyItems="center"
                    height="100%"
                    gap={{ base: 2, md: 3 }}
                  >
                    {ordered.map(segment => {
                      const heightPx = (segment.percentage / 100) * CHART_HEIGHT;
                      const fill = categoryPalette[segment.label] || '#9ca3af';
                      return (
                        <Box key={segment.label} width="100%" display="flex" alignItems="flex-end" justifyContent="center">
                          <Box
                            width={{ base: '24px', md: '30px' }}
                            borderRadius="12px 12px 0 0"
                            bg={fill}
                            height={`${heightPx}px`}
                            transition="height 200ms ease"
                            boxShadow="0 6px 16px rgba(0,0,0,0.18)"
                          />
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>
              <Box
                display="grid"
                gridTemplateColumns={`repeat(${ordered.length}, minmax(0, 1fr))`}
                gap={{ base: 1, md: 2 }}
                justifyItems="center"
                mt={1}
                px={{ base: 3, md: 6 }}
              >
                {ordered.map(segment => (
                  <Box key={`label-${segment.label}`} textAlign="center">
                    <Text fontWeight="semibold" fontSize="xs">{ABBR[segment.label]}</Text>
                    <Text fontSize="8px" color="gray.600">
                      {segment.votes.toLocaleString()} seats
                    </Text>
                  </Box>
                ))}
              </Box>
            </Box>
          </Flex>
        </Box>
      )}
    </Box>
  );
}
