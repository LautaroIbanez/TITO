'use client';
import { useEffect, useState } from 'react';

// Define types for strategy data
interface AssetAllocation {
  percentage: number;
  ars: number;
  usd: number;
}

interface Strategy {
  stocks: AssetAllocation;
  bonds: AssetAllocation;
  cash: AssetAllocation;
}

const HowItWorksPage = () => {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStrategy = async () => {
      try {
        const session = localStorage.getItem('session');
        if (!session) {
          throw new Error('User not logged in');
        }
        const username = JSON.parse(session).username;

        const res = await fetch(`/api/strategy?username=${username}`);
        if (!res.ok) {
          throw new Error('Failed to fetch strategy data');
        }
        const data = await res.json();
        setStrategy(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStrategy();
  }, []);

  if (loading) {
    return <div className="text-center text-gray-500">Loading strategy...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  if (!strategy) {
    return <div className="text-center text-gray-500">No strategy data available.</div>;
  }

  const renderAllocationCard = (title: string, allocation: AssetAllocation) => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="space-y-2">
        <p className="text-gray-600">
          <strong>Recommended Allocation:</strong> {allocation.percentage}%
        </p>
        <p className="text-gray-600">
          <strong>Split ARS:</strong> {allocation.ars}%
        </p>
        <p className="text-gray-600">
          <strong>Split USD:</strong> {allocation.usd}%
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">How Our Strategy Works</h1>
      <p className="text-lg text-gray-700">
        Based on your selected investment profile, we recommend the following portfolio distribution. 
        This guide helps you understand the suggested allocation across different asset classes and currencies 
        to optimize your returns while managing risk.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {renderAllocationCard('Stocks', strategy.stocks)}
        {renderAllocationCard('Bonds', strategy.bonds)}
        {renderAllocationCard('Cash', strategy.cash)}
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md mt-8">
        <h4 className="font-semibold text-blue-800">Why this distribution?</h4>
        <p className="text-blue-700">
          This asset mix is designed to balance growth opportunities from stocks with the stability of bonds and the liquidity of cash. The currency split between ARS and USD further diversifies your holdings, protecting against local currency fluctuations and providing exposure to global markets. Adjustments can be made based on your risk tolerance and financial goals.
        </p>
      </div>
    </div>
  );
};

export default HowItWorksPage; 