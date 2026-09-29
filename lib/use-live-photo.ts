"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "active"
  | "captured"
  | "denied"
  | "unsupported"
  | "error";

export interface GeoCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface LivePhotoState {
  status: CameraStatus;
  /** JPEG data URL of the captured frame. */
  photo: string | null;
  coords: GeoCoords | null;
  /** Human-readable reason when the camera or GPS is unavailable. */
  message: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  start: () => Promise<void>;
  capture: () => void;
  retake: () => void;
  /** Clears the captured photo/GPS and returns the card to its idle state. */
  reset: () => void;
  stop: () => void;
}

function getPosition(): Promise<GeoCoords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

/**
 * Owns the webcam stream and the GPS lookup behind the "capture live image"
 * requirement. The stream starts only on demand and is always released on
 * unmount so the camera indicator turns off.
 */
export function useLivePhoto(): LivePhotoState {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [photo, setPhoto] = useState<string | null>(null);
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setMessage(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setMessage(
        "This browser cannot access a camera. Open the form on a phone or laptop with a camera and a secure (https) connection.",
      );
      return;
    }

    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setStatus("active");
    } catch {
      setStatus("denied");
      setMessage(
        "Camera permission was blocked. Allow camera access in your browser settings, then try again.",
      );
    }
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setMessage("The camera is still starting up. Wait a moment and capture again.");
      return;
    }

    // Keep the file small enough for a single Apps Script upload.
    const maxWidth = 900;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setStatus("error");
      setMessage("Could not read the camera frame. Please try again.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL("image/jpeg", 0.85));
    setStatus("captured");
    stop();

    // GPS is best-effort: the submission still works if the user declines it.
    void getPosition().then((result) => {
      setCoords(result);
      if (!result) {
        setMessage(
          "Photo captured. Location was unavailable, so only the address you typed will be saved.",
        );
      }
    });
  }, [stop]);

  const retake = useCallback(() => {
    setPhoto(null);
    setCoords(null);
    setMessage(null);
    void start();
  }, [start]);

  const reset = useCallback(() => {
    stop();
    setPhoto(null);
    setCoords(null);
    setMessage(null);
    setStatus("idle");
  }, [stop]);

  useEffect(() => stop, [stop]);

  return {
    status,
    photo,
    coords,
    message,
    videoRef,
    start,
    capture,
    retake,
    reset,
    stop,
  };
}

/** `https://www.google.com/maps/search/?api=1&query=lat,lng` — opens on any device. */
export function toMapsLink(coords: GeoCoords | null): string {
  if (!coords) return "";
  return `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`;
}
