"use client";
import { Box, Text, HStack, Badge, Button, Flex } from '@chakra-ui/react';
import { FaTimes } from 'react-icons/fa';
import { useData } from './DataContext';
import { YearData, CountryKey } from '@/types';
import PartyTable from './PartyTable';
import Spectrum from './Spectrum';
import ElectionDonut from './ElectionDonut';
import LeaningBarChart from './LeaningBarChart';
import { categoryPalette } from '@/lib/colors';
import { majoritySocialCategory } from '@/lib/analytics';
import { getCountryFreedomYear } from '@/lib/democracy';
import { getCountryLabel } from '@/lib/countryMeta';

export default function CountryPanel({ country, data }: { country?: CountryKey; data?: YearData }) {
  const { year, allData, setCountry } = useData();
  const dataYear = data?.year;
  const freedomYear = country ? getCountryFreedomYear(country) : undefined;
  const blockedByDemocracy = !!(country && freedomYear && typeof year === 'number' && year < freedomYear);
  const displayedYear = blockedByDemocracy ? year : (dataYear ?? year);
  const label = country ? getCountryLabel(country) : 'Select a country';
  const majority = (!blockedByDemocracy && country && displayedYear && data)
    ? majoritySocialCategory(allData, country, displayedYear)
    : null;
  const activeParties = data ? data.parties.filter(p => (p.votes ?? 0) > 0).length : 0;

  const handleClose = () => setCountry(undefined);

  return (
    <Box h="100%" w="100%" overflow="auto" bg="white" display="flex" flexDirection="column">
      <Box borderBottom="2px solid" borderColor="black" px={6} py={5}>
        <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap={4} flexWrap="wrap">
          <Box>
            <Text fontWeight="bold" fontSize="lg">{label}</Text>
            <Text fontSize="sm" color="gray.600">
              Most Recent Election: {dataYear ? dataYear : '—'}
            </Text>
            {data?.total && (
              <Text fontSize="sm" color="gray.600">{data.total.toLocaleString()} seats</Text>
            )}
          </Box>
          <Button size="sm" variant="ghost" leftIcon={<FaTimes />} onClick={handleClose} color="gray.600">
            Close
          </Button>
        </Flex>
      </Box>

      {blockedByDemocracy ? (
        <Box px={6} py={5}>
          <Text fontSize="sm" color="gray.700">
            {label} did not hold free parliamentary elections until <b>{freedomYear}</b>. Data visualizations are unavailable prior to that transition.
          </Text>
        </Box>
      ) : !data ? (
        <Box px={6} py={5}>
          <Text fontSize="sm" color="gray.700">
            No election data is available for {label}{displayedYear ? ` in ${displayedYear}` : ''}.
          </Text>
        </Box>
      ) : (
        <>
          <Box borderBottom="2px solid" borderColor="black" px={6} py={4} bg="gray.50">
            <HStack spacing={3} flexWrap="wrap">
              {majority?.category && (
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
        </>
      )}
    </Box>
  );
}
