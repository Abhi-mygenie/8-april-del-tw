import { useCallback, useMemo, useRef } from 'react';
import { COLORS } from '../../constants';
import { useLocalStorage } from '../../hooks';
import ChannelColumn from './ChannelColumn';
import ResizeHandle from './ResizeHandle';

// Default column widths (percentages, must sum to 100)
const DEFAULT_WIDTHS = {
  dineIn: 25,
  takeAway: 25,
  delivery: 25,
  room: 25,
};

// Minimum width in pixels for a column (enough for 2 TableCards: 160*2 + gaps + padding)
const MIN_COLUMN_WIDTH = 350;

// localStorage keys
const STORAGE_KEY_WIDTHS = 'mygenie_channel_widths';
const STORAGE_KEY_COLLAPSED = 'mygenie_channel_collapsed';

/**
 * ChannelColumnsLayout - Main container for channel-based column layout
 * 
 * Features:
 * - 4 columns for Dine-In, TakeAway, Delivery, Room
 * - Resizable via drag handles between columns
 * - Collapsible columns
 * - Persists widths and collapsed state to localStorage
 * - Same layout for Table View and List View
 */
const ChannelColumnsLayout = ({
  channels,          // Array of { id, name, items, enabled }
  viewType,          // 'table' | 'order'
  activeFirst,
  onItemClick,
  // Card handlers passed through
  onMarkReady,
  onMarkServed,
  onBillClick,
  onCancelOrder,
  onItemStatusChange,
  onToggleSnooze,
  onConfirmOrder,
  onUpdateStatus,
  onFoodTransfer,
  // Permissions
  hasPermission,
  // Other
  snoozedOrders,
  currencySymbol,
  isTableEngaged,
  searchQuery,
  matchingIds,
}) => {
  const containerRef = useRef(null);
  
  // Persist column widths
  const [columnWidths, setColumnWidths] = useLocalStorage(STORAGE_KEY_WIDTHS, DEFAULT_WIDTHS);
  
  // Persist collapsed state
  const [collapsedChannels, setCollapsedChannels] = useLocalStorage(STORAGE_KEY_COLLAPSED, []);

  // Filter to only enabled channels
  const enabledChannels = useMemo(() => {
    return channels.filter(c => c.enabled !== false);
  }, [channels]);

  // Get channel IDs that are visible (enabled and not collapsed)
  const visibleChannelIds = useMemo(() => {
    return enabledChannels
      .filter(c => !collapsedChannels.includes(c.id))
      .map(c => c.id);
  }, [enabledChannels, collapsedChannels]);

  // Calculate actual widths accounting for collapsed columns
  const effectiveWidths = useMemo(() => {
    const widths = { ...columnWidths };
    
    // If some channels are collapsed, redistribute their width
    const collapsedWidth = collapsedChannels.reduce((sum, id) => sum + (widths[id] || 0), 0);
    const visibleCount = visibleChannelIds.length;
    
    if (visibleCount > 0 && collapsedWidth > 0) {
      const extraPerChannel = collapsedWidth / visibleCount;
      visibleChannelIds.forEach(id => {
        widths[id] = (widths[id] || 25) + extraPerChannel;
      });
    }
    
    return widths;
  }, [columnWidths, collapsedChannels, visibleChannelIds]);

  // Handle resize drag
  const handleResize = useCallback((leftChannelId, rightChannelId, deltaX) => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const deltaPercent = (deltaX / containerWidth) * 100;
    
    setColumnWidths(prev => {
      const newWidths = { ...prev };
      const leftWidth = newWidths[leftChannelId] || 25;
      const rightWidth = newWidths[rightChannelId] || 25;
      
      // Calculate new widths
      let newLeftWidth = leftWidth + deltaPercent;
      let newRightWidth = rightWidth - deltaPercent;
      
      // Enforce minimum widths (in percentage terms, roughly)
      const minPercent = (MIN_COLUMN_WIDTH / containerWidth) * 100;
      
      if (newLeftWidth < minPercent) {
        newLeftWidth = minPercent;
        newRightWidth = leftWidth + rightWidth - minPercent;
      }
      if (newRightWidth < minPercent) {
        newRightWidth = minPercent;
        newLeftWidth = leftWidth + rightWidth - minPercent;
      }
      
      newWidths[leftChannelId] = newLeftWidth;
      newWidths[rightChannelId] = newRightWidth;
      
      return newWidths;
    });
  }, [setColumnWidths]);

  // Toggle column collapse
  const toggleCollapse = useCallback((channelId) => {
    setCollapsedChannels(prev => {
      if (prev.includes(channelId)) {
        return prev.filter(id => id !== channelId);
      }
      // Don't allow collapsing all columns
      if (prev.length >= enabledChannels.length - 1) {
        return prev;
      }
      return [...prev, channelId];
    });
  }, [setCollapsedChannels, enabledChannels.length]);

  // Render columns with resize handles between them
  const renderColumns = () => {
    const elements = [];
    
    enabledChannels.forEach((channel, index) => {
      const isCollapsed = collapsedChannels.includes(channel.id);
      const width = isCollapsed ? 0 : effectiveWidths[channel.id] || 25;
      
      // Add column
      elements.push(
        <ChannelColumn
          key={channel.id}
          channel={channel}
          width={width}
          isCollapsed={isCollapsed}
          activeFirst={activeFirst}
          viewType={viewType}
          onCollapse={() => toggleCollapse(channel.id)}
          onItemClick={onItemClick}
          onMarkReady={onMarkReady}
          onMarkServed={onMarkServed}
          onBillClick={onBillClick}
          onCancelOrder={onCancelOrder}
          onItemStatusChange={onItemStatusChange}
          onToggleSnooze={onToggleSnooze}
          onConfirmOrder={onConfirmOrder}
          onUpdateStatus={onUpdateStatus}
          hasPermission={hasPermission}
          snoozedOrders={snoozedOrders}
          currencySymbol={currencySymbol}
          isTableEngaged={isTableEngaged}
          searchQuery={searchQuery}
          matchingIds={matchingIds}
        />
      );
      
      // Add resize handle between columns (not after last one)
      if (index < enabledChannels.length - 1) {
        const nextChannel = enabledChannels[index + 1];
        const leftCollapsed = isCollapsed;
        const rightCollapsed = collapsedChannels.includes(nextChannel.id);
        
        // Only show resize handle if both adjacent columns are expanded
        if (!leftCollapsed && !rightCollapsed) {
          elements.push(
            <ResizeHandle
              key={`resize-${channel.id}-${nextChannel.id}`}
              onDrag={(deltaX) => handleResize(channel.id, nextChannel.id, deltaX)}
            />
          );
        }
      }
    });
    
    return elements;
  };

  if (enabledChannels.length === 0) {
    return (
      <div 
        className="flex items-center justify-center h-64 text-sm"
        style={{ color: COLORS.grayText }}
      >
        No channels configured
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="channel-columns-layout"
      className="flex h-full gap-0"
      style={{ 
        minHeight: '500px',
        backgroundColor: COLORS.sectionBg,
      }}
    >
      {renderColumns()}
    </div>
  );
};

export default ChannelColumnsLayout;
