import React, { useState } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';

const CreateDepartmentForm = ({ departments = [], onCreateDept, createDeptLoading }) => {
  const [newDeptName, setNewDeptName] = useState('');
  const [deptType, setDeptType] = useState('GENERAL');
  
  // Custom classification input mode state
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customType, setCustomType] = useState('');

  // Extract all unique classifications currently in the database, merged with Ranchi defaults
  const defaultClassifications = [
    { value: 'GENERAL', label: 'General/Other' },
    { value: 'ENGINEERING', label: 'Engineering' },
    { value: 'SANITATION', label: 'Sanitation' },
    { value: 'WATER_SUPPLY', label: 'Water Supply' },
    { value: 'STREET_LIGHTING', label: 'Street Lighting' },
    { value: 'HORTICULTURE', label: 'Horticulture' },
    { value: 'ENCROACHMENT', label: 'Encroachment' },
    { value: 'ANIMAL_CONTROL', label: 'Animal Control' },
  ];

  const dbClassifications = Array.from(new Set(
    departments.map(d => d.dept_type).filter(Boolean)
  )).filter(type => !defaultClassifications.some(d => d.value === type));

  const allClassifications = [
    ...defaultClassifications,
    ...dbClassifications.map(type => ({ value: type, label: type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ') }))
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalName = newDeptName.trim();
    if (!finalName) return;

    const finalType = isCustomMode 
      ? customType.toUpperCase().trim().replace(/\s+/g, '_') 
      : deptType;

    if (!finalType) {
      alert('Please specify a classification type.');
      return;
    }

    onCreateDept(finalName, finalType);
    setNewDeptName('');
    setCustomType('');
    setIsCustomMode(false);
  };

  return (
    <div className="bg-white p-5 rounded-md border border-gray-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏢</span>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Add Department
          </h3>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Department Name */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Department Name</label>
          <input 
            type="text"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            placeholder="e.g. Health & Safety Wing"
            className="w-full bg-gray-50 border border-gray-200 text-xs font-bold p-2.5 rounded-sm focus:outline-none placeholder-gray-400 focus:bg-white"
            required
          />
        </div>

        {/* Classification Selector or Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Classification Type</label>
            
            {/* Button to toggle custom mode */}
            <button
              type="button"
              onClick={() => setIsCustomMode(!isCustomMode)}
              className="text-[9px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider flex items-center gap-0.5 cursor-pointer bg-transparent border-none outline-none"
            >
              {isCustomMode ? (
                <>
                  <FiX className="w-2.5 h-2.5" /> Use Existing
                </>
              ) : (
                <>
                  <FiPlus className="w-2.5 h-2.5" /> Add New Type
                </>
              )}
            </button>
          </div>

          {isCustomMode ? (
            <input 
              type="text"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="ENTER NEW CLASSIFICATION (e.g. HEALTH)"
              className="w-full bg-gray-50 border border-gray-200 text-xs font-bold p-2.5 rounded-sm focus:outline-none placeholder-gray-400 focus:bg-white uppercase"
              required
            />
          ) : (
            <select
              value={deptType}
              onChange={(e) => setDeptType(e.target.value)}
              className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold p-2.5 rounded-sm focus:outline-none cursor-pointer"
            >
              {allClassifications.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>

        <button 
          type="submit"
          disabled={createDeptLoading || !newDeptName.trim() || (isCustomMode && !customType.trim())}
          className="w-full py-2.5 bg-[#1e2a5a] hover:bg-[#2d3f82] disabled:bg-gray-300 text-white text-xs font-extrabold rounded-sm shadow-sm transition cursor-pointer"
        >
          {createDeptLoading ? 'Creating...' : 'Register Department'}
        </button>
      </form>
    </div>
  );
};

export default CreateDepartmentForm;
