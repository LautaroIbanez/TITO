// jest.setup.js
// Optional: extend Jest expectations with custom matchers
// import '@testing-library/jest-dom/extend-expect'; 

import '@testing-library/jest-dom';

// Polyfill for TextEncoder, which is used by Next.js server components
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Next.js server-side objects
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      // Basic mock properties
      this.url = typeof input === 'string' ? input : input.url;
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
      this.body = init?.body;
      this._bodyUsed = false;
      this.json = async () => JSON.parse(this.body);
      this.text = async () => this.body;
    }
  };
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Headers(init?.headers);
      this.ok = this.status >= 200 && this.status < 300;
    }
    static json(data, init) {
      const body = JSON.stringify(data);
      const headers = new Headers(init?.headers);
      headers.set('Content-Type', 'application/json');
      return new Response(body, { ...init, headers });
    }
  };
}

// Mock fetch if it's not available (it is in recent Node versions, but good to be safe)
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn();
}

// Mock JSON imports
jest.mock('../../data/bonds.json', () => ({
  bonds: [
    {
      id: "AL30",
      ticker: "AL30",
      name: "Bonar 2030 Ley Arg.",
      issuer: "Gobierno de Argentina",
      maturityDate: "2030-07-09",
      couponRate: 7.5,
      price: 50000,
      currency: "ARS",
      bcbaPrice: 50000,
      mepPrice: 45.0,
      cclPrice: 42.0,
      tna: 7.5,
      duration: 6.5
    },
    {
      id: "GD30",
      ticker: "GD30",
      name: "Global 2030 Ley NY",
      issuer: "Gobierno de Argentina",
      maturityDate: "2030-07-09",
      couponRate: 7.5,
      price: 55,
      currency: "USD",
      bcbaPrice: 55,
      mepPrice: 55,
      cclPrice: 55,
      tna: 7.5,
      duration: 6.5
    },
    {
      id: "ON-YMC20",
      ticker: "YMC2O",
      name: "ON YPF 2026",
      issuer: "YPF S.A.",
      maturityDate: "2026-03-23",
      couponRate: 8.5,
      price: 98,
      currency: "USD",
      bcbaPrice: 98,
      mepPrice: 98,
      cclPrice: 98,
      tna: 8.5,
      duration: 2.3
    }
  ],
  lastUpdated: "2024-01-15T10:30:00.000Z",
  source: "bonistas.com",
  totalBonds: 3
}), { virtual: true }); 