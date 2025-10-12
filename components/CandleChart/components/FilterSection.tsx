import { useState } from "react";
import { ActiveFilters } from "../types";

interface FilterSectionProps {
  activeFilters: ActiveFilters;
  toggleFilter: (filterName: keyof ActiveFilters) => void;
  selectAllFilters: () => void;
  deselectAllFilters: () => void;
  isTablet: boolean;
  isMobile: boolean;
}

export function FilterSection({
  activeFilters,
  toggleFilter,
  selectAllFilters,
  deselectAllFilters,
  isTablet,
  isMobile,
}: FilterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // ✅ Responsive styles
  const getContainerPadding = () => {
    if (isMobile) return "12px";
    if (isTablet) return "14px";
    return "16px";
  };

  const getButtonPadding = () => {
    if (isMobile) return "4px 8px";
    if (isTablet) return "5px 10px";
    return "6px 12px";
  };

  const getFontSize = () => {
    if (isMobile) return 11;
    if (isTablet) return 12;
    return 13;
  };

  const getGap = () => {
    if (isMobile) return 6;
    if (isTablet) return 8;
    return 10;
  };

  // ✅ Phân loại filters
  const filterCategories = {
    "Market Structure": ["SMC", "SHOCK", "LIQ", "WYCK"],
    "Candlestick Patterns": [
      "Bullish Engulfing",
      "Bearish Engulfing",
      "Doji",
      "Double Top",
      "Double Bottom",
      "Head & Shoulders",
      "Triangle",
    ],
    Predictions: [
      "Bull Prediction",
      "Bear Prediction",
      "Range Prediction",
      "Breakout Prediction",
      "Reversal Prediction",
    ],
  };

  // ✅ Số filters hiển thị mặc định (khi thu gọn)
  const getVisibleFilterCount = () => {
    if (isMobile) return 4;
    if (isTablet) return 6;
    return 8;
  };

  const visibleFilterCount = getVisibleFilterCount();
  const allFilters = Object.keys(activeFilters) as Array<keyof ActiveFilters>;
  const visibleFilters = isExpanded
    ? allFilters
    : allFilters.slice(0, visibleFilterCount);
  const hiddenFilterCount = allFilters.length - visibleFilters.length;

  // ✅ Màu sắc cho từng loại filter - FIXED: Type-safe
  const getFilterColor = (filterName: string, isActive: boolean) => {
    const baseColors: { [key: string]: { active: string; inactive: string } } =
      {
        SMC: { active: "#9c27b0", inactive: "#e1bee7" },
        SHOCK: { active: "#ff9800", inactive: "#ffe0b2" },
        LIQ: { active: "#2196f3", inactive: "#bbdefb" },
        WYCK: { active: "#4caf50", inactive: "#c8e6c9" },
        "Bullish Engulfing": { active: "#4caf50", inactive: "#c8e6c9" },
        "Bearish Engulfing": { active: "#f44336", inactive: "#ffcdd2" },
        Doji: { active: "#ff9800", inactive: "#ffe0b2" },
        "Double Top": { active: "#f44336", inactive: "#ffcdd2" },
        "Double Bottom": { active: "#4caf50", inactive: "#c8e6c9" },
        "Head & Shoulders": { active: "#f44336", inactive: "#ffcdd2" },
        Triangle: { active: "#2196f3", inactive: "#bbdefb" },
        "Bull Prediction": { active: "#4caf50", inactive: "#c8e6c9" },
        "Bear Prediction": { active: "#f44336", inactive: "#ffcdd2" },
        "Range Prediction": { active: "#ff9800", inactive: "#ffe0b2" },
        "Breakout Prediction": { active: "#9c27b0", inactive: "#e1bee7" },
        "Reversal Prediction": { active: "#2196f3", inactive: "#bbdefb" },
      };

    return baseColors[filterName] || { active: "#666", inactive: "#f5f5f5" };
  };

  // ✅ Helper function để check active state - FIXED
  const isFilterActive = (filterName: keyof ActiveFilters): boolean => {
    return activeFilters[filterName] === true;
  };

  // ✅ Count active filters - FIXED
  const activeFiltersCount = Object.values(activeFilters).filter(
    (val) => val === true
  ).length;

  return (
    <div
      style={{
        marginBottom: 16,
        padding: getContainerPadding(),
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        backgroundColor: "#fafafa",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          flexWrap: isMobile ? "wrap" : "nowrap",
          gap: isMobile ? 8 : 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <h4
            style={{
              margin: 0,
              color: "#333",
              fontSize: isMobile ? 14 : 16,
            }}
          >
            📊 Filter Markers
          </h4>
          <span
            style={{
              fontSize: getFontSize() - 1,
              color: "#666",
              backgroundColor: "white",
              padding: "2px 6px",
              borderRadius: 12,
              border: "1px solid #e0e0e0",
            }}
          >
            {activeFiltersCount}/{allFilters.length} active
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: getGap(),
            flexWrap: "wrap",
            justifyContent: isMobile ? "flex-start" : "flex-end",
          }}
        >
          <button
            onClick={selectAllFilters}
            style={{
              padding: getButtonPadding(),
              fontSize: getFontSize(),
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Select All
          </button>
          <button
            onClick={deselectAllFilters}
            style={{
              padding: getButtonPadding(),
              fontSize: getFontSize(),
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Deselect All
          </button>
          {!isExpanded && hiddenFilterCount > 0 && (
            <button
              onClick={() => setIsExpanded(true)}
              style={{
                padding: getButtonPadding(),
                fontSize: getFontSize(),
                backgroundColor: "#2196f3",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              📖 Show All ({hiddenFilterCount})
            </button>
          )}
          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                padding: getButtonPadding(),
                fontSize: getFontSize(),
                backgroundColor: "#666",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Show Less
            </button>
          )}
        </div>
      </div>

      {/* Filters Grid */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {Object.entries(filterCategories).map(([category, filters]) => {
          const categoryFilters = visibleFilters.filter((filter) =>
            filters.includes(filter as string)
          );

          if (categoryFilters.length === 0) return null;

          return (
            <div key={category}>
              <div
                style={{
                  fontSize: getFontSize(),
                  fontWeight: "600",
                  color: "#555",
                  marginBottom: 8,
                  paddingBottom: 4,
                  borderBottom: "1px solid #e0e0e0",
                }}
              >
                {category}
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: getGap(),
                }}
              >
                {categoryFilters.map((filterName) => {
                  const isActive = isFilterActive(filterName); // ✅ FIXED: Using helper function
                  const colors = getFilterColor(filterName as string, isActive);

                  return (
                    <button
                      key={filterName}
                      onClick={() => toggleFilter(filterName)}
                      style={{
                        padding: getButtonPadding(),
                        borderRadius: 20,
                        border: `2px solid ${
                          isActive ? colors.active : colors.inactive
                        }`,
                        backgroundColor: isActive ? colors.active : "white",
                        color: isActive ? "white" : "#333",
                        cursor: "pointer",
                        fontSize: getFontSize(),
                        transition: "all 0.2s",
                        fontWeight: "500",
                        boxShadow: isActive
                          ? "0 2px 4px rgba(0,0,0,0.2)"
                          : "none",
                        transform: isActive ? "translateY(-1px)" : "none",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor =
                            colors.inactive;
                          e.currentTarget.style.transform = "translateY(-1px)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "white";
                          e.currentTarget.style.transform = "none";
                        }
                      }}
                    >
                      {filterName}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Filters Summary */}
      <div
        style={{
          marginTop: 12,
          padding: "8px 12px",
          backgroundColor: "white",
          borderRadius: 6,
          border: "1px solid #e0e0e0",
          fontSize: getFontSize() - 1,
          color: "#666",
        }}
      >
        <strong>Active:</strong>{" "}
        {Object.entries(activeFilters)
          .filter(([_, isActive]) => isActive === true) // ✅ FIXED: Strict boolean check
          .map(([name]) => name)
          .join(", ") || "No filters selected"}
      </div>
    </div>
  );
}
