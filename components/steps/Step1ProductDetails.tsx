import React, { useState } from 'react';
import { Campaign } from '../../types';
import Button from '../common/Button';
import Card from '../common/Card';

interface Props {
  onNext: (details: Omit<Campaign, 'audienceSegments'>) => void;
}

const COUNTRIES = ['Singapore', 'Hong Kong', 'India', 'Indonesia', 'Taiwan'];

const Step1ProductDetails: React.FC<Props> = ({ onNext }) => {
  const [campaignName, setCampaignName] = useState('');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [totalBudget, setTotalBudget] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (campaignName && country && startDate && endDate && totalBudget) {
      onNext({
        campaignName,
        country,
        startDate,
        endDate,
        totalBudget: parseFloat(totalBudget),
      });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-1 text-slate-800 dark:text-slate-200">Campaign Details</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Let's start by defining the basics of your new campaign.</p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="campaignName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Campaign Name
            </label>
            <input
              type="text"
              id="campaignName"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
              placeholder="e.g., 'Summer Savings Bonanza'"
              required
            />
          </div>
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Country
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
              required
            >
              {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
              required
              min={startDate}
            />
          </div>
        </div>
        <div>
          <label htmlFor="totalBudget" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Total Budget ($)
          </label>
          <input
            type="number"
            id="totalBudget"
            value={totalBudget}
            onChange={(e) => setTotalBudget(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
            placeholder="e.g., 50000"
            required
            min="100"
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit">
            Define Audience
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default Step1ProductDetails;