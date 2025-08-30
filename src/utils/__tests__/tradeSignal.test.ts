import { getTradeSignal, TradeSignal } from '../tradeSignal';
import { Technicals } from '@/types/finance';

describe('getTradeSignal', () => {
  const baseTechnicals: Technicals = {
    rsi: null, 
    macd: null, 
    sma200: null, 
    sma40: null,
    ema12: null, 
    ema25: null,
    ema26: null, 
    ema50: null, 
    ema150: null,
    adx: null, 
    pdi: null, 
    mdi: null, 
    koncorde: null,
    updatedAt: ''
  };

  it('returns hold if technicals or price is missing', () => {
    expect(getTradeSignal(null, 100)).toBe('hold');
    expect(getTradeSignal(baseTechnicals, null)).toBe('hold');
  });

  it('returns buy for oversold RSI', () => {
    expect(getTradeSignal({ ...baseTechnicals, rsi: 20 }, 100)).toBe('buy');
  });

  it('returns sell for overbought RSI', () => {
    expect(getTradeSignal({ ...baseTechnicals, rsi: 80 }, 100)).toBe('sell');
  });

  it('returns buy for bullish MACD', () => {
    expect(getTradeSignal({ ...baseTechnicals, macd: 1 }, 100)).toBe('buy');
  });

  it('returns sell for bearish MACD', () => {
    expect(getTradeSignal({ ...baseTechnicals, macd: -1 }, 100)).toBe('sell');
  });

  it('returns buy for price above SMA200', () => {
    expect(getTradeSignal({ ...baseTechnicals, sma200: 90 }, 100)).toBe('buy');
  });

  it('returns sell for price below SMA200', () => {
    expect(getTradeSignal({ ...baseTechnicals, sma200: 110 }, 100)).toBe('sell');
  });

  it('returns buy for EMA12 > EMA26', () => {
    expect(getTradeSignal({ ...baseTechnicals, ema12: 105, ema26: 100 }, 100)).toBe('buy');
  });

  it('returns sell for EMA12 < EMA26', () => {
    expect(getTradeSignal({ ...baseTechnicals, ema12: 95, ema26: 100 }, 100)).toBe('sell');
  });

  it('returns buy for strong ADX and PDI > MDI', () => {
    expect(getTradeSignal({ ...baseTechnicals, adx: 30, pdi: 40, mdi: 20 }, 100)).toBe('buy');
  });

  it('returns sell for strong ADX and MDI > PDI', () => {
    expect(getTradeSignal({ ...baseTechnicals, adx: 30, pdi: 20, mdi: 40 }, 100)).toBe('sell');
  });

  it('returns hold for neutral/weak signals', () => {
    expect(getTradeSignal({ ...baseTechnicals, rsi: 50, macd: 0, sma200: 100, ema12: 100, ema26: 100, adx: 10, pdi: 20, mdi: 20 }, 100)).toBe('hold');
  });
}); 