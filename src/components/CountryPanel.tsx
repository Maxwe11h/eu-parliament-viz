"use client";
import { Box, Text, HStack, Badge, Button, Flex, Table, Thead, Tr, Th, Tbody, Td } from '@chakra-ui/react';
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

export default function CountryPanel({ country, data, genderData }: { country?: CountryKey; data?: YearData; genderData?: GenderYearData }) {
  const { year, allData, setCountry, dataView } = useData();
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

  return (
    <Box h="100%" w="100%" overflow="auto" bg="white" display="flex" flexDirection="column">
      <Box borderBottom="2px solid" borderColor="black" px={6} py={5}>
        <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap={4} flexWrap="wrap">
          <Box>
            <Text fontWeight="bold" fontSize="lg">{label}</Text>
            <Text fontSize="sm" color="gray.600">
              {isGenderView ? 'Latest gender data' : 'Most recent election'}: {isGenderView ? (genderData?.year ?? '—') : (dataYear ?? '—')}
            </Text>
            {(isGenderView ? genderData?.total : data?.total) && (
              <Text fontSize="sm" color="gray.600">{(isGenderView ? genderData?.total : data?.total)?.toLocaleString()} seats</Text>
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
      ) : isGenderView ? (
        !genderData ? (
          <Box px={6} py={5}>
            <Text fontSize="sm" color="gray.700">
              No gender data is available for {label}{displayedYear ? ` in ${displayedYear}` : ''}.
            </Text>
          </Box>
        ) : (
          <>
            <Box borderBottom="2px solid" borderColor="black" px={6} py={4} bg="gray.50">
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

            <Box borderBottom="2px solid" borderColor="black" px={0} py={0} bg="white">
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

        
          </>
        )
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
