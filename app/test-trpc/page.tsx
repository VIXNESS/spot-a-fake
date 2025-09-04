'use client';

import { trpc } from '@/lib/trpc/client';
import { useState } from 'react';

export default function TestTRPCPage() {
  const [name, setName] = useState('');
  
  // Test the basic greeting
  const { data: greeting, isLoading: greetingLoading } = trpc.getGreeting.useQuery();
  
  // Test the greeting with input
  const { data: personalGreeting, isLoading: personalLoading, refetch } = trpc.greeting.useQuery(
    { name: name || undefined },
    { enabled: false } // Don't auto-fetch, we'll trigger manually
  );

  const handleTestGreeting = () => {
    refetch();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          tRPC Test Page
        </h1>
        
        {/* Basic Greeting Test */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Basic Greeting Test
          </h2>
          <div className="bg-gray-100 p-4 rounded-md">
            {greetingLoading ? (
              <p className="text-gray-600">Loading...</p>
            ) : greeting ? (
              <div>
                <p className="text-green-600 font-medium">{greeting.message}</p>
                <p className="text-gray-500 text-sm mt-1">Status: {greeting.status}</p>
                <p className="text-gray-500 text-xs mt-1">
                  Timestamp: {new Date(greeting.timestamp).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-red-600">Failed to load greeting</p>
            )}
          </div>
        </div>

        {/* Personal Greeting Test */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Personal Greeting Test
          </h2>
          <div className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleTestGreeting}
              disabled={personalLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {personalLoading ? 'Loading...' : 'Test Personal Greeting'}
            </button>
            
            {personalGreeting && (
              <div className="bg-gray-100 p-4 rounded-md">
                <p className="text-blue-600 font-medium">{personalGreeting.message}</p>
                <p className="text-gray-500 text-xs mt-1">
                  Timestamp: {new Date(personalGreeting.timestamp).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            🚀 If you can see responses above, tRPC is working correctly!
          </p>
        </div>
      </div>
    </div>
  );
}
