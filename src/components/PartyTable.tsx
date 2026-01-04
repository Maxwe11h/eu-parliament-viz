"use client";
import { Box, Table, Thead, Tr, Th, Tbody, Td, Text, Flex, Button, ButtonGroup } from '@chakra-ui/react';
import { YearData } from '@/types';
import { useData } from './DataContext';

export default function PartyTable({ data, year, title = true }: { data?: YearData; year?: number; title?: boolean }){
  const { categoryPalette, partyNameMode, setPartyNameMode } = useData();

  const nameButtonVariant = (mode: 'english' | 'native') => partyNameMode === mode ? 'solid' : 'outline';
  return (
    <Box p={0} m={0}>
      {title && (
        <Text fontWeight="bold" mb={2}>Election Results {year ?? data?.year ?? ''}</Text>
      )}
      <Table size="sm" width="100%">
        <Thead>
          <Tr borderBottom="2px solid" borderColor="gray.800">
            <Th fontSize="sm" fontWeight="bold" py={3}>
              <Flex align="center" gap={2} flexWrap="wrap">
                <Text fontWeight="bold">Party</Text>
                <ButtonGroup size="xs" isAttached variant="outline" colorScheme="gray">
                  <Button
                    variant={nameButtonVariant('english')}
                    onClick={()=>setPartyNameMode('english')}
                    aria-pressed={partyNameMode==='english'}
                  >
                    EN
                  </Button>
                  <Button
                    variant={nameButtonVariant('native')}
                    onClick={()=>setPartyNameMode('native')}
                    aria-pressed={partyNameMode==='native'}
                  >
                    Native
                  </Button>
                </ButtonGroup>
              </Flex>
            </Th>
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
              const primaryName = partyNameMode === 'native'
                ? (p.nativeName || p.englishName || p.acronym)
                : (p.englishName || p.nativeName || p.acronym);
              const secondaryName = p.acronym && p.acronym !== primaryName ? p.acronym : undefined;
              return (
                <Tr
                  key={p.acronym}
                  bg={`${(categoryPalette[p.socialCategory ?? ''] || p.color || '#e2e8f0')}20`}
                  borderBottom="1px solid"
                  borderColor="gray.300"
                >
                  <Td>
                    <Text fontWeight="medium" lineHeight="1.15">{primaryName}</Text>
                    {secondaryName && (
                      <Text fontSize="xs" color="gray.600" lineHeight="1.05">{secondaryName}</Text>
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
