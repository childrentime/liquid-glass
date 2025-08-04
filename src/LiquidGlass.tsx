import React, { useRef, useEffect, useCallback, useMemo } from 'react';

interface MousePosition {
  x: number;
  y: number;
}

interface FragmentFunction {
  (uv: { x: number; y: number }, mouse?: MousePosition): { type: 't'; x: number; y: number };
}

interface LiquidGlassProps {
  width?: number;
  height?: number;
  fragment?: FragmentFunction;
  className?: string;
  style?: React.CSSProperties;
}

// 工具函数
function smoothStep(a: number, b: number, t: number): number {
  t = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

function roundedRectSDF(x: number, y: number, width: number, height: number, radius: number): number {
  const qx = Math.abs(x) - width + radius;
  const qy = Math.abs(y) - height + radius;
  return Math.min(Math.max(qx, qy), 0) + length(Math.max(qx, 0), Math.max(qy, 0)) - radius;
}

function texture(x: number, y: number): { type: 't'; x: number; y: number } {
  return { type: 't', x, y };
}

// 生成唯一ID
function generateId(): string {
  return 'liquid-glass-' + Math.random().toString(36).substr(2, 9);
}

export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  width = 300,
  height = 200,
  fragment,
  className = '',
  style = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const feImageRef = useRef<SVGFEImageElement>(null);
  const feDisplacementMapRef = useRef<SVGFEDisplacementMapElement>(null);
  
  const mouseRef = useRef<MousePosition>({ x: 0, y: 0 });
  const mouseUsedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragDataRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });
  
  const canvasDPI = 1;
  const offset = 10; // 视口边界偏移量
  
  // 生成唯一ID
  const id = useMemo(() => generateId(), []);
  
  // 默认fragment函数
  const defaultFragment: FragmentFunction = useCallback((uv) => {
    const ix = uv.x - 0.5;
    const iy = uv.y - 0.5;
    const distanceToEdge = roundedRectSDF(ix, iy, 0.3, 0.2, 0.6);
    const displacement = smoothStep(0.8, 0, distanceToEdge - 0.15);
    const scaled = smoothStep(0, 1, displacement);
    return texture(ix * scaled + 0.5, iy * scaled + 0.5);
  }, []);
  
  const fragmentShader = fragment || defaultFragment;
  
  // 约束位置函数
  const constrainPosition = useCallback((x: number, y: number) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const minX = offset;
    const maxX = viewportWidth - width - offset;
    const minY = offset;
    const maxY = viewportHeight - height - offset;
    
    const constrainedX = Math.max(minX, Math.min(maxX, x));
    const constrainedY = Math.max(minY, Math.min(maxY, y));
    
    return { x: constrainedX, y: constrainedY };
  }, [width, height, offset]);
  
  // 更新着色器
  const updateShader = useCallback(() => {
    const canvas = canvasRef.current;
    const feImage = feImageRef.current;
    const feDisplacementMap = feDisplacementMapRef.current;
    
    if (!canvas || !feImage || !feDisplacementMap) return;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    // 创建鼠标代理以检测使用
    const mouseProxy = new Proxy(mouseRef.current, {
      get: (target, prop) => {
        mouseUsedRef.current = true;
        return target[prop as keyof MousePosition];
      }
    });
    
    mouseUsedRef.current = false;
    
    const w = width * canvasDPI;
    const h = height * canvasDPI;
    const data = new Uint8ClampedArray(w * h * 4);
    
    let maxScale = 0;
    const rawValues: number[] = [];
    
    // 第一遍：计算位移并找到最大缩放
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % w;
      const y = Math.floor(i / 4 / w);
      const pos = fragmentShader(
        { x: x / w, y: y / h },
        mouseProxy
      );
      const dx = pos.x * w - x;
      const dy = pos.y * h - y;
      maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
      rawValues.push(dx, dy);
    }
    
    maxScale *= 0.5;
    
    // 第二遍：标准化并填充数据
    let index = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = rawValues[index++] / maxScale + 0.5;
      const g = rawValues[index++] / maxScale + 0.5;
      data[i] = r * 255;
      data[i + 1] = g * 255;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }
    
    context.putImageData(new ImageData(data, w, h), 0, 0);
    feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', canvas.toDataURL());
    feDisplacementMap.setAttribute('scale', (maxScale / canvasDPI).toString());
  }, [width, height, canvasDPI, fragmentShader]);
  
  // 鼠标事件处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    const container = containerRef.current;
    if (!container) return;
    
    container.style.cursor = 'grabbing';
    dragDataRef.current.startX = e.clientX;
    dragDataRef.current.startY = e.clientY;
    
    const rect = container.getBoundingClientRect();
    dragDataRef.current.initialX = rect.left;
    dragDataRef.current.initialY = rect.top;
    
    e.preventDefault();
  }, []);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    
    if (isDraggingRef.current) {
      const deltaX = e.clientX - dragDataRef.current.startX;
      const deltaY = e.clientY - dragDataRef.current.startY;
      
      const newX = dragDataRef.current.initialX + deltaX;
      const newY = dragDataRef.current.initialY + deltaY;
      
      const constrained = constrainPosition(newX, newY);
      
      container.style.left = constrained.x + 'px';
      container.style.top = constrained.y + 'px';
      container.style.transform = 'none';
    }
    
    // 更新鼠标位置用于着色器
    const rect = container.getBoundingClientRect();
    mouseRef.current.x = (e.clientX - rect.left) / rect.width;
    mouseRef.current.y = (e.clientY - rect.top) / rect.height;
    
    if (mouseUsedRef.current) {
      updateShader();
    }
  }, [constrainPosition, updateShader]);
  
  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    const container = containerRef.current;
    if (container) {
      container.style.cursor = 'grab';
    }
  }, []);
  
  const handleWindowResize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const constrained = constrainPosition(rect.left, rect.top);
    
    if (rect.left !== constrained.x || rect.top !== constrained.y) {
      container.style.left = constrained.x + 'px';
      container.style.top = constrained.y + 'px';
      container.style.transform = 'none';
    }
  }, [constrainPosition]);
  
  // 设置事件监听器
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleWindowResize);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [handleMouseMove, handleMouseUp, handleWindowResize]);
  
  // 初始化着色器
  useEffect(() => {
    updateShader();
  }, [updateShader]);
  
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: `${width}px`,
    height: `${height}px`,
    overflow: 'hidden',
    borderRadius: '150px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.25), 0 -10px 25px inset rgba(0, 0, 0, 0.15)',
    cursor: 'grab',
    backdropFilter: `url(#${id}_filter) blur(0.25px) contrast(1.2) brightness(1.05) saturate(1.1)`,
    zIndex: 9999,
    pointerEvents: 'auto',
    ...style
  };
  
  const svgStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    pointerEvents: 'none',
    zIndex: 9998,
    width: 0,
    height: 0
  };
  
  return (
    <>
      {/* SVG 滤镜 */}
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        style={svgStyle}
      >
        <defs>
          <filter
            id={`${id}_filter`}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
            x="0"
            y="0"
            width={width.toString()}
            height={height.toString()}
          >
            <feImage
              ref={feImageRef}
              id={`${id}_map`}
              width={width.toString()}
              height={height.toString()}
            />
            <feDisplacementMap
              ref={feDisplacementMapRef}
              in="SourceGraphic"
              in2={`${id}_map`}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      
      {/* 液体玻璃容器 */}
      <div
        ref={containerRef}
        className={className}
        style={containerStyle}
        onMouseDown={handleMouseDown}
      />
      
      {/* 隐藏的画布用于生成位移贴图 */}
      <canvas
        ref={canvasRef}
        width={width * canvasDPI}
        height={height * canvasDPI}
        style={{ display: 'none' }}
      />
    </>
  );
};

export default LiquidGlass; 