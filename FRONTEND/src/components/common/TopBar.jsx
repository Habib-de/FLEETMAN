// src/components/common/TopBar.jsx
import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import TenantSwitcher from '../TenantSwitcher';

const TopBar = ({ onSearch, searchPlaceholder, isAdmin = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    
    if (query.length === 0) {
      return;
    }

    setIsSearching(true);
    console.log('🔍 Searching for:', query);
    
    if (onSearch) {
      onSearch(query);
    }
    
    window.dispatchEvent(new CustomEvent('globalSearch', {
      detail: { query }
    }));
    
    setIsSearching(false);
  };

  const handleClear = () => {
    setSearchQuery('');
    if (onSearch) {
      onSearch('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-2 sm:py-3 flex flex-wrap items-center justify-between gap-3">
      {/* Left: Tenant Switcher + Label */}
      <div className="flex items-center gap-3">
        <TenantSwitcher isAdmin={isAdmin} />  {/* ✅ PASS isAdmin */}
        <div className="h-5 w-px bg-gray-300 hidden sm:block"></div>
        <span className="text-xs sm:text-sm text-gray-500 hidden sm:block">
          {/* Fleet Management */}
        </span>
      </div>
      
      {/* Right: Search */}
      <form onSubmit={handleSearch} className="relative flex-1 sm:flex-none sm:w-64 md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input 
          type="text" 
          placeholder={searchPlaceholder || "Search vehicles, drivers, trips..."} 
          className="w-full pl-9 pr-9 py-1.5 sm:py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </form>
    </div>
  );
};

export default TopBar;