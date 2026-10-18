import { useRef, useState } from 'react';
import { exportData, ImportError, parseImport } from '../store/exportImport';
import { useStore } from '../store/store';

export default function DataScreen() {
  const importData = useStore((s) => s.importData);
  const resetAll = useStore((s) => s.resetAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const doExport = () => {
    const json = JSON.stringify(exportData(useStore.getState()), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dota-draft-helper.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const doImport = async (file: File | undefined) => {
    setError(null);
    setOk(null);
    if (!file) return;
    try {
      importData(parseImport(await file.text()));
      setOk(`Imported ${file.name} successfully.`);
    } catch (e) {
      setError(e instanceof ImportError ? e.message : `Could not read file: ${String(e)}`);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const doReset = () => {
    if (!window.confirm('Reset all players, ratings, synergies and watchlist? This cannot be undone.')) return;
    resetAll();
    setError(null);
    setOk('All data reset.');
  };

  return (
    <div className="screen">
      <h2>Data</h2>
      <div className="card data-actions">
        <button onClick={doExport}>Export JSON</button>
        <label className="file-label">
          Import JSON
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            aria-label="Import JSON file"
            onChange={(e) => void doImport(e.target.files?.[0])}
          />
        </label>
        <button className="danger" onClick={doReset}>Reset all data</button>
      </div>
      {error && <div role="alert" className="alert error">{error}</div>}
      {ok && <div role="status" className="alert ok">{ok}</div>}
    </div>
  );
}
