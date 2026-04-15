'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

function stopVideoTracks(video: HTMLVideoElement | null) {
  const stream = video?.srcObject as MediaStream | null
  stream?.getTracks().forEach((t) => t.stop())
  if (video) video.srcObject = null
}

/** Prefer the device that looks like the phone rear / environment camera. */
function pickRearCameraId(devices: MediaDeviceInfo[]): string | undefined {
  const back = devices.find((d) => {
    const label = d.label.toLowerCase()
    return (
      label.includes('back') ||
      label.includes('rear') ||
      label.includes('environment') ||
      label.includes('world') ||
      label.includes('trás') ||
      label.includes('arrière')
    )
  })
  return back?.deviceId ?? devices[0]?.deviceId
}

export interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
  onError?: (err: Error) => void
}

/**
 * Live barcode / QR decode using the device camera (@zxing/browser).
 * Works on modern mobile browsers over HTTPS with camera permission.
 */
export default function BarcodeScanner({ onDetected, onError }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onDetectedRef = useRef(onDetected)
  const onErrorRef = useRef(onError)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(true)

  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    if (!scanning) return

    const video = videoRef.current
    if (!video) return

    let cancelled = false
    const reader = new BrowserMultiFormatReader()

    const start = async () => {
      setError('')
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices()
        if (cancelled) return
        if (devices.length === 0) {
          setError('No camera found on this device.')
          setScanning(false)
          return
        }
        const deviceId = pickRearCameraId(devices)

        await reader.decodeFromVideoDevice(deviceId, video, (result, err, controls) => {
          if (cancelled) return
          if (controls) controlsRef.current = controls

          if (result) {
            const text = result.getText().trim()
            if (text) {
              try {
                controls?.stop()
              } catch {
                /* ignore */
              }
              controlsRef.current = null
              stopVideoTracks(video)
              onDetectedRef.current(text)
              setScanning(false)
            }
            return
          }

          if (err && (err as { name?: string }).name !== 'NotFoundException') {
            const msg = err.message || String(err)
            setError(msg)
            onErrorRef.current?.(err instanceof Error ? err : new Error(msg))
          }
        })
      } catch (e) {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        setScanning(false)
        onErrorRef.current?.(e instanceof Error ? e : new Error(msg))
      }
    }

    void start()

    return () => {
      cancelled = true
      try {
        controlsRef.current?.stop()
      } catch {
        /* ignore */
      }
      controlsRef.current = null
      stopVideoTracks(video)
    }
  }, [scanning])

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <video
        ref={videoRef}
        className="rounded-lg border w-full max-w-md aspect-video bg-black object-cover"
        autoPlay
        muted
        playsInline
      />
      {error && (
        <div className="text-red-600 text-sm text-center px-2" role="alert">
          {error}
        </div>
      )}
      {!scanning && (
        <button
          type="button"
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500"
          onClick={() => {
            setError('')
            setScanning(true)
          }}
        >
          Scan again
        </button>
      )}
    </div>
  )
}
