import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';

interface WebcamCaptureProps {
  onCapture: (base64Photo: string) => void;
  onCancel: () => void;
}

export const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(true);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        'Kamera tidak dapat diakses atau izin ditolak. Pastikan izin kamera browser aktif.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleTakePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      // Mirror the image horizontally for selfie look
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
      setScanning(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setScanning(true);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      stopCamera();
      onCapture(capturedImage);
    }
  };

  // Fallback demo selfie if webcam is unavailable on some environments
  const handleUseDemoSelfie = () => {
    // Generate an SVG avatar data URL as reliable fallback
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
        <rect width="300" height="300" fill="#1e293b"/>
        <circle cx="150" cy="110" r="50" fill="#6366f1"/>
        <circle cx="150" cy="240" r="80" fill="#4f46e5"/>
        <text x="150" y="285" font-family="sans-serif" font-size="12" fill="#a5b4fc" text-anchor="middle">VERIFIED FACE ID • RUANG KELANA</text>
      </svg>
    `;
    const demoBase64 = `data:image/svg+xml;base64,${btoa(svg)}`;
    setCapturedImage(demoBase64);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center">
              <Camera size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                Verifikasi Wajah (Face Biometric)
              </h3>
              <p className="text-[11px] text-gray-400">Ambil foto selfie langsung untuk konfirmasi kehadiran</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewport Camera / Image */}
        <div className="relative bg-slate-950 aspect-4/3 flex items-center justify-center overflow-hidden">
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Foto Absensi"
              className="w-full h-full object-cover animate-fadeIn"
            />
          ) : cameraError ? (
            <div className="p-6 text-center space-y-3">
              <ShieldAlert size={36} className="text-amber-500 mx-auto" />
              <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>
              <button
                type="button"
                onClick={handleUseDemoSelfie}
                className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={13} /> Gunakan Foto Simulasi / Face Token
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
              {/* Face Guide Frame Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-56 border-2 border-dashed border-primary-400/80 rounded-full flex flex-col items-center justify-between p-4 shadow-lg shadow-primary-500/10">
                  <span className="text-[10px] text-primary-300 bg-black/60 px-2 py-0.5 rounded-full font-mono">
                    Posisikan Wajah di Sini
                  </span>
                  <div className="w-12 h-0.5 bg-primary-400/40 rounded-full" />
                </div>
              </div>
            </>
          )}

          {/* Hidden Canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="p-4 bg-gray-50 dark:bg-gray-850 flex items-center justify-between gap-3">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} /> Ulangi Foto
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5 cursor-pointer font-bold shadow-md"
              >
                <Check size={14} /> Gunakan Foto Ini
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleUseDemoSelfie}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
              >
                Mode Simulasi
              </button>
              <button
                type="button"
                onClick={handleTakePhoto}
                disabled={!!cameraError}
                className="btn-primary text-xs py-2.5 px-6 flex items-center gap-2 font-bold cursor-pointer rounded-xl shadow-lg shadow-primary-600/30 disabled:opacity-50"
              >
                <Camera size={15} /> Ambil Foto
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
