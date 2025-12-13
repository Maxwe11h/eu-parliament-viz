"use client";
import { Dispatch, SetStateAction, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CountryKey, DataView, GenderYearData, YearData } from '@/types';
import { PaletteOrientation, getCategoryPalette } from '@/lib/colors';

type DataContextValue = {
  allData: Record<CountryKey, YearData[]>;
  genderData: Record<CountryKey, GenderYearData[]>;
  country?: CountryKey;
  setCountry: (c?: CountryKey)=>void;
  year: number;
  setYear: (y:number)=>void;
  currentYearData?: YearData;
  currentGenderData?: GenderYearData;
  comparisonSelections: (CountryKey | null)[];
  setComparisonSelections: Dispatch<SetStateAction<(CountryKey | null)[]>>;
  populations: Partial<Record<CountryKey, number>>;
  dataView: DataView;
  setDataView: (mode: DataView)=>void;
  paletteOrientation: PaletteOrientation;
  setPaletteOrientation: (o: PaletteOrientation)=>void;
  categoryPalette: Record<string,string>;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

const DEFAULT_COMPARISON_COLUMNS = 3;
const createEmptyComparisonSelections = () => Array.from({ length: DEFAULT_COMPARISON_COLUMNS }, () => null as CountryKey | null);

type DataProviderProps = {
  children: React.ReactNode;
  allData: Record<CountryKey, YearData[]>;
  genderData: Record<CountryKey, GenderYearData[]>;
  populations: Partial<Record<CountryKey, number>>;
};

export function DataProvider({ children, allData, genderData, populations }: DataProviderProps) {
  const [country,setCountry] = useState<CountryKey | undefined>();
  const [yearState,setYearState] = useState<number>(2018);
  const [dataView, setDataViewState] = useState<DataView>('political');
  const [paletteOrientation, setPaletteOrientationState] = useState<PaletteOrientation>('european');
  const [comparisonSelections, setComparisonSelections] = useState<(CountryKey | null)[]>(() => createEmptyComparisonSelections());
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  // Initialize from URL
  useEffect(()=>{
    const c = params.get('country') as CountryKey | null;
    const y = params.get('year');
    const lens = params.get('lens');
    const palette = params.get('palette');
    if (c && allData[c]) setCountry(c);
    if (y) setYearState(Number(y));
    if (lens === 'gender' || lens === 'political') setDataViewState(lens as DataView);
    if (palette === 'european' || palette === 'american') setPaletteOrientationState(palette as PaletteOrientation);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Push updates to URL
  useEffect(()=>{
    const query = new URLSearchParams();
    if (country) query.set('country', country);
    query.set('year', String(yearState));
    if (dataView !== 'political') query.set('lens', dataView);
    if (paletteOrientation !== 'european') query.set('palette', paletteOrientation);
    const targetPath = pathname || '/';
    router.replace(`${targetPath}?${query.toString()}`);
  },[country, yearState, dataView, paletteOrientation, router, pathname]);

  const setYear = (y:number) => setYearState(y);
  const setDataView = (mode: DataView) => setDataViewState(mode);
  const setPaletteOrientation = (o: PaletteOrientation) => setPaletteOrientationState(o);
  const categoryPalette = useMemo(()=> getCategoryPalette(paletteOrientation), [paletteOrientation]);
  const currentYearData = useMemo(()=>{
    if (!country) return undefined;
    const arr = allData[country];
    // most recent election <= selected yearState, else earliest
    const exact = arr.find(d=>d.year===yearState);
    if (exact) return exact;
    const prev = [...arr].reverse().find(d=>d.year <= yearState);
    return prev ?? arr[0];
  },[allData,country,yearState]);

  const currentGenderData = useMemo(()=>{
    if (!country) return undefined;
    const arr = genderData[country];
    if (!arr || arr.length === 0) return undefined;
    const exact = arr.find(d=>d.year===yearState);
    if (exact) return exact;
    const prev = [...arr].reverse().find(d=>d.year <= yearState);
    return prev ?? arr[0];
  },[genderData, country, yearState]);
  return (
    <DataContext.Provider
      value={{
        allData,
        genderData,
        country,
        setCountry: (c?: CountryKey) => setCountry(c),
        year: yearState,
        setYear,
        currentYearData,
        currentGenderData,
        comparisonSelections,
        setComparisonSelections,
        populations,
        dataView,
        setDataView,
        paletteOrientation,
        setPaletteOrientation,
        categoryPalette
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