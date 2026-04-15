"use client";
import { useState, useEffect } from "react";
import BarcodeScanner from "@/components/barcode/BarcodeScanner";
import ManualBarcodeEntry from "@/components/barcode/ManualBarcodeEntry";
import { enrichImportRowsForJira, type ClientImportRow } from "@/lib/importPayloadEnrich";
import { DEFAULT_OBJECT_TYPE } from "@/lib/jira";

export default function ImportScanPage() {
  const [barcode, setBarcode] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [step, setStep] = useState<'scan' | 'confirm' | 'done'>('scan');
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [assetPreview, setAssetPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [jiraStatusOptions, setJiraStatusOptions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/jira/statusOptions")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setJiraStatusOptions(Array.isArray(data.options) ? data.options : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function handleDetected(code: string) {
    setBarcode(code);
    setStep('confirm');
  }

  useEffect(() => {
    if (step === 'confirm' && barcode) {
      setPreviewLoading(true);
      setAssetPreview(null);
      fetch(`/api/jira/getAsset?objectKey=${encodeURIComponent(barcode)}`)
        .then(async (resp) => {
          if (!resp.ok) throw new Error('Not found');
          return resp.json();
        })
        .then((data) => setAssetPreview(data))
        .catch(() => setAssetPreview(null))
        .finally(() => setPreviewLoading(false));
    }
  }, [step, barcode]);

  async function handleSubmit() {
    if (!barcode?.trim()) return;
    setLoading(true);
    setError("");
    try {
      const tag = barcode.trim();
      const rawRows: ClientImportRow[] = Array.from({ length: quantity }, (_, i) => ({
        rowIndex: i + 1,
        objectTypeName: DEFAULT_OBJECT_TYPE,
        assetTag: tag,
        model: tag,
        manufacturer: "",
        serialNumber: "",
        locationName: "",
        status: "In Stock",
        dateAdded: "",
      }));
      const rows = enrichImportRowsForJira(rawRows, jiraStatusOptions);
      const resp = await fetch("/api/jira/importAssets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      });
      const data = await resp.json();
      setResult(data);
      setStep('done');
    } catch (e: any) {
      setError(e.message || "Failed to import asset(s)");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto min-h-screen flex flex-col bg-white sm:rounded-xl sm:shadow-lg sm:my-8">
      <header className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Scan Asset Barcode</h1>
        <div className="flex gap-2 justify-center mb-2">
          <button
            className={`flex-1 py-3 rounded-lg text-lg font-semibold ${mode === 'camera' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setMode('camera')}
          >
            📷 Camera
          </button>
          <button
            className={`flex-1 py-3 rounded-lg text-lg font-semibold ${mode === 'manual' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setMode('manual')}
          >
            ⌨️ Manual
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-2 pb-32 sm:pb-8">
        {step === 'scan' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            {mode === 'camera' ? (
              <div className="w-full flex flex-col items-center">
                <BarcodeScanner onDetected={handleDetected} onError={err => setError(err.message)} />
              </div>
            ) : (
              <ManualBarcodeEntry onDetected={handleDetected} />
            )}
            {error && <div className="text-red-600 text-base text-center">{error}</div>}
          </div>
        )}

        {step === 'confirm' && barcode && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="text-xl font-semibold text-center">Scanned Barcode:</div>
            <div className="font-mono bg-gray-100 px-4 py-2 rounded text-lg break-all text-center">{barcode}</div>
            {previewLoading && <div className="text-gray-500 text-base">Checking for existing asset…</div>}
            {assetPreview ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-base w-full max-w-xs mx-auto">
                <div className="font-semibold text-yellow-800 mb-1">Asset already exists in Jira:</div>
                <div><b>Model:</b> {assetPreview.model}</div>
                <div><b>Manufacturer:</b> {assetPreview.manufacturer}</div>
                <div><b>Serial Number:</b> {assetPreview.serialNumber}</div>
                <div><b>Status:</b> {assetPreview.status}</div>
                <div><b>Location:</b> {assetPreview.location}</div>
                <div className="text-xs text-yellow-700 mt-2">You may want to update this asset instead of importing a new one.</div>
              </div>
            ) : !previewLoading && (
              <div className="bg-green-50 border border-green-200 rounded p-4 text-base w-full max-w-xs mx-auto text-green-800">No existing asset found. Ready to import new asset.</div>
            )}
            <label className="block text-base font-medium text-gray-700 mt-2">Quantity</label>
            <input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="border rounded px-4 py-3 w-32 text-lg text-center"
              inputMode="numeric"
            />
            {assetPreview && <div className="text-xs text-yellow-700 mt-2 text-center">Import is disabled because this asset already exists.</div>}
            {error && <div className="text-red-600 text-base mt-2 text-center">{error}</div>}
          </div>
        )}

        {step === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="text-green-700 font-semibold text-xl">Import complete!</div>
            <pre className="bg-gray-100 rounded p-4 text-sm overflow-x-auto w-full max-w-xs mx-auto">{JSON.stringify(result, null, 2)}</pre>
            <button
              className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-semibold w-full max-w-xs"
              onClick={() => { setStep('scan'); setBarcode(null); setResult(null); }}
            >
              Scan Another
            </button>
          </div>
        )}
      </main>

      {/* Fixed bottom action bar for confirm step */}
      {step === 'confirm' && barcode && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex gap-4 px-4 py-4 z-10 sm:static sm:border-none sm:p-0 sm:gap-2 sm:justify-end">
          <button
            className="flex-1 bg-blue-600 text-white py-4 rounded-lg text-lg font-semibold disabled:opacity-50"
            onClick={handleSubmit}
            disabled={loading || !!assetPreview}
          >
            {loading ? 'Importing…' : `Import ${quantity} Asset${quantity > 1 ? 's' : ''}`}
          </button>
          <button
            className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg text-lg font-semibold"
            onClick={() => { setStep('scan'); setBarcode(null); setAssetPreview(null); }}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
