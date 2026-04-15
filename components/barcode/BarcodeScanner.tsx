'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

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

/**
 * Hints so 1D symbologies (Code 128, Code 39, etc.) are decoded, not only QR.
 * Without POSSIBLE_FORMATS + TRY_HARDER, many mobile setups only reliably read QR.
 */
function buildDecodeHints(): Map<DecodeHintType, any> {
  const hints = new Map<DecodeHintType, any>()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.ITF,
    BarcodeFormat.CODABAR,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.PDF_417,
    BarcodeFormat.AZTEC,
    BarcodeFormat.RSS_14,
    BarcodeFormat.RSS_EXPANDED,
  ])
  hints.set(DecodeHintType.TRY_HARDER, true)
  return hints
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
    const hints = buildDecodeHints()
    const reader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 90,
      tryPlayVideoTimeout: 15_000,
    })

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

        const videoTrack: MediaTrackConstraints = {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 30 },
        }
        if (deviceId) {
          videoTrack.deviceId = { exact: deviceId }
        } else {
          videoTrack.facingMode = 'environment'
        }

        const constraints: MediaStreamConstraints = { video: videoTrack, audio: false }

        const callback: Parameters<BrowserMultiFormatReader['decodeFromConstraints']>[2] = (
          result,
          err,
          controls
        ) => {
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
        }

        try {
          await reader.decodeFromConstraints(constraints, video, callback)
        } catch (e) {
          if (cancelled) return
          const name = e && typeof e === 'object' && 'name' in e ? String((e as Error).name) : ''
          if (name === 'NotAllowedError' || name === 'NotFoundError') {
            throw e
          }
          await reader.decodeFromVideoDevice(deviceId, video, callback)
        }
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
      <p className="text-xs text-slate-600 text-center max-w-md px-2">
        Hold linear barcodes steady and fill the frame; good lighting helps. QR codes usually read faster.
      </p>
      <video
        ref={videoRef}
        className="rounded-lg border w-full max-w-md max-h-[70vh] aspect-video bg-black object-contain"
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
