"use client";
import { useEffect } from 'react';
import MapEurope from '@/components/MapEurope';
import CountryPanel from '@/components/CountryPanel';
import { CountryKey, YearData } from '@/types';
import { useData } from '@/components/DataContext';

export default function Page() {
  const { country, setCountry, year, setYear, currentYearData } = useData();
  const handleSelect = (c: CountryKey) => {
    // Toggle selection: clicking the active country deselects it
    if (country && c === country) {
      setCountry(undefined);
    } else {
      setCountry(c);
    }
  };
  const TIMELINE_SAFE_HEIGHT = 62; // px reserved at bottom so timeline stays interactive

  // Close panel with Escape
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{
    function onKey(e: KeyboardEvent){
      if (e.key === 'Escape' && country) setCountry(undefined);
    }
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  },[country, setCountry]);
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh', overflow:'hidden'}}>
      <div style={{flex:1, position:'relative', minHeight:0, overflow:'hidden', display:'flex'}}>
  <div style={{flex:1, minWidth:0, display:'flex', flexDirection:'column', minHeight:0, borderLeft:'2px solid black'}}>
          <MapEurope selected={country} onSelect={handleSelect} year={year} onYearChange={setYear} timelineRightOffset={country ? 'min(32vw, 520px)' : 0} />
        </div>
        {/* Backdrop removed per user request */}
        {/* Slide-out overlay panel */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: 'min(32vw, 520px)',
            maxWidth: '520px',
            minWidth: '320px',
            transform: country ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 320ms ease',
            zIndex: 40,
            pointerEvents: country ? 'auto' : 'none',
            display: 'flex'
          }}
          aria-hidden={!country}
        >
          <div style={{flex:1, background:'white', borderLeft:'1px solid black', borderRight:'2px solid black', borderTop:'2px solid black', borderBottom:'2px solid black', boxShadow:'-8px 0 24px rgba(0,0,0,0.25)', display:'flex'}}>
            <CountryPanel country={country} data={currentYearData} />
          </div>
        </div>
      </div>
    </div>
  );
}
