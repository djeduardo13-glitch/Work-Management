export async function fetchWCity(lat,lon){
  try{
    const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${Number(lat)}&longitude=${Number(lon)}&hourly=temperature_2m,weather_code&forecast_days=3&timezone=Europe/Rome`);
    const d=await r.json();
    return d;
  }catch(e){return null;}
}

export async function geocodeCity(city,country){
  try{
    const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=it&format=json`);
    const d=await r.json();
    if(!d.results||!d.results.length) return null;
    // Preferisce risultato con country_code corrispondente
    const cc={spagna:'ES',francia:'FR',germania:'DE',portogallo:'PT',belgio:'BE',italia:'IT','repubblica ceca':'CZ',ungheria:'HU'};
    const code=cc[country.toLowerCase()]||'';
    const match=d.results.find(x=>x.country_code===code)||d.results[0];
    return {lat:match.latitude,lon:match.longitude,name:match.name,tz:match.timezone||''};
  }catch(e){return null;}
}

export function wmoDesc(code){
  if(code===0) return 'Cielo sereno';
  if(code<=2) return 'Parzialmente nuvoloso';
  if(code===3) return 'Coperto';
  if(code<=49) return 'Nebbia';
  if(code<=59) return 'Pioggerella';
  if(code<=69) return 'Pioggia';
  if(code<=79) return 'Neve';
  if(code<=82) return 'Rovesci';
  if(code<=99) return 'Temporale';
  return 'Variabile';
}

export function wmoIcon(code){
  if(code===0) return '☀️';
  if(code<=2) return '⛅';
  if(code===3) return '☁️';
  if(code<=49) return '🌫️';
  if(code<=59) return '🌦️';
  if(code<=69) return '🌧️';
  if(code<=79) return '❄️';
  if(code<=82) return '🌧️';
  if(code<=99) return '⛈️';
  return '🌡️';
}
