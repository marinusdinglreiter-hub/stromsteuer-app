"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { forwardRef } from "react";

/** Imperative API: parent kann Canvas leeren und DataURL holen. */
export type SignaturCanvasHandle = {
  clear: () => void;
  getDataUrl: () => string | null;
  isEmpty: () => boolean;
};

type Props = {
  width?: number;
  height?: number;
  onChange?: (hasContent: boolean) => void;
};

/**
 * Minimaler Signature-Canvas mit Pointer-Events (deckt Maus, Pen, Touch ab).
 * Speichert Striche als Pfade und zeichnet bei Resize/DPR neu, damit die
 * exportierte PNG-Aufloesung scharf bleibt.
 */
export const SignaturCanvas = forwardRef<SignaturCanvasHandle, Props>(
  function SignaturCanvas({ width = 600, height = 180, onChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const pathsRef = useRef<{ x: number; y: number }[][]>([]);
    const currentPathRef = useRef<{ x: number; y: number }[]>([]);
    const [hasContent, setHasContent] = useState(false);

    const redraw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const path of pathsRef.current) {
        if (path.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(path[0]!.x, path[0]!.y);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i]!.x, path[i]!.y);
        }
        ctx.stroke();
      }
    }, []);

    // DPR-aware sizing
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      redraw();
    }, [width, height, redraw]);

    function clientToCanvas(event: PointerEvent | React.PointerEvent) {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }

    function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
      event.preventDefault();
      canvasRef.current?.setPointerCapture(event.pointerId);
      drawingRef.current = true;
      const pt = clientToCanvas(event);
      lastPointRef.current = pt;
      currentPathRef.current = [pt];
    }

    function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawingRef.current) return;
      event.preventDefault();
      const pt = clientToCanvas(event);
      const last = lastPointRef.current;
      if (!last) return;
      currentPathRef.current.push(pt);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      lastPointRef.current = pt;
    }

    function handlePointerUp() {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      if (currentPathRef.current.length > 1) {
        pathsRef.current.push(currentPathRef.current);
        if (!hasContent) {
          setHasContent(true);
          onChange?.(true);
        }
      }
      currentPathRef.current = [];
      lastPointRef.current = null;
    }

    useImperativeHandle(
      ref,
      (): SignaturCanvasHandle => ({
        clear() {
          pathsRef.current = [];
          currentPathRef.current = [];
          setHasContent(false);
          onChange?.(false);
          redraw();
        },
        getDataUrl() {
          if (pathsRef.current.length === 0) return null;
          return canvasRef.current?.toDataURL("image/png") ?? null;
        },
        isEmpty() {
          return pathsRef.current.length === 0;
        },
      }),
      [onChange, redraw],
    );

    return (
      <div className="relative rounded-md border border-input bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          role="img"
          aria-label={
            hasContent
              ? "Unterschriftsfeld — Unterschrift erfasst"
              : "Unterschriftsfeld — mit Maus oder Finger unterschreiben"
          }
          className="block w-full touch-none rounded-md"
          style={{ height }}
        />
        {!hasContent ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground/70">
            Mit Maus oder Finger unterschreiben
          </div>
        ) : null}
      </div>
    );
  },
);
