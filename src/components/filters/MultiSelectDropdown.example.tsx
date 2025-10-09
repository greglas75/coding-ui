/**
 * 📚 Example Usage: MultiSelectDropdown Component
 *
 * This file demonstrates how to use the MultiSelectDropdown component
 * in various scenarios (filters, forms, dashboards, etc.)
 */

import { useState } from 'react';
import { MultiSelectDropdown } from './MultiSelectDropdown';

// ═══════════════════════════════════════════════════════════════
// 🎯 EXAMPLE 1: Basic Filter Bar
// ═══════════════════════════════════════════════════════════════

export function FilterBarExample() {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  return (
    <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Coding Dashboard Filters
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Type Filter */}
        <MultiSelectDropdown
          label="Type"
          options={[
            'Not categorized',
            'Categorized',
            'Whitelist',
            'Blacklist',
            'Gibberish',
            'gBlacklist',
            'Wrong Category',
            'Ignored',
            'Other',
            'Bad Word',
          ]}
          selected={selectedTypes}
          onChange={setSelectedTypes}
          searchable
          placeholder="Select types..."
        />

        {/* Status Filter */}
        <MultiSelectDropdown
          label="Status"
          options={['Active', 'Pending', 'Completed', 'Archived']}
          selected={selectedStatuses}
          onChange={setSelectedStatuses}
          placeholder="All Statuses"
        />

        {/* Code Filter */}
        <MultiSelectDropdown
          label="Code"
          options={['Gucci', 'Dior', 'Nike', 'Adidas', 'Prada', 'Chanel', 'Versace']}
          selected={selectedCodes}
          onChange={setSelectedCodes}
          searchable
          placeholder="Search codes..."
        />
      </div>

      {/* Selected Summary */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-neutral-800 rounded-md">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong>Selected:</strong>
        </p>
        <ul className="text-xs text-gray-500 dark:text-gray-500 mt-1 space-y-1">
          <li>Types: {selectedTypes.length > 0 ? selectedTypes.join(', ') : 'None'}</li>
          <li>Statuses: {selectedStatuses.length > 0 ? selectedStatuses.join(', ') : 'None'}</li>
          <li>Codes: {selectedCodes.length > 0 ? selectedCodes.join(', ') : 'None'}</li>
        </ul>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎯 EXAMPLE 2: Compact Layout (Single Column)
// ═══════════════════════════════════════════════════════════════

export function CompactExample() {
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  return (
    <div className="max-w-xs mx-auto p-4">
      <MultiSelectDropdown
        label="Languages"
        options={['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Polish']}
        selected={selectedLanguages}
        onChange={setSelectedLanguages}
        searchable
        placeholder="Select languages..."
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎯 EXAMPLE 3: Large Dataset with Search
// ═══════════════════════════════════════════════════════════════

export function LargeDatasetExample() {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  // Simulate large dataset
  const countries = [
    'United States',
    'Canada',
    'Mexico',
    'Brazil',
    'Argentina',
    'United Kingdom',
    'France',
    'Germany',
    'Italy',
    'Spain',
    'Poland',
    'Netherlands',
    'Belgium',
    'Sweden',
    'Norway',
    'Denmark',
    'Finland',
    'Switzerland',
    'Austria',
    'Portugal',
    'Greece',
    'Turkey',
    'Russia',
    'Ukraine',
    'China',
    'Japan',
    'South Korea',
    'India',
    'Australia',
    'New Zealand',
  ];

  return (
    <div className="max-w-md mx-auto p-4">
      <MultiSelectDropdown
        label="Countries"
        options={countries}
        selected={selectedCountries}
        onChange={setSelectedCountries}
        searchable
        placeholder="Search countries..."
      />

      {selectedCountries.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {selectedCountries.map((country) => (
            <span
              key={country}
              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md"
            >
              {country}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎯 EXAMPLE 4: Disabled State
// ═══════════════════════════════════════════════════════════════

export function DisabledExample() {
  const [selectedItems, setSelectedItems] = useState<string[]>(['Option 1', 'Option 2']);

  return (
    <div className="max-w-xs mx-auto p-4 space-y-4">
      <MultiSelectDropdown
        label="Normal"
        options={['Option 1', 'Option 2', 'Option 3']}
        selected={selectedItems}
        onChange={setSelectedItems}
      />

      <MultiSelectDropdown
        label="Disabled"
        options={['Option 1', 'Option 2', 'Option 3']}
        selected={selectedItems}
        onChange={setSelectedItems}
        disabled
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎯 EXAMPLE 5: Responsive Grid Layout
// ═══════════════════════════════════════════════════════════════

export function ResponsiveGridExample() {
  const [type, setType] = useState<string[]>([]);
  const [status, setStatus] = useState<string[]>([]);
  const [language, setLanguage] = useState<string[]>([]);
  const [country, setCountry] = useState<string[]>([]);

  return (
    <div className="p-4 bg-white dark:bg-neutral-900 rounded-lg shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MultiSelectDropdown
          label="Type"
          options={['Type A', 'Type B', 'Type C']}
          selected={type}
          onChange={setType}
        />

        <MultiSelectDropdown
          label="Status"
          options={['Active', 'Inactive']}
          selected={status}
          onChange={setStatus}
        />

        <MultiSelectDropdown
          label="Language"
          options={['English', 'Spanish', 'French']}
          selected={language}
          onChange={setLanguage}
          searchable
        />

        <MultiSelectDropdown
          label="Country"
          options={['USA', 'UK', 'Canada', 'Australia']}
          selected={country}
          onChange={setCountry}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 mt-4">
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium">
          Apply Filters
        </button>
        <button
          className="px-4 py-2 border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium"
          onClick={() => {
            setType([]);
            setStatus([]);
            setLanguage([]);
            setCountry([]);
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN DEMO COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function MultiSelectDropdownDemo() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 p-8 space-y-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          MultiSelectDropdown Examples
        </h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              1. Filter Bar Example
            </h2>
            <FilterBarExample />
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              2. Compact Layout
            </h2>
            <CompactExample />
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              3. Large Dataset with Search
            </h2>
            <LargeDatasetExample />
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              4. Disabled State
            </h2>
            <DisabledExample />
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              5. Responsive Grid Layout
            </h2>
            <ResponsiveGridExample />
          </section>
        </div>
      </div>
    </div>
  );
}
