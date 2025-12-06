"use client";
import { Dispatch, SetStateAction, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CountryKey, YearData } from '@/types';

type DataContextValue = {
  allData: Record<CountryKey, YearData[]>;
  country?: CountryKey;
  setCountry: (c?: CountryKey)=>void;
  year: number;
  setYear: (y:number)=>void;
  currentYearData?: YearData;
  comparisonSelections: (CountryKey | null)[];
  setComparisonSelections: Dispatch<SetStateAction<(CountryKey | null)[]>>;
  populations: Partial<Record<CountryKey, number>>;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

const DEFAULT_COMPARISON_COLUMNS = 3;
const createEmptyComparisonSelections = () => Array.from({ length: DEFAULT_COMPARISON_COLUMNS }, () => null as CountryKey | null);

type DataProviderProps = {
  children: React.ReactNode;
  allData: Record<CountryKey, YearData[]>;
  populations: Partial<Record<CountryKey, number>>;
};

export function DataProvider({ children, allData, populations }: DataProviderProps) {
  const [country,setCountry] = useState<CountryKey | undefined>();
  const [yearState,setYearState] = useState<number>(2018);
  const [comparisonSelections, setComparisonSelections] = useState<(CountryKey | null)[]>(() => createEmptyComparisonSelections());
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  // Initialize from URL
  useEffect(()=>{
    const c = params.get('country') as CountryKey | null;
    const y = params.get('year');
    if (c && allData[c]) setCountry(c);
    if (y) setYearState(Number(y));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Push updates to URL
  useEffect(()=>{
    const query = new URLSearchParams();
    if (country) query.set('country', country);
    query.set('year', String(yearState));
    const targetPath = pathname || '/';
    router.replace(`${targetPath}?${query.toString()}`);
  },[country, yearState, router, pathname]);

  const setYear = (y:number) => setYearState(y);
  const currentYearData = useMemo(()=>{
    if (!country) return undefined;
    const arr = allData[country];
    // most recent election <= selected yearState, else earliest
    const exact = arr.find(d=>d.year===yearState);
    if (exact) return exact;
    const prev = [...arr].reverse().find(d=>d.year <= yearState);
    return prev ?? arr[0];
  },[allData,country,yearState]);
  return (
    <DataContext.Provider
      value={{
        allData,
        country,
        setCountry: (c?: CountryKey) => setCountry(c),
        year: yearState,
        setYear,
        currentYearData,
        comparisonSelections,
        setComparisonSelections,
        populations
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(){
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}