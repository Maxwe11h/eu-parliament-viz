"use client";

import { Box, Button, Text } from '@chakra-ui/react';
import { useData } from './DataContext';
import { DataView } from '@/types';

const TOGGLE_RADIUS = 16;
const TOGGLE_PADDING = 4;

type DataLensToggleProps = {
  width?: string | number;
  borderless?: boolean;
  compact?: boolean;
};

export default function DataLensToggle({ width = 320, borderless = false, compact = false }: DataLensToggleProps) {
  const { dataView, setDataView } = useData();

  const renderButton = (label: string, view: DataView) => {
    const isActive = dataView === view;
    return (
      <Button
        key={view}
        onClick={() => setDataView(view)}
        flex={1}
        variant="unstyled"
        bg={isActive ? 'black' : 'transparent'}
        color={isActive ? 'white' : 'black'}
        fontWeight="semibold"
        fontSize="sm"
        height={compact ? '30px' : '36px'}
        borderRadius={`${TOGGLE_RADIUS}px`}
        border="1px solid"
        borderColor={isActive ? 'black' : 'gray.300'}
        transition="background 150ms ease, color 150ms ease, border-color 150ms ease"
        _hover={{ bg: isActive ? 'black' : 'gray.50' }}
        _focusVisible={{ boxShadow: '0 0 0 2px #111' }}
        aria-pressed={isActive}
      >
        {label}
      </Button>
    );
  };

  return (
    <Box display="inline-flex" flexDirection="column" width={width} gap={1}>
      <Box
        display="inline-flex"
        width="100%"
        border={borderless ? 'none' : '2px solid black'}
        borderRadius={`${TOGGLE_RADIUS}px`}
        boxShadow={borderless ? 'none' : 'sm'}
        bg="white"
        padding={`${TOGGLE_PADDING}px`}
        gap={`${TOGGLE_PADDING}px`}
        role="group"
      >
        {renderButton('Political', 'political')}
        {renderButton('Gender', 'gender')}
      </Box>
    </Box>
  );
}
