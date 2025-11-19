"use client";
import { HStack, Heading, Icon, Box, Text } from '@chakra-ui/react';
import { FaEarthEurope } from 'react-icons/fa6';
import { useData } from './DataContext';

export default function TopBar() {
  const { year } = useData();
  return (
    <HStack spacing={3} p={3} pl={4} border="2px solid" borderColor="black" bg="white">
      <Icon as={FaEarthEurope} boxSize={6} color="teal.600" />
      <Heading as="h1" size="md">Parliamentary Composition Overview</Heading>
      <Box flex="1" />
      <Text fontWeight="bold" fontSize="lg" pr={2}>{year}</Text>
    </HStack>
  );
}
