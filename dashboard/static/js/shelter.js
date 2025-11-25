// static/js/shelter.js

(function () {
    const shelterData = window.shelter_data || [];
  
    if (!shelterData.length) {
      console.warn("No shelter_data found.");
      return;
    }
  
    const SHELTER_FIELD = "shelter_name";
    const FOUND_FIELD = "Found"; // column you added for origin
  
    // DOM targets for dropdown + labels
    const shelterListContainer = d3.select("#shelterListContainer");
    const searchInput = d3.select("#shelterSearchInput");
    const resetBtn = d3.select("#resetShelterFilter");
    const label = d3.select("#selectedShelterLabel");
    const dropdownBtn = d3.select("#shelterDropdownBtn");
  
    // DOM targets for table + carousel
    const stateTableEl = document.getElementById("state-table");
    const totalDogsEl = document.getElementById("totalDogsCount");
    const carouselShelterLabelEl = document.getElementById("carouselShelterLabel");
    const topStatesListEl = document.getElementById("topStatesList");
  
    // ---------- BUILD SHELTER LIST ----------
  
    const shelterMap = new Map();
    shelterData.forEach((row) => {
      const name = row[SHELTER_FIELD];
      if (!name) return;
  
      if (!shelterMap.has(name)) {
        shelterMap.set(name, {
          name: name,
          count: 0,
        });
      }
      shelterMap.get(name).count += 1;
    });
  
    const shelters = Array.from(shelterMap.values()).sort((a, b) =>
      d3.ascending(a.name, b.name)
    );
  
    function renderShelterList(filterText = "") {
      const filtered = shelters.filter((s) =>
        s.name.toLowerCase().includes(filterText.toLowerCase())
      );
  
      shelterListContainer
        .selectAll("button.shelter-item")
        .data(filtered, (d) => d.name)
        .join("button")
        .attr("class", "dropdown-item shelter-item")
        .text((d) => `${d.name} (${d.count})`)
        .on("click", (event, d) => selectShelter(d.name));
    }
  
    // ---------- TABLE RENDERING, DRIVEN BY SELECTION ----------
  
    function renderShelterTable(rows) {
      if (!stateTableEl) return;
  
      // Clear old table
      stateTableEl.innerHTML = "";
  
      const tableNode = d3TableWithControls(rows, {
        searchKey: "name", // dog name
        pageSize: 25,
        filters: [
          { key: "age", label: "Age" },
          { key: "sex", label: "Sex" },
          { key: "size", label: "Size" },
          { key: "contact_state", label: "Shelter state" },
          { key: "breed_primary", label: "Primary breed" },
        ],
      });
  
      stateTableEl.appendChild(tableNode);
    }
  
    // ---------- CAROUSEL METRICS (TOTAL DOGS + TOP FOUND) ----------
  
    function updateCarouselMetrics(rows, shelterName) {
      const total = rows.length;
  
      if (totalDogsEl) {
        totalDogsEl.textContent = total.toString();
      }
  
      if (carouselShelterLabelEl) {
        carouselShelterLabelEl.textContent =
          shelterName === "ALL" ? "All shelters" : shelterName;
      }
  
      if (!topStatesListEl) return;
  
      // Compute counts for Found field
      const counts = new Map();
      rows.forEach((r) => {
        let key = r[FOUND_FIELD];
        if (key == null || key === "") key = "Unknown";
        counts.set(key, (counts.get(key) || 0) + 1);
      });
  
      const top = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
  
      topStatesListEl.innerHTML = "";
  
      if (!top.length) {
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.textContent = "No origin data available.";
        topStatesListEl.appendChild(li);
        return;
      }
  
      top.forEach(([state, count]) => {
        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between align-items-center";
  
        const pct = total ? Math.round((count / total) * 100) : 0;
  
        li.innerHTML = `
          <span>${state}</span>
          <span class="badge bg-secondary rounded-pill">${count} (${pct}%)</span>
        `;
        topStatesListEl.appendChild(li);
      });
    }
  
    // ---------- MAIN DASHBOARD UPDATE (TABLE + CAROUSEL) ----------
  
    function updateShelterDashboard(rows, shelterName) {
      console.log(
        "Shelter dashboard update:",
        shelterName,
        "| rows:",
        rows.length
      );
  
      renderShelterTable(rows);
      updateCarouselMetrics(rows, shelterName);
    }
  
    // ---------- DROPDOWN BEHAVIOR ----------
  
    if (!searchInput.empty()) {
      searchInput.on("input", (event) => {
        renderShelterList(event.target.value);
      });
    }
  
    if (!resetBtn.empty()) {
      resetBtn.on("click", () => {
        dropdownBtn.text("Select Your Shelter");
        label.text("Showing all shelters");
        updateShelterDashboard(shelterData, "ALL");
      });
    }
  
    function selectShelter(shelterName) {
      const meta = shelterMap.get(shelterName);
  
      dropdownBtn.text(shelterName);
      label.text(
        `${shelterName} • ${meta ? meta.count : 0} dogs`
      );
  
      const rows = shelterData.filter(
        (r) => r[SHELTER_FIELD] === shelterName
      );
      updateShelterDashboard(rows, shelterName);
    }
  
    // ---------- INITIALIZE ----------
  
    renderShelterList("");
    label.text("Showing all shelters");
    updateShelterDashboard(shelterData, "ALL");
  })();
  
  // ---------------------------------------------------------
  // d3TableWithControls (same as your existing version)
  // ---------------------------------------------------------
  function d3TableWithControls(
    data,
    {
      searchKey = "name",
      pageSizes = [10, 25, 50, 100],
      pageSize = 25,
      filters = [],
    } = {}
  ) {
    // --- include ALL columns seen in any row ---
    const columns = Array.from(
      data.reduce((s, r) => {
        for (const k of Object.keys(r)) s.add(k);
        return s;
      }, new Set())
    );
  
    let q = "";
    let sortCol = null;
    let sortAsc = true;
    let page = 0;
    let ps = pageSize;
  
    // keep track of filter selections
    const filterState = {};
    filters.forEach((f) => {
      filterState[f.key] = "all";
    });
  
    // root + styles
    const root = d3
      .create("div")
      .attr("class", "d3-table-wrap")
      .style("font", "11px system-ui, sans-serif");
  
    root.append("style").text(`
      .d3-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:6px 0 8px}
      .d3-spacer{flex:1}
      .d3-btn,.d3-input,.d3-select{padding:3px 6px;border:1px solid #ccc;border-radius:6px;background:#fff;font-size:11px}
      .d3-btn[disabled]{opacity:.5;cursor:default}
      .scroll-x{overflow-x:auto; -webkit-overflow-scrolling:touch;}
      .d3-table{border-collapse:collapse;width:100%; table-layout:auto;}
      .d3-table thead th{position:sticky; top:0; background:#fff; border-bottom:1px solid #000; text-align:left; padding:2px 6px; user-select:none; cursor:pointer; white-space:nowrap; line-height:1.2}
      .d3-table tbody td{border-bottom:1px solid #eee; padding:2px 6px; line-height:1.2; white-space:nowrap;}
      .badge{font-size:10px;padding:1px 6px;border:1px solid #ddd;border-radius:999px;background:#f8f8f8}
      .d3-filter-label{display:flex;align-items:center;gap:4px}
    `);
  
    // ---------- CONTROLS (TOP) ----------
    const ctrTop = root.append("div").attr("class", "d3-controls");
  
    // search
    ctrTop
      .append("label")
      .attr("class", "d3-filter-label")
      .text(`Search ${searchKey}:`)
      .append("input")
      .attr("type", "text")
      .attr("class", "d3-input")
      .attr("placeholder", `Search ${searchKey}...`)
      .on("input", function () {
        q = this.value.toLowerCase();
        page = 0;
        update();
      });
  
    // filters (dropdowns)
    filters.forEach((f) => {
      const values = Array.from(
        new Set(
          data
            .map((d) => d[f.key])
            .filter((v) => v !== null && v !== undefined && v !== "")
        )
      )
        .map(String)
        .sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
        );
  
      const label = ctrTop.append("label").attr("class", "d3-filter-label");
      label.append("span").text(`${f.label}:`);
  
      const sel = label
        .append("select")
        .attr("class", "d3-select")
        .on("change", function () {
          filterState[f.key] = this.value;
          page = 0;
          update();
        });
  
      sel.append("option").attr("value", "all").text("All");
  
      sel
        .selectAll("option.value")
        .data(values)
        .join("option")
        .attr("class", "value")
        .attr("value", (d) => d)
        .text((d) => d);
    });
  
    // rows-per-page selector
    ctrTop.append("span").text("Rows:");
    const sizeSel = ctrTop
      .append("select")
      .attr("class", "d3-select")
      .on("change", () => {
        ps = +sizeSel.property("value");
        page = 0;
        update();
      });
  
    sizeSel
      .selectAll("option")
      .data(pageSizes)
      .join("option")
      .attr("value", (d) => d)
      .property("selected", (d) => d === ps)
      .text((d) => d);
  
    ctrTop.append("span").attr("class", "d3-spacer");
  
    // paging buttons (top)
    const prevTop = ctrTop
      .append("button")
      .attr("class", "d3-btn")
      .text("⬅ Previous page")
      .on("click", () => {
        page = Math.max(0, page - 1);
        update();
      });
  
    const nextTop = ctrTop
      .append("button")
      .attr("class", "d3-btn")
      .text("Next page ➡")
      .on("click", () => {
        page = page + 1;
        update();
      });
  
    const infoTop = ctrTop.append("span").attr("class", "badge");
  
    // ---------- TABLE ----------
    const scroller = root.append("div").attr("class", "scroll-x");
    const table = scroller.append("table").attr("class", "d3-table");
    const thead = table.append("thead");
    const tbody = table.append("tbody");
  
    const headRow = thead.append("tr");
    headRow
      .selectAll("th")
      .data(columns)
      .join("th")
      .on("click", (event, col) => {
        if (sortCol === col) sortAsc = !sortAsc;
        else {
          sortCol = col;
          sortAsc = true;
        }
        page = 0;
        update();
      })
      .each(function (c) {
        const s = d3.select(this);
        s.append("span").text(c);
        s.append("span")
          .attr("class", "sort")
          .style("margin-left", "6px")
          .text("↕");
      });
  
    // ---------- CONTROLS (BOTTOM) ----------
    const ctrBot = root.append("div").attr("class", "d3-controls");
    ctrBot.append("span").attr("class", "d3-spacer");
  
    const prevBot = ctrBot
      .append("button")
      .attr("class", "d3-btn")
      .text("⬅ Previous page")
      .on("click", () => {
        page = Math.max(0, page - 1);
        update();
      });
  
    const nextBot = ctrBot
      .append("button")
      .attr("class", "d3-btn")
      .text("Next page ➡")
      .on("click", () => {
        page = page + 1;
        update();
      });
  
    const infoBot = ctrBot.append("span").attr("class", "badge");
  
    // ---------- HELPERS ----------
    const cmp = (a, b) => {
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      if (a instanceof Date && b instanceof Date) return d3.ascending(+a, +b);
      if (typeof a === "number" && typeof b === "number")
        return d3.ascending(a, b);
      return String(a).localeCompare(String(b), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    };
  
    const currentRows = () => {
      let rows = data;
  
      // search
      if (q)
        rows = rows.filter((d) =>
          String(d[searchKey] ?? "")
            .toLowerCase()
            .includes(q)
        );
  
      // dropdown filters
      filters.forEach((f) => {
        const selected = filterState[f.key];
        if (selected !== "all") {
          rows = rows.filter(
            (d) => String(d[f.key] ?? "") === String(selected)
          );
        }
      });
  
      // sorting
      if (sortCol)
        rows = rows
          .slice()
          .sort((a, b) => cmp(a[sortCol], b[sortCol]) * (sortAsc ? 1 : -1));
  
      return rows;
    };
  
    function update() {
      const rows = currentRows();
      const pages = Math.max(1, Math.ceil(rows.length / ps));
      page = Math.min(page, pages - 1);
      const start = page * ps;
      const end = Math.min(start + ps, rows.length);
      const pageRows = rows.slice(start, end);
  
      // header indicators
      thead.selectAll(".sort").text((_, i, nodes) => {
        const col = columns[nodes[i].parentNode.cellIndex];
        if (col !== sortCol) return "↕";
        return sortAsc ? "▲" : "▼";
      });
  
      // body
      const tr = tbody.selectAll("tr").data(pageRows).join("tr");
      tr.selectAll("td")
        .data((d) => columns.map((c) => d[c]))
        .join("td")
        .text((v) => (v == null ? "" : v));
  
      // controls
      prevTop.attr("disabled", page <= 0 ? true : null);
      nextTop.attr("disabled", page >= pages - 1 ? true : null);
      prevBot.attr("disabled", page <= 0 ? true : null);
      nextBot.attr("disabled", page >= pages - 1 ? true : null);
  
      infoTop.text(
        `${rows.length ? start + 1 : 0}–${end} of ${rows.length} record${
          rows.length === 1 ? "" : "s"
        }`
      );
      infoBot.text(
        `Page ${rows.length ? page + 1 : 0}/${pages} • ${
          rows.length ? start + 1 : 0
        }–${end} of ${rows.length}`
      );
    }
  
    update();
    return root.node();
  }
  
  
  