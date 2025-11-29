import { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import ThemeProviderClient from '@/components/ThemeProviderClient';
import './globals.css';
import { DataProvider } from '@/components/DataContext';
import { getAllCountriesData } from '@/lib/data';
import { ColorModeScript } from '@chakra-ui/react';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: ReactNode }) {
  const allData = getAllCountriesData();
  return (
    <html lang="en" className={inter.className}>
      <head>
        <ColorModeScript initialColorMode="light" />
      </head>
      <body>
        <ThemeProviderClient>
          <DataProvider allData={allData}>{children}</DataProvider>
        </ThemeProviderClient>
      </body>
    </html>
  );
}
