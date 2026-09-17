import { CircleItem, GridConfig } from '../types';

export function exportCanvasToPng(
  circles: CircleItem[],
  gridConfig: GridConfig,
  includeGrid: boolean,
  authorName: string,
  title: string = '나의 원 그림'
) {
  // Determine bounding dimensions
  let minX = 0;
  let minY = 0;
  let maxX = 960;
  let maxY = 640;

  if (circles.length > 0) {
    const allMinX = Math.min(...circles.map((c) => c.cx - c.radius - 40));
    const allMaxX = Math.max(...circles.map((c) => c.cx + c.radius + 40));
    const allMinY = Math.min(...circles.map((c) => c.cy - c.radius - 40));
    const allMaxY = Math.max(...circles.map((c) => c.cy + c.radius + 40));
    maxX = Math.max(maxX, allMaxX);
    maxY = Math.max(maxY, allMaxY);
  }

  const canvas = document.createElement('canvas');
  const dpr = 2; // high-res
  const width = Math.ceil(maxX);
  const height = Math.ceil(maxY);

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(dpr, dpr);

  // 1. Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const pxPerCm = gridConfig.gridSize; // 30

  // 2. Grid lines if requested
  if (includeGrid) {
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#e2e8f0';

    // Sub-grid (0.5cm)
    const halfCm = pxPerCm / 2;
    for (let x = 0; x <= width; x += halfCm) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += halfCm) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Main grid (1cm)
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#cbd5e1';
    for (let x = 0; x <= width; x += pxPerCm) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += pxPerCm) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Grid coordinates
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    for (let x = pxPerCm; x <= width; x += pxPerCm) {
      ctx.fillText(`${x / pxPerCm}`, x - 3, 14);
    }
    for (let y = pxPerCm; y <= height; y += pxPerCm) {
      ctx.fillText(`${y / pxPerCm}`, 4, y + 3);
    }
  }

  // 3. Draw circles
  circles.forEach((circle) => {
    const isSemi = circle.shapeType === 'semicircle';
    const dir = circle.semiDirection || 'top';

    const setupPath = () => {
      ctx.beginPath();
      if (isSemi) {
        if (dir === 'top') {
          ctx.arc(circle.cx, circle.cy, circle.radius, Math.PI, 0, false);
        } else if (dir === 'bottom') {
          ctx.arc(circle.cx, circle.cy, circle.radius, 0, Math.PI, false);
        } else if (dir === 'left') {
          ctx.arc(circle.cx, circle.cy, circle.radius, Math.PI * 0.5, Math.PI * 1.5, false);
        } else {
          // right
          ctx.arc(circle.cx, circle.cy, circle.radius, -Math.PI * 0.5, Math.PI * 0.5, false);
        }
        ctx.closePath();
      } else {
        ctx.arc(circle.cx, circle.cy, circle.radius, 0, Math.PI * 2);
      }
    };

    // Optional Fill
    if (circle.isFilled) {
      ctx.save();
      setupPath();
      ctx.fillStyle = circle.fillColor || circle.color;
      ctx.globalAlpha = circle.fillOpacity ?? 0.35;
      ctx.fill();
      ctx.restore();
    }

    // Perimeter / Shape Outline
    setupPath();
    ctx.strokeStyle = circle.color;
    ctx.lineWidth = circle.strokeWidth;
    ctx.stroke();

    // Diameter Line
    if (circle.showDiameter) {
      ctx.beginPath();
      ctx.setLineDash([4, 3]);
      if (isSemi && (dir === 'left' || dir === 'right')) {
        ctx.moveTo(circle.cx, circle.cy - circle.radius);
        ctx.lineTo(circle.cx, circle.cy + circle.radius);
      } else {
        ctx.moveTo(circle.cx - circle.radius, circle.cy);
        ctx.lineTo(circle.cx + circle.radius, circle.cy);
      }
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#b91c1c';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`지름 ${((circle.radius * 2) / pxPerCm).toFixed(1)}cm`, circle.cx - 25, circle.cy + 16);
    }

    // Radius Line
    if (circle.showRadius) {
      let rx = circle.cx;
      let ry = circle.cy;
      if (isSemi) {
        if (dir === 'top') {
          ry = circle.cy - circle.radius;
        } else if (dir === 'bottom') {
          ry = circle.cy + circle.radius;
        } else if (dir === 'left') {
          rx = circle.cx - circle.radius;
        } else {
          rx = circle.cx + circle.radius;
        }
      } else {
        const angle = -Math.PI / 4;
        rx = circle.cx + circle.radius * Math.cos(angle);
        ry = circle.cy + circle.radius * Math.sin(angle);
      }

      ctx.beginPath();
      ctx.moveTo(circle.cx, circle.cy);
      ctx.lineTo(rx, ry);
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.fillStyle = '#1d4ed8';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`반지름 ${(circle.radius / pxPerCm).toFixed(1)}cm`, circle.cx + (rx - circle.cx) * 0.5 - 15, circle.cy + (ry - circle.cy) * 0.5 - 6);
    }

    // Center point ㅇ
    if (circle.showCenter) {
      ctx.beginPath();
      ctx.arc(circle.cx, circle.cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#e11d48';
      ctx.fill();

      ctx.fillStyle = '#be123c';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ㅇ', circle.cx - 5, circle.cy - 8);
    }
  });

  // 4. Header / Watermark stamp
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`📌 ${title}`, 20, height - 36);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#64748b';
  const subtitle = authorName ? `만든 이: ${authorName} ⬝ 초등학교 3학년 수학 '원' 탐구` : `초등학교 3학년 수학 '원' 탐구 교실`;
  ctx.fillText(subtitle, 20, height - 18);

  // 5. Trigger download
  const link = document.createElement('a');
  link.download = `${title.replace(/\s+/g, '_')}_컴퍼스원.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
