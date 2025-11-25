// static/js/shelter.js

(function () {
    const shelterData = window.shelter_data || [];
  
    if (!shelterData.length) {
      console.warn("No shelter_data found.");
      return;
    }
  
    const SHELTER_FIELD = "shelter_name";
    const FOUND_FIELD = "Found"; // your origin column
  
    // cards pagination: target ~3 rows/page (12 cards on large screens)
    const CARDS_PER_PAGE = 12;
    let cardPage = 0; // 0-based page index
  
    // DOM elements
    const shelterListContainer = d3.select("#shelterListContainer");
    const searchInput = d3.select("#shelterSearchInput");
    const resetBtn = d3.select("#resetShelterFilter");
    const label = d3.select("#selectedShelterLabel");
    const dropdownBtn = d3.select("#shelterDropdownBtn");
  
    const stateTableEl = document.getElementById("state-table");
    const totalDogsEl = document.getElementById("totalDogsCount");
    const carouselShelterLabelEl = document.getElementById("carouselShelterLabel");
    const topStatesListEl = document.getElementById("topStatesList");
    const dogCardsContainer = document.getElementById("dogCardsContainer");
    const dogCardsPagerEl = document.getElementById("dogCardsPager");
  
    // ---------- BUILD SHELTER LIST ----------
    const shelterMap = new Map();
    shelterData.forEach((row) => {
      const name = row[SHELTER_FIELD];
      if (!name) return;
  
      if (!shelterMap.has(name)) {
        shelterMap.set(name, { name, count: 0 });
      }
      shelterMap.get(name).count += 1;
    });
  
    const shelters = Array.from(shelterMap.values()).sort((a, b) =>
      d3.ascending(a.name, b.name)
    );
  
    function renderShelterList(filterText = "") {
      const search = filterText.toLowerCase();
  
      shelterListContainer
        .selectAll("button.shelter-item")
        .data(
          shelters.filter((s) => s.name.toLowerCase().includes(search)),
          (d) => d.name
        )
        .join("button")
        .attr("class", "dropdown-item shelter-item")
        .text((d) => `${d.name} (${d.count})`)
        .on("click", (_, d) => selectShelter(d.name));
    }
  
    // ---------- TABLE ----------
    function renderShelterTable(rows) {
      if (!stateTableEl) return;
  
      stateTableEl.innerHTML = ""; // clear old table
  
      const tableNode = d3TableWithControls(rows, {
        searchKey: "name",
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
  
    // ---------- CAROUSEL ----------
    function updateCarouselMetrics(rows, shelterName) {
      const total = rows.length;
  
      if (totalDogsEl) totalDogsEl.textContent = total.toString();
      if (carouselShelterLabelEl) {
        carouselShelterLabelEl.textContent =
          shelterName === "ALL" ? "All shelters" : shelterName;
      }
  
      if (!topStatesListEl) return;
  
      // top 3 Found sources
      const counts = new Map();
      rows.forEach((r) => {
        let key = r[FOUND_FIELD] || "Unknown";
        counts.set(key, (counts.get(key) || 0) + 1);
      });
  
      const top = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
  
      topStatesListEl.innerHTML = "";
  
      if (!top.length) {
        topStatesListEl.innerHTML =
          "<li class='list-group-item'>No origin data available.</li>";
        return;
      }
  
      top.forEach(([state, count]) => {
        const pct = total ? Math.round((count / total) * 100) : 0;
  
        const li = document.createElement("li");
        li.className =
          "list-group-item d-flex justify-content-between align-items-center";
        li.innerHTML = `
          <span>${state}</span>
          <span class="badge bg-secondary rounded-pill">${count} (${pct}%)</span>
        `;
        topStatesListEl.appendChild(li);
      });
    }
  
    // ---------- DOG CARDS (ONLY WHEN SHELTER SELECTED, PAGINATED) ----------
    function renderDogCards(rows, shelterName) {
      if (!dogCardsContainer) return;
  
      dogCardsContainer.innerHTML = ""; // clean previous
      if (dogCardsPagerEl) dogCardsPagerEl.innerHTML = ""; // clear pager
  
      // Only render cards when a shelter is selected
      if (shelterName === "ALL") {
        dogCardsContainer.innerHTML = `
          <p class="text-muted mt-2">
            Select a shelter from the dropdown to view individual dog cards.
          </p>
        `;
        return;
      }
  
      const totalCards = rows.length;
      if (!totalCards) {
        dogCardsContainer.innerHTML = `
          <p class="text-muted mt-2">
            No dogs found for this shelter.
          </p>
        `;
        return;
      }
  
      const totalPages = Math.max(1, Math.ceil(totalCards / CARDS_PER_PAGE));
      // keep current page in range
      cardPage = Math.min(cardPage, totalPages - 1);
  
      const start = cardPage * CARDS_PER_PAGE;
      const end = Math.min(start + CARDS_PER_PAGE, totalCards);
      const pageRows = rows.slice(start, end);
  
      pageRows.forEach((dog) => {
        const card = document.createElement("div");
        card.className = "col-12 col-sm-6 col-md-4 col-lg-3";
  
        const name = dog.name ?? "Unknown";
        const age = dog.age ?? "Unknown";
        const breed = dog.breed_primary ?? "Unknown";
        const size = dog.size ?? "Unknown";
        const sex = dog.sex ?? dog.gender ?? "Unknown";
        const desc = dog.description ?? "No description available.";
  
        card.innerHTML = `
          <div class="flip-card">
            <div class="flip-card-inner">
  
              <!-- Front -->
              <div class="flip-card-front d-flex flex-column justify-content-center">
                <h5 class="fw-bold mb-2">${name}</h5>
                <p class="mb-1"><strong>Age:</strong> ${age}</p>
                <p class="mb-1"><strong>Breed:</strong> ${breed}</p>
                <p class="mb-1"><strong>Size:</strong> ${size}</p>
                <p class="mb-0"><strong>Sex:</strong> ${sex}</p>
              </div>
  
              <!-- Back -->
              <div class="flip-card-back d-flex align-items-center justify-content-center">
                <p class="px-2 mb-0">${desc}</p>
              </div>
  
            </div>
          </div>
        `;
  
        dogCardsContainer.appendChild(card);
      });
  
      // build pager
      if (dogCardsPagerEl && totalPages > 1) {
        const prevBtn = document.createElement("button");
        prevBtn.className = "btn btn-sm btn-outline-secondary";
        prevBtn.textContent = "Prev";
        prevBtn.disabled = cardPage === 0;
        prevBtn.onclick = () => {
          cardPage = Math.max(0, cardPage - 1);
          renderDogCards(rows, shelterName);
        };
  
        const nextBtn = document.createElement("button");
        nextBtn.className = "btn btn-sm btn-outline-secondary";
        nextBtn.textContent = "Next";
        nextBtn.disabled = cardPage >= totalPages - 1;
        nextBtn.onclick = () => {
          cardPage = Math.min(totalPages - 1, cardPage + 1);
          renderDogCards(rows, shelterName);
        };
  
        const info = document.createElement("span");
        info.className = "text-muted small";
        info.textContent = `Page ${cardPage + 1} of ${totalPages} • Showing ${start + 1}–${end} of ${totalCards}`;
  
        dogCardsPagerEl.appendChild(info);
        dogCardsPagerEl.appendChild(prevBtn);
        dogCardsPagerEl.appendChild(nextBtn);
      }
    }
  
    // ---------- MAIN DASHBOARD UPDATE ----------
    function updateShelterDashboard(rows, shelterName) {
      renderShelterTable(rows);
      updateCarouselMetrics(rows, shelterName);
      renderDogCards(rows, shelterName);
    }
  
    // ---------- DROPDOWN LOGIC ----------
    if (!searchInput.empty()) {
      searchInput.on("input", (event) => {
        renderShelterList(event.target.value);
      });
    }
  
    if (!resetBtn.empty()) {
      resetBtn.on("click", () => {
        dropdownBtn.text("Select Your Shelter");
        label.text("Showing all shelters");
        cardPage = 0;
        updateShelterDashboard(shelterData, "ALL");
      });
    }
  
    function selectShelter(shelterName) {
      const meta = shelterMap.get(shelterName);
  
      dropdownBtn.text(shelterName);
      label.text(`${shelterName} • ${meta ? meta.count : 0} dogs`);
  
      cardPage = 0; // reset to first page when switching shelters
      const rows = shelterData.filter(
        (r) => r[SHELTER_FIELD] === shelterName
      );
  
      updateShelterDashboard(rows, shelterName);
    }
  
    // ---------- INIT ----------
    renderShelterList("");
    label.text("Showing all shelters");
  
    // Start with:
    // - Full table
    // - Carousel for ALL
    // - No dog cards (just hint)
    updateShelterDashboard(shelterData, "ALL");
  })();
  
  
  // ---------------------------------------------------------
  // d3TableWithControls (same as before, with correct sort)
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
  
    const filterState = {};
    filters.forEach((f) => {
      filterState[f.key] = "all";
    });
  
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
  
    const ctrTop = root.append("div").attr("class", "d3-controls");
  
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
  
      if (q)
        rows = rows.filter((d) =>
          String(d[searchKey] ?? "")
            .toLowerCase()
            .includes(q)
        );
  
      filters.forEach((f) => {
        const selected = filterState[f.key];
        if (selected !== "all") {
          rows = rows.filter(
            (d) => String(d[f.key] ?? "") === String(selected)
          );
        }
      });
  
      if (sortCol)
        rows = rows
          .slice()
          .sort(
            (a, b) => cmp(a[sortCol], b[sortCol]) * (sortAsc ? 1 : -1)
          );
  
      return rows;
    };
  
    function update() {
      const rows = currentRows();
      const pages = Math.max(1, Math.ceil(rows.length / ps));
      page = Math.min(page, pages - 1);
      const start = page * ps;
      const end = Math.min(start + ps, rows.length);
      const pageRows = rows.slice(start, end);
  
      thead.selectAll(".sort").text((_, i, nodes) => {
        const col = columns[nodes[i].parentNode.cellIndex];
        if (col !== sortCol) return "↕";
        return sortAsc ? "▲" : "▼";
      });
  
      const tr = tbody.selectAll("tr").data(pageRows).join("tr");
      tr.selectAll("td")
        .data((d) => columns.map((c) => d[c]))
        .join("td")
        .text((v) => (v == null ? "" : v));
  
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
    
  
  
  