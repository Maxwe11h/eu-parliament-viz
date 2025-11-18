"use client";
import { HStack, VStack, Text, Box } from '@chakra-ui/react';
import { categoryPalette } from '@/lib/colors';
import { YearData } from '@/types';

export default function Legend({ data }: { data?: YearData }) {
  const discrepancy = data ? data.total - data.sumParties : 0;
  return (
    <VStack align="start" spacing={2} fontSize="xs">
      <Text fontWeight="bold" fontSize="sm">Legend</Text>
      <HStack wrap="wrap" rowGap={1} columnGap={3}>
        {Object.entries(categoryPalette).map(([cat,color])=> (
          <HStack key={cat} spacing={1}>
            <Box w={3} h={3} borderRadius="full" bg={color} />
            <Text>{cat}</Text>
          </HStack>
        ))}
      </HStack>
      {data && (
        <Box mt={2} p={2} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
          <Text>Total seats (CSV): <b>{data.total}</b></Text>
          <Text>Sum of party seats: <b>{data.sumParties}</b></Text>
          {discrepancy !== 0 && (
            <Text color="red.600">Discrepancy: {discrepancy > 0 ? '+' : ''}{discrepancy}</Text>
          )}
        </Box>
      )}
    </VStack>
  );
}