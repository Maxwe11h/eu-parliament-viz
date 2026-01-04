"use client";
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Table,
  HStack,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Stack,
  Text,
  useOutsideClick
} from '@chakra-ui/react';
import { FaChevronDown, FaSearch, FaTimes } from 'react-icons/fa';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { CountryKey, YearData } from '@/types';
import type { GenderYearData } from '@/types';
import { useData } from './DataContext';
import ViewToggle from './ViewToggle';
import { getCountryLabel, orderedCountryKeys } from '@/lib/countryMeta';
import { getYearDataForCountry, majoritySocialCategory } from '@/lib/analytics';
import { getGenderYearDataForCountry } from '@/lib/gender';
import { getCountryFreedomYear } from '@/lib/democracy';
import ElectionDonut from './ElectionDonut';
import Spectrum from './Spectrum';
import LeaningBarChart from './LeaningBarChart';
import PartyTable from './PartyTable';
import EuropeanComparison from './EuropeanComparison';
import Timeline, { TIMELINE_MAX_YEAR, TIMELINE_MIN_YEAR } from './Timeline';
import DataLensToggle from './DataLensToggle';

const COLUMN_COUNT = 3;

export default function ComparisonView() {
  const { allData, genderData, year, setYear, comparisonSelections, setComparisonSelections, populations, paletteOrientation, setPaletteOrientation } = useData();
  const [yearQuery, setYearQuery] = useState(year.toString());

  useEffect(()=>{
    setYearQuery(year.toString());
  },[year]);

  const applyYearQuery = () => {
    const trimmed = yearQuery.trim();
    if (trimmed.length === 0) {
      setYearQuery(year.toString());
      return;
    }
    const requiredDigits = TIMELINE_MAX_YEAR.toString().length;
    if (trimmed.length < requiredDigits) {
      setYearQuery(year.toString());
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      setYearQuery(year.toString());
      return;
    }
    const normalized = clamp(Math.round(parsed), TIMELINE_MIN_YEAR, TIMELINE_MAX_YEAR);
    setYearQuery(normalized.toString());
    if (normalized !== year) {
      setYear(normalized);
    }
  };

  const handleYearInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyYearQuery();
    }
  };

  const handleYearInputBlur = () => {
    applyYearQuery();
  };

  const normalizeSelections = (values: (CountryKey | null)[]) => {
    if (values.length === COLUMN_COUNT) return values;
    return Array.from({ length: COLUMN_COUNT }, (_, idx) => values[idx] ?? null);
  };

  const selectedCountries = useMemo(() => normalizeSelections(comparisonSelections), [comparisonSelections]);

  const orderedKeys = useMemo(() => {
    const present = new Set(Object.keys(allData));
    const primary = orderedCountryKeys.filter(key => present.has(key));
    const extras = Object.keys(allData)
      .filter(key => !primary.includes(key as CountryKey))
      .sort();
    return [...primary, ...extras] as CountryKey[];
  }, [allData]);

  const columnConfigs = selectedCountries.map((country, index) => {
    const blocked = new Set<CountryKey>();
    selectedCountries.forEach((value, idx) => {
      if (value && idx !== index) {
        blocked.add(value);
      }
    });
    const options = orderedKeys.filter(key => !blocked.has(key) || country === key);
    return {
      country,
      data: country ? getYearDataForCountry(allData, country, year) : undefined,
      options
    };
  });

  const handleSelectCountry = (index: number, country: CountryKey) => {
    setComparisonSelections(prev => {
      const base = normalizeSelections(prev);
      const next = [...base];
      next[index] = country;
      return next;
    });
  };

  const handleClearCountry = (index: number) => {
    setComparisonSelections(prev => {
      const base = normalizeSelections(prev);
      const next = [...base];
      next[index] = null;
      return next;
    });
  };

  const handleClearAll = () => {
    setComparisonSelections(Array(COLUMN_COUNT).fill(null));
  };

  const handleToggleCountry = (country: CountryKey) => {
    setComparisonSelections(prev => {
      const base = normalizeSelections(prev);
      const existingIndex = base.findIndex(value => value === country);
      if (existingIndex !== -1) {
        const next = [...base];
        next[existingIndex] = null;
        return next;
      }
      const emptyIndex = base.findIndex(value => value === null);
      if (emptyIndex !== -1) {
        const next = [...base];
        next[emptyIndex] = country;
        return next;
      }
      const next = [...base];
      next[0] = country;
      return next;
    });
  };

  return (
    <Box display="flex" flexDirection="column" height="100vh" bg="gray.50">
      <Box px={{ base: 4, md: 6 }} py={{ base: 2, md: 3 }} borderBottom="2px solid" borderColor="black" bg="white" boxShadow="md">
        <Flex align="stretch" justify="space-between" gap={4} flexWrap="wrap">
          <Box display="flex" flexDirection="column" gap={2} flex={1} minW="260px">
            <Heading as="h1" size="md" lineHeight="1.2">The Making of a Parliament</Heading>
            <Flex align="center" gap={3} flexWrap="wrap">
              <Box
                bg="transparent"
                color="black"
                border="none"
                borderRadius="0"
                boxShadow="none"
                px={2}
                py={1}
                height="54px"
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                minW="150px"
              >
                <InputGroup size="md" width="auto" display="flex" alignItems="center" justifyContent="center" mb={0}>
                  <InputLeftElement pointerEvents="none" height="100%" color="gray.500" top="50%" transform="translateY(-50%)" width="18px" left="2px" display="flex" justifyContent="center">
                    <Box as="span" display="inline-flex" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="7" />
                        <line x1="17" y1="17" x2="21" y2="21" />
                      </svg>
                    </Box>
                  </InputLeftElement>
                  <Input
                    type="number"
                    variant="unstyled"
                    fontWeight="extrabold"
                    fontSize="lg"
                    letterSpacing="-0.02em"
                    value={yearQuery}
                    onChange={(event)=>setYearQuery(event.target.value)}
                    onKeyDown={handleYearInputKeyDown}
                    onBlur={handleYearInputBlur}
                    min={TIMELINE_MIN_YEAR}
                    max={TIMELINE_MAX_YEAR}
                    step={1}
                    inputMode="numeric"
                    aria-label="Search year"
                    paddingLeft="22px"
                    width="88px"
                    height="32px"
                    color="black"
                    _placeholder={{ color: 'gray.400' }}
                  />
                </InputGroup>
                <Text fontSize="xs" color="gray.600" lineHeight="1" mt={0}>Selected Year</Text>
              </Box>
              <Box flex={1} minW={0} width="100%">
                <Timeline
                  year={year}
                  onChange={setYear}
                  showElectionPins={false}
                  borderless
                  tickHeights={{ decade: 12, year: 9 }}
                />
              </Box>
            </Flex>
          </Box>
          <Box display="flex" flexDirection="column" gap={2} alignItems="flex-end" minW="200px">
            <ViewToggle width={200} borderless height={30} />
            <DataLensToggle width={200} borderless compact />
          </Box>
        </Flex>
      </Box>

      <Box flex="1" overflowY="auto">
        <Box px={{ base: 0, md: 4 }} py={0} mb={-4}>
          <EuropeanComparison
            allData={allData}
            genderData={genderData}
            year={year}
            populations={populations}
            onToggleCountry={handleToggleCountry}
          />
        </Box>
        <Box
          px={{ base: 4, md: 6 }}
          py={2}
          border="2px solid"
          borderColor="black"
          borderRadius="18px"
          bg="white"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mx={8}
          mt={2}
        >
          <Box flex="1" textAlign="left">
            <Text fontWeight="semibold" fontSize="lg" color="gray.800">Panel Comparison</Text>
          </Box>
          <Button size="sm" variant="ghost" leftIcon={<FaTimes />} onClick={handleClearAll} color="gray.700" ml={2}>
            Clear all
          </Button>
        </Box>
        <Flex align="stretch" minH="100%" width="100%" px={{ base: 0, md: 4 }} py={0}>
          {columnConfigs.map((config, idx) => (
            <Box
              key={idx}
              flex="1"
              minW={0}
              display="flex"
              flexDirection="column"
            >
              <CountryColumn
                country={config.country}
                data={config.data}
                genderData={genderData}
                year={year}
                options={config.options}
                allData={allData}
                onSelect={country => handleSelectCountry(idx, country)}
                onClear={() => handleClearCountry(idx)}
              />
            </Box>
          ))}
        </Flex>
      </Box>
    </Box>
  );
}

type CountryColumnProps = {
  country: CountryKey | null;
  data?: YearData;
  genderData: Record<CountryKey, GenderYearData[]>;
  year: number;
  options: CountryKey[];
  allData: Record<CountryKey, YearData[]>;
  onSelect: (country: CountryKey) => void;
  onClear: () => void;
};

function CountryColumn({ country, data, genderData, year, options, allData, onSelect, onClear }: CountryColumnProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectorRef = useRef<HTMLDivElement>(null);

  useOutsideClick({ ref: selectorRef, handler: () => setIsOpen(false) });

  const filteredOptions = useMemo(() => {
    const q = query.trim();
    if (!q) return options;
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^${safe}`, 'i');
    return options.filter(option => pattern.test(getCountryLabel(option)));
  }, [options, query]);

  const handleChoose = (value: CountryKey) => {
    onSelect(value);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <Box px={{ base: 2, md: 4 }} pt={4} pb={8} width="100%" display="flex" flexDirection="column" flex="1" minH="0">
      {!country ? (
        <Flex direction="column" gap={5} flex="1" minH="0">
          <Box ref={selectorRef} position="relative" width="100%">
            <InputGroup width="100%">
              <InputLeftElement pointerEvents="none" height="100%" display="flex" alignItems="center">
                <FaSearch color="#718096" />
              </InputLeftElement>
              <InputRightElement pointerEvents="none" color="gray.500" height="100%" display="flex" alignItems="center">
                <FaChevronDown />
              </InputRightElement>
              <Input
                placeholder="Select a country"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (!isOpen) setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                border="2px solid black"
                borderRadius="18px"
                height="56px"
                bg="white"
                fontWeight="semibold"
                pr={12}
              />
            </InputGroup>
            {isOpen && (
              <Box
                position="absolute"
                top="calc(100% + 8px)"
                left={0}
                right={0}
                bg="white"
                border="1px solid"
                borderColor="gray.200"
                borderRadius="20px"
                boxShadow="xl"
                maxH="280px"
                overflowY="auto"
                zIndex={20}
              >
                <Stack spacing={0}>
                  {filteredOptions.map(option => (
                    <Button
                      key={option}
                      variant="ghost"
                      justifyContent="flex-start"
                      borderRadius={0}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleChoose(option)}
                      py={3}
                      px={4}
                    >
                      <Text fontWeight="medium">{getCountryLabel(option)}</Text>
                    </Button>
                  ))}
                  {filteredOptions.length === 0 && (
                    <Text fontSize="xs" color="gray.500" textAlign="center" py={4}>No matches found</Text>
                  )}
                </Stack>
              </Box>
            )}
          </Box>
          <Box
            flex="1"
            border="1px dashed"
            borderColor="gray.300"
            borderRadius="24px"
            p={6}
            textAlign="center"
            color="gray.500"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="flex-start"
            bg="white"
            position="relative"
          >
            <Box width="100%" display="flex" flexDirection="column" alignItems="center" justifyContent="flex-start">
              <Text fontWeight="semibold" mb={2}>No country selected</Text>
              <Text fontSize="sm" maxW="260px">
                Use the search above to load a parliament into this column.
              </Text>
            </Box>
          </Box>
        </Flex>
      ) : (
        <CountryInsights country={country} data={data as YearData} genderData={genderData} year={year} allData={allData} onClear={onClear} />
      )}
    </Box>
  );
}

type CountryInsightsProps = {
  country: CountryKey;
  data?: YearData;
  genderData: Record<CountryKey, GenderYearData[]>;
  year: number;
  allData: Record<CountryKey, YearData[]>;
  onClear: () => void;
};

function CountryInsights({ country, data, genderData, year, allData, onClear }: CountryInsightsProps) {
  const { categoryPalette, dataView } = useData();
  const label = getCountryLabel(country);
  const freedomYear = getCountryFreedomYear(country);
  const blockedByDemocracy = !!(freedomYear && year < freedomYear);
  const majority = !blockedByDemocracy && data ? majoritySocialCategory(allData, country, year) : { category: undefined, percentage: undefined };
  const activeParties = data ? data.parties.filter(p => (p.votes ?? 0) > 0).length : 0;
  const genderEntry = !blockedByDemocracy ? getGenderYearDataForCountry(genderData, country, year) : undefined;
  const dataYear = data?.year ?? '—';
  const totalSeats = data?.total?.toLocaleString();

  if (blockedByDemocracy) {
    return (
      <Box
        border="2px solid"
        borderColor="black"
        borderRadius="32px"
        bg="white"
        overflow="hidden"
        display="flex"
        flexDirection="column"
        flex="1"
      >
        <Box borderBottom="2px solid" borderColor="black" px={6} py={5}>
          <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap={4} flexWrap="wrap">
            <Box>
              <Text fontWeight="bold" fontSize="lg">{label}</Text>
              <Text fontSize="sm" color="gray.600">Most Recent Election: {dataYear}</Text>
              {totalSeats && <Text fontSize="sm" color="gray.600">{totalSeats} seats</Text>}
            </Box>
            <Button size="sm" variant="ghost" leftIcon={<FaTimes />} onClick={onClear} color="gray.600">
              Clear
            </Button>
          </Flex>
        </Box>

        <Box px={6} py={5}>
          <Text fontSize="sm" color="gray.700">
            {label} did not hold free parliamentary elections until <b>{freedomYear}</b>. Data visualizations are unavailable prior to that transition.
          </Text>
        </Box>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box
        border="2px solid"
        borderColor="black"
        borderRadius="32px"
        bg="white"
        overflow="hidden"
        display="flex"
        flexDirection="column"
        flex="1"
      >
        <Box borderBottom="2px solid" borderColor="black" px={6} py={5}>
          <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap={4} flexWrap="wrap">
            <Box>
              <Text fontWeight="bold" fontSize="lg">{label}</Text>
              <Text fontSize="sm" color="gray.600">Most Recent Election: —</Text>
            </Box>
            <Button size="sm" variant="ghost" leftIcon={<FaTimes />} onClick={onClear} color="gray.600">
              Clear
            </Button>
          </Flex>
        </Box>

        <Box px={6} py={5}>
          <Text fontSize="sm" color="gray.700">No election data is available for {label} in {year}.</Text>
        </Box>
      </Box>
    );
  }

  const showGenderFirst = dataView === 'gender';

  const electionSection = (
    <Box borderBottom="2px solid" borderColor="black" px={6} py={4} display="flex" alignItems="start" justifyContent="center">
      <ElectionDonut data={data} />
    </Box>
  );

  const genderSection = (
    <Box borderBottom="2px solid" borderColor="black" px={6} py={4} display="flex" flexDirection="column" gap={3} bg="white">
      <Text fontWeight="semibold" fontSize="md">Gender representation</Text>
      {genderEntry ? (
        <>
          <Box width="100%" bg="#fde4ee" borderRadius="12px" overflow="hidden" border="1px solid" borderColor="#f4cfe0" height="24px">
            <Box height="100%" width={`${Math.min(100, Math.max(0, genderEntry.femalePct))}%`} bg="#e75480" transition="width 200ms ease" />
          </Box>
          <HStack justify="space-between" spacing={4} fontSize="sm">
            <Text fontWeight="semibold" color="gray.800">Women: {genderEntry.femalePct.toFixed(1)}%</Text>
            <Text color="gray.700">Men: {genderEntry.malePct.toFixed(1)}%</Text>
          </HStack>
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
                <Td isNumeric fontWeight="semibold" color="#7a1035">{genderEntry.female.toLocaleString()}</Td>
                <Td isNumeric fontWeight="semibold" color="#7a1035">{genderEntry.femalePct.toFixed(1)}%</Td>
              </Tr>
              <Tr bg="#e3eeff">
                <Td fontWeight="semibold" color="#103a7a">Male</Td>
                <Td isNumeric fontWeight="semibold" color="#103a7a">{genderEntry.male.toLocaleString()}</Td>
                <Td isNumeric fontWeight="semibold" color="#103a7a">{genderEntry.malePct.toFixed(1)}%</Td>
              </Tr>
            </Tbody>
          </Table>
        </>
      ) : (
        <Text fontSize="sm" color="gray.700">No gender data is available for {label}.</Text>
      )}
    </Box>
  );

  return (
    <Box
      border="2px solid"
      borderColor="black"
      borderRadius="32px"
      bg="white"
      overflow="hidden"
      display="flex"
      flexDirection="column"
      flex="1"
    >
      <Box borderBottom="2px solid" borderColor="black" px={6} py={5}>
        <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap={4} flexWrap="wrap">
          <Box>
            <Text fontWeight="bold" fontSize="lg">{label}</Text>
            <Text fontSize="sm" color="gray.600">
              Most Recent Election: {data.year}
            </Text>
            <Text fontSize="sm" color="gray.600">{data.total.toLocaleString()} seats</Text>
          </Box>
          <Button size="sm" variant="ghost" leftIcon={<FaTimes />} onClick={onClear} color="gray.600">
            Clear
          </Button>
        </Flex>
      </Box>

      <Box borderBottom="2px solid" borderColor="black" px={6} py={4} bg="gray.50">
        <HStack spacing={3} flexWrap="wrap">
          {majority.category && (
            <Badge bg={categoryPalette[majority.category] || 'gray.400'} color="white" px={4} py={2} borderRadius="999px" fontWeight="bold">
              {majority.category}
              {majority.percentage ? ` • ${majority.percentage.toFixed(1)}%` : ''}
            </Badge>
          )}
          <Badge borderRadius="999px" px={4} py={2} bg="gray.100" fontWeight="semibold" color="gray.700">
            {activeParties} active parties
          </Badge>
        </HStack>
      </Box>

      {showGenderFirst && genderSection}
      {electionSection}
      {!showGenderFirst && genderSection}

      <Box borderBottom="2px solid" borderColor="black" px={2} py={2} bg="white">
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
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// Removed ComparisonModeToggle; view now always shows both European overview and country columns.
