import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { COLORS, USE_CHANNEL_LAYOUT } from "../constants";
import { Sidebar, Header } from "../components/layout";
import { TableSection } from "../components/sections";
import { DineInCard, DeliveryCard, OrderCard } from "../components/cards";
import TableCard from "../components/cards/TableCard";
import { OrderEntry } from "../components/order-entry";
import { sortByActiveFirst, TABLE_STATUS_PRIORITY } from "../utils";
import { useRestaurant, useTables, useOrders, useAuth, useSettings } from "../contexts";
import SettingsPanel from "../components/panels/SettingsPanel";
import MenuManagementPanel from "../components/panels/MenuManagementPanel";
import { useRefreshAllData } from "../hooks/useRefreshAllData";
import RoomCheckInModal from "../components/modals/RoomCheckInModal";
import CancelOrderModal from "../components/order-entry/CancelOrderModal";
import { useSocketEvents } from "../api/socket";
import api from "../api/axios";
import { API_ENDPOINTS } from "../api/constants";
import { toAPI as orderToAPI } from "../api/transforms/orderTransform";
import { updateOrderStatus } from "../api/services/orderService";
import { ChannelColumnsLayout } from "../components/dashboard";

// Helper: search a list of items by id, customer/guest, and phone fields
const searchItems = (items, query, getFields) => {
  const exact = [];
  const partial = [];
  items.forEach(item => {
    const fields = getFields(item);
    const idMatch = fields.id.toLowerCase();
    if (idMatch === query) {
      exact.push(item);
    } else if (fields.all.some(f => f.toLowerCase().includes(query))) {
      partial.push(item);
    }
  });
  return { exact, partial: partial.slice(0, 5) };
};

// Helper: extract matching IDs from search results
const getMatchingIds = (searchQuery, resultGroup) => {
  if (!searchQuery.trim()) return null;
  const ids = new Set();
  resultGroup.exact.forEach(item => ids.add(item.id));
  resultGroup.partial.forEach(item => ids.add(item.id));
  return ids;
};

// Empty state component for 0 tables
const EmptyTableState = () => (
  <div data-testid="empty-table-state" className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: COLORS.sectionBg }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={COLORS.grayText} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    </div>
    <p className="text-lg font-medium" style={{ color: COLORS.darkText }}>No Tables Found</p>
    <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>Add tables from Settings to start managing dine-in orders.</p>
  </div>
);

// Reusable order list section (Delivery/TakeAway) — now uses OrderCard
const OrderListSection = ({ title, orders, orderType, matchingIds, snoozedOrders, onToggleSnooze, onEdit, onMarkReady, onMarkServed, onBillClick, onCancelOrder, onItemStatusChange, canCancelOrder, canPrintBill, canBill, className }) => (
  <div className={className}>
    <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: COLORS.grayText }}>
      <span className="font-medium" style={{ color: COLORS.darkText }}>{title}</span>
      <span style={{ color: COLORS.borderGray }}>|</span>
      <span>{matchingIds === null ? orders.length : matchingIds.size} Orders</span>
    </div>
    {orders.length > 0 ? (
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {orders
          .filter(order => matchingIds === null || matchingIds.has(String(order.orderId)))
          .map((order) => (
            <OrderCard
              key={order.orderId}
              order={order}
              orderType={orderType}
              isSnoozed={snoozedOrders.has(String(order.orderId))}
              canCancelOrder={canCancelOrder}
              canMergeOrder={false}
              canShiftTable={false}
              canFoodTransfer={false}
              canPrintBill={canPrintBill}
              canBill={canBill}
              onToggleSnooze={onToggleSnooze}
              onEdit={onEdit}
              onMarkReady={() => onMarkReady?.({ orderId: order.orderId, tableId: 0 })}
              onMarkServed={() => onMarkServed?.({ orderId: order.orderId, tableId: 0 })}
              onBillClick={() => onBillClick?.(order)}
              onCancelOrder={onCancelOrder}
              onItemStatusChange={onItemStatusChange}
            />
          ))}
      </div>
    ) : (
      <p className="text-sm py-4" style={{ color: COLORS.grayText }}>No active orders</p>
    )}
  </div>
);

// Main Home/Dashboard Component
const DashboardPage = () => {
  const navigate = useNavigate();
  const { isLoaded: restaurantLoaded, currencySymbol, cancellation, features } = useRestaurant();
  const { tables: apiTables, isLoaded: tablesLoaded } = useTables();
  const { user, hasPermission, permissions } = useAuth();
  
  // Debug: Log permissions on Dashboard load
  useEffect(() => {
    if (user && permissions) {
      console.log('%c[Dashboard] USER PERMISSIONS', 'background: #22c55e; color: white; padding: 4px 8px; border-radius: 4px;');
      console.log('User:', user?.firstName, user?.roleName);
      console.log('Permissions Array:', permissions);
      console.table(permissions.map((p, i) => ({ '#': i + 1, Permission: p })));
    }
  }, [user, permissions]);
  const { getOrderCancellationReasons } = useSettings();
  const {
    dineInOrders, takeAwayOrders, deliveryOrders, walkInOrders,
    orderItemsByTableId, getOrderByTableId, removeOrder, waitForOrderRemoval,
  } = useOrders();
  const refreshAllData = useRefreshAllData();
  const { updateTableStatus, isTableEngaged, setTableEngaged } = useTables();

  // Socket events - subscribe to real-time updates
  const { isConnected: socketConnected } = useSocketEvents();

  // Redirect to loading if data not loaded (auth check handled by ProtectedRoute — T-07)
  useEffect(() => {
    if (!restaurantLoaded && window.location.pathname !== '/loading') {
      navigate("/loading", { replace: true });
    }
  }, [navigate, restaurantLoaded]);

  // Warn before browser reload/close — prevents accidental session loss
  // Exception: skip dialog when it's an intentional auth redirect (401)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (sessionStorage.getItem('auth_redirect')) {
        sessionStorage.removeItem('auth_redirect');
        return; // intentional redirect — no dialog
      }
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // --- State ---
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Real-time internet connectivity detection
  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [activeChannels, setActiveChannels] = useState(["delivery", "takeAway", "dineIn", "room"]);
  const [activeStatuses, setActiveStatuses] = useState(["confirm", "cooking", "ready", "running", "schedule"]);
  const [tableFilter, setTableFilter] = useState(null); // null | 'confirm' | 'schedule'
  const [activeView, setActiveView] = useState("table");
  const [activeFirst, setActiveFirst] = useState(true);
  const [orderEntryTable, setOrderEntryTable] = useState(null);
  const [orderEntryType, setOrderEntryType] = useState(null);
  const [initialShowPayment, setInitialShowPayment] = useState(false);
  const [initialTransferItem, setInitialTransferItem] = useState(null);
  const [cartsByTable, setCartsByTable] = useState({});
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSilentMode, setIsSilentMode] = useState(false);
  const [snoozedOrders, setSnoozedOrders] = useState(new Set());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checkInRoom, setCheckInRoom] = useState(null); // Room object for CheckIn modal
  const [cancelOrderEntry, setCancelOrderEntry] = useState(null); // Table entry for CancelOrderModal

  const handleRefreshAll = async () => {
    if (isRefreshing) return;
    // Guard: block refresh when OrderEntry is open
    if (orderEntryType !== null) {
      return; // toast shown in Sidebar
    }
    setIsRefreshing(true);
    setCartsByTable({}); // clear stale saved carts
    try {
      await refreshAllData(user?.roleName || 'Owner');
    } finally {
      setIsRefreshing(false);
    }
  };

  // --- Derive tables from API data + order enrichment (synchronous with render) ---
  const { tables, flatTables } = useMemo(() => {
    if (!tablesLoaded) return { tables: {}, flatTables: [] };
    const nonRoomTables = apiTables.filter(t => !t.isRoom);
    if (nonRoomTables.length === 0 && walkInOrders.length === 0) return { tables: {}, flatTables: [] };

    const adaptTable = (t) => {
      // Check if this table has a running order
      const order = getOrderByTableId(t.tableId);
      const hasOrder = !!order;

      return {
        id: String(t.tableId),
        label: t.tableNumber,
        status: hasOrder ? order.tableStatus : (t.isOccupied ? 'occupied' : 'available'),
        tableId: t.tableId,
        orderType: 'dineIn',
        // Order enrichment (only if order exists)
        amount: hasOrder ? order.amount : undefined,
        time: hasOrder ? order.time : undefined,
        orderNumber: hasOrder ? order.orderNumber : undefined,
        fOrderStatus: hasOrder ? order.fOrderStatus : undefined,
        orderId: hasOrder ? order.orderId : undefined,
        waiter: hasOrder ? order.waiter : undefined,
      };
    };

    const hasSections = nonRoomTables.some(t => t.sectionName);

    if (hasSections) {
      const grouped = {};
      nonRoomTables.forEach(table => {
        if (table.status === 'disabled') return;
        const section = table.sectionName || 'Default';
        const key = section.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (!grouped[key]) {
          grouped[key] = { name: section, prefix: 'T', tables: [] };
        }
        grouped[key].tables.push(adaptTable(table));
      });

      // Add walk-in orders as virtual table entries in a "Walk-In" section
      if (walkInOrders.length > 0) {
        grouped['walk_in'] = {
          name: 'Walk-In',
          prefix: 'Walk-In',
          tables: walkInOrders.map((order) => ({
            id: `wc-${order.orderId}`,
            label: order.customer || 'Walk-In',
            status: order.tableStatus,
            tableId: 0,
            amount: order.amount,
            time: order.time,
            orderNumber: order.orderNumber,
            isWalkIn: true,
            walkInOrderId: order.orderId,
            orderId: order.orderId,
            orderType: 'walkIn',
            fOrderStatus: order.fOrderStatus,
            waiter: order.waiter || '',
          })),
        };
      }

      return { tables: grouped, flatTables: [] };
    } else {
      const flat = nonRoomTables
        .filter(t => t.status !== 'disabled')
        .map(adaptTable);

      // Append walk-in orders as virtual entries
      walkInOrders.forEach((order) => {
        flat.push({
          id: `wc-${order.orderId}`,
          label: order.customer || 'Walk-In',
          status: order.tableStatus,
          tableId: 0,
          amount: order.amount,
          time: order.time,
          orderNumber: order.orderNumber,
          isWalkIn: true,
          walkInOrderId: order.orderId,
          orderId: order.orderId,
          orderType: 'walkIn',
          fOrderStatus: order.fOrderStatus,
          waiter: order.waiter || '',
        });
      });

      return { tables: {}, flatTables: flat };
    }
  }, [tablesLoaded, apiTables, getOrderByTableId, walkInOrders]);

  // --- Derived values ---
  const hasAreas = Object.keys(tables).length > 0;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- tables/flatTables are useMemo outputs, valid deps
  const allTablesList = useMemo(() => {
    return hasAreas ? Object.values(tables).flatMap(s => s.tables) : flatTables;
  }, [tables, flatTables, hasAreas]);

  const allRoomsList = useMemo(() => {
    if (!tablesLoaded) return [];
    return apiTables
      .filter(t => t.isRoom && t.status !== 'disabled')
      .map(t => {
        const order = getOrderByTableId(t.tableId);
        const hasOrder = !!order;
        return {
          id: String(t.tableId),
          label: t.tableNumber,
          status: hasOrder ? order.tableStatus : (t.isOccupied ? 'occupied' : 'available'),
          tableId: t.tableId,
          orderType: 'room',
          isRoom: true,
          amount: hasOrder ? order.amount : undefined,
          time: hasOrder ? order.time : undefined,
          orderNumber: hasOrder ? order.orderNumber : undefined,
          fOrderStatus: hasOrder ? order.fOrderStatus : undefined,
          orderId: hasOrder ? order.orderId : undefined,
          customer: hasOrder ? order.customer : undefined,
        };
      });
  }, [tablesLoaded, apiTables, getOrderByTableId]);

  // === Channel-Based Layout Data (USE_CHANNEL_LAYOUT feature flag) ===
  const channelData = useMemo(() => {
    if (!USE_CHANNEL_LAYOUT) return null;
    
    // Helper to adapt walk-in orders as table-like entries
    const adaptWalkIn = (order) => ({
      id: `wc-${order.orderId}`,
      label: order.customer || 'Walk-In',
      status: order.tableStatus,
      tableId: 0,
      amount: order.amount,
      time: order.time,
      orderNumber: order.orderNumber,
      isWalkIn: true,
      walkInOrderId: order.orderId,
      orderId: order.orderId,
      orderType: 'walkIn',
      fOrderStatus: order.fOrderStatus,
      waiter: order.waiter || '',
      order: order, // Keep full order for OrderCard
    });

    // Helper to adapt takeaway/delivery orders
    const adaptOrder = (order, type) => ({
      id: `${type}-${order.orderId}`,
      label: order.customer || type.toUpperCase().slice(0, 3),
      status: order.tableStatus,
      tableId: 0,
      amount: order.amount,
      time: order.time,
      orderNumber: order.orderNumber,
      orderId: order.orderId,
      orderType: type,
      fOrderStatus: order.fOrderStatus,
      waiter: order.waiter || '',
      order: order, // Keep full order for OrderCard
    });

    // Helper to enrich dine-in tables with order data
    const enrichTable = (table) => {
      const order = getOrderByTableId(table.tableId);
      if (order) {
        return {
          ...table,
          order: order,
        };
      }
      return table;
    };

    return {
      dineIn: {
        id: 'dineIn',
        name: 'Dine-In',
        items: [
          ...allTablesList.filter(t => !t.isRoom && !t.isWalkIn).map(enrichTable),
          ...walkInOrders.map(adaptWalkIn),
        ],
        enabled: features.dineIn !== false,
      },
      takeAway: {
        id: 'takeAway',
        name: 'TakeAway',
        items: takeAwayOrders.map(o => adaptOrder(o, 'takeAway')),
        enabled: features.takeaway !== false,
      },
      delivery: {
        id: 'delivery',
        name: 'Delivery',
        items: deliveryOrders.map(o => adaptOrder(o, 'delivery')),
        enabled: features.delivery !== false,
      },
      room: {
        id: 'room',
        name: 'Room',
        items: allRoomsList,
        enabled: features.room !== false,
      },
    };
  }, [allTablesList, allRoomsList, takeAwayOrders, deliveryOrders, walkInOrders, features, getOrderByTableId]);

  // View conditions
  const isDineInOnly = activeChannels.length === 1 && activeChannels[0] === "dineIn";
  const isRoomOnly = activeChannels.length === 1 && activeChannels[0] === "room";
  const showGridView = activeView === "table";
  const showListView = !isRoomOnly && activeView === "order";

  // Unified grid items: combine tables + takeaway + delivery based on active channels
  const gridItems = useMemo(() => {
    let items = [];

    if (activeChannels.includes('dineIn')) {
      items.push(...allTablesList);
    }

    if (activeChannels.includes('takeAway')) {
      takeAwayOrders.forEach(order => {
        items.push({
          id: `ta-${order.orderId}`,
          label: order.customer || 'TA',
          status: order.tableStatus,
          tableId: 0,
          amount: order.amount,
          time: order.time,
          orderNumber: order.orderNumber,
          orderType: 'takeAway',
          orderId: order.orderId,
          fOrderStatus: order.fOrderStatus,
          waiter: order.waiter || '',
        });
      });
    }

    if (activeChannels.includes('delivery')) {
      deliveryOrders.forEach(order => {
        items.push({
          id: `del-${order.orderId}`,
          label: order.customer || 'Del',
          status: order.tableStatus,
          tableId: 0,
          amount: order.amount,
          time: order.time,
          orderNumber: order.orderNumber,
          orderType: 'delivery',
          orderId: order.orderId,
          fOrderStatus: order.fOrderStatus,
          waiter: order.waiter || '',
        });
      });
    }

    if (activeChannels.includes('room')) {
      items.push(...allRoomsList);
    }

    return items;
  }, [activeChannels, allTablesList, allRoomsList, takeAwayOrders, deliveryOrders]);

  // Grid title based on active channels
  const gridTitle = useMemo(() => {
    if (activeChannels.length >= 4) return 'All Orders';
    if (activeChannels.length === 1) {
      if (activeChannels[0] === 'dineIn') return 'Tables';
      if (activeChannels[0] === 'takeAway') return 'TakeAway Orders';
      if (activeChannels[0] === 'delivery') return 'Delivery Orders';
      if (activeChannels[0] === 'room') return 'Rooms';
    }
    return 'Orders';
  }, [activeChannels]);

  // Filter grid items — exclusive filter for Schedule/Confirm in table view
  const filteredGridItems = useMemo(() => {
    if (tableFilter === 'confirm') return gridItems.filter(item => item.status === 'yetToConfirm');
    if (tableFilter === 'schedule') return gridItems.filter(item => item.status === 'scheduled');
    return gridItems; // no filter active — show all
  }, [gridItems, tableFilter]);

  // --- Search ---
  const searchResults = useMemo(() => {
    const results = {
      tables: { exact: [], partial: [] },
      delivery: { exact: [], partial: [] },
      takeAway: { exact: [], partial: [] },
      rooms: { exact: [], partial: [] }
    };

    if (!searchQuery.trim()) return results;
    const query = searchQuery.toLowerCase().trim();

    if (activeChannels.includes("dineIn")) {
      const enriched = allTablesList.map(table => {
        const orderData = orderItemsByTableId[table.tableId] || {};
        return {
          ...table,
          customer: orderData.customer || table.label || "",
          phone: orderData.phone || ""
        };
      });
      results.tables = searchItems(enriched, query, item => ({
        id: item.id,
        all: [item.label || item.id, item.customer, item.phone]
      }));
    }

    if (activeChannels.includes("delivery")) {
      results.delivery = searchItems(deliveryOrders, query, item => ({
        id: String(item.orderId),
        all: [item.orderNumber, item.customer, item.phone]
      }));
    }

    if (activeChannels.includes("takeAway")) {
      results.takeAway = searchItems(takeAwayOrders, query, item => ({
        id: String(item.orderId),
        all: [item.orderNumber, item.customer, item.phone]
      }));
    }

    if (activeChannels.includes("room")) {
      results.rooms = searchItems(allRoomsList, query, item => ({
        id: item.id,
        all: [item.id, item.guestName || ""]
      }));
    }

    return results;
  }, [searchQuery, activeChannels, allTablesList, allRoomsList, deliveryOrders, takeAwayOrders, orderItemsByTableId]);

  const matchingTableIds = useMemo(() => getMatchingIds(searchQuery, searchResults.tables), [searchQuery, searchResults]);
  const matchingRoomIds = useMemo(() => getMatchingIds(searchQuery, searchResults.rooms), [searchQuery, searchResults]);
  const matchingDeliveryIds = useMemo(() => getMatchingIds(searchQuery, searchResults.delivery), [searchQuery, searchResults]);
  const matchingTakeAwayIds = useMemo(() => getMatchingIds(searchQuery, searchResults.takeAway), [searchQuery, searchResults]);

  // Combined matching IDs for unified grid filtering
  const matchingGridIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const ids = new Set();
    [matchingTableIds, matchingRoomIds, matchingDeliveryIds, matchingTakeAwayIds].forEach(set => {
      if (set) set.forEach(id => ids.add(id));
    });
    return ids;
  }, [searchQuery, matchingTableIds, matchingRoomIds, matchingDeliveryIds, matchingTakeAwayIds]);

  // --- Handlers ---
  const toggleSnooze = (orderId) => {
    setSnoozedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Resolve order data for any grid entry (table, walk-in, takeaway, delivery)
  const getOrderDataForEntry = useCallback((tableEntry) => {
    if (!tableEntry) return null;

    // Takeaway or delivery virtual entry
    if (tableEntry.orderId) {
      const allOrders = [...takeAwayOrders, ...deliveryOrders, ...walkInOrders];
      const order = allOrders.find(o => o.orderId === tableEntry.orderId);
      if (order) return order;
    }

    // Walk-in virtual entry
    if (tableEntry.isWalkIn && tableEntry.walkInOrderId) {
      const order = walkInOrders.find(o => o.orderId === tableEntry.walkInOrderId);
      if (order) return order;
    }

    // Physical table
    if (tableEntry.tableId) {
      return orderItemsByTableId[tableEntry.tableId] || null;
    }

    return null;
  }, [takeAwayOrders, deliveryOrders, walkInOrders, orderItemsByTableId]);

  // --- Confirm scan order (green tick) ---
  const handleConfirmOrder = useCallback(async (tableEntry) => {
    const order = getOrderDataForEntry(tableEntry);
    if (!order || !order.items) return;

    const itemsToConfirm = order.items.filter(i => i.status !== 'cancelled');
    if (itemsToConfirm.length === 0) return;

    try {
      for (const item of itemsToConfirm) {
        const payload = {
          order_id: order.orderId,
          order_food_id: item.foodId,
          item_id: item.id,
          order_status: 'preparing',
          cancel_type: null,
        };
        await api.put(API_ENDPOINTS.FOOD_STATUS_UPDATE, payload);
      }
    } catch (err) {
      console.error('[DashboardPage] Failed to confirm order:', err);
    }
  }, [getOrderDataForEntry]);

  // --- Cancel scan order (red cross) → open modal ---
  const handleCancelOrder = useCallback((tableEntry) => {
    setCancelOrderEntry(tableEntry);
  }, []);

  // --- Cancel order confirmed from modal ---
  const handleCancelOrderConfirm = useCallback(async (reason) => {
    if (!cancelOrderEntry) return;

    const order = getOrderDataForEntry(cancelOrderEntry);
    if (!order) return;

    // Await API call, then socket handler does removeOrder + updateTableStatus
    try {
      const payload = orderToAPI.cancelOrder(order.orderId, user?.roleName || 'Manager', reason);
      await api.put(API_ENDPOINTS.ORDER_STATUS_UPDATE, payload);
      
      // Wait for socket to confirm removal
      await waitForOrderRemoval(order.orderId, 5000);
    } catch (err) {
      console.error('[CancelOrder] Failed:', err);
    }

    setCancelOrderEntry(null);
  }, [cancelOrderEntry, getOrderDataForEntry, user, waitForOrderRemoval]);

  const handleSearchSelect = (selection) => {
    const { type, data } = selection;
    if (type === 'table') {
      if (["occupied", "billReady"].includes(data.status)) {
        const tableData = allTablesList.find(t => t.id === data.id);
        if (tableData) handleTableClick(tableData);
      }
    }
  };

  const handleTableClick = (tableEntry) => {
    // Allow null to clear table selection (used after prepaid payment)
    if (!tableEntry) {
      setOrderEntryTable(null);
      return;
    }
    // Block clicks on engaged tables (update-order in progress)
    if (isTableEngaged(tableEntry.id)) {
      console.log(`[Dashboard] Blocked click on engaged table ${tableEntry.id}`);
      return;
    }
    console.log(`[Dashboard] Table click allowed: ${tableEntry.id}, engaged check: ${isTableEngaged(tableEntry.id)}, type: ${typeof tableEntry.id}`);
    // Step 8: Available room → show CheckIn modal instead of OrderEntry
    if (tableEntry.orderType === 'room' && tableEntry.status === 'available') {
      setCheckInRoom(tableEntry);
      return;
    }
    setOrderEntryTable(tableEntry);
    if (tableEntry.orderType === 'takeAway') {
      setOrderEntryType('takeAway');
    } else if (tableEntry.orderType === 'delivery') {
      setOrderEntryType('delivery');
    } else if (tableEntry.orderType === 'dineIn') {
      setOrderEntryType('dineIn');    // physical table — NOT walkIn
    } else if (tableEntry.orderType === 'room') {
      setOrderEntryType('dineIn');    // occupied rooms use dineIn flow
    } else {
      setOrderEntryType('walkIn');    // actual walk-in orders (wc-* entries)
    }
  };

  const handleAddOrder = () => {
    setOrderEntryTable(null);
    setOrderEntryType("delivery");
  };

  const handleOrderTypeChange = (newType) => {
    if (newType === "walkIn" && !orderEntryTable) {
      const firstAvailable = allTablesList.find(t => t.status === "available");
      if (firstAvailable) setOrderEntryTable(firstAvailable);
    } else if (newType !== "walkIn") {
      setOrderEntryTable(null);
    }
    setOrderEntryType(newType);
  };

  const handleCloseOrderEntry = () => {
    setOrderEntryTable(null);
    setOrderEntryType(null);
    setInitialShowPayment(false);
    setInitialTransferItem(null);
  };

  const handleBillClick = (tableEntry) => {
    handleTableClick(tableEntry);
    setInitialShowPayment(true);
  };

  // Handler for food transfer from Order Card - opens Order Entry with transfer modal
  const handleFoodTransfer = (order, item, tableEntry) => {
    // Open Order Entry for this table/order
    handleTableClick(tableEntry);
    // Set the item to trigger transfer modal in OrderEntry
    setInitialTransferItem(item);
  };

  // Handler for marking order as ready
  const handleMarkReady = useCallback(async (tableEntry) => {
    if (!tableEntry?.orderId) return;
    
    const tableId = Number(tableEntry.tableId);
    
    try {
      // Lock table before API call
      if (tableId) setTableEngaged(tableId, true);
      
      await updateOrderStatus(tableEntry.orderId, user?.roleName || 'Manager', 'ready');
      // Socket handler will release lock via update-order-status event
    } catch (error) {
      // Release lock on error
      if (tableId) setTableEngaged(tableId, false);
      console.error('[handleMarkReady] Error:', error);
    }
  }, [user?.roleName, setTableEngaged]);

  // Handler for marking order as served
  const handleMarkServed = useCallback(async (tableEntry) => {
    if (!tableEntry?.orderId) return;
    
    const tableId = Number(tableEntry.tableId);
    
    try {
      // Lock table before API call
      if (tableId) setTableEngaged(tableId, true);
      
      await updateOrderStatus(tableEntry.orderId, user?.roleName || 'Manager', 'serve');
      // Socket handler will release lock via update-order-status event
    } catch (error) {
      // Release lock on error
      if (tableId) setTableEngaged(tableId, false);
      console.error('[handleMarkServed] Error:', error);
    }
  }, [user?.roleName, setTableEngaged]);

  // Handler for item-level status change (Ready/Serve per item) from OrderCard
  const handleItemStatusChange = useCallback(async (order, item, newStatus) => {
    if (!order?.orderId || !item?.id) return;

    try {
      const payload = {
        order_id: order.orderId,
        order_food_id: item.foodId || item.id,
        item_id: item.id,
        order_status: newStatus,
        cancel_type: null,
      };
      await api.put(API_ENDPOINTS.FOOD_STATUS_UPDATE, payload);
    } catch (err) {
      console.error('[handleItemStatusChange] Failed:', err);
    }
  }, []);

  // Handler for cancel order from OrderCard (opens CancelOrderModal)
  const handleCancelOrderFromCard = useCallback((order) => {
    if (!order) return;
    // Build a tableEntry-like object from the order for CancelOrderModal
    const tableEntry = {
      id: order.tableId ? String(order.tableId) : `order-${order.orderId}`,
      tableId: order.tableId || 0,
      orderId: order.orderId,
      orderType: order.orderType === 'dineIn' ? 'dineIn' : order.orderType,
    };
    setCancelOrderEntry(tableEntry);
  }, []);

  const handleUpdateTableStatus = useCallback((tableStringId, newStatus) => {
    // Update through TableContext — useMemo derivation picks up the change
    updateTableStatus(Number(tableStringId), newStatus);
  }, [updateTableStatus]);

  return (
    <div
      data-testid="pos-home"
      className="flex min-h-screen"
      style={{ backgroundColor: COLORS.sectionBg }}
    >
      <Sidebar
        isExpanded={sidebarExpanded}
        setIsExpanded={setSidebarExpanded}
        isSilentMode={isSilentMode}
        setIsSilentMode={setIsSilentMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenMenu={() => setIsMenuOpen(true)}
        onRefresh={handleRefreshAll}
        isRefreshing={isRefreshing}
        isOrderEntryOpen={orderEntryType !== null}
      />

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        sidebarWidth={sidebarExpanded ? 280 : 70}
      />

      <MenuManagementPanel
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        sidebarWidth={sidebarExpanded ? 280 : 70}
      />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden relative">
        {/* Refresh overlay — dims content while refreshing */}
        {isRefreshing && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
            style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}>
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin" style={{ color: COLORS.primaryOrange }} />
              <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>Refreshing data...</span>
            </div>
          </div>
        )}
        <Header
          isOnline={isOnline}
          activeChannels={activeChannels}
          setActiveChannels={setActiveChannels}
          activeStatuses={activeStatuses}
          setActiveStatuses={setActiveStatuses}
          tableFilter={tableFilter}
          setTableFilter={setTableFilter}
          activeView={activeView}
          setActiveView={setActiveView}
          activeFirst={activeFirst}
          setActiveFirst={setActiveFirst}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          onSearchSelect={handleSearchSelect}
          onAddOrder={handleAddOrder}
        />

        <main className="flex-1 p-2 overflow-auto">
            {/* === NEW: Channel-Based Layout (Feature Flag) === */}
            {USE_CHANNEL_LAYOUT && channelData && (
              <ChannelColumnsLayout
                channels={Object.values(channelData).filter(c => c.enabled)}
                viewType={activeView === 'table' ? 'table' : 'order'}
                activeFirst={activeFirst}
                onItemClick={handleTableClick}
                onMarkReady={handleMarkReady}
                onMarkServed={handleMarkServed}
                onBillClick={handleBillClick}
                onCancelOrder={handleCancelOrderFromCard}
                onItemStatusChange={handleItemStatusChange}
                onToggleSnooze={toggleSnooze}
                onConfirmOrder={handleConfirmOrder}
                onUpdateStatus={handleUpdateTableStatus}
                hasPermission={hasPermission}
                snoozedOrders={snoozedOrders}
                currencySymbol={currencySymbol}
                isTableEngaged={isTableEngaged}
                searchQuery={searchQuery}
                matchingIds={matchingTableIds}
              />
            )}

            {/* === OLD: Area-Based Layout (when feature flag is off) === */}
            {!USE_CHANNEL_LAYOUT && (
              <>
            {/* Grid View - Unified for all channels */}
            {showGridView && (
              isDineInOnly && hasAreas && !activeFirst ? (
                <div className="flex gap-8 overflow-x-auto">
                  {Object.entries(tables).map(([key, section], index) => (
                    <div key={key} className="contents">
                      {index > 0 && (
                        <div className="w-px self-stretch" style={{ backgroundColor: COLORS.borderGray }} />
                      )}
                      <TableSection
                        section={section}
                        onTableClick={handleTableClick}
                        onOpenModal={handleTableClick}
                        onUpdateStatus={handleUpdateTableStatus}
                        onBillClick={handleBillClick}
                        onConfirmOrder={handleConfirmOrder}
                        onCancelOrder={handleCancelOrder}
                        activeFirst={activeFirst}
                        searchQuery={searchQuery}
                        matchingTableIds={matchingTableIds}
                        snoozedOrders={snoozedOrders}
                        onToggleSnooze={toggleSnooze}
                        currencySymbol={currencySymbol}
                        activeStatuses={activeStatuses}
                        tableFilter={tableFilter}
                      />
                    </div>
                  ))}
                </div>
              ) : filteredGridItems.length > 0 ? (
                <div>
                  <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: COLORS.grayText }}>
                    <span className="font-medium" style={{ color: COLORS.darkText }}>{gridTitle}</span>
                    <span style={{ color: COLORS.borderGray }}>|</span>
                    <span>{filteredGridItems.filter(t => matchingGridIds === null || matchingGridIds.has(t.id)).length} Items</span>
                  </div>
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, 160px)' }}>
                    {sortByActiveFirst(
                      filteredGridItems.filter(t => matchingGridIds === null || matchingGridIds.has(t.id)),
                      TABLE_STATUS_PRIORITY,
                      activeFirst
                    ).map((item) => (
                      <TableCard
                        key={item.id}
                        table={item}
                        onClick={handleTableClick}
                        onOpenModal={handleTableClick}
                        onUpdateStatus={handleUpdateTableStatus}
                        onBillClick={handleBillClick}
                        onConfirmOrder={handleConfirmOrder}
                        onCancelOrder={handleCancelOrder}
                        onMarkReady={handleMarkReady}
                        onMarkServed={handleMarkServed}
                        isSnoozed={snoozedOrders?.has(item.id)}
                        onToggleSnooze={toggleSnooze}
                        currencySymbol={currencySymbol}
                        isEngaged={isTableEngaged(item.tableId)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyTableState />
              )
            )}

            {/* List View - All orders in a single unified grid */}
            {showListView && (
              <div>
                <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: COLORS.grayText }}>
                  <span className="font-medium" style={{ color: COLORS.darkText }}>All Orders</span>
                  <span style={{ color: COLORS.borderGray }}>|</span>
                  <span>
                    {(() => {
                      let count = 0;
                      if (activeChannels.includes("dineIn")) {
                        count += allTablesList.filter(t => !["available", "reserved"].includes(t.status)).length;
                      }
                      if (activeChannels.includes("delivery")) count += deliveryOrders.length;
                      if (activeChannels.includes("takeAway")) count += takeAwayOrders.length;
                      return `${count} Orders`;
                    })()}
                  </span>
                </div>
                <div style={{ columnCount: 4, columnGap: '8px' }}>
                  {/* Dine In Orders */}
                  {activeChannels.includes("dineIn") && allTablesList
                    .filter(t => !["available", "reserved"].includes(t.status))
                    .filter(t => matchingTableIds === null || matchingTableIds.has(t.id))
                    .map((table) => {
                      const order = table.isWalkIn
                        ? walkInOrders.find(o => o.orderId === table.walkInOrderId)
                        : getOrderByTableId(table.tableId);
                      if (!order) return null;
                      return (
                        <OrderCard
                          key={table.id}
                          order={order}
                          orderType="dineIn"
                          tableLabel={table.label}
                          isSnoozed={snoozedOrders.has(table.id)}
                          isEngaged={isTableEngaged(table.tableId)}
                          canCancelOrder={hasPermission('order_cancel')}
                          canMergeOrder={hasPermission('merge_table')}
                          canShiftTable={hasPermission('transfer_table')}
                          canFoodTransfer={hasPermission('food_transfer')}
                          canPrintBill={hasPermission('print_icon')}
                          canBill={hasPermission('bill')}
                          onToggleSnooze={toggleSnooze}
                          onEdit={() => handleTableClick(table)}
                          onMarkReady={() => handleMarkReady({ ...table, orderId: order.orderId, tableId: table.tableId || 0 })}
                          onMarkServed={() => handleMarkServed({ ...table, orderId: order.orderId, tableId: table.tableId || 0 })}
                          onBillClick={() => handleBillClick(table)}
                          onCancelOrder={handleCancelOrderFromCard}
                          onItemStatusChange={handleItemStatusChange}
                          onMergeOrder={(o) => console.log('[OrderCard] Merge order:', o.orderId)}
                          onTableShift={(o) => console.log('[OrderCard] Shift table:', o.orderId)}
                          onFoodTransfer={(o, item) => handleFoodTransfer(o, item, table)}
                        />
                      );
                    })
                  }
                  
                  {/* Delivery Orders */}
                  {activeChannels.includes("delivery") && deliveryOrders
                    .filter(order => matchingDeliveryIds === null || matchingDeliveryIds.has(String(order.orderId)))
                    .map((order) => (
                      <OrderCard
                        key={`del-${order.orderId}`}
                        order={order}
                        orderType="delivery"
                        isSnoozed={snoozedOrders.has(String(order.orderId))}
                        isEngaged={false}
                        canCancelOrder={hasPermission('order_cancel')}
                        canMergeOrder={false}
                        canShiftTable={false}
                        canFoodTransfer={false}
                        canPrintBill={hasPermission('print_icon')}
                        canBill={hasPermission('bill')}
                        onToggleSnooze={toggleSnooze}
                        onEdit={() => handleTableClick({ id: `del-${order.orderId}`, orderId: order.orderId, orderType: 'delivery' })}
                        onMarkReady={() => handleMarkReady({ orderId: order.orderId, tableId: 0 })}
                        onMarkServed={() => handleMarkServed({ orderId: order.orderId, tableId: 0 })}
                        onBillClick={() => handleBillClick({ id: `del-${order.orderId}`, orderId: order.orderId, orderType: 'delivery' })}
                        onCancelOrder={handleCancelOrderFromCard}
                        onItemStatusChange={handleItemStatusChange}
                      />
                    ))
                  }
                  
                  {/* TakeAway Orders */}
                  {activeChannels.includes("takeAway") && takeAwayOrders
                    .filter(order => matchingTakeAwayIds === null || matchingTakeAwayIds.has(String(order.orderId)))
                    .map((order) => (
                      <OrderCard
                        key={`ta-${order.orderId}`}
                        order={order}
                        orderType="takeAway"
                        isSnoozed={snoozedOrders.has(String(order.orderId))}
                        isEngaged={false}
                        canCancelOrder={hasPermission('order_cancel')}
                        canMergeOrder={false}
                        canShiftTable={false}
                        canFoodTransfer={false}
                        canPrintBill={hasPermission('print_icon')}
                        canBill={hasPermission('bill')}
                        onToggleSnooze={toggleSnooze}
                        onEdit={() => handleTableClick({ id: `ta-${order.orderId}`, orderId: order.orderId, orderType: 'takeAway' })}
                        onMarkReady={() => handleMarkReady({ orderId: order.orderId, tableId: 0 })}
                        onMarkServed={() => handleMarkServed({ orderId: order.orderId, tableId: 0 })}
                        onBillClick={() => handleBillClick({ id: `ta-${order.orderId}`, orderId: order.orderId, orderType: 'takeAway' })}
                        onCancelOrder={handleCancelOrderFromCard}
                        onItemStatusChange={handleItemStatusChange}
                      />
                    ))
                  }
                </div>
              </div>
            )}

            {/* Room View - Rooms now render in the unified grid above */}
              </>
            )}
        </main>

        {orderEntryType && (
          <OrderEntry
            table={orderEntryTable}
            onClose={handleCloseOrderEntry}
            orderData={orderEntryTable ? getOrderDataForEntry(orderEntryTable) : null}
            orderType={orderEntryType}
            onOrderTypeChange={handleOrderTypeChange}
            allTables={allTablesList}
            onSelectTable={handleTableClick}
            savedCart={cartsByTable[orderEntryTable?.id || orderEntryType] || []}
            onCartChange={(key, items) => setCartsByTable(prev => ({ ...prev, [key]: items }))}
            initialShowPayment={initialShowPayment}
            initialTransferItem={initialTransferItem}
          />
        )}

        {/* Room Check-In Panel (Phase 2A — Step 8) */}
        {checkInRoom && (
          <RoomCheckInModal
            room={checkInRoom}
            availableRooms={allRoomsList.filter(r => r.status === 'available')}
            onClose={() => setCheckInRoom(null)}
            onSuccess={() => setCheckInRoom(null)}
            sidebarWidth={sidebarExpanded ? 280 : 70}
          />
        )}

        {/* Cancel Order Modal — for yetToConfirm scan orders */}
        {cancelOrderEntry && (
          <CancelOrderModal
            table={cancelOrderEntry}
            itemCount={(() => {
              const order = getOrderDataForEntry(cancelOrderEntry);
              return order?.items?.filter(i => i.status !== 'cancelled').length || 0;
            })()}
            reasons={getOrderCancellationReasons()}
            onClose={() => setCancelOrderEntry(null)}
            onCancel={handleCancelOrderConfirm}
          />
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
