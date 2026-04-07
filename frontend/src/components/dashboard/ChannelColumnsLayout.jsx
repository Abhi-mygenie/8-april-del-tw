import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { COLORS } from '../../constants';
import ChannelColumn from './ChannelColumn';
import ResizeHandle from './ResizeHandle';

// Default max columns per view type (fallback before measurement)
const getDefaultMaxColumns = (viewType) => {
  const cols = viewType === 'table' ? 2 : 1;
  return { dineIn: cols, takeAway: cols, delivery: cols, room: cols };
};

// Channel order for arrow navigation
const CHANNEL_ORDER = ['dineIn', 'takeAway', 'delivery', 'room'];

// Card unit sizes (card width + gap)
const TABLE_CARD_UNIT = 172; // 160px card + 12px gap
const ORDER_CARD_UNIT = 312; // 300px card + 12px gap
const CHANNEL_PADDING = 24;  // p-3 = 12px each side
const RESIZE_HANDLE_WIDTH = 24;

// Card widths (for pixel-based column sizing)
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
  
  // Start with static fallback, smart defaults calculated after mount
  const [maxColumns, setMaxColumns] = useState(() => getDefaultMaxColumns(viewType));
  const initializedForViewRef = useRef(null);

  // Reset initialization flag when viewType changes so it recalculates
  useEffect(() => {
    initializedForViewRef.current = null;
    setMaxColumns(getDefaultMaxColumns(viewType));
  }, [viewType]);

  // Clean up stale localStorage from previous implementation
  useEffect(() => {
    try { window.localStorage.removeItem('mygenie_channel_max_columns'); } catch (_) {}
  }, []);

  // Filter to only enabled channels
  const enabledChannels = useMemo(() => {
    return channels.filter(c => c.enabled !== false);
  }, [channels]);

  // Smart default calculation: measure container, distribute width among visible channels
  // Placed AFTER enabledChannels declaration
  useEffect(() => {
    // Skip if already calculated for this viewType
    if (initializedForViewRef.current === viewType) return;

    const visibleChannels = enabledChannels.filter(c => (c.items?.length || 0) > 0);

    // No channels with items yet — use static defaults
    if (visibleChannels.length === 0) {
      setMaxColumns(getDefaultMaxColumns(viewType));
      initializedForViewRef.current = viewType;
      return;
    }

    // Measure after DOM settles
    const timer = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;

      const containerWidth = el.clientWidth;
      const visibleCount = visibleChannels.length;
      const cardUnit = viewType === 'table' ? TABLE_CARD_UNIT : ORDER_CARD_UNIT;

      const totalHandles = Math.max(0, visibleCount - 1) * RESIZE_HANDLE_WIDTH;
      const totalPadding = visibleCount * CHANNEL_PADDING;
      const available = containerWidth - totalHandles - totalPadding;
      const perChannel = available / visibleCount;
      const cols = Math.max(1, Math.floor(perChannel / cardUnit));

      const defaults = {};
      CHANNEL_ORDER.forEach(id => { defaults[id] = cols; });

      console.log(`%c[SmartDefault] view=${viewType}, container=${containerWidth}px, channels=${visibleCount}, cols=${cols}`, 'color: #f59e0b; font-weight: bold;');

      setMaxColumns(defaults);
      initializedForViewRef.current = viewType;
    }, 50);

    return () => clearTimeout(timer);
  }, [viewType, enabledChannels]);

  // Calculate actual columns for each channel based on order count
  const getActualColumns = useCallback((channelId, orderCount) => {
    if (orderCount === 0) return 0; // Auto-hide when no orders
    
    const max = maxColumns[channelId] ?? (viewType === 'table' ? 2 : 1);
    return Math.min(orderCount, max);
  }, [maxColumns, viewType]);

  // Arrow click handler
  // `<` = DECREASE this channel by 1 (min 1)
  // `>` = INCREASE this channel by 1 (no max limit)
  // No transfer between channels — each is independent
  const handleArrowClick = useCallback((channelId, direction) => {
    console.log(`%c[Arrow] ${direction === 'left' ? 'DECREASE(<)' : 'INCREASE(>)'} on "${channelId}"`, 'background: #3b82f6; color: white; padding: 2px 6px; border-radius: 3px;');

    setMaxColumns(prev => {
      const currentMax = prev[channelId] ?? 2;

      if (direction === 'left') {
        if (currentMax <= 1) {
          console.log(`[Arrow] BLOCKED: "${channelId}" already at min (1)`);
          return prev;
        }
        const newVal = currentMax - 1;
        console.log(`%c[Arrow] ${channelId} ${currentMax}→${newVal}`, 'color: #22c55e; font-weight: bold;');
        return { ...prev, [channelId]: newVal };
      }

      if (direction === 'right') {
        const newVal = currentMax + 1;
        console.log(`%c[Arrow] ${channelId} ${currentMax}→${newVal}`, 'color: #22c55e; font-weight: bold;');
        return { ...prev, [channelId]: newVal };
      }

      return prev;
    });
  }, []);

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

      // Add column
      elements.push(
        <ChannelColumn
          key={channel.id}
          channel={channel}
          actualColumns={actualColumns}
          maxColumns={channelMax}
          viewType={viewType}
          activeFirst={activeFirst}
          hasLeftArrow={true}
          hasRightArrow={true}
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
