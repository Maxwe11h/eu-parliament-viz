"use client";
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  Text,
  useOutsideClick
} from '@chakra-ui/react';
import { FaChevronDown, FaSearch, FaTimes } from 'react-icons/fa';
import { useMemo, useRef, useState } from 'react';
import { CountryKey, YearData } from '@/types';
import { useData } from './DataContext';
import ViewToggle from './ViewToggle';
import { getCountryLabel, orderedCountryKeys } from '@/lib/countryMeta';
import { categoryPalette } from '@/lib/colors';
import { getYearDataForCountry, majoritySocialCategory } from '@/lib/analytics';
import ElectionDonut from './ElectionDonut';
import Spectrum from './Spectrum';
import LeaningBarChart from './LeaningBarChart';
import PartyTable from './PartyTable';

const COLUMN_COUNT = 3;

export default function ComparisonView() {
  const { allData, year, setYear } = useData();
  const initialSelections = useMemo(() => Array.from({ length: COLUMN_COUNT }, () => null as CountryKey | null), []);
  const [selectedCountries, setSelectedCountries] = useState<(CountryKey | null)[]>(initialSelections);

  const orderedKeys = useMemo(() => {
    const present = new Set(Object.keys(allData));
    const primary = orderedCountryKeys.filter(key => present.has(key));
    const extras = Object.keys(allData)
      .filter(key => !primary.includes(key as CountryKey))
      .sort();
    return [...primary, ...extras] as CountryKey[];
  }, [allData]);

  const timelineYears = useMemo(() => {
    const set = new Set<number>();
    Object.values(allData).forEach(entries =>
      entries.forEach(entry => {
        if (Number.isFinite(entry.year)) {
          set.add(entry.year);
        }
      })
    );
    if (Number.isFinite(year)) {
      set.add(year);
    }
    const sorted = Array.from(set).sort((a, b) => a - b);
    return sorted.length ? sorted : [new Date().getFullYear()];
  }, [allData, year]);

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
    setSelectedCountries(prev => {
      const next = [...prev];
      next[index] = country;
      return next;
    });
  };

  const handleClearCountry = (index: number) => {
    setSelectedCountries(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  return (
    <Box display="flex" flexDirection="column" height="100vh" bg="gray.50">
      <Box px={6} py={5} borderBottom="2px solid" borderColor="black" bg="white" boxShadow="md">
        <Flex align={{ base: 'flex-start', md: 'center' }} justify="space-between" gap={4} flexWrap="wrap">
          <Box>
            <Heading as="h1" size="md" textAlign="center">European Parliamentary Visualizer</Heading>
          </Box>
          <ViewToggle width={320} />
        </Flex>
        <Box mt={4}>
          <ComparisonTimeline year={year} onChange={setYear} years={timelineYears} />
        </Box>
      </Box>

      <Box flex="1" overflowY="auto">
        <Flex align="stretch" minH="100%" width="100%">
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
  year: number;
  options: CountryKey[];
  allData: Record<CountryKey, YearData[]>;
  onSelect: (country: CountryKey) => void;
  onClear: () => void;
};

function CountryColumn({ country, data, year, options, allData, onSelect, onClear }: CountryColumnProps) {
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
            justifyContent="center"
            bg="white"
            position="relative"
          >
            <Box width="100%" display="flex" flexDirection="column" alignItems="center" justifyContent="center">
              <Text fontWeight="semibold" mb={2}>No country selected</Text>
              <Text fontSize="sm" maxW="260px">
                Use the search above to load a parliament into this column.
              </Text>
            </Box>
          </Box>
        </Flex>
      ) : (
        <CountryInsights country={country} data={data as YearData} year={year} allData={allData} onClear={onClear} />
      )}
    </Box>
  );
}

type CountryInsightsProps = {
  country: CountryKey;
  data: YearData;
  year: number;
  allData: Record<CountryKey, YearData[]>;
  onClear: () => void;
};

function CountryInsights({ country, data, year, allData, onClear }: CountryInsightsProps) {
  const label = getCountryLabel(country);
  const majority = majoritySocialCategory(allData, country, year);
  const activeParties = data.parties.filter(p => (p.votes ?? 0) > 0).length;

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

      <Box borderBottom="2px solid" borderColor="black" p={6} minH="360px" display="flex" alignItems="center" justifyContent="center">
        <ElectionDonut data={data} />
      </Box>

      <Box borderBottom="2px solid" borderColor="black" p={0} bg="white">
        <Spectrum data={data} size={520} />
      </Box>

      <Box borderBottom="2px solid" borderColor="black" px={6} py={5}>
        <LeaningBarChart data={data} />
      </Box>

      <Box px={0} py={0}>
        <PartyTable data={data} year={data.year} title={false} />
      </Box>
    </Box>
  );
}

function ComparisonTimeline({ year, onChange, years }: { year: number; onChange: (value: number) => void; years: number[] }) {
  const hasYears = years.length > 0;
  const sortedYears = hasYears ? [...years].sort((a, b) => a - b) : [1950, 2025];
  const minYear = sortedYears[0];
  const maxYear = sortedYears[sortedYears.length - 1];
  const clampedYear = clamp(year, minYear, maxYear);
  const sliderValue = Number.isFinite(clampedYear) ? clampedYear : minYear;

  return (
    <Flex align="center" gap={4} flexWrap="wrap">
      <Box border="2px solid black" borderRadius="14px" px={4} py={2} minW="120px">
        <Text fontSize="2xl" fontWeight="bold" lineHeight="1">
          {sliderValue}
        </Text>
        <Text fontSize="xs" textTransform="uppercase" color="gray.500">
          Selected Year
        </Text>
      </Box>
      <Flex flex="1" align="center" gap={3} minW="240px">
        <Text fontWeight="semibold" color="gray.700">{minYear}</Text>
        <Slider value={sliderValue} min={minYear} max={maxYear} step={1} onChange={onChange} flex="1">
          <SliderTrack bg="gray.200" height="6px" borderRadius="999px">
            <SliderFilledTrack bg="black" />
          </SliderTrack>
          <SliderThumb boxSize={6} bg="white" border="2px solid black" _focus={{ boxShadow: 'none' }} _active={{ boxShadow: 'none' }}>
            <Box as="span" width="0" height="0" borderLeft="6px solid transparent" borderRight="6px solid transparent" borderTop="10px solid black" transform="translateY(2px)" />
          </SliderThumb>
        </Slider>
        <Text fontWeight="semibold" color="gray.700">{maxYear}</Text>
      </Flex>
    </Flex>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
