import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ZoomHandle, ZoomableImageProps, RenderAnomalyBox } from "../types/models";


export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export const ZoomableImage = forwardRef<ZoomHandle, ZoomableImageProps>(function ZoomableImage(
  { src, alt, emptyText,  anomalies, interactive = true }: ZoomableImageProps,
  ref
) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showHint, setShowHint] = useState(interactive);
  const dragOrigin = useRef<{ pointerId: number; x: number; y: number; baseX: number; baseY: number } | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [renderBoxes, setRenderBoxes] = useState<RenderAnomalyBox[]>([]);
  const isInteractive = interactive !== false;
  const hasImage = Boolean(src);

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setShowHint(isInteractive);
  }, [src, isInteractive]);

  const computeBoxes = useCallback(() => {
    if (!anomalies?.length || !containerRef.current || !imageRef.current) {
      setRenderBoxes([]);
      return;
    }

    const naturalWidth = imageRef.current.naturalWidth;
    const naturalHeight = imageRef.current.naturalHeight;
    if (!naturalWidth || !naturalHeight) {
      setRenderBoxes([]);
      return;
    }

    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;
    if (!containerWidth || !containerHeight) {
      setRenderBoxes([]);
      return;
    }

    const imageAspect = naturalWidth / naturalHeight;
    const containerAspect = containerWidth / containerHeight;
    let displayWidth = containerWidth;
    let displayHeight = containerHeight;
    if (imageAspect > containerAspect) {
      displayHeight = displayWidth / imageAspect;
    } else {
      displayWidth = displayHeight * imageAspect;
    }

    const offsetX = (containerWidth - displayWidth) / 2;
    const offsetY = (containerHeight - displayHeight) / 2;
    const scaleX = displayWidth / naturalWidth;
    const scaleY = displayHeight / naturalHeight;

    const mapped: RenderAnomalyBox[] = anomalies
      .map((anomaly, idx) => {
        if (!isFiniteNumber(anomaly.x) || !isFiniteNumber(anomaly.y)) return null;
        if (!isFiniteNumber(anomaly.width) || !isFiniteNumber(anomaly.height)) return null;
        const left = offsetX + anomaly.x * scaleX;
        const top = offsetY + anomaly.y * scaleY;
        const width = anomaly.width * scaleX;
        const height = anomaly.height * scaleY;
        if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width) || !Number.isFinite(height))
          return null;
        if (width <= 0 || height <= 0) return null;
        const boundedLeft = Math.max(0, Math.min(left, containerWidth));
        const boundedTop = Math.max(0, Math.min(top, containerHeight));
        const boundedWidth = Math.min(width, containerWidth - boundedLeft);
        const boundedHeight = Math.min(height, containerHeight - boundedTop);
        if (boundedWidth <= 0 || boundedHeight <= 0) return null;
        const displayIndex = anomaly.displayIndex ?? idx + 1;
        return {
          key: `${displayIndex}-${anomaly.id ?? idx}`,
          left: boundedLeft,
          top: boundedTop,
          width: boundedWidth,
          height: boundedHeight,
          displayIndex,
        } satisfies RenderAnomalyBox;
      })
      .filter((box): box is RenderAnomalyBox => Boolean(box));

    setRenderBoxes(mapped);
  }, [anomalies]);

  useEffect(() => {
    if (!hasImage) {
      setRenderBoxes([]);
      return;
    }
    computeBoxes();
  }, [hasImage, computeBoxes]);

  useEffect(() => {
    if (!containerRef.current) return;
    const node = containerRef.current;
    const observer = new ResizeObserver(() => computeBoxes());
    observer.observe(node);
    return () => observer.disconnect();
  }, [computeBoxes]);

  const handleImageLoad = useCallback(() => {
    computeBoxes();
  }, [computeBoxes]);

  const zoomIn = useCallback(() => {
    if (!hasImage || !isInteractive) return;
    setScale((prev) => Math.min(prev + 0.25, 4));
  }, [hasImage, isInteractive]);

  const zoomOut = useCallback(() => {
    if (!hasImage || !isInteractive) return;
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  }, [!hasImage || !isInteractive]);

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setShowHint(isInteractive);
    dragOrigin.current = null;
    computeBoxes();
  }, [computeBoxes, isInteractive]);

  // expose controls to parent
  useImperativeHandle(ref, () => ({ zoomIn, zoomOut, resetView }), [zoomIn, zoomOut, resetView]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!hasImage || !isInteractive) return;
      event.preventDefault();
      const { pointerId, clientX, clientY } = event;
      dragOrigin.current = { pointerId, x: clientX, y: clientY, baseX: offset.x, baseY: offset.y };
      setIsDragging(true);
      setShowHint(false);
      event.currentTarget.setPointerCapture(pointerId);
    },
    [hasImage, isInteractive, offset.x, offset.y],
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!hasImage || !isInteractive) return;
    const active = dragOrigin.current;
    if (!active) return;
    event.preventDefault();
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    setOffset({ x: active.baseX + dx, y: active.baseY + dy });
  }, [hasImage, isInteractive]);

  const clearPointerState = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const active = dragOrigin.current;
    if (active?.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      dragOrigin.current = null;
    }
    setIsDragging(false);
  }, []);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!hasImage || !isInteractive) {
        setIsDragging(false);
        return;
      }
      clearPointerState(event);
    },
    [clearPointerState, hasImage, isInteractive],
  );

  const handlePointerLeave = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!hasImage || !isInteractive) {
        setIsDragging(false);
        return;
      }
      clearPointerState(event);
    },
    [clearPointerState, hasImage, isInteractive],
  );

  const handleImageError = useCallback(() => {
    setRenderBoxes([]);
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignSelf: "stretch",
        justifySelf: "stretch",
        minHeight: 0,
        flex: 1,
      }}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{
          position: "relative",
          flex: "1 1 auto",
          minHeight: 280,
          minWidth: 0,
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
          cursor: !isInteractive
            ? "default"
            : hasImage
              ? (isDragging ? "grabbing" : "grab")
              : "default",
          touchAction: isInteractive ? "none" : "auto",
          background: hasImage ? "#0b1a4a" : "rgba(15,23,42,0.25)",
          display: "flex",
          alignItems: "stretch",
        }}
      >
        {hasImage ? (
          <>
            <div
              ref={containerRef}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: "center",
                transition: isDragging ? "none" : "transform .08s ease-out",
                willChange: "transform",
              }}
            >
              <div style={{ position: "relative", width: "100%", height: "100%" }}>
                <img
                  src={src ?? undefined}
                  alt={alt}
                  ref={imageRef}
                  draggable={false}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                />
                {renderBoxes.length > 0 && (
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                    {renderBoxes.map((box) => (
                      <div
                        key={box.key}
                        style={{
                          position: "absolute",
                          left: box.left,
                          top: box.top,
                          width: box.width,
                          height: box.height,
                          border: "2px solid rgba(251,191,36,0.95)",
                          borderRadius: 12,
                          background: "rgba(251,191,36,0.12)",
                          boxShadow: "0 8px 18px rgba(251,191,36,0.25)",
                          color: "#facc15",
                          fontWeight: 800,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: 8,
                            left: 8,
                            background: "rgba(250,204,21,0.95)",
                            color: "#0f172a",
                            borderRadius: 999,
                            padding: "2px 8px",
                            fontSize: 12,
                            lineHeight: 1,
                          }}
                        >
                          {box.displayIndex}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {showHint && isInteractive && (
              <div
                style={{
                  position: "absolute",
                  bottom: 14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(15,23,42,0.75)",
                  color: "#e2e8f0",
                  padding: "6px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 14 }}>↔️</span> Drag to move
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              color: "#cbd5e1",
              fontWeight: 700,
            }}
          >
            {emptyText}
          </div>
        )}
      </div>
      {/* Note: local zoom buttons removed; controlled by parent */}
    </div>
  );
});