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
jest.mock('../../data/bonds.json', () => [
  {
    id: "AL30",
    ticker: "AL30",
    name: "Bonar 2030 Ley Arg.",
    issuer: "Gobierno de Argentina",
    maturityDate: "2030-07-09",
    couponRate: 0.75,
    price: 50000,
    currency: "ARS"
  },
  {
    id: "GD30",
    ticker: "GD30",
    name: "Global 2030 Ley NY",
    issuer: "Gobierno de Argentina",
    maturityDate: "2030-07-09",
    couponRate: 0.75,
    price: 55,
    currency: "USD"
  },
  {
    id: "ON-YMC20",
    ticker: "YMC2O",
    name: "ON YPF 2026",
    issuer: "YPF S.A.",
    maturityDate: "2026-03-23",
    couponRate: 8.5,
    price: 98,
    currency: "USD"
  }
], { virtual: true }); 