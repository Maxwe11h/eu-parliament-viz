"use client";
import { Box, Table, Thead, Tr, Th, Tbody, Td, Text } from '@chakra-ui/react';
import { YearData } from '@/types';

export default function PartyTable({ data, year, title = true }: { data?: YearData; year?: number; title?: boolean }){
  return (
    <Box p={0} m={0}>
      {title && (
        <Text fontWeight="bold" mb={2}>Election Results {year ?? data?.year ?? ''}</Text>
      )}
      <Table size="sm" width="100%">
        <Thead>
          <Tr borderBottom="2px solid" borderColor="gray.800">
            <Th fontSize="sm" fontWeight="bold" py={3}>Party</Th>
            <Th isNumeric fontSize="sm" fontWeight="bold" py={3}>Seats</Th>
            <Th isNumeric fontSize="sm" fontWeight="bold" py={3}>%</Th>
          </Tr>
        </Thead>
        <Tbody>
          {data?.parties
            .filter(p=> (p.votes ?? 0) > 0)
            .slice()
            .sort((a,b)=> (b.votes ?? 0) - (a.votes ?? 0))
            .map(p=> {
              const name = p.englishName ?? p.acronym;
              const showAcronym = p.englishName && p.englishName !== p.acronym;
              return (
                <Tr key={p.acronym} bg={p.color+"20"} borderBottom="1px solid" borderColor="gray.300">
                  <Td>
                    <Text fontWeight="medium" lineHeight="1.15">{name}</Text>
                    {showAcronym && (
                      <Text fontSize="xs" color="gray.600" lineHeight="1.05">{p.acronym}</Text>
                    )}
                  </Td>
                  <Td isNumeric>{p.votes}</Td>
                  <Td isNumeric>{p.pct.toFixed(1)}</Td>
                </Tr>
              );
            })}
        </Tbody>
      </Table>
    </Box>
  );
}
