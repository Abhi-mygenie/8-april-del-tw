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
    
    onDrag?.(deltaX);
  }, [onDrag]);

  const handleMouseUp = useCallback(() => {
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
      className="resize-handle group flex-shrink-0 flex items-center justify-center cursor-col-resize"
      style={{
        width: '12px',
        marginLeft: '-6px',
        marginRight: '-6px',
        zIndex: 10,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Visual indicator */}
      <div
        className="h-full transition-all duration-150 group-hover:bg-opacity-100"
        style={{
          width: '4px',
          backgroundColor: COLORS.borderGray,
          borderRadius: '2px',
          opacity: 0.5,
        }}
      />
      
      {/* Hover/Active state overlay */}
      <style>{`
        .resize-handle:hover > div,
        .resize-handle:active > div {
          background-color: ${COLORS.primaryOrange} !important;
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

export default ResizeHandle;
