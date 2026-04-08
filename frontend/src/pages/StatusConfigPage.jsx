import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, RotateCcw, Save, Eye, EyeOff } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import { COLORS } from "../constants";
import { useToast } from "../hooks/use-toast";

// LocalStorage key for enabled statuses
const STORAGE_KEY = 'mygenie_enabled_statuses';

// All 9 status definitions (same as Header.jsx)
const ALL_STATUSES = [
  { id: "pending", fOrderStatus: 7, label: "YTC", description: "Yet to Confirm orders" },
  { id: "preparing", fOrderStatus: 1, label: "Preparing", description: "Orders being prepared" },
  { id: "ready", fOrderStatus: 2, label: "Ready", description: "Orders ready for pickup/serve" },
  { id: "running", fOrderStatus: 8, label: "Running", description: "Active running orders" },
  { id: "served", fOrderStatus: 5, label: "Served", description: "Orders already served" },
  { id: "pendingPayment", fOrderStatus: 9, label: "Pending Pay", description: "Awaiting payment" },
  { id: "paid", fOrderStatus: 6, label: "Paid", description: "Paid/completed orders" },
  { id: "cancelled", fOrderStatus: 3, label: "Cancelled", description: "Cancelled orders" },
  { id: "reserved", fOrderStatus: 10, label: "Reserved", description: "Reserved tables/orders" },
];

// Default: all statuses enabled
const DEFAULT_ENABLED = ALL_STATUSES.map(s => s.id);

/**
 * StatusConfigPage - Configure which statuses are visible on the dashboard
 * Follows same pattern as Audit Report page
 */
const StatusConfigPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSilentMode, setIsSilentMode] = useState(false);
  
  // Enabled statuses state
  const [enabledStatuses, setEnabledStatuses] = useState(DEFAULT_ENABLED);
  const [hasChanges, setHasChanges] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEnabledStatuses(parsed);
        }
      } catch (e) {
        console.error('Failed to parse stored statuses:', e);
      }
    }
  }, []);

  // Toggle a status
  const toggleStatus = (statusId) => {
    setEnabledStatuses(prev => {
      const isEnabled = prev.includes(statusId);
      // Prevent disabling all statuses (at least 1 must be enabled)
      if (isEnabled && prev.length === 1) {
        toast({
          title: "Cannot disable",
          description: "At least one status must be enabled.",
          variant: "destructive",
        });
        return prev;
      }
      const next = isEnabled 
        ? prev.filter(id => id !== statusId)
        : [...prev, statusId];
      setHasChanges(true);
      return next;
    });
  };

  // Enable all
  const enableAll = () => {
    setEnabledStatuses(DEFAULT_ENABLED);
    setHasChanges(true);
  };

  // Disable all except one (first one)
  const disableAll = () => {
    setEnabledStatuses([DEFAULT_ENABLED[0]]);
    setHasChanges(true);
  };

  // Reset to default
  const resetToDefault = () => {
    setEnabledStatuses(DEFAULT_ENABLED);
    setHasChanges(true);
  };

  // Save to localStorage
  const saveConfiguration = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledStatuses));
    setHasChanges(false);
    toast({
      title: "Configuration saved",
      description: `${enabledStatuses.length} status(es) enabled. Refresh dashboard to see changes.`,
    });
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: COLORS.background }}>
      {/* Sidebar */}
      <Sidebar
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
        isSilentMode={isSilentMode}
        setIsSilentMode={setIsSilentMode}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className="px-6 py-4 flex items-center justify-between"
          style={{ 
            backgroundColor: COLORS.lightBg, 
            borderBottom: `1px solid ${COLORS.borderGray}` 
          }}
        >
          <div className="flex items-center gap-4">
            <button
              data-testid="back-btn"
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" style={{ color: COLORS.darkText }} />
            </button>
            <h1 className="text-xl font-semibold" style={{ color: COLORS.darkText }}>
              Status Configuration
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Reset Button */}
            <button
              data-testid="reset-btn"
              onClick={resetToDefault}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors hover:bg-gray-50"
              style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">Reset to Default</span>
            </button>

            {/* Save Button */}
            <button
              data-testid="save-btn"
              onClick={saveConfiguration}
              disabled={!hasChanges}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              style={{ 
                backgroundColor: hasChanges ? COLORS.primaryOrange : COLORS.borderGray, 
                color: 'white' 
              }}
            >
              <Save className="w-4 h-4" />
              <span className="text-sm">Save Configuration</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Info Card */}
            <div 
              className="p-4 rounded-lg mb-6"
              style={{ backgroundColor: `${COLORS.primaryOrange}10`, border: `1px solid ${COLORS.primaryOrange}30` }}
            >
              <p className="text-sm" style={{ color: COLORS.darkText }}>
                <strong>Note:</strong> Select which order statuses should be visible on the dashboard. 
                In Channel View, these will appear as filter pills. In Status View, these will appear as columns.
                <br />
                <span style={{ color: COLORS.grayText }}>
                  This configuration is stored locally and will persist until you change it.
                  In future, this will be controlled by user role permissions.
                </span>
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 mb-6">
              <button
                data-testid="enable-all-btn"
                onClick={enableAll}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:opacity-80"
                style={{ backgroundColor: COLORS.primaryGreen, color: 'white' }}
              >
                <Eye className="w-4 h-4" />
                Enable All
              </button>
              <button
                data-testid="disable-all-btn"
                onClick={disableAll}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:opacity-80"
                style={{ backgroundColor: COLORS.grayText, color: 'white' }}
              >
                <EyeOff className="w-4 h-4" />
                Disable All
              </button>
              <span className="text-sm ml-auto" style={{ color: COLORS.grayText }}>
                {enabledStatuses.length} of {ALL_STATUSES.length} enabled
              </span>
            </div>

            {/* Status Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ALL_STATUSES.map((status) => {
                const isEnabled = enabledStatuses.includes(status.id);
                return (
                  <div
                    key={status.id}
                    data-testid={`status-card-${status.id}`}
                    onClick={() => toggleStatus(status.id)}
                    className="p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md"
                    style={{
                      backgroundColor: isEnabled ? `${COLORS.primaryOrange}05` : COLORS.lightBg,
                      borderColor: isEnabled ? COLORS.primaryOrange : COLORS.borderGray,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span 
                            className="font-semibold"
                            style={{ color: isEnabled ? COLORS.primaryOrange : COLORS.darkText }}
                          >
                            {status.label}
                          </span>
                          <span 
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ 
                              backgroundColor: COLORS.borderGray,
                              color: COLORS.grayText,
                            }}
                          >
                            Status {status.fOrderStatus}
                          </span>
                        </div>
                        <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                          {status.description}
                        </p>
                      </div>
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ 
                          backgroundColor: isEnabled ? COLORS.primaryOrange : COLORS.borderGray,
                        }}
                      >
                        {isEnabled && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Changes Indicator */}
            {hasChanges && (
              <div 
                className="fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3"
                style={{ backgroundColor: COLORS.darkText }}
              >
                <span className="text-sm text-white">You have unsaved changes</span>
                <button
                  onClick={saveConfiguration}
                  className="px-3 py-1.5 rounded-md text-sm font-medium"
                  style={{ backgroundColor: COLORS.primaryOrange, color: 'white' }}
                >
                  Save Now
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StatusConfigPage;
