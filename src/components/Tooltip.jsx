import React, { useState } from 'react';

const Tooltip = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-flex items-center ml-1 z-50"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(!isVisible)}
    >
      {children}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 pointer-events-none z-50">
          <div className="bg-slate-800 text-slate-100 dark:bg-slate-200 dark:text-slate-900 text-xs font-medium rounded p-2 shadow-xl text-center leading-relaxed whitespace-normal break-words relative">
            {content}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-800 dark:border-t-slate-200"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
