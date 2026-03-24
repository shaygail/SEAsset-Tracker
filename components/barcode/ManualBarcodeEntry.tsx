"use client";
import { useState } from "react";

interface ManualBarcodeEntryProps {
  onDetected: (barcode: string) => void;
}

export default function ManualBarcodeEntry({ onDetected }: ManualBarcodeEntryProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) {
      setError("Please enter a barcode value.");
      return;
    }
    setError("");
    onDetected(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 items-center">
      <input
        type="text"
        className="border rounded px-3 py-2 text-lg w-64"
        placeholder="Enter barcode manually"
        value={value}
        onChange={e => setValue(e.target.value)}
        autoFocus
      />
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded-lg mt-2"
      >
        Submit
      </button>
    </form>
  );
}
