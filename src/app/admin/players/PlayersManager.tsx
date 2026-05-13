"use client";

import React, { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { UploadedPlayer, uploadPlayers, getPlayers } from "@/app/actions/players";
import { UploadCloud, FileType, CheckCircle, AlertCircle, Loader2, Users, List, Filter, Search, Calendar, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlayersManager({ divisions }: { divisions: any[] }) {
  const [activeTab, setActiveTab] = useState<"list" | "upload">("list");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [mappedPlayers, setMappedPlayers] = useState<UploadedPlayer[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [registeredPlayers, setRegisteredPlayers] = useState<any[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [filterDivision, setFilterDivision] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch players on tab change or filter change
  useEffect(() => {
    if (activeTab === "list") {
      fetchRegisteredPlayers();
    }
  }, [activeTab, filterDivision]);

  const fetchRegisteredPlayers = async () => {
    setIsLoadingPlayers(true);
    try {
      const players = await getPlayers(filterDivision);
      setRegisteredPlayers(players);
    } catch (err) {
      console.error("Failed to fetch players:", err);
    } finally {
      setIsLoadingPlayers(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setFile(file);
    setError(null);
    setUploadSuccess(false);

    if (file.name.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          handleParsedData(results.data);
        },
        error: (error) => {
          setError(`Error parsing CSV: ${error.message}`);
        }
      });
    } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        if (data) {
          const workbook = XLSX.read(data, { type: "binary" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          handleParsedData(json);
        }
      };
      reader.onerror = () => setError("Error reading Excel file.");
      reader.readAsBinaryString(file);
    } else {
      setError("Unsupported file format. Please upload .csv or .xlsx");
    }
  };

  const handleParsedData = (data: any[]) => {
    setParsedData(data);
    
    // Auto map common column names
    const mapped: UploadedPlayer[] = data.map(row => {
      // Helper to find a value matching a set of common header names (case insensitive)
      const findVal = (keys: string[]) => {
        const foundKey = Object.keys(row).find(k => keys.some(key => k.toLowerCase().replace(/[^a-z0-9]/g, '') === key));
        return foundKey ? row[foundKey] : undefined;
      };

      const firstName = findVal(['firstname', 'first']) || row['First Name'] || '';
      const lastName = findVal(['lastname', 'last']) || row['Last Name'] || '';
      const name = findVal(['name', 'playername']) || '';

      let fName = firstName;
      let lName = lastName;
      
      if (!fName && !lName && name) {
        const parts = name.split(' ');
        fName = parts[0];
        lName = parts.slice(1).join(' ');
      }

      return {
        firstName: String(fName),
        lastName: String(lName),
        dob: findVal(['dob', 'dateofbirth', 'birthdate']),
        gender: findVal(['gender', 'sex']),
        tryoutNumber: findVal(['tryoutnumber', 'number', 'jersey', 'tryout']),
        position: findVal(['position', 'pos']),
        rating: Number(findVal(['rating', 'score', 'eval'])) || undefined,
        seasonAgeGroupId: selectedDivision || undefined
      };
    }).filter(p => p.firstName || p.lastName);

    setMappedPlayers(mapped);
  };

  // Re-map when division changes
  useEffect(() => {
    if (mappedPlayers.length > 0) {
      setMappedPlayers(prev => prev.map(p => ({ ...p, seasonAgeGroupId: selectedDivision || undefined })));
    }
  }, [selectedDivision]);


  const handleUpload = async () => {
    if (mappedPlayers.length === 0) return;
    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadPlayers(mappedPlayers);
      if (result.success) {
        setUploadSuccess(true);
        setFile(null);
        setMappedPlayers([]);
        setParsedData([]);
        // Refresh list if we upload successfully
        if (activeTab === "list") fetchRegisteredPlayers();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const filteredRegisteredPlayers = registeredPlayers.filter(p => {
    const searchStr = `${p.first_name} ${p.last_name}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("list")}
          className={`px-6 py-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === "list" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Users size={18} /> Registered Players
        </button>
        <button
          onClick={() => setActiveTab("upload")}
          className={`px-6 py-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === "upload" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          }`}
        >
          <UploadCloud size={18} /> Upload Players
        </button>
      </div>

      {activeTab === "list" ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50/50 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 min-w-[250px]">
                <Filter size={18} className="text-slate-400" />
                <select
                  value={filterDivision}
                  onChange={(e) => setFilterDivision(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Divisions</option>
                  {divisions.map((div) => (
                    <option key={div.id} value={div.id}>
                      {div.age_group_name} {div.gender === 'M' ? 'Boys' : div.gender === 'F' ? 'Girls' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={() => fetchRegisteredPlayers()} variant="outline" size="sm" className="h-9">
                Refresh
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                  <th className="px-6 py-4">Player</th>
                  <th className="px-6 py-4">DOB / Gender</th>
                  <th className="px-6 py-4">Division</th>
                  <th className="px-6 py-4">Tryout #</th>
                  <th className="px-6 py-4">Position</th>
                  <th className="px-6 py-4">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingPlayers ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 size={32} className="animate-spin text-indigo-600" />
                        <p className="text-slate-500 text-sm">Loading players...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredRegisteredPlayers.length > 0 ? (
                  filteredRegisteredPlayers.map((player) => (
                    <tr key={`${player.id}-${player.season_age_group_id}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-100 text-slate-600 p-2 rounded-full">
                            <User size={16} />
                          </div>
                          <span className="font-bold text-slate-900">{player.first_name} {player.last_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm text-slate-700 flex items-center gap-1.5">
                            <Calendar size={14} className="text-slate-400" />
                            {player.date_of_birth ? new Date(player.date_of_birth).toLocaleDateString() : 'N/A'}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 uppercase">
                            <Shield size={12} className="text-slate-400" />
                            {player.gender || 'Unknown'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {player.age_group_name ? (
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-md border border-indigo-100 font-medium">
                            {player.age_group_name} {player.division_gender}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-mono">
                        {player.tryout_number || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {player.position || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {player.rating ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-500" 
                                style={{ width: `${Math.min(100, (player.rating / 100) * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-900">{player.rating}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <Search size={32} className="text-slate-200" />
                        <p>No players found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 text-right">
            Showing {filteredRegisteredPlayers.length} registered players
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="mb-8 max-w-xl">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Assign to Division (Optional)</label>
            <select 
              value={selectedDivision} 
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-slate-900 bg-white"
            >
              <option value="">Do not assign to a specific division</option>
              {divisions.map((div: any) => (
                <option key={div.id} value={div.id}>
                  {div.age_group_name} {div.gender === 'M' ? 'Boys' : div.gender === 'F' ? 'Girls' : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-2">
              If selected, uploaded players will also be added to this season division with their tryout numbers, ratings, and positions if available.
            </p>
          </div>

          {!file || mappedPlayers.length === 0 ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition-colors"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                className="hidden" 
              />
              <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                <UploadCloud size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Click or drag file to this area to upload</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                Support for a single or bulk upload. Supported formats: CSV, XLSX.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-100 text-indigo-700 p-3 rounded-lg">
                    <FileType size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">{mappedPlayers.length} valid records found</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setFile(null); setMappedPlayers([]); }}
                  className="text-sm text-red-600 hover:text-red-700 font-semibold"
                >
                  Remove
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">First Name</th>
                        <th className="px-4 py-3">Last Name</th>
                        <th className="px-4 py-3">DOB</th>
                        <th className="px-4 py-3">Gender</th>
                        <th className="px-4 py-3">Tryout #</th>
                        <th className="px-4 py-3">Position</th>
                        <th className="px-4 py-3">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mappedPlayers.slice(0, 10).map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-slate-900">{p.firstName}</td>
                          <td className="px-4 py-2 text-slate-900">{p.lastName}</td>
                          <td className="px-4 py-2 text-slate-500">{p.dob || '-'}</td>
                          <td className="px-4 py-2 text-slate-500">{p.gender || '-'}</td>
                          <td className="px-4 py-2 text-slate-500">{p.tryoutNumber || '-'}</td>
                          <td className="px-4 py-2 text-slate-500">{p.position || '-'}</td>
                          <td className="px-4 py-2 text-slate-500">{p.rating || '-'}</td>
                        </tr>
                      ))}
                      {mappedPlayers.length > 10 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-3 text-center text-slate-500 italic bg-slate-50/50">
                            ...and {mappedPlayers.length - 10} more records.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle size={20} className="mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => { setFile(null); setMappedPlayers([]); }}
                  className="px-6 py-2.5 rounded-lg font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || mappedPlayers.length === 0}
                  className="px-6 py-2.5 rounded-lg font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isUploading ? (
                    <><Loader2 size={18} className="animate-spin" /> Uploading...</>
                  ) : (
                    <><UploadCloud size={18} /> Import {mappedPlayers.length} Players</>
                  )}
                </button>
              </div>
            </div>
          )}

          {uploadSuccess && !file && (
            <div className="bg-green-50 text-green-700 p-6 rounded-xl flex flex-col items-center justify-center text-center mt-6 border border-green-200">
              <CheckCircle size={48} className="text-green-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">Upload Successful!</h3>
              <p className="max-w-md mx-auto">
                The players have been successfully imported into the database. You can now assign them to teams or divisions.
              </p>
              <button
                onClick={() => setUploadSuccess(false)}
                className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Upload Another File
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
