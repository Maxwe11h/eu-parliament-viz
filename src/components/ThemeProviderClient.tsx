"use client";
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

const theme = extendTheme({
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
  return <ChakraProvider theme={theme}>{children}</ChakraProvider>;
}
