"use client";

import { CamerasIcon, RotateIcon, WarningIcon } from "./icons";
import { toMapsLink, type LivePhotoState } from "@/lib/use-live-photo";

interface Props {
  photo: LivePhotoState;
  error?: string;
}

/**
 * Live camera card: start the stream, capture a frame, and show the GPS fix
 * that will be written to the "Location" column alongside it.
 */
export default function LivePhotoCapture({ photo, error }: Props) {
  const mapLink = toMapsLink(photo.coords);
  const msg = photo.message;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-4 flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <CamerasIcon className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Capture live image <span className="text-rose-600">*</span>
          </h2>
          <p className="text-xs text-slate-500">
            Taken from your device camera — photo and GPS are saved with the form.
          </p>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
        {photo.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.photo}
            alt="Captured live image"
            className="mx-auto max-h-72 w-auto object-contain"
          />
        ) : (
          <div className="relative aspect-video w-full">
            <video
              ref={photo.videoRef}
              playsInline
              muted
              autoPlay
              className="size-full object-cover"
            />
            {photo.status !== "active" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/85 px-6 text-center">
                <CamerasIcon className="size-8 text-slate-400" />
                <p className="text-sm text-slate-300">
                  {photo.status === "requesting"
                    ? "Starting camera…"
                    : "Camera preview appears here"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {(photo.status === "idle" ||
          photo.status === "denied" ||
          photo.status === "unsupported" ||
          photo.status === "error") && (
          <button type="button" onClick={() => void photo.start()} className="btn-secondary">
            <CamerasIcon className="size-4" />
            {photo.status === "idle" ? "Start camera" : "Try camera again"}
          </button>
        )}

        {photo.status === "requesting" && (
          <button type="button" disabled className="btn-secondary opacity-60">
            <CamerasIcon className="size-4" />
            Starting…
          </button>
        )}

        {photo.status === "active" && (
          <button type="button" onClick={photo.capture} className="btn-primary">
            <CamerasIcon className="size-4" />
            Capture photo
          </button>
        )}

        {photo.status === "captured" && (
          <button type="button" onClick={photo.retake} className="btn-secondary">
            <RotateIcon className="size-4" />
            Retake photo
          </button>
        )}
      </div>

      {photo.status === "captured" && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
          <p className="font-semibold">Photo captured</p>
          {mapLink ? (
            <p className="mt-1">
              Location:{" "}
              <a
                href={mapLink}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-emerald-800 underline"
              >
                {photo.coords?.latitude.toFixed(5)},{" "}
                {photo.coords?.longitude.toFixed(5)}
              </a>{" "}
              — the map link and the exact place name for these coordinates are saved in
              the sheet.
            </p>
          ) : (
            <p className="mt-1">
              Waiting for GPS… If location stays unavailable, the address you typed is used
              instead.
            </p>
          )}
        </div>
      )}

      {msg && photo.status !== "captured" && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <WarningIcon className="mt-0.5 size-4 shrink-0" />
          {msg}
        </p>
      )}

      {error && (
        <p className="mt-3 text-xs font-medium text-rose-600">{error}</p>
      )}
    </section>
  );
}
