"use client";

import React, { useState, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { UploadedPlayer, uploadPlayers } from "@/app/actions/players";
import { UploadCloud, FileType, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function PlayersManager({ divisions }: { divisions: any[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [mappedPlayers, setMappedPlayers] = useState<UploadedPlayer[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  React.useEffect(() => {
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
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
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
            Support for a single or bulk upload. Strictly prohibit from uploading company data or other band files. Supported formats: CSV, XLSX.
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
  );
}
