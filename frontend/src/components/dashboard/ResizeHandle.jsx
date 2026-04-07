import { useState, useRef, useEffect, useCallback } from 'react';
import { COLORS } from '../../constants';

/**
 * ResizeHandle - Draggable vertical bar for resizing adjacent columns
 */
const ResizeHandle = ({ onDrag, onDragStart, onDragEnd }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const onDragRef = useRef(onDrag);
  
  // Keep ref updated with latest onDrag
  useEffect(() => {
    onDragRef.current = onDrag;
  }, [onDrag]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[ResizeHandle] Mouse down at X:', e.clientX);
    startXRef.current = e.clientX;
    setIsDragging(true);
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    onDragStart?.();
  }, [onDragStart]);

  // Handle mouse move and mouse up when dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startXRef.current;
      startXRef.current = e.clientX;
      
      if (deltaX !== 0) {
        console.log('[ResizeHandle] Dragging, deltaX:', deltaX);
        onDragRef.current?.(deltaX);
      }
    };

    const handleMouseUp = () => {
      console.log('[ResizeHandle] Mouse up, stopping drag');
      setIsDragging(false);
      
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      onDragEnd?.();
    };

    console.log('[ResizeHandle] Adding drag listeners');
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      console.log('[ResizeHandle] Removing drag listeners');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onDragEnd]);

  return (
    <div
      data-testid="resize-handle"
      className="resize-handle flex-shrink-0 flex items-center justify-center"
      style={{
        width: '20px',
        cursor: 'col-resize',
        zIndex: 50,
        position: 'relative',
        backgroundColor: isDragging ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Visual indicator */}
      <div
        style={{
          width: '6px',
          height: '100%',
          backgroundColor: isDragging ? COLORS.primaryOrange : '#E5E5E5',
          borderRadius: '3px',
          transition: 'background-color 0.15s',
        }}
      />
      
      {/* Hover styles */}
      <style>{`
        .resize-handle:hover > div {
          background-color: ${COLORS.primaryOrange} !important;
        }
      `}</style>
    </div>
  );
};

export default ResizeHandle;
