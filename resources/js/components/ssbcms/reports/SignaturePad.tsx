import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

type Props = {
    busy?: boolean;
    error?: string | null;
    onCancel: () => void;
    onConfirm: (pngDataUrl: string) => void;
};

const INK = '#111827';

/** Pointer events cover mouse, touch and pen with one code path. */
export default function SignaturePad({ busy, error, onCancel, onConfirm }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const last = useRef<{ x: number; y: number } | null>(null);
    const [hasInk, setHasInk] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    // Size the backing store to the displayed size × device pixel ratio (sharp on phones).
    const setup = useCallback(() => {
        const c = canvasRef.current;
        const ctx = c?.getContext('2d');
        if (!c || !ctx) return;
        const ratio = window.devicePixelRatio || 1;
        const { width, height } = c.getBoundingClientRect();
        c.width = Math.round(width * ratio);
        c.height = Math.round(height * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = INK;
        ctx.fillStyle = INK;
    }, []);

    // The canvas is unmounted while previewing, so it must be re-initialised when it returns.
    useEffect(() => {
        if (!preview) setup();
    }, [preview, setup]);

    const point = (e: PointerEvent<HTMLCanvasElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const down = (e: PointerEvent<HTMLCanvasElement>) => {
        const ctx = e.currentTarget.getContext('2d');
        if (!ctx) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drawing.current = true;
        const p = point(e);
        last.current = p;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
        ctx.fill();
        setHasInk(true);
    };

    const move = (e: PointerEvent<HTMLCanvasElement>) => {
        if (!drawing.current || !last.current) return;
        const ctx = e.currentTarget.getContext('2d');
        if (!ctx) return;
        const p = point(e);
        ctx.beginPath();
        ctx.moveTo(last.current.x, last.current.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        last.current = p;
    };

    const up = () => {
        drawing.current = false;
        last.current = null;
    };

    const clear = () => {
        const c = canvasRef.current;
        const ctx = c?.getContext('2d');
        if (!c || !ctx) return;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.restore();
        setHasInk(false);
    };

    const redraw = () => {
        setPreview(null);
        setHasInk(false);
    };

    return (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            {preview ? (
                <>
                    <p className="text-sm font-medium text-foreground">
                        Preview your signature
                    </p>
                    <img
                        src={preview}
                        alt="Signature preview"
                        className="h-40 w-full rounded-lg border border-border bg-white object-contain"
                    />
                </>
            ) : (
                <>
                    <p className="text-sm font-medium text-foreground">
                        Sign in the box with your mouse, finger or stylus
                    </p>
                    <canvas
                        ref={canvasRef}
                        style={{ touchAction: 'none' }}
                        className="h-40 w-full cursor-crosshair rounded-lg border border-dashed border-border bg-white"
                        onPointerDown={down}
                        onPointerMove={move}
                        onPointerUp={up}
                        onPointerCancel={up}
                        onPointerLeave={up}
                    />
                </>
            )}

            {error && (
                <p role="alert" className="text-sm text-red-600">
                    {error}
                </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
                {preview ? (
                    <>
                        <button
                            type="button"
                            onClick={redraw}
                            disabled={busy}
                            className="btn-outline px-3 py-2 text-xs"
                        >
                            Redraw
                        </button>
                        <button
                            type="button"
                            onClick={() => onConfirm(preview)}
                            disabled={busy}
                            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
                        >
                            {busy ? 'Submitting…' : 'Confirm and submit'}
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={clear}
                            disabled={!hasInk}
                            className="btn-outline px-3 py-2 text-xs disabled:opacity-50"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                canvasRef.current &&
                                setPreview(canvasRef.current.toDataURL('image/png'))
                            }
                            disabled={!hasInk}
                            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
                        >
                            Preview
                        </button>
                    </>
                )}
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={busy}
                    className="ml-auto px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}