"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Player, TeamConfig, FieldConfig, PlayerStatus, SortOption, FilterOption, PlayerAttendance } from '@/types';
import { PlayerCard } from './PlayerCard';
import { Users, Trash2, ArrowUpDown, Filter, RotateCcw, Star, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TeamSectionProps {
  team: FieldConfig;
  players: Player[];
  isTryoutMode: boolean;
  viewMode: 'table' | 'kanban';
  isSidebar?: boolean;
  onStatusChange?: (id: string, status: PlayerStatus) => void;
  onNotesChange?: (id: string, notes: string) => void;
  onTeamNameChange?: (id: string, name: string) => void;
  onSortChange?: (id: string, sort: SortOption) => void;
  onFilterChange?: (id: string, filter: FilterOption) => void;
  onRatingFilterChange?: (id: string, rating: string) => void;
  onDeleteTeam?: (id: string) => void;
  onResetField?: (id: string) => void;
  onInviteAllTeam?: (id: string) => void;
  onAttendanceChange?: (id: string, attendance: PlayerAttendance) => void;
  onViewDetails?: (player: Player) => void;
  activeUserId?: string;
  isCompact?: boolean;
}

export function TeamSection({ 
  team, 
  players, 
  isTryoutMode, 
  viewMode, 
  isSidebar, 
  isCompact,
  onStatusChange, 
  onNotesChange,
  onTeamNameChange,
  onSortChange,
  onFilterChange,
  onRatingFilterChange,
  onDeleteTeam,
  onResetField,
  onInviteAllTeam,
  onAttendanceChange,
  onViewDetails,
  activeUserId
}: TeamSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: team.id,
  });

  const activePlayerCount = players.filter(p => p.status !== 'declined').length;

  const renderControls = () => (
    <div className="flex flex-wrap items-center gap-2 mt-2 mb-3">
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md px-2 py-1 shadow-sm">
        <button 
          onClick={() => onSortChange?.(team.id, team.sortBy)}
          className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
          title="Toggle Sort Direction"
        >
          <ArrowUpDown size={14} className={cn("transition-transform", team.sortDirection === 'desc' ? "rotate-180" : "")} />
          <span className="text-[10px] text-gray-400 font-bold uppercase">{team.sortDirection}</span>
        </button>
        <div className="w-px h-3 bg-gray-200 mx-1"></div>
        <select 
          value={team.sortBy}
          onChange={(e) => onSortChange?.(team.id, e.target.value as SortOption)}
          className="text-xs bg-transparent outline-none text-gray-700 cursor-pointer font-semibold"
        >
          <option value="manual">Manual Rank</option>
          <option value="name">Name</option>
          <option value="rating">Rating</option>
          <option value="position">Position</option>
          {isTryoutMode && <option value="status">Status</option>}
        </select>
      </div>
      
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md px-2 py-1 shadow-sm">
        <span className="text-[10px] font-black text-gray-400 mr-1">RATING</span>
        <select 
          value={team.ratingFilter || 'all'}
          onChange={(e) => onRatingFilterChange?.(team.id, e.target.value)}
          className="text-xs bg-transparent outline-none text-gray-700 cursor-pointer font-bold"
        >
          <option value="all">All</option>
          {[...new Set(players.map(p => Math.floor(p.rating)))].sort((a,b) => b-a).map(r => (
            <option key={r} value={r}>{r}+</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md px-2 py-1 shadow-sm">
        <span className="text-[10px] font-black text-gray-400 mr-1">POS</span>
        <select 
          value={team.filterBy}
          onChange={(e) => onFilterChange?.(team.id, e.target.value as FilterOption)}
          className="text-xs bg-transparent outline-none text-gray-700 cursor-pointer"
        >
          <option value="all">All</option>
          <option value="Forward">FWD</option>
          <option value="Midfielder">MID</option>
          <option value="Defender">DEF</option>
          <option value="Goalkeeper">GK</option>
        </select>
      </div>

      {team.id !== 'unassigned' && (
        <button 
          onClick={() => onDeleteTeam?.(team.id)}
          className="ml-auto text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors"
          title="Delete Field"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );

  if (viewMode === 'table') {
    return (
      <div className="mb-8 relative">
        <div className="sticky top-0 bg-white z-20 pt-2 pb-2 border-b-2 border-gray-100 mb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Users className="text-indigo-500" />
              {team.id.includes('unassigned') ? (
                <h2 className="text-xl font-bold text-gray-800">{team.name}</h2>
              ) : (
                <input 
                  type="text" 
                  value={team.name}
                  onChange={(e) => onTeamNameChange?.(team.id, e.target.value)}
                  className="text-xl font-bold text-gray-800 bg-transparent outline-none border-b border-transparent focus:border-indigo-300 hover:bg-gray-50 px-1 rounded transition-colors w-full max-w-[300px]"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              {!team.id.includes('unassigned') && (
                <>
                  <button 
                    onClick={() => {
                      if (window.confirm("Move all players from this field back to the unassigned pool?")) {
                        onResetField?.(team.id);
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                    title="Return All to Pool"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm("Delete this field? All players will return to the unassigned pool.")) {
                        onDeleteTeam?.(team.id);
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete Field"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
              <div className="bg-indigo-100 text-indigo-800 font-bold px-4 py-1.5 rounded-full text-sm shrink-0">
                {activePlayerCount} {activePlayerCount === 1 ? 'Player' : 'Players'}
              </div>
            </div>
          </div>
          {renderControls()}
        </div>

        <div 
          ref={setNodeRef}
          className={cn(
            "min-h-[100px] p-2 rounded-xl transition-colors duration-200",
            isOver ? "bg-indigo-50 border-2 border-dashed border-indigo-300" : "bg-gray-50 border-2 border-transparent"
          )}
        >
          <SortableContext items={players.map(p => p.id)} strategy={verticalListSortingStrategy}>
            {players.map((player) => (
              <PlayerCard 
                key={player.id} 
                player={player} 
                isTryoutMode={isTryoutMode} 
                viewMode={viewMode}
                isCompact={isCompact}
                onStatusChange={onStatusChange}
                onAttendanceChange={onAttendanceChange}
                onViewDetails={onViewDetails}
                activeUserId={activeUserId}
              />
            ))}
            {players.length === 0 && (
              <div className="h-24 flex items-center justify-center text-gray-400 font-medium italic border-2 border-dashed border-gray-200 rounded-lg">
                Drag players here
              </div>
            )}
          </SortableContext>
        </div>
      </div>
    );
  }

  // Kanban View
  return (
    <div className={cn(
      "flex-1 min-w-[300px] bg-gray-50/50 rounded-2xl flex flex-col h-full border border-gray-100/50 shadow-sm overflow-hidden",
      !isSidebar && "max-w-[350px]"
    )}>
      <div className="p-3 bg-white border-b border-gray-100 shadow-sm z-10 sticky top-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          {team.id.includes('unassigned') ? (
            <h2 className="text-lg font-bold text-gray-800">{team.name}</h2>
          ) : (
            <input 
              type="text" 
              value={team.name}
              onChange={(e) => onTeamNameChange?.(team.id, e.target.value)}
              className="text-lg font-bold text-gray-800 bg-transparent outline-none border-b border-transparent focus:border-indigo-300 hover:bg-gray-50 px-1 rounded w-full max-w-[200px]"
            />
          )}
          <div className="flex items-center gap-1">
            {!team.id.includes('unassigned') && (
              <>
                <button 
                  onClick={() => {
                    if (window.confirm("Move all players from this field back to the unassigned pool?")) {
                      onResetField?.(team.id);
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  title="Return All to Pool"
                >
                  <RotateCcw size={14} />
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm("Delete this field? All players will return to the unassigned pool.")) {
                      onDeleteTeam?.(team.id);
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Delete Field"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
            <div className="bg-indigo-100 text-indigo-800 font-bold px-3 py-1 rounded-full text-xs">
              {activePlayerCount}
            </div>
          </div>
        </div>
        {renderControls()}
      </div>

      <div 
        ref={setNodeRef}
        className={cn(
          "flex-1 p-3 overflow-y-auto transition-colors duration-200 min-h-[150px]",
          isOver ? "bg-indigo-50/50 ring-2 ring-inset ring-indigo-200 rounded-b-2xl" : ""
        )}
      >
        <SortableContext items={players.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {players.map((player) => (
            <PlayerCard 
              key={player.id} 
              player={player} 
              isTryoutMode={isTryoutMode} 
              viewMode={viewMode}
              isCompact={isCompact}
              onStatusChange={onStatusChange}
              onAttendanceChange={onAttendanceChange}
              onViewDetails={onViewDetails}
              activeUserId={activeUserId}
            />
          ))}
          {players.length === 0 && (
            <div className="h-32 flex flex-col items-center justify-center text-gray-400 font-medium italic border-2 border-dashed border-gray-200 rounded-xl m-2">
              <Users className="mb-2 opacity-50" size={24} />
              Drop here
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
