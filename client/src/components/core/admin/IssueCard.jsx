import React from 'react';
import { FiMapPin, FiBarChart2, FiUsers, FiCalendar } from 'react-icons/fi';

const CATEGORY_LABELS = {
  POTHOLE: '🕳️ Pothole',
  STREETLIGHT: '💡 Street Light',
  SEWAGE: '🚰 Sewage',
  GARBAGE: '🗑️ Garbage',
  WATER_SUPPLY: '💧 Water Supply',
  ROAD_DAMAGE: '🛣️ Road Damage',
  ENCROACHMENT: '🚧 Encroachment',
  STRAY_ANIMALS: '🐕 Stray Animals',
  DEAD_ANIMAL: '💀 Dead Animal',
  PUBLIC_TOILET: '🚻 Public Toilet',
  DRAIN_BLOCKAGE: '🚰 Drain Blockage',
  FALLEN_TREE: '🌳 Fallen Tree',
  ABANDONED_VEHICLE: '🚗 Abandoned Vehicle',
  AIR_POLLUTION: '🌫️ Air Pollution',
  OTHER: '📋 Other',
};

const STATUS_STYLING = {
  SUBMITTED: 'bg-sky-50 text-sky-600 border-sky-100',
  VERIFIED: 'bg-teal-50 text-teal-600 border-teal-100',
  ASSIGNED: 'bg-amber-50 text-amber-600 border-amber-100',
  IN_PROGRESS: 'bg-blue-50 text-blue-600 border-blue-100',
  RESOLVED: 'bg-green-50 text-green-600 border-green-100',
  NOT_SATISFIED: 'bg-red-50 text-red-600 border-red-100',
  REJECTED: 'bg-red-50 text-red-600 border-red-100',
};

const IssueCard = ({ issue, onClick }) => {
  const {
    thumbnail,
    status,
    category,
    address,
    short_id,
    report_count,
    priority_score,
    days_pending
  } = issue;

  return (
    <div 
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-sm p-4.5 sm:p-5 shadow-xs hover:shadow-md transition-all duration-250 cursor-pointer hover:border-blue-200/50 hover:translate-y-[-1px] flex gap-4"
    >
      {thumbnail && (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-sm overflow-hidden flex-shrink-0 shadow-inner bg-gray-50">
          <img src={thumbnail} alt="Issue thumbnail" className="w-full h-full object-cover" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded border border-gray-200/50">
              #{short_id}
            </span>
            {status && (
              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${STATUS_STYLING[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {status.replace('_', ' ')}
              </span>
            )}
            {issue.department_name && (
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border bg-indigo-50 text-indigo-600 border-indigo-100">
                🏢 {issue.department_name}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {days_pending !== undefined && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-50 px-2.5 py-0.5 rounded-full border border-gray-200">
                <FiCalendar className="w-3.5 h-3.5 text-gray-400" /> {days_pending}d pending
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
              <FiUsers className="w-3.5 h-3.5 text-gray-400" /> {report_count || 1} reports
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100">
              <FiBarChart2 className="w-3.5 h-3.5" /> Score: {priority_score}
            </span>
          </div>
        </div>
        
        <h3 className="font-extrabold text-gray-900 text-base leading-tight mb-1">
          {CATEGORY_LABELS[category] || category}
        </h3>
        <p className="text-gray-550 text-xs font-semibold flex items-start gap-1">
          <FiMapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
          <span className="truncate">{address || 'Location information not provided'}</span>
        </p>
      </div>
    </div>
  );
};

export default IssueCard;
