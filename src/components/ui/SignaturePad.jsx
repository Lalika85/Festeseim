import React, { useRef, useEffect, useState } from 'react';
import Button from './Button';
import { Eraser, Check } from 'lucide-react';

export default function SignaturePad({ onSave, onClear }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#1e293b';

        const resizeCanvas = () => {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = 200;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#1e293b';
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    const startDrawing = (e) => {
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
    };

    const draw = (e) => {
        if (!isDrawing) return;
        setIsEmpty(false);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        let clientX, clientY;
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
        if (onClear) onClear();
    };

    const handleSave = () => {
        if (isEmpty) return;
        const canvas = canvasRef.current;
        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
    };

    return (
        <div className="w-full">
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden mb-3">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseMove={draw}
                    onTouchStart={startDrawing}
                    onTouchEnd={stopDrawing}
                    onTouchMove={draw}
                    className="w-full cursor-crosshair touch-none"
                    style={{ height: '200px' }}
                />
            </div>
            <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleClear} className="flex-1 border-gray-200">
                    <Eraser size={16} className="mr-2" /> Törlés
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isEmpty} className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-100">
                    <Check size={16} className="mr-2" /> Elfogadás & Aláírás
                </Button>
            </div>
        </div>
    );
}
