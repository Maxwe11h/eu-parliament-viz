"use client";
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CountryKey, YearData } from '@/types';

type DataContextValue = {
  allData: Record<CountryKey, YearData[]>;
  country?: CountryKey;
  setCountry: (c: CountryKey)=>void;
  year: number;
  setYear: (y:number)=>void;
  currentYearData?: YearData;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children, allData }: { children: React.ReactNode; allData: Record<CountryKey, YearData[]> }) {
  const [country,setCountry] = useState<CountryKey | undefined>();
  const [yearState,setYearState] = useState<number>(2018);
  const router = useRouter();
  const params = useSearchParams();

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
    router.replace(`/?${query.toString()}`);
  },[country, yearState, router]);

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
  return <DataContext.Provider value={{ allData, country, setCountry, year: yearState, setYear, currentYearData }}>{children}</DataContext.Provider>;
}

export function useData(){
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}