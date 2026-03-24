"use client";
import { useEffect, useRef, useState } from "react";

// We'll use @zxing/browser for barcode scanning
// Install with: npm install @zxing/browser
import { BrowserMultiFormatReader } from "@zxing/browser";

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onError?: (err: Error) => void;
}

export default function BarcodeScanner({ onDetected, onError }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>("");
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    if (!scanning) return;
    const codeReader = new BrowserMultiFormatReader();
    let active = true;

    BrowserMultiFormatReader.listVideoInputDevices()
      .then((videoInputDevices: MediaDeviceInfo[]) => {
        if (videoInputDevices.length === 0) {
          setError("No camera found");
          setScanning(false);
          return;
        }
        codeReader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result, err, controls) => {
            if (!active) return;
            if (result) {
              setScanning(false);
              controls.stop();
              onDetected(result.getText());
            } else if (err && err.name !== "NotFoundException") {
              setError(err.message);
              if (onError) onError(err);
            }
          }
        );
      })
      .catch((err: any) => {
        setError(err.message);
        setScanning(false);
        if (onError) onError(err);
      });
    return () => {
      active = false;
      // decodeFromVideoDevice provides a controls object with a stop() method for cleanup
      // If needed, you can keep a reference to controls and call controls.stop() here
      // But since we call controls.stop() on successful scan, this is usually sufficient
    };
  }, [scanning, onDetected, onError]);

  return (
    <div className="flex flex-col items-center gap-4">
      <video ref={videoRef} className="rounded-lg border w-full max-w-md aspect-video bg-black" autoPlay muted playsInline />
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {!scanning && (
        <button
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
          onClick={() => {
            setError("");
            setScanning(true);
          }}
        >
          Scan Again
        </button>
      )}
    </div>
  );
}
