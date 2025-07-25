import React, { useState, useRef } from 'react';
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

const COLOR_PALETTE = [
  '#c8e6c9', '#b3e5fc', '#ffe082', '#ffab91', '#d1c4e9', '#f8bbd0', '#b2dfdb', '#f0f4c3', '#ffccbc', '#d7ccc8',
  '#f5e1a4', '#aed581', '#81d4fa', '#ffd54f', '#ff8a65', '#9575cd', '#f06292', '#4dd0e1', '#dce775', '#ffb74d',
];

const MapViewer: React.FC = () => {
  const [rows, setRows] = useState<number>(0);
  const [plantsPerRow, setPlantsPerRow] = useState<number>(0);
  const [grid, setGrid] = useState<Block[][]>([]);
  const [genotypes, setGenotypes] = useState<GenotypeInfo[]>([]);
  const [hoveredBlock, setHoveredBlock] = useState<{ row: number; col: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Germplasm.xlsx for genotype info
  React.useEffect(() => {
    const fetchExcel = async () => {
      try {
        const response = await fetch('/Germplasm.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets['Genotypes'] || workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<any>(sheet);
        const genotypeList: GenotypeInfo[] = data.map((row, idx) => ({
          Genotype: String(row['Genotype']),
          MaleDonor: row['Male donor'] || '',
          FemaleReceptor: row['Female receptor'] || '',
          color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
        })).filter(g => g.Genotype);
        setGenotypes(genotypeList);
      } catch (err) {
        setGenotypes([]);
      }
    };
    fetchExcel();
  }, []);

  // Import map from JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.rows && data.plantsPerRow && data.grid) {
          setRows(data.rows);
          setPlantsPerRow(data.plantsPerRow);
          setGrid(data.grid);
        }
      } catch (err) {
        alert('Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const getBlockGenotypeInfo = (row: number, col: number) => {
    if (!grid[row] || !grid[row][col]) return undefined;
    const genotype = grid[row][col].genotype;
    if (!genotype) return undefined;
    return genotypes.find(g => String(g.Genotype) === String(genotype));
  };

  return (
    <div className="App">
      <h1>Map Viewer</h1>
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => fileInputRef.current?.click()}>Load Map JSON</button>
        <input
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleImport}
        />
      </div>
      {grid.length > 0 && (
        <div style={{ display: 'inline-block', border: '1px solid #ccc', padding: 10, position: 'relative' }}>
          {grid.map((row, rIdx) => (
            <div key={rIdx} style={{ display: 'flex' }}>
              {row.map((block, cIdx) => {
                const genotypeInfo = getBlockGenotypeInfo(rIdx, cIdx);
                return (
                  <div
                    key={cIdx}
                    style={{
                      width: 30,
                      height: 30,
                      border: '1px solid #888',
                      margin: 2,
                      background: genotypeInfo?.color ? genotypeInfo.color : '#f9f9f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      fontSize: 12,
                      fontWeight: 'bold',
                    }}
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
    </div>
  );
};

export default MapViewer; 