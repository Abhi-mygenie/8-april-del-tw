import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { COLORS } from '../../constants';
import ChannelColumn from './ChannelColumn';
import ResizeHandle from './ResizeHandle';

// Default max columns per channel
const DEFAULT_MAX_COLUMNS = {
  dineIn: 2,
  takeAway: 2,
  delivery: 2,
  room: 2,
};

// Channel order for arrow navigation
const CHANNEL_ORDER = ['dineIn', 'takeAway', 'delivery', 'room'];

// Card widths
const TABLE_CARD_WIDTH = 168; // 160px + gap
const ORDER_CARD_WIDTH = 320; // Wider for order cards

/**
 * ChannelColumnsLayout - Main container for channel-based column layout
 * 
 * New Behavior:
 * - Each channel has a "max columns" setting (default 2 for table view, 1 for order view)
 * - Actual columns = min(orderCount, maxColumns) - auto-sizes based on content
 * - 0 orders = channel hidden (0 columns)
 * - Arrow buttons transfer max columns between adjacent channels
 * - Drag also transfers columns
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
  
  // Reset to default on every mount (no persistence across sessions)
  const [maxColumns, setMaxColumns] = useState(DEFAULT_MAX_COLUMNS);

  // Clean up stale localStorage from previous implementation
  useEffect(() => {
    try { window.localStorage.removeItem('mygenie_channel_max_columns'); } catch (_) {}
  }, []);

  // Filter to only enabled channels
  const enabledChannels = useMemo(() => {
    return channels.filter(c => c.enabled !== false);
  }, [channels]);

  // Calculate actual columns for each channel based on order count
  const getActualColumns = useCallback((channelId, orderCount) => {
    if (orderCount === 0) return 0; // Auto-hide when no orders
    
    const max = maxColumns[channelId] ?? (viewType === 'table' ? 2 : 1);
    return Math.min(orderCount, max);
  }, [maxColumns, viewType]);

  // Get channel index in order
  const getChannelIndex = useCallback((channelId) => {
    return CHANNEL_ORDER.indexOf(channelId);
  }, []);

  // Arrow click handler - transfer 1 max column between adjacent channels
  // Left arrow: current channel shrinks by 1, left neighbor grows by 1
  // Right arrow: current channel shrinks by 1, right neighbor grows by 1
  // Minimum maxColumns is 1 (prevents hiding a channel that has orders)
  const handleArrowClick = useCallback((channelId, direction) => {
    const currentIndex = getChannelIndex(channelId);
    
    console.log(`%c[Arrow] CLICKED ${direction.toUpperCase()} on "${channelId}" (index ${currentIndex})`, 'background: #3b82f6; color: white; padding: 2px 6px; border-radius: 3px;');
    console.log(`[Arrow] Current maxColumns:`, { ...maxColumns });
    
    if (direction === 'left' && currentIndex > 0) {
      let leftIndex = currentIndex - 1;
      while (leftIndex >= 0) {
        const leftChannelId = CHANNEL_ORDER[leftIndex];
        const leftChannel = enabledChannels.find(c => c.id === leftChannelId);
        if (leftChannel) {
          setMaxColumns(prev => {
            const currentMax = prev[channelId] ?? 2;
            if (currentMax <= 1) {
              console.log(`[Arrow] BLOCKED: "${channelId}" already at min (${currentMax})`);
              return prev;
            }
            const newState = {
              ...prev,
              [channelId]: currentMax - 1,
              [leftChannelId]: (prev[leftChannelId] ?? 2) + 1,
            };
            console.log(`%c[Arrow] TRANSFER: "${channelId}" ${currentMax}→${currentMax - 1}, "${leftChannelId}" ${prev[leftChannelId] ?? 2}→${(prev[leftChannelId] ?? 2) + 1}`, 'color: #22c55e; font-weight: bold;');
            console.log(`[Arrow] New maxColumns:`, newState);
            return newState;
          });
          break;
        }
        leftIndex--;
      }
    }
    
    if (direction === 'right' && currentIndex < CHANNEL_ORDER.length - 1) {
      let rightIndex = currentIndex + 1;
      while (rightIndex < CHANNEL_ORDER.length) {
        const rightChannelId = CHANNEL_ORDER[rightIndex];
        const rightChannel = enabledChannels.find(c => c.id === rightChannelId);
        if (rightChannel) {
          setMaxColumns(prev => {
            const currentMax = prev[channelId] ?? 2;
            if (currentMax <= 1) {
              console.log(`[Arrow] BLOCKED: "${channelId}" already at min (${currentMax})`);
              return prev;
            }
            const newState = {
              ...prev,
              [channelId]: currentMax - 1,
              [rightChannelId]: (prev[rightChannelId] ?? 2) + 1,
            };
            console.log(`%c[Arrow] TRANSFER: "${channelId}" ${currentMax}→${currentMax - 1}, "${rightChannelId}" ${prev[rightChannelId] ?? 2}→${(prev[rightChannelId] ?? 2) + 1}`, 'color: #22c55e; font-weight: bold;');
            console.log(`[Arrow] New maxColumns:`, newState);
            return newState;
          });
          break;
        }
        rightIndex++;
      }
    }
  }, [getChannelIndex, enabledChannels, maxColumns]);

  // Handle resize drag (for Phase B - placeholder for now)
  const handleResize = useCallback((leftChannelId, rightChannelId, deltaX) => {
    const cardWidth = viewType === 'table' ? TABLE_CARD_WIDTH : ORDER_CARD_WIDTH;
    const columnsDelta = Math.round(deltaX / cardWidth);
    
    if (columnsDelta === 0) return;
    
    setMaxColumns(prev => {
      const leftMax = prev[leftChannelId] ?? 2;
      const rightMax = prev[rightChannelId] ?? 2;
      
      // Positive delta = drag right = left gains, right loses
      const newLeftMax = Math.max(1, leftMax + columnsDelta);
      const newRightMax = Math.max(1, rightMax - columnsDelta);
      
      return {
        ...prev,
        [leftChannelId]: newLeftMax,
        [rightChannelId]: newRightMax,
      };
    });
  }, [viewType]);

  // Calculate total width needed for layout
  const channelWidths = useMemo(() => {
    const cardWidth = viewType === 'table' ? TABLE_CARD_WIDTH : ORDER_CARD_WIDTH;
    const widths = {};
    
    enabledChannels.forEach(channel => {
      const actualCols = getActualColumns(channel.id, channel.items?.length || 0);
      // Width = columns * cardWidth + padding (24px)
      widths[channel.id] = actualCols > 0 ? (actualCols * cardWidth) + 24 : 0;
    });
    
    return widths;
  }, [enabledChannels, viewType, getActualColumns]);

  // Render columns with resize handles between them
  const renderColumns = () => {
    const elements = [];
    const visibleChannels = enabledChannels.filter(c => {
      const actualCols = getActualColumns(c.id, c.items?.length || 0);
      return actualCols > 0;
    });

    // Log current layout state
    const layoutSummary = enabledChannels.map(c => {
      const items = c.items?.length || 0;
      const actual = getActualColumns(c.id, items);
      const max = maxColumns[c.id] ?? 2;
      return `${c.name}: ${actual}col (max:${max}, items:${items})`;
    });
    console.log(`%c[Layout] ${layoutSummary.join(' | ')}`, 'color: #8b5cf6;');
    
    enabledChannels.forEach((channel, index) => {
      const actualColumns = getActualColumns(channel.id, channel.items?.length || 0);
      const channelMax = maxColumns[channel.id] ?? (viewType === 'table' ? 2 : 1);
      
      // Skip channels with 0 actual columns (no orders)
      if (actualColumns === 0) return;
      
      // Determine if this channel has neighbors for arrow buttons
      const currentOrderIndex = getChannelIndex(channel.id);
      const hasLeftNeighbor = currentOrderIndex > 0;
      const hasRightNeighbor = currentOrderIndex < CHANNEL_ORDER.length - 1;
      
      // Add column
      elements.push(
        <ChannelColumn
          key={channel.id}
          channel={channel}
          actualColumns={actualColumns}
          maxColumns={channelMax}
          viewType={viewType}
          activeFirst={activeFirst}
          hasLeftArrow={hasLeftNeighbor && channelMax > 0}
          hasRightArrow={hasRightNeighbor && channelMax > 0}
          onLeftArrowClick={() => handleArrowClick(channel.id, 'left')}
          onRightArrowClick={() => handleArrowClick(channel.id, 'right')}
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
      
      // Add resize handle between visible columns
      const nextVisibleIndex = visibleChannels.findIndex(c => c.id === channel.id) + 1;
      if (nextVisibleIndex < visibleChannels.length) {
        const nextChannel = visibleChannels[nextVisibleIndex];
        elements.push(
          <ResizeHandle
            key={`resize-${channel.id}-${nextChannel.id}`}
            onDrag={(deltaX) => handleResize(channel.id, nextChannel.id, deltaX)}
          />
        );
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

  // Check if all channels have 0 orders
  const allEmpty = enabledChannels.every(c => (c.items?.length || 0) === 0);
  if (allEmpty) {
    return (
      <div 
        className="flex items-center justify-center h-64 text-sm"
        style={{ color: COLORS.grayText }}
      >
        No active orders
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="channel-columns-layout"
      className="flex h-full gap-0 overflow-x-auto"
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
