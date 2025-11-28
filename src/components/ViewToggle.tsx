"use client";

import { Box, Button } from '@chakra-ui/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

type ViewToggleProps = {
  width?: string | number;
  borderless?: boolean;
};

const TOGGLE_RADIUS = 18;
const TOGGLE_PADDING = 4;

export default function ViewToggle({ width = 320, borderless = false }: ViewToggleProps) {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeView = useMemo<'map' | 'comparison'>(() => {
    return pathname.startsWith('/comparison') ? 'comparison' : 'map';
  }, [pathname]);

  const buildHref = (view: 'map' | 'comparison') => {
    const query = new URLSearchParams(searchParams.toString());
    const targetPath = view === 'map' ? '/' : '/comparison';
    const qs = query.toString();
    return qs ? `${targetPath}?${qs}` : targetPath;
  };

  const handleNavigate = (view: 'map' | 'comparison') => {
    if (view === activeView) return;
    router.push(buildHref(view));
  };

  const renderButton = (label: string, view: 'map' | 'comparison') => {
    const isActive = activeView === view;
    return (
      <Button
        key={view}
        onClick={() => handleNavigate(view)}
        flex={1}
        variant="unstyled"
        bg={isActive ? 'black' : 'transparent'}
        color={isActive ? 'white' : 'black'}
        fontWeight="semibold"
        fontSize="sm"
        height="38px"
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
    <Box
      display="inline-flex"
      width={width}
      border={borderless ? 'none' : '2px solid black'}
      borderRadius={`${TOGGLE_RADIUS}px`}
      boxShadow={borderless ? 'none' : 'sm'}
      bg="white"
      padding={`${TOGGLE_PADDING}px`}
      gap={`${TOGGLE_PADDING}px`}
      role="group"
    >
      {renderButton('Map', 'map')}
      {renderButton('Compare', 'comparison')}
    </Box>
  );
}
