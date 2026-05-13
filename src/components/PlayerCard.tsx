"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Player, PlayerStatus, PlayerAttendance } from '@/types';
import { GripVertical, Crosshair, Star, MessageSquare, ClipboardList, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PlayerCardProps {
  player: Player;
  isTryoutMode: boolean;
  viewMode: 'table' | 'kanban';
  isCompact?: boolean;
  onStatusChange?: (id: string, status: PlayerStatus) => void;
  onAttendanceChange?: (id: string, attendance: PlayerAttendance) => void;
  onViewDetails?: (player: Player) => void;
  activeUserId?: string;
}

export function PlayerCard({ 
  player, 
  isTryoutMode, 
  viewMode, 
  isCompact,
  onStatusChange, 
  onAttendanceChange,
  onViewDetails,
  activeUserId 
}: PlayerCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: player.id, data: player });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusColors: Record<PlayerStatus, string> = {
    'none': 'bg-gray-100 text-gray-600',
    'invited': 'bg-blue-100 text-blue-700',
    'declined': 'bg-red-100 text-red-700',
    'accepted': 'bg-green-100 text-green-700',
    'waiting to send invitation': 'bg-yellow-100 text-yellow-700',
  };

  const attendanceColors: Record<PlayerAttendance, string> = {
    'present': 'text-green-600 bg-green-50',
    'absent': 'text-red-600 bg-red-50',
    'excused': 'text-yellow-600 bg-yellow-50',
  };

  const getCardStyles = () => {
    if (player.status === 'declined') return "bg-red-50 border-red-200";
    if (player.position === 'Goalkeeper') return "bg-emerald-50 border-emerald-200";
    return "bg-white border-gray-100";
  };

  if (isCompact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group flex items-center justify-between p-2 mb-1.5 rounded-lg shadow-sm border transition-all select-none touch-none relative",
          getCardStyles(),
          isDragging ? "opacity-20 shadow-2xl scale-[1.02] z-50 ring-2 ring-indigo-500" : "hover:border-indigo-300 hover:bg-indigo-50"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 pointer-events-none">
          <div className="flex items-center gap-1 pointer-events-auto">
            <div 
              {...attributes} 
              {...listeners} 
              className="text-gray-300 hover:text-indigo-600 transition-colors cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-indigo-50"
            >
              <GripVertical size={16} />
            </div>
            <button 
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onViewDetails?.(player);
              }}
              className="p-1 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors z-20 relative pointer-events-auto"
              title="Player Details"
            >
              <Info size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded text-[10px] min-w-[28px] text-center">
              #{player.tryoutNumber}
            </div>
            <span className="font-semibold text-gray-900 text-[11px] truncate">{player.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter w-8 text-right">{player.position.substring(0, 3)}</span>
          <span className="flex items-center gap-0.5 font-black text-gray-800 text-[11px] min-w-[30px]"><Star size={10} className="text-yellow-400 fill-yellow-400" /> {player.rating}</span>
          
          {/* Mini Attendance Toggle */}
          <select 
            value={player.attendance}
            onChange={(e) => {
              e.stopPropagation();
              onAttendanceChange?.(player.id, e.target.value as PlayerAttendance);
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "text-[9px] font-black rounded border-0 outline-none w-6 h-6 flex items-center justify-center cursor-pointer transition-colors appearance-none text-center shadow-sm",
              player.attendance === 'present' ? "bg-green-100 text-green-700 hover:bg-green-200" :
              player.attendance === 'absent' ? "bg-red-100 text-red-700 hover:bg-red-200" :
              "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
            )}
            title={player.attendance === 'present' ? 'Present' : player.attendance === 'absent' ? 'Not Present' : 'Unavailable'}
          >
            <option value="present">P</option>
            <option value="excused">U</option>
            <option value="absent">N</option>
          </select>
        </div>
      </div>
    );
  }

  if (viewMode === 'table') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          "group flex items-center justify-between p-3 mb-2 rounded-xl shadow-sm border transition-all hover:shadow-md cursor-grab active:cursor-grabbing select-none touch-none",
          getCardStyles(),
          isDragging ? "opacity-20 shadow-none border-dashed border-gray-300" : ""
        )}
      >
        <div className="flex items-center gap-4 flex-1 pointer-events-none">
          <div className="text-gray-300 group-hover:text-indigo-400 transition-colors">
            <GripVertical size={20} />
          </div>
          
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center shrink-0">
            <span className="font-bold text-indigo-700 text-lg">#{player.tryoutNumber}</span>
          </div>
          
          <div className="flex flex-col min-w-[150px]">
            <span className="font-semibold text-gray-900">{player.name}</span>
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Crosshair size={14} /> {player.position}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Star size={16} className="text-yellow-400 fill-yellow-400" />
            <span className="font-bold text-gray-700">{player.rating}</span>
          </div>
        </div>

        {isTryoutMode && (
          <div className="flex items-center gap-3 ml-4 flex-1 justify-end">
            <select 
              value={player.attendance}
              onChange={(e) => onAttendanceChange?.(player.id, e.target.value as PlayerAttendance)}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn("text-xs font-semibold rounded-md px-2 py-1 cursor-pointer border-0 outline-none appearance-none", attendanceColors[player.attendance])}
            >
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
            </select>

            <select 
              value={player.status}
              onChange={(e) => onStatusChange?.(player.id, e.target.value as PlayerStatus)}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn("text-xs font-semibold rounded-full px-3 py-1 cursor-pointer border-0 outline-none appearance-none min-w-[90px] text-center", statusColors[player.status])}
            >
              <option value="none">No Status</option>
              <option value="waiting to send invitation">Waitlist</option>
              <option value="invited">Invited</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
            </select>
            
            <button
              onClick={() => onViewDetails?.(player)}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-sm bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-gray-700 transition-colors shadow-sm"
            >
              <Info size={14} className="text-indigo-500" />
              <span>Details</span>
              {player.notes.length > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 rounded-full ml-1">{player.notes.length}</span>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Kanban View
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group p-4 rounded-2xl border transition-all duration-200 cursor-grab active:cursor-grabbing select-none touch-none",
        getCardStyles(),
        isDragging ? "opacity-20 shadow-none border-dashed border-gray-300" : "hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1"
      )}
    >
      <div className="flex justify-between items-start mb-3 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="text-gray-300 group-hover:text-indigo-400 transition-colors -ml-1">
            <GripVertical size={16} />
          </div>
          <span className="font-semibold text-gray-900 truncate max-w-[120px]">{player.name}</span>
        </div>
        <div className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md text-xs">
          #{player.tryoutNumber}
        </div>
      </div>
      
      <div className="flex justify-between items-center text-sm text-gray-600 mb-3 pointer-events-none">
        <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-100"><Crosshair size={12} /> {player.position}</span>
        <span className="flex items-center gap-1 font-bold text-gray-800"><Star size={12} className="text-yellow-400 fill-yellow-400" /> {player.rating}</span>
      </div>

      {isTryoutMode && (
        <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <select 
              value={player.attendance}
              onChange={(e) => onAttendanceChange?.(player.id, e.target.value as PlayerAttendance)}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn("text-xs font-semibold rounded-md px-2 py-1.5 cursor-pointer border-0 outline-none w-1/3 text-center", attendanceColors[player.attendance])}
            >
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
            </select>

            <select 
              value={player.status}
              onChange={(e) => onStatusChange?.(player.id, e.target.value as PlayerStatus)}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn("text-xs font-semibold rounded-md px-2 py-1.5 cursor-pointer border-0 outline-none w-2/3 text-center", statusColors[player.status])}
            >
              <option value="none">No Status</option>
              <option value="waiting to send invitation">Waitlist</option>
              <option value="invited">Invited</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
            </select>
          </div>
          
          <button
            onClick={() => onViewDetails?.(player)}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full flex items-center justify-center gap-2 text-xs bg-white border border-gray-200 hover:bg-gray-50 px-2 py-1.5 rounded-md text-gray-700 transition-colors shadow-sm"
          >
            <Info size={14} className="text-indigo-500" />
            <span>View Details & Notes</span>
            {player.notes.length > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 rounded-full">{player.notes.length}</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
