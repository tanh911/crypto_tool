import { ActiveFilters } from "../types";

interface FilterSectionProps {
  activeFilters: ActiveFilters;
  toggleFilter: (filterName: keyof ActiveFilters) => void;
  selectAllFilters: () => void;
  deselectAllFilters: () => void;
}

export function FilterSection({
  activeFilters,
  toggleFilter,
  selectAllFilters,
  deselectAllFilters,
}: FilterSectionProps) {
  return (
    <div
      style={{
        marginBottom: 16,
        padding: 16,
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        backgroundColor: "#fafafa",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h4 style={{ margin: 0, color: "#333" }}>Filter Markers:</h4>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={selectAllFilters}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Select All
          </button>
          <button
            onClick={deselectAllFilters}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Deselect All
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(Object.keys(activeFilters) as Array<keyof ActiveFilters>).map(
          (filterName) => (
            <button
              key={filterName}
              onClick={() => toggleFilter(filterName)}
              style={{
                padding: "6px 12px",
                borderRadius: 16,
                border: `2px solid ${
                  activeFilters[filterName]
                    ? filterName.toString().includes("Bull")
                      ? "#4caf50"
                      : filterName.toString().includes("Bear")
                      ? "#f44336"
                      : "#2196f3"
                    : "#ddd"
                }`,
                backgroundColor: activeFilters[filterName]
                  ? filterName.toString().includes("Bull")
                    ? "#4caf50"
                    : filterName.toString().includes("Bear")
                    ? "#f44336"
                    : "#2196f3"
                  : "white",
                color: activeFilters[filterName] ? "white" : "#333",
                cursor: "pointer",
                fontSize: 12,
                transition: "all 0.2s",
              }}
            >
              {filterName}
            </button>
          )
        )}
      </div>
    </div>
  );
}
