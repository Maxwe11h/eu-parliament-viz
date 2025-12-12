import { ReactNode, Suspense } from 'react';
import { Inter } from 'next/font/google';
import ThemeProviderClient from '@/components/ThemeProviderClient';
import './globals.css';
import { DataProvider } from '@/components/DataContext';
import { getAllCountriesData, getAllGenderData, getPopulationMap } from '@/lib/data';
import { ColorModeScript } from '@chakra-ui/react';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: ReactNode }) {
  const allData = getAllCountriesData();
  const genderData = getAllGenderData();
  const populations = getPopulationMap();
  return (
    <html lang="en" className={inter.className}>
      <head>
        <ColorModeScript initialColorMode="light" />
      </head>
      <body>
        <Suspense fallback={null}>
          <ThemeProviderClient>
            <DataProvider allData={allData} genderData={genderData} populations={populations}>
              {children}
            </DataProvider>
          </ThemeProviderClient>
        </Suspense>
      </body>
    </html>
  );
}
