// src/components/common/MainContentHeader.jsx
import React from 'react';
import { Search } from 'lucide-react';
import TenantSwitcher from '../TenantSwitcher';

const MainContentHeader = ({ title, showSearch = true, children }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
      {/* Left: Title */}
      {title && (
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
          {title}
        </h2>
      )}
      
      {/* Right: Tenant Switcher + Search + Custom children */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Tenant Switcher - Full version with text */}
        <TenantSwitcher />
        
        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search..." 
              className="pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none w-40 sm:w-56" 
            />
          </div>
        )}
        
        {/* Custom children (like action buttons) */}
        {children}
      </div>
    </div>
  );
};

export default MainContentHeader;