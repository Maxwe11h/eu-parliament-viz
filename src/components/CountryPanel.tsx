"use client";
import { Box, Text, HStack, VStack, Badge } from '@chakra-ui/react';
import { useData } from './DataContext';
import { YearData, CountryKey } from '@/types';
import PartyTable from './PartyTable';
import Spectrum from './Spectrum';
import ElectionDonut from './ElectionDonut';
import { useMemo } from 'react';
import { categoryPalette } from '@/lib/colors';
import { majoritySocialCategory } from '@/lib/analytics';

export default function CountryPanel({ country, data }: { country?: CountryKey; data?: YearData }) {
  const { year, allData } = useData();
  const displayedYear = data?.year ? data.year : year;

  const headerRight = useMemo(()=>{
    if (!country || !displayedYear) return undefined;
    const { category, partyName, percentage } = majoritySocialCategory(allData, country, displayedYear);
    return { category, partyName, percentage };
  },[allData, country, displayedYear]);

  return (
  <Box h="100%" overflow="auto" border="2px solid" borderColor="black" borderRadius="0" bg="white" p={0} display="flex" flexDirection="column">
  <HStack p={4} px={5} borderBottom="2px solid" borderColor="black" spacing={4} align="center">
        <VStack align="start" spacing={0} flex={1}>
          <Text fontSize="lg" fontWeight="bold">{country ? country.toUpperCase() : 'Select a country'}</Text>
          <Text fontSize="sm" color="gray.600">{displayedYear ?? ''}</Text>
        </VStack>
        {headerRight && headerRight.partyName && (
          <VStack align="flex-end" spacing={1} minW="160px">
            <Text fontSize="sm" fontWeight="semibold" textAlign="right" lineHeight="1.05" noOfLines={2}>
              {headerRight.partyName}
              {headerRight.category && (
                <>
                  {' '}
                  <Badge as="span" bg={categoryPalette[headerRight.category] || 'gray.600'} color="#fff" px={1.5} py={0.5} fontSize="10px" borderRadius="sm" lineHeight="1" ml={1}>
                    {headerRight.percentage ? `${headerRight.percentage.toFixed(1)}%` : ''}
                  </Badge>
                </>
              )}
            </Text>
          </VStack>
        )}
      </HStack>

      <Box borderBottom="2px solid" borderColor="black" p={4}>
        <ElectionDonut data={data} />
      </Box>
      <Box borderBottom="2px solid" borderColor="black" p={0}>
        <Spectrum data={data} />
      </Box>
      <Box borderBottom="2px solid" borderColor="black" p={0}>
        <PartyTable data={data} year={displayedYear} title={false} />
      </Box>
      {data && (
        <Box p={4}>
          <Text fontSize="xs" color="gray.600">Debug: Total seats from CSV: <b>{data.total}</b> | Sum of parties: <b>{data.sumParties}</b></Text>
        </Box>
      )}
  </Box>
  );
}
