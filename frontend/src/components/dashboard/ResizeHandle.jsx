import { useCallback, useRef } from 'react';
import { COLORS } from '../../constants';

/**
 * ResizeHandle - Draggable vertical bar for resizing adjacent columns
 * 
 * Features:
 * - Visual feedback on hover and drag
 * - Smooth drag tracking
 * - Reports delta movement to parent
 */
const ResizeHandle = ({ onDrag, onDragStart, onDragEnd }) => {
  const isDragging = useRef(false);
  const startX = useRef(0);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    
    const deltaX = e.clientX - startX.current;
    startX.current = e.clientX;
    
    console.log('[ResizeHandle] Dragging, deltaX:', deltaX);
    onDrag?.(deltaX);
  }, [onDrag]);

  const handleMouseUp = useCallback(() => {
    console.log('[ResizeHandle] Mouse up, stopping drag');
    isDragging.current = false;
    
    // Remove document-level listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Reset body styles
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    onDragEnd?.();
  }, [onDragEnd, handleMouseMove]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[ResizeHandle] Mouse down, starting drag');
    isDragging.current = true;
    startX.current = e.clientX;
    
    onDragStart?.();
    
    // Add document-level listeners for smooth dragging
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Add dragging class to body for cursor
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [onDragStart, handleMouseMove, handleMouseUp]);

  return (
    <div
      data-testid="resize-handle"
      className="resize-handle flex-shrink-0 flex items-center justify-center"
      style={{
        width: '20px',
        cursor: 'col-resize',
        zIndex: 50,
        position: 'relative',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Visual indicator - more prominent */}
      <div
        style={{
          width: '6px',
          height: '100%',
          backgroundColor: '#E5E5E5',
          borderRadius: '3px',
          transition: 'background-color 0.15s',
        }}
        className="hover:bg-orange-400"
      />
      
      {/* Inline hover styles */}
      <style>{`
        .resize-handle:hover > div {
          background-color: ${COLORS.primaryOrange} !important;
        }
        .resize-handle:active > div {
          background-color: ${COLORS.primaryOrange} !important;
        }
      `}</style>
    </div>
  );
};

export default ResizeHandle;
