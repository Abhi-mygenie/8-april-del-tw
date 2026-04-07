import { useRef, useEffect } from 'react';
import { COLORS } from '../../constants';

/**
 * ResizeHandle - Draggable vertical bar for resizing adjacent columns
 */
const ResizeHandle = ({ onDrag, onDragStart, onDragEnd }) => {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const handleRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      
      const deltaX = e.clientX - startX.current;
      startX.current = e.clientX;
      
      if (deltaX !== 0) {
        console.log('[ResizeHandle] Dragging, deltaX:', deltaX);
        onDrag?.(deltaX);
      }
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      
      console.log('[ResizeHandle] Mouse up, stopping drag');
      isDragging.current = false;
      
      // Reset body styles
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      onDragEnd?.();
    };

    // Add listeners at mount
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onDrag, onDragEnd]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[ResizeHandle] Mouse down, starting drag at X:', e.clientX);
    isDragging.current = true;
    startX.current = e.clientX;
    
    // Add dragging styles to body
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    onDragStart?.();
  };

  return (
    <div
      ref={handleRef}
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
