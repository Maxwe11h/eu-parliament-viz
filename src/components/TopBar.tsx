"use client";
import { HStack, Heading, Icon, Box } from '@chakra-ui/react';
import { FaEarthEurope } from 'react-icons/fa6';

export default function TopBar() {
  return (
    <HStack spacing={3} p={3} pl={4} border="2px solid" borderColor="black" bg="white">
      <Icon as={FaEarthEurope} boxSize={6} color="teal.600" />
      <Heading as="h1" size="md">Parliamentary Composition Overview</Heading>
      <Box flex="1" />
    </HStack>
  );
}
