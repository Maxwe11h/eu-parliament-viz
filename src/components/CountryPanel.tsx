"use client";
import { Box, Text, HStack, Badge, Button, Flex, Table, Thead, Tr, Th, Tbody, Td, VStack } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { useData } from './DataContext';
import { YearData, CountryKey, GenderYearData } from '@/types';
import PartyTable from './PartyTable';
import Spectrum from './Spectrum';
import ElectionDonut from './ElectionDonut';
import LeaningBarChart from './LeaningBarChart';
import { categoryPalette } from '@/lib/colors';
import { majoritySocialCategory } from '@/lib/analytics';
import { getCountryFreedomYear } from '@/lib/democracy';
import { getCountryLabel } from '@/lib/countryMeta';
import { formatFemaleShare, getGenderColor } from '@/lib/gender';

type CountryPanelProps = {
  country?: CountryKey;
  data?: YearData;
  genderData?: GenderYearData;
  onAlternateToggle?: (open: boolean) => void;
};

export default function CountryPanel({ country, data, genderData, onAlternateToggle }: CountryPanelProps) {
  const { year, allData, setCountry, dataView } = useData();
  const [showAlternatePanel, setShowAlternatePanel] = useState(false);
  const dataYear = data?.year;
  const freedomYear = country ? getCountryFreedomYear(country) : undefined;
  const blockedByDemocracy = !!(country && freedomYear && typeof year === 'number' && year < freedomYear);
  const isGenderView = dataView === 'gender';
  const displayedYear = blockedByDemocracy ? year : (isGenderView ? (genderData?.year ?? year) : (dataYear ?? year));
  const label = country ? getCountryLabel(country) : 'Select a country';
  const majority = (!blockedByDemocracy && country && displayedYear && data && !isGenderView)
    ? majoritySocialCategory(allData, country, displayedYear)
    : null;
  const activeParties = data ? data.parties.filter(p => (p.votes ?? 0) > 0).length : 0;

  const handleClose = () => setCountry(undefined);
  type PanelView = 'political' | 'gender';
  const primaryView: PanelView = isGenderView ? 'gender' : 'political';
  const alternateView: PanelView = primaryView === 'gender' ? 'political' : 'gender';

  // Hide drawer when no country is selected or the main view changes
  useEffect(() => {
    if (!country) setShowAlternatePanel(false);
  }, [country]);
  useEffect(() => {
    if (onAlternateToggle) onAlternateToggle(showAlternatePanel);
  }, [showAlternatePanel, onAlternateToggle]);

  if (!country) return null;

  const renderPanel = (viewMode: PanelView, isSecondary = false) => {
    const isGenderMode = viewMode === 'gender';
    const panelDisplayedYear = blockedByDemocracy
      ? year
      : (isGenderMode ? (genderData?.year ?? year) : (dataYear ?? year));
    const panelMajority = (!blockedByDemocracy && country && panelDisplayedYear && data && !isGenderMode)
      ? majoritySocialCategory(allData, country, panelDisplayedYear)
      : null;
    const panelActiveParties = data ? data.parties.filter(p => (p.votes ?? 0) > 0).length : 0;
    const header = (
      <Box
        borderBottom="2px solid"
        borderColor="black"
        px={6}
        py={5}
        bg={isSecondary ? 'gray.50' : 'white'}
        minH="100px"
        display="flex"
        alignItems="center"
      >
        {isSecondary ? (
          <Flex justify="center" align="center" w="100%" minH="72px">
            <Text fontWeight="bold" fontSize="2xl">{isGenderMode ? 'Gender Data' : 'Political Data'}</Text>
          </Flex>
        ) : (
          <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap={4} flexWrap="wrap" w="100%">
            <Box>
              <Text fontWeight="bold" fontSize="lg">{label}</Text>
              <Text fontSize="sm" color="gray.600">
                {isGenderMode ? 'Latest gender data' : 'Most recent election'}: {isGenderMode ? (genderData?.year ?? '—') : (dataYear ?? '—')}
              </Text>
              {(isGenderMode ? genderData?.total : data?.total) && (
                <Text fontSize="sm" color="gray.600">{(isGenderMode ? genderData?.total : data?.total)?.toLocaleString()} seats</Text>
              )}
            </Box>
            <VStack spacing={2} align="stretch">
              <Button
                size="sm"
                variant="outline"
                colorScheme="gray"
                onClick={() => setShowAlternatePanel(!showAlternatePanel)}
                w="full"
              >
                {showAlternatePanel ? 'Hide other view' : 'Show other view'}
              </Button>
              <Button size="sm" variant="ghost" leftIcon={<FaTimes />} onClick={handleClose} color="gray.600" w="full">
                Close
              </Button>
            </VStack>
          </Flex>
        )}
      </Box>
    );

    if (blockedByDemocracy) {
      return (
        <Box borderBottom="2px solid" borderColor="black" bg="white" key={`${viewMode}-blocked`}>
          {header}
          <Box px={6} py={5}>
            <Text fontSize="sm" color="gray.700">
              {label} did not hold free parliamentary elections until <b>{freedomYear}</b>. Data visualizations are unavailable prior to that transition.
            </Text>
          </Box>
        </Box>
      );
    }

    if (isGenderMode) {
      if (!genderData) {
        return (
          <Box borderBottom="2px solid" borderColor="black" bg="white" key={`${viewMode}-empty`}>
            {header}
            <Box px={6} py={5}>
              <Text fontSize="sm" color="gray.700">
                No gender data is available for {label}{panelDisplayedYear ? ` in ${panelDisplayedYear}` : ''}.
              </Text>
            </Box>
          </Box>
        );
      }

      return (
        <Box borderBottom="2px solid" borderColor="black" bg="white" key={`${viewMode}-content`}>
          {header}
          <Box borderBottom="2px solid" borderColor="black" px={6} py={4} bg="gray.50" minH="96px" display="flex" alignItems="center">
            <HStack spacing={3} flexWrap="wrap">
              <Badge bg={getGenderColor(genderData.femalePct)} color="black" px={4} py={2} borderRadius="999px" fontWeight="bold" border="1px solid black">
                {formatFemaleShare(genderData.femalePct)}
              </Badge>
            </HStack>
          </Box>

          <Box borderBottom="2px solid" borderColor="black" px={6} pt={5} pb={6} display="flex" flexDirection="column" gap={3}>
            <Text fontWeight="semibold" fontSize="md">Representation split</Text>
            <Box width="100%" bg="#fde4ee" borderRadius="12px" overflow="hidden" border="1px solid" borderColor="#f4cfe0" height="26px">
              <Box height="100%" width={`${Math.min(100, Math.max(0, genderData.femalePct))}%`} bg="#e75480" transition="width 200ms ease" />
            </Box>
            <HStack justify="space-between" spacing={4} fontSize="sm">
              <Text fontWeight="semibold" color="gray.800">Women: {genderData.femalePct.toFixed(1)}%</Text>
              <Text color="gray.700">Men: {genderData.malePct.toFixed(1)}%</Text>
            </HStack>
          </Box>

          <Box borderBottom="0px solid" borderColor="black" px={0} py={0} bg="white">
            <Table size="sm" width="100%">
              <Thead>
                <Tr borderBottom="2px solid" borderColor="gray.800">
                  <Th fontSize="sm" fontWeight="bold" py={3}>Gender</Th>
                  <Th isNumeric fontSize="sm" fontWeight="bold" py={3}>Seats</Th>
                  <Th isNumeric fontSize="sm" fontWeight="bold" py={3}>%</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr bg="#fde4ee" borderBottom="1px solid" borderColor="#f4cfe0">
                  <Td fontWeight="semibold" color="#7a1035">Female</Td>
                  <Td isNumeric fontWeight="semibold" color="#7a1035">{genderData.female.toLocaleString()}</Td>
                  <Td isNumeric fontWeight="semibold" color="#7a1035">{genderData.femalePct.toFixed(1)}%</Td>
                </Tr>
                <Tr bg="#e3eeff">
                  <Td fontWeight="semibold" color="#103a7a">Male</Td>
                  <Td isNumeric fontWeight="semibold" color="#103a7a">{genderData.male.toLocaleString()}</Td>
                  <Td isNumeric fontWeight="semibold" color="#103a7a">{genderData.malePct.toFixed(1)}%</Td>
                </Tr>
              </Tbody>
            </Table>
          </Box>
        </Box>
      );
    }

    if (!data) {
      return (
        <Box borderBottom="2px solid" borderColor="black" bg="white" key={`${viewMode}-empty`}>
          {header}
          <Box px={6} py={5}>
            <Text fontSize="sm" color="gray.700">
              No election data is available for {label}{panelDisplayedYear ? ` in ${panelDisplayedYear}` : ''}.
            </Text>
          </Box>
        </Box>
      );
    }

    return (
      <Box borderBottom="2px solid" borderColor="black" bg="white" key={`${viewMode}-content`}>
        {header}
        <Box borderBottom="2px solid" borderColor="black" px={6} py={4} bg="gray.50" minH="96px" display="flex" alignItems="center">
          <HStack spacing={3} flexWrap="wrap">
            {panelMajority?.category && (
              <Badge bg={categoryPalette[panelMajority.category] || 'gray.400'} color="white" px={4} py={2} borderRadius="999px" fontWeight="bold">
                {panelMajority.category}
                {panelMajority.percentage ? ` • ${panelMajority.percentage.toFixed(1)}%` : ''}
              </Badge>
            )}
            <Badge borderRadius="999px" px={4} py={2} bg="gray.100" fontWeight="semibold" color="gray.700">
              {panelActiveParties} active parties
            </Badge>
          </HStack>
        </Box>

        <Box borderBottom="2px solid" borderColor="black" px={6} pt={4} pb={6} display="flex" alignItems="start" justifyContent="center">
          <ElectionDonut data={data} />
        </Box>

        <Box borderBottom="2px solid" borderColor="black" p={2} bg="white">
          <Spectrum data={data} size={520} />
        </Box>

        <Box borderBottom="2px solid" borderColor="black" px={6} py={2}>
          <LeaningBarChart data={data} />
        </Box>

        <Box px={0} py={0}>
          <PartyTable data={data} year={data.year} title={false} />
        </Box>
      </Box>
    );
  };

  const panelWidth = 400;
  const drawerVisible = showAlternatePanel && !!country;

  return (
    <Box
      h="100%"
      w={{ base: '100%', md: `${panelWidth}px` }}
      flexShrink={0}
      bg="white"
      position="relative"
      overflow="visible"
    >
      <Box
        position="absolute"
        top={0}
        bottom={0}
        right="100%"
        width={{ base: '100%', md: `${panelWidth}px` }}
        maxW={{ base: '100%', md: '70vw' }}
        bg="white"
        boxShadow="2px 0 16px rgba(0,0,0,0.15)"
        borderLeft="2px solid"
        borderRight="2px solid"
        borderColor="black"
        transform={drawerVisible ? 'translateX(0)' : `translateX(calc(100vw + ${panelWidth}px))`}
        transition="transform 240ms ease"
        pointerEvents={drawerVisible ? 'auto' : 'none'}
        overflowY="auto"
        overflowX="hidden"
        visibility={drawerVisible ? 'visible' : 'hidden'}
        zIndex={1}
      >
        {renderPanel(alternateView, true)}
      </Box>

      <Box position="relative" h="100%" w="100%" overflow="auto" boxShadow="lg" zIndex={3} bg="white">
        {renderPanel(primaryView, false)}
      </Box>
    </Box>
  );
}

