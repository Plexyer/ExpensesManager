import React, { useState, useRef } from 'react';
import { Settings, Check } from 'lucide-react';
import { ColumnId } from '../../../types/budget';
import { ALL_COLUMNS, COLUMN_PRESETS } from './categoryColumns';

interface ChooseColumnsPopoverProps {
  visibleColumns: ColumnId[];
  onColumnsChange: (columns: ColumnId[]) => void;
}

function ChooseColumnsPopover({ visibleColumns, onColumnsChange }: ChooseColumnsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleColumnToggle = (columnId: ColumnId) => {
    if (visibleColumns.includes(columnId)) {
      // Remove column (but keep at least one)
      if (visibleColumns.length > 1) {
        onColumnsChange(visibleColumns.filter(id => id !== columnId));
      }
    } else {
      // Add column
      onColumnsChange([...visibleColumns, columnId]);
    }
  };

  const handlePresetSelect = (presetColumns: ColumnId[]) => {
    onColumnsChange(presetColumns);
    setIsOpen(false);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-200 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
        title="Choose visible columns"
      >
        <Settings className="w-4 h-4 mr-2" />
        Columns
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          <div className="p-4">
            <h3 className="text-sm font-medium text-slate-900 mb-3">Visible Columns</h3>
            
            {/* Column Presets */}
            <div className="mb-4">
              <h4 className="text-xs font-medium text-slate-700 mb-2">Presets</h4>
              <div className="space-y-1">
                {Object.entries(COLUMN_PRESETS).map(([presetName, presetColumns]) => (
                  <button
                    key={presetName}
                    onClick={() => handlePresetSelect(presetColumns)}
                    className="w-full text-left px-2 py-1 text-sm rounded hover:bg-slate-50 text-slate-700"
                  >
                    {presetName}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-slate-200 mb-4" />

            {/* Individual Columns */}
            <div className="space-y-2">
              {ALL_COLUMNS.map(column => (
                <label
                  key={column.id}
                  className="flex items-center cursor-pointer hover:bg-slate-50 px-2 py-1 rounded"
                >
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(column.id)}
                      onChange={() => handleColumnToggle(column.id)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      visibleColumns.includes(column.id) 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'border-slate-300'
                    }`}>
                      {visibleColumns.includes(column.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>
                  <span className="ml-2 text-sm text-slate-700">{column.label}</span>
                </label>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                {visibleColumns.length} of {ALL_COLUMNS.length} columns visible
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChooseColumnsPopover;
