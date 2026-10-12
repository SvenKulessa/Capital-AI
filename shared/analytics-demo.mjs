export const ARCHIVE_WINDOW = Object.freeze({start:'2026-09-23',end:'2026-09-30'});
export const DEMO_DATES = Object.freeze(Array.from({length:8},(_,i)=>`2026-09-${23+i}`));
const SYMBOLS = ['BTC','ETH','SOL'];
/** Bounded educational index, independent of production ranking. No raw price or stored score leaves this projection. */
export function projectHistoricalDemo(rows) {
  if (!Array.isArray(rows) || rows.length !== 24) throw new Error('ARCHIVE_INCOMPLETE');
  return SYMBOLS.map(symbol => {
    const points = rows.filter(row => row.symbol === symbol).sort((a,b)=>String(a.snapshot_date).localeCompare(String(b.snapshot_date)));
    if (points.length !== 8 || points.some((row,i)=>row.snapshot_date !== DEMO_DATES[i] || !Number.isFinite(Number(row.price)) || Number(row.price) <= 0)) throw new Error('ARCHIVE_INVALID');
    const prices = points.map(row => Number(row.price));
    const index = prices.map(value => Math.round(value/prices[0]*10000)/100);
    return {symbol,name:{BTC:'Bitcoin',ETH:'Ethereum',SOL:'Solana'}[symbol],index};
  });
}
/** Public demo intentionally synthetic; never copied from the private archive. */
export const PUBLIC_ANALYTICS_DEMO = Object.freeze([
  {symbol:'BTC',name:'Bitcoin',index:[100,101.4,100.8,102.1,101.2,103.5,102.8,104.2]},
  {symbol:'ETH',name:'Ethereum',index:[100,99.1,99.5,98.6,100.2,99.4,100.8,101.3]},
  {symbol:'SOL',name:'Solana',index:[100,102.8,101.5,104.1,103.7,105.6,104.5,106.1]},
]);
export function demoMetrics(index) {
  if (!Array.isArray(index) || index.length < 3 || index.some(value=>!Number.isFinite(value)||value<=0)) throw new Error('INVALID_INDEX');
  const returns = index.slice(1).map((value,i)=>(value/index[i]-1)*100);
  const mean = returns.reduce((sum,value)=>sum+value,0)/returns.length;
  const volatility = Math.sqrt(returns.reduce((sum,value)=>sum+(value-mean)**2,0)/(returns.length-1));
  return {change:(index.at(-1)/index[0]-1)*100,volatility,last:index.at(-1)};
}
