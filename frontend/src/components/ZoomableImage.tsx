import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ZoomHandle, ZoomableImageProps, RenderAnomalyBox, DisplayAnomaly } from "../types/models";


export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export const ZoomableImage = forwardRef<ZoomHandle, ZoomableImageProps>(function ZoomableImage(
  { src, alt, emptyText,  anomalies, interactive = true , editable = false,  onChangeAnomalies,}: ZoomableImageProps,
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
  const [editableAnoms, setEditableAnoms] = useState<DisplayAnomaly[]>(() => anomalies ?? []);
  useEffect(() => { setEditableAnoms(anomalies ?? []); }, [anomalies]);

  // store natural/display mapping numbers from computeBoxes
  const mappingRef = useRef<{
    naturalWidth: number;
    naturalHeight: number;
    displayWidth: number;
    displayHeight: number;
    containerWidth: number;
    containerHeight: number;
    offsetX: number;
    offsetY: number;
    scaleX: number;
    scaleY: number;
  } | null>(null);


  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setShowHint(isInteractive);
  }, [src, isInteractive]);

  // const computeBoxes = useCallback(() => {
  //   if (!anomalies?.length || !containerRef.current || !imageRef.current) {
  //     setRenderBoxes([]);
  //     return;
  //   }

  //   const naturalWidth = imageRef.current.naturalWidth;
  //   const naturalHeight = imageRef.current.naturalHeight;
  //   if (!naturalWidth || !naturalHeight) {
  //     setRenderBoxes([]);
  //     return;
  //   }

  //   const containerWidth = containerRef.current.offsetWidth;
  //   const containerHeight = containerRef.current.offsetHeight;
  //   if (!containerWidth || !containerHeight) {
  //     setRenderBoxes([]);
  //     return;
  //   }

  //   const imageAspect = naturalWidth / naturalHeight;
  //   const containerAspect = containerWidth / containerHeight;
  //   let displayWidth = containerWidth;
  //   let displayHeight = containerHeight;
  //   if (imageAspect > containerAspect) {
  //     displayHeight = displayWidth / imageAspect;
  //   } else {
  //     displayWidth = displayHeight * imageAspect;
  //   }

  //   const offsetX = (containerWidth - displayWidth) / 2;
  //   const offsetY = (containerHeight - displayHeight) / 2;
  //   const scaleX = displayWidth / naturalWidth;
  //   const scaleY = displayHeight / naturalHeight;

  //   const mapped: RenderAnomalyBox[] = anomalies
  //     .map((anomaly, idx) => {
  //       if (!isFiniteNumber(anomaly.x) || !isFiniteNumber(anomaly.y)) return null;
  //       if (!isFiniteNumber(anomaly.width) || !isFiniteNumber(anomaly.height)) return null;
  //       const left = offsetX + anomaly.x * scaleX;
  //       const top = offsetY + anomaly.y * scaleY;
  //       const width = anomaly.width * scaleX;
  //       const height = anomaly.height * scaleY;
  //       if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width) || !Number.isFinite(height))
  //         return null;
  //       if (width <= 0 || height <= 0) return null;
  //       const boundedLeft = Math.max(0, Math.min(left, containerWidth));
  //       const boundedTop = Math.max(0, Math.min(top, containerHeight));
  //       const boundedWidth = Math.min(width, containerWidth - boundedLeft);
  //       const boundedHeight = Math.min(height, containerHeight - boundedTop);
  //       if (boundedWidth <= 0 || boundedHeight <= 0) return null;
  //       const displayIndex = anomaly.displayIndex ?? idx + 1;
  //       return {
  //         key: `${displayIndex}-${anomaly.id ?? idx}`,
  //         left: boundedLeft,
  //         top: boundedTop,
  //         width: boundedWidth,
  //         height: boundedHeight,
  //         displayIndex,
  //       } satisfies RenderAnomalyBox;
  //     })
  //     .filter((box): box is RenderAnomalyBox => Boolean(box));

  //   setRenderBoxes(mapped);
  // }, [anomalies]);

  type Corner = "nw" | "ne" | "sw" | "se";

const [resizing, setResizing] = useState<{
  index: number;            // which anomaly
  corner: Corner;
  startClientX: number;
  startClientY: number;
  startBox: { x: number; y: number; w: number; h: number }; // in NATURAL px
} | null>(null);

const HANDLE = 12;
const HALF = HANDLE / 2;

const handleCommon: React.CSSProperties = {
  position: "absolute",
  width: HANDLE,
  height: HANDLE,
  background: "#fff",
  border: "2px solid #f59e0b",
  borderRadius: 2,
  boxShadow: "0 2px 6px rgba(0,0,0,.25)",
  zIndex: 2,
  pointerEvents: "auto",
};

const cursorFor = (corner: Corner) =>
  corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize";


const startResize = (e: React.PointerEvent, idx: number, corner: Corner) => {
  if (!editable || !mappingRef.current) return;
  e.stopPropagation();
  e.preventDefault();

  // const map = mappingRef.current;
  // current NATURAL box from editableAnoms
  const a = editableAnoms[idx];
  const startBox = { x: a.x, y: a.y, w: a.width, h: a.height };

  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  setResizing({
    index: idx,
    corner,
    startClientX: e.clientX,
    startClientY: e.clientY,
    startBox,
  });
  // while resizing, suppress panning hints/dragging
  setIsDragging(false);
  dragOrigin.current = null;
};

// put near other callbacks
const finishResize = useCallback(() => {
  // send latest anomalies up to the parent
  onChangeAnomalies?.(editableAnoms);
}, [onChangeAnomalies, editableAnoms]);



  const computeBoxes = useCallback(() => {
  const list = (editable ? editableAnoms : anomalies) ?? [];
  if (!list.length || !containerRef.current || !imageRef.current) {
    setRenderBoxes([]);
    mappingRef.current = null;
    return;
  }

  const naturalWidth = imageRef.current.naturalWidth;
  const naturalHeight = imageRef.current.naturalHeight;
  if (!naturalWidth || !naturalHeight) { setRenderBoxes([]); mappingRef.current = null; return; }

  const containerWidth = containerRef.current.offsetWidth;
  const containerHeight = containerRef.current.offsetHeight;
  if (!containerWidth || !containerHeight) { setRenderBoxes([]); mappingRef.current = null; return; }

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

  mappingRef.current = {
    naturalWidth, naturalHeight,
    displayWidth, displayHeight,
    containerWidth, containerHeight,
    offsetX, offsetY, scaleX, scaleY,
  };

  const mapped: RenderAnomalyBox[] = list
    .map((anomaly, idx) => {
      if (!isFiniteNumber(anomaly.x) || !isFiniteNumber(anomaly.y)) return null;
      if (!isFiniteNumber(anomaly.width) || !isFiniteNumber(anomaly.height)) return null;
      const left = offsetX + anomaly.x * scaleX;
      const top = offsetY + anomaly.y * scaleY;
      const width = anomaly.width * scaleX;
      const height = anomaly.height * scaleY;
      if (![left, top, width, height].every(Number.isFinite)) return null;
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
      } as RenderAnomalyBox;
    })
    .filter(Boolean) as RenderAnomalyBox[];

  setRenderBoxes(mapped);
}, [anomalies, editable, editableAnoms]);

  const MIN_SIZE_NAT = 5; // clamp minimum box size in natural px

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

  if (resizing && mappingRef.current) {
    event.preventDefault();
    const { index, corner, startClientX, startClientY, startBox } = resizing;
    const map = mappingRef.current;

    // screen delta -> display px (undo zoom 'scale'), then -> natural px (undo map scaleX/scaleY)
    const dxDisplay = (event.clientX - startClientX) / scale;
    const dyDisplay = (event.clientY - startClientY) / scale;
    const dxNat = dxDisplay / map.scaleX;
    const dyNat = dyDisplay / map.scaleY;

    // compute new NATURAL box based on which corner
    let { x, y, w, h } = startBox;

    if (corner === "nw") { x = startBox.x + dxNat; y = startBox.y + dyNat; w = startBox.w - dxNat; h = startBox.h - dyNat; }
    if (corner === "ne") { y = startBox.y + dyNat; w = startBox.w + dxNat; h = startBox.h - dyNat; }
    if (corner === "sw") { x = startBox.x + dxNat; w = startBox.w - dxNat; h = startBox.h + dyNat; }
    if (corner === "se") { w = startBox.w + dxNat; h = startBox.h + dyNat; }

    // enforce min size and keep inside image bounds
    w = Math.max(MIN_SIZE_NAT, Math.min(w, map.naturalWidth));
    h = Math.max(MIN_SIZE_NAT, Math.min(h, map.naturalHeight));
    x = Math.min(Math.max(0, x), map.naturalWidth - w);
    y = Math.min(Math.max(0, y), map.naturalHeight - h);

    setEditableAnoms((prev) => {
      const next = prev.slice();
      const target = { ...next[index], x, y, width: w, height: h };
      next[index] = target;
      // live preview: recompute boxes
      return next;
    });
    // re-map immediately
    computeBoxes();
    return;
  }

  // (your existing pan logic)
  const active = dragOrigin.current;
    if (!active) return;
    event.preventDefault();
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    setOffset({ x: active.baseX + dx, y: active.baseY + dy });
  }, [hasImage, isInteractive, resizing, scale, computeBoxes]);

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
    if (resizing) {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
      setResizing(null);
      finishResize();          // <- notify parent
      return;
    }
    clearPointerState(event);
  },
  [resizing, clearPointerState, finishResize]
);

const handlePointerLeave = useCallback(
  (event: React.PointerEvent<HTMLDivElement>) => {
    if (resizing) {
      setResizing(null);
      finishResize();          // <- notify parent
      return;
    }
    clearPointerState(event);
  },
  [resizing, clearPointerState, finishResize]
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
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        // Let handles receive events; keep boxes themselves click-through if you still want panning.
                        pointerEvents: editable ? "auto" : "none",
                      }}
                    >
                      {renderBoxes.map((box, idx) => (
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
                            // Keep the rectangular area transparent to pointer to preserve panning,
                            // but we'll turn handles back on with pointerEvents: 'auto' below.
                            pointerEvents: editable ? "none" : "none",
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
                              pointerEvents: "none",
                            }}
                          >
                            {box.displayIndex}
                          </span>

                          {editable && (
                            <>
                              {/* NW */}
                              <div
                                style={{ ...handleCommon, left: -HALF, top: -HALF, cursor: cursorFor("nw") }}
                                onPointerDown={(e) => startResize(e, idx, "nw")}
                              />
                              {/* NE */}
                              <div
                                style={{ ...handleCommon, right: -HALF, top: -HALF, cursor: cursorFor("ne") }}
                                onPointerDown={(e) => startResize(e, idx, "ne")}
                              />
                              {/* SW */}
                              <div
                                style={{ ...handleCommon, left: -HALF, bottom: -HALF, cursor: cursorFor("sw") }}
                                onPointerDown={(e) => startResize(e, idx, "sw")}
                              />
                              {/* SE */}
                              <div
                                style={{ ...handleCommon, right: -HALF, bottom: -HALF, cursor: cursorFor("se") }}
                                onPointerDown={(e) => startResize(e, idx, "se")}
                              />
                            </>
                          )}
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