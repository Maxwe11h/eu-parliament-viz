"use client";
import { CacheProvider } from '@chakra-ui/next-js';
import { ChakraProvider, extendTheme, ThemeConfig } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false
};

const theme = extendTheme({
  config,
  fonts: {
    heading: `${inter.style.fontFamily}, system-ui, sans-serif`,
    body: `${inter.style.fontFamily}, system-ui, sans-serif`,
  },
  styles: {
    global: {
      'html, body, #__next': { height: '100%' },
      body: { bg: '#f5f5f4', color: '#111827' }
    }
  }
});

export default function ThemeProviderClient({ children }: { children: ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider theme={theme}>
        {children}
      </ChakraProvider>
    </CacheProvider>
  );
}
