"use client";
import TopBar from '@/components/TopBar';
import MapEurope from '@/components/MapEurope';
import CountryPanel from '@/components/CountryPanel';
import Timeline from '@/components/Timeline';
import { CountryKey, YearData } from '@/types';
import { useData } from '@/components/DataContext';

export default function Page() {
  const { country, setCountry, year, setYear, currentYearData } = useData();
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh', overflow:'hidden'}}>
      <TopBar />
      <div style={{flex:1, display:'flex', minHeight:0, overflow:'hidden'}}>
        <div style={{flex:'0 0 70%', minWidth:0, display:'flex', flexDirection:'column', minHeight:0, borderLeft:'2px solid black'}}>
          <MapEurope selected={country} onSelect={setCountry} />
        </div>
        <div style={{flex:'0 0 30%', minWidth:0, overflow:'auto', display:'flex', flexDirection:'column', minHeight:0}}>
          <CountryPanel country={country} data={currentYearData} />
        </div>
      </div>
      <Timeline year={year} onChange={setYear} />
    </div>
  );
}
