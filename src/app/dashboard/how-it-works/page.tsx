'use client';

import React from 'react';

const steps = [
  {
    icon: (
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 text-2xl">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.5-1.8 4.5-4.5S14.7 3 12 3 7.5 4.8 7.5 7.5 9.3 12 12 12zm0 1.5c-3 0-9 1.5-9 4.5V21h18v-3c0-3-6-4.5-9-4.5z" fill="currentColor"/></svg>
      </span>
    ),
    title: 'Create Your Profile',
    desc: 'Set up your account to get started.'
  },
  {
    icon: (
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 text-2xl">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9 4.03 9 9 9zm-1-13h2v4h3v2h-5V8z" fill="currentColor"/></svg>
      </span>
    ),
    title: 'Add a Deposit',
    desc: 'Fund your account in ARS or USD.'
  },
  {
    icon: (
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 text-2xl">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/></svg>
      </span>
    ),
    title: 'Check Opportunities',
    desc: 'Explore stocks, crypto, and more.'
  },
  {
    icon: (
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 text-2xl">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M17 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2zm-5 14a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3-7H9V8h6v2z" fill="currentColor"/></svg>
      </span>
    ),
    title: 'Trade Instantly',
    desc: 'Buy or sell assets in a few clicks.'
  },
  {
    icon: (
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pink-100 text-pink-600 text-2xl">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/></svg>
      </span>
    ),
    title: 'Update Your Goals',
    desc: 'Track and adjust your investment objectives.'
  },
];

export default function HowItWorksPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2 text-center">How It Works</h1>
      <p className="text-gray-600 text-center mb-8">Get started in just a few steps:</p>
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {steps.map((step, idx) => (
          <div key={step.title} className="flex flex-col items-center bg-white rounded-xl shadow p-4 text-center">
            <div>{step.icon}</div>
            <div className="mt-2 text-lg font-semibold">{idx + 1}. {step.title}</div>
            <div className="text-gray-500 text-sm mt-1">{step.desc}</div>
          </div>
        ))}
      </div>
    </main>
  );
} 