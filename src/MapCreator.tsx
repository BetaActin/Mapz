import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { utils as XLSXUtils, writeFile as XLSXWriteFile } from 'xlsx';
import './App.css';

interface GenotypeInfo {
  Genotype: string;
  MaleDonor: string;
  FemaleReceptor: string;
  color?: string;
}

interface Block {
  row: number;
  col: number;
  genotype?: string;
  plotNumber?: number;
}

const DISTINCT_COLORS = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe',
  '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080',
  '#ffffff', '#000000', '#ff7f00', '#1f78b4', '#b15928', '#6a3d9a', '#b2df8a', '#fb9a99', '#cab2d6', '#ffff99',
];

const MapCreator: React.FC = () => {
  const [columns, setColumns] = useState<number>(5);
  const [plantsPerColumn, setPlantsPerColumn] = useState<number>(5);
  const [grid, setGrid] = useState<Block[][]>([]);
  const [isMapCreated, setIsMapCreated] = useState(false);
  const [genotypes, setGenotypes] = useState<GenotypeInfo[]>([]);
  const [selectedBlocks, setSelectedBlocks] = useState<{ row: number; col: number }[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [genotypeToAssign, setGenotypeToAssign] = useState<string>('');
  const [hoveredBlock, setHoveredBlock] = useState<{ row: number; col: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [startingPlotNumber, setStartingPlotNumber] = useState<number>(1000);
  const [currentPlotNumber, setCurrentPlotNumber] = useState<number>(1000);

  // Load Germplasm.xlsx from public folder on mount
  useEffect(() => {
    const fetchExcel = async () => {
      try {
        const response = await fetch('/Germplasm.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets['Genotypes'] || workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<any>(sheet);
        // Assign a color to each genotype
        const genotypeList: GenotypeInfo[] = data.map((row, idx) => ({
          Genotype: String(row['Genotype']),
          MaleDonor: row['Male donor'] || '',
          FemaleReceptor: row['Female receptor'] || '',
          color: DISTINCT_COLORS[idx % DISTINCT_COLORS.length],
        })).filter(g => g.Genotype);
        setGenotypes(genotypeList);
      } catch (err) {
        setGenotypes([]);
      }
    };
    fetchExcel();
  }, []);

  // Use a more distinct color palette
  useEffect(() => {
    setGenotypes(prev => prev.map((g, idx) => ({ ...g, color: DISTINCT_COLORS[idx % DISTINCT_COLORS.length] })));
  }, [genotypes.length]);

  useEffect(() => {
    setCurrentPlotNumber(startingPlotNumber);
  }, [startingPlotNumber, isMapCreated]);

  const handleCreateMap = () => {
    const newGrid: Block[][] = [];
    for (let c = 0; c < columns; c++) {
      const col: Block[] = [];
      for (let r = 0; r < plantsPerColumn; r++) {
        col.push({ row: r, col: c });
      }
      newGrid.push(col);
    }
    setGrid(newGrid);
    setIsMapCreated(true);
    setSelectedBlocks([]);
  };

  // Selection logic
  const handleBlockMouseDown = (row: number, col: number, e?: React.MouseEvent) => {
    if (e && e.shiftKey) {
      // Toggle selection
      setSelectedBlocks(prev => {
        const exists = prev.some(b => b.row === row && b.col === col);
        if (exists) {
          return prev.filter(b => !(b.row === row && b.col === col));
        } else {
          return [...prev, { row, col }];
        }
      });
      setSelecting(false);
    } else {
      setSelecting(true);
      setSelectedBlocks([{ row, col }]);
    }
  };

  const handleBlockMouseEnter = (row: number, col: number) => {
    if (selecting) {
      setSelectedBlocks(prev => {
        const exists = prev.some(b => b.row === row && b.col === col);
        if (!exists) {
          return [...prev, { row, col }];
        }
        return prev;
      });
    }
  };

  const handleMouseUp = () => {
    setSelecting(false);
  };

  useEffect(() => {
    if (selecting) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [selecting]);

  // Mobile/touch selection logic
  const isTouchDevice = () => {
    return (
      'ontouchstart' in window ||
      (navigator as any).maxTouchPoints > 0
    );
  };

  const handleBlockClick = (row: number, col: number, e?: React.MouseEvent | React.TouchEvent) => {
    if (isTouchDevice()) {
      setSelectedBlocks(prev => {
        const exists = prev.some(b => b.row === row && b.col === col);
        if (exists) {
          return prev.filter(b => !(b.row === row && b.col === col));
        } else {
          return [...prev, { row, col }];
        }
      });
    } else {
      // Desktop: same as before
      if (e && 'shiftKey' in e && e.shiftKey) {
        setSelectedBlocks(prev => {
          const exists = prev.some(b => b.row === row && b.col === col);
          if (exists) {
            return prev.filter(b => !(b.row === row && b.col === col));
          } else {
            return [...prev, { row, col }];
          }
        });
        setSelecting(false);
      } else {
        setSelecting(true);
        setSelectedBlocks([{ row, col }]);
      }
    }
  };

  // Assign genotype and plot number to selected blocks
  const handleApprove = () => {
    if (!genotypeToAssign) return;
    setGrid(prevGrid =>
      prevGrid.map((colArr, cIdx) =>
        colArr.map((block, rIdx) => {
          const isSelected = selectedBlocks.some(b => b.row === rIdx && b.col === cIdx);
          if (isSelected) {
            return { ...block, genotype: genotypeToAssign, plotNumber: currentPlotNumber };
          }
          return block;
        })
      )
    );
    setSelectedBlocks([]);
    setGenotypeToAssign('');
    setCurrentPlotNumber(prev => prev + 1);
  };

  // Tooltip logic
  const getBlockGenotypeInfo = (row: number, col: number) => {
    if (!grid[row] || !grid[row][col]) return undefined;
    const genotype = grid[row][col].genotype;
    if (!genotype) return undefined;
    return genotypes.find(g => String(g.Genotype) === String(genotype));
  };

  // Export map as JSON
  const handleExport = () => {
    const exportData = {
      columns,
      plantsPerColumn,
      grid,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'experiment_map.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Excel export with specified columns
  const handleExportExcel = () => {
    const rows: any[] = [];
    grid.forEach((col, cIdx) => {
      col.forEach((block, rIdx) => {
        if (block.genotype) {
          const genotypeInfo = getBlockGenotypeInfo(rIdx, cIdx);
          rows.push({
            'Plot number': block.plotNumber ?? '',
            'Column': cIdx + 1,
            'Genotype': block.genotype,
            'Male donor': genotypeInfo ? genotypeInfo.MaleDonor : '',
            'Female receptor': genotypeInfo ? genotypeInfo.FemaleReceptor : '',
            'Number of plants per plot': 1,
          });
        }
      });
    });
    const ws = XLSXUtils.json_to_sheet(rows);
    const wb = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(wb, ws, 'Map');
    XLSXWriteFile(wb, 'experiment_map.xlsx');
  };

  // Import map from JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.columns && data.plantsPerColumn && data.grid) {
          setColumns(data.columns);
          setPlantsPerColumn(data.plantsPerColumn);
          setGrid(data.grid);
          setIsMapCreated(true);
          setSelectedBlocks([]);
        }
      } catch (err) {
        alert('Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="App">
      <h1>Experiment Map Planner</h1>
      <div style={{ marginBottom: 20 }}>
        <label>
          Columns:
          <input
            type="number"
            value={columns}
            min={1}
            onChange={e => setColumns(Number(e.target.value))}
            style={{ margin: '0 10px' }}
          />
        </label>
        <label>
          Plants per column:
          <input
            type="number"
            value={plantsPerColumn}
            min={1}
            onChange={e => setPlantsPerColumn(Number(e.target.value))}
            style={{ margin: '0 10px' }}
          />
        </label>
        <label style={{ marginLeft: 20 }}>
          Starting plot number:
          <input
            type="number"
            value={startingPlotNumber}
            min={1}
            onChange={e => setStartingPlotNumber(Number(e.target.value))}
            style={{ margin: '0 10px' }}
          />
        </label>
        <button onClick={handleCreateMap}>Create Map</button>
        <button style={{ marginLeft: 10 }} onClick={handleExport} disabled={!isMapCreated}>Export Map</button>
        <button style={{ marginLeft: 10 }} onClick={handleExportExcel} disabled={!isMapCreated}>Export to Excel</button>
        <button style={{ marginLeft: 10 }} onClick={() => fileInputRef.current?.click()} disabled={!isMapCreated}>Import Map</button>
        <input
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleImport}
        />
      </div>
      {isMapCreated && (
        <div
          ref={gridRef}
          style={{ display: 'inline-block', border: '1px solid #ccc', padding: 10, position: 'relative' }}
        >
          {Array.from({ length: plantsPerColumn }).map((_, rIdx) => (
            <div key={rIdx} style={{ display: 'flex' }}>
              {grid.map((col, cIdx) => {
                const block = col[rIdx];
                if (!block) return <div key={cIdx} style={{ width: 30, height: 30, margin: 2 }} />;
                const isSelected = selectedBlocks.some(b => b.row === rIdx && b.col === cIdx);
                const genotypeInfo = getBlockGenotypeInfo(rIdx, cIdx);
                return (
                  <div
                    key={cIdx}
                    style={{
                      width: 30,
                      height: 30,
                      border: '1px solid #888',
                      margin: 2,
                      background: isSelected
                        ? '#b3e5fc'
                        : genotypeInfo?.color
                        ? genotypeInfo.color
                        : '#f9f9f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                      fontSize: 12,
                      fontWeight: 'bold',
                    }}
                    onClick={e => handleBlockClick(rIdx, cIdx, e)}
                    onTouchEnd={e => handleBlockClick(rIdx, cIdx, e)}
                    onMouseEnter={() => handleBlockMouseEnter(rIdx, cIdx)}
                    onMouseOver={() => setHoveredBlock({ row: rIdx, col: cIdx })}
                    onMouseOut={() => setHoveredBlock(null)}
                  >
                    {block.plotNumber !== undefined ? block.plotNumber : ''}
                    {hoveredBlock && hoveredBlock.row === rIdx && hoveredBlock.col === cIdx && genotypeInfo && (
                      <div className="block-tooltip">
                        <div><b>Genotype:</b> {genotypeInfo.Genotype}</div>
                        <div><b>Male donor:</b> {genotypeInfo.MaleDonor}</div>
                        <div><b>Female receptor:</b> {genotypeInfo.FemaleReceptor}</div>
                        {block.plotNumber !== undefined && (
                          <div><b>Plot number:</b> {block.plotNumber}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {/* Genotype dropdown and approve button for selected blocks */}
      {selectedBlocks.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h3>Assign Genotype to Selected Blocks:</h3>
          <select
            value={genotypeToAssign}
            onChange={e => setGenotypeToAssign(e.target.value)}
          >
            <option value="">Select genotype</option>
            {genotypes.map((g, i) => (
              <option key={i} value={g.Genotype}>{g.Genotype}</option>
            ))}
          </select>
          <button style={{ marginLeft: 10 }} onClick={handleApprove} disabled={!genotypeToAssign}>
            Approve
          </button>
        </div>
      )}
    </div>
  );
};

export default MapCreator; 