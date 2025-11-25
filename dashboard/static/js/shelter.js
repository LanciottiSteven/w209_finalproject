// static/js/shelter.js

(function () {
    const shelterData = window.shelter_data || [];
  
    console.log("🔍 Incoming shelter_data:", shelterData);


    if (!shelterData.length) {
      console.warn("No shelter_data found.");
      return;
    }
  
    const SHELTER_FIELD = "shelter_name";
    const FOUND_FIELD = "Found"; // your origin column
  
    // cards pagination: target ~3 rows/page (12 cards on large screens)
    const CARDS_PER_PAGE = 12;
    let cardPage = 0; // 0-based page index
    let selectedBreed = null;
  
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
      
        dogCardsContainer.innerHTML = "";
        if (dogCardsPagerEl) dogCardsPagerEl.innerHTML = "";
      
        // Only render cards when a shelter is selected
        if (shelterName === "ALL") {
          dogCardsContainer.innerHTML = `
            <p class="text-muted mt-2">
              Select a shelter from the dropdown to view individual dog cards.
            </p>
          `;
          return;
        }
      
        // ---- Apply breed filter if one is selected from the chart ----
        let filteredRows = rows;
        if (selectedBreed) {
          filteredRows = rows.filter((d) => {
            const b = (d.breed_primary || "Unknown").trim();
            return b === selectedBreed;
          });
        }
      
        const totalCards = filteredRows.length;
        if (!totalCards) {
          const msg = selectedBreed
            ? `No dogs found for breed "${selectedBreed}" in this shelter.`
            : "No dogs found for this shelter.";
      
          dogCardsContainer.innerHTML = `
            <p class="text-muted mt-2">${msg}</p>
          `;
          return;
        }
      
        const totalPages = Math.max(1, Math.ceil(totalCards / CARDS_PER_PAGE));
        cardPage = Math.min(cardPage, totalPages - 1);
      
        const start = cardPage * CARDS_PER_PAGE;
        const end = Math.min(start + CARDS_PER_PAGE, totalCards);
        const pageRows = filteredRows.slice(start, end);
      
        pageRows.forEach((dog) => {
          const card = document.createElement("div");
          card.className = "col-12 col-sm-6 col-md-4 col-lg-3";
      
          // image logic as you already have it
          let img = dog.image || null;
          if (img) {
            img = String(img).trim();
            const parts = img.split(/[\\/]/);
            const fileName = parts[parts.length - 1];
            if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("/")) {
              // use as-is
            } else if (window.dog_image_base) {
              img = window.dog_image_base + fileName;
            } else {
              img = "/static/images/" + fileName;
            }
          } else {
            img = "/static/images/image2.jpg"; // fallback
          }
      
          const name = dog.name ?? "Unknown";
          const age = dog.age ?? "Unknown";
          const breed = dog.breed_primary ?? "Unknown";
          const size = dog.size ?? "Unknown";
          const sex = dog.sex ?? dog.gender ?? "Unknown";
          const desc = dog.description ?? "No description available.";
      
          card.innerHTML = `
            <div class="flip-card">
              <div class="flip-card-inner">
      
                <!-- FRONT -->
                <div class="flip-card-front d-flex flex-column justify-content-end"
                     style="
                       background-image: url('${img}');
                       background-size: cover;
                       background-position: center;
                       background-repeat: no-repeat;
                       color: white;
                       text-shadow: 0 0 6px black;
                     ">
                  <div class="p-2" style="background: rgba(0,0,0,0.4); border-radius: 6px;">
                    <h5 class="fw-bold mb-1">${name}</h5>
                    <p class="mb-1"><strong>Age:</strong> ${age}</p>
                    <p class="mb-1"><strong>Breed:</strong> ${breed}</p>
                    <p class="mb-1"><strong>Size:</strong> ${size}</p>
                    <p class="mb-0"><strong>Sex:</strong> ${sex}</p>
                  </div>
                </div>
      
                <!-- BACK -->
                <div class="flip-card-back d-flex align-items-center justify-content-center">
                  <p class="px-2 mb-0">${desc}</p>
                </div>
      
              </div>
            </div>
          `;
      
          dogCardsContainer.appendChild(card);
        });
      
        // ----- PAGINATION -----
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
          info.className = "text-muted small me-2";
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
        renderBreedChart(rows, shelterName);   
        renderOriginsSankey(rows, shelterName);
        renderDogCards(rows, shelterName);
      }
      
// ---------- Breed Chart ----------
      function renderBreedChart(rows, shelterName) {
        const container = document.getElementById("breedBarChartContainer");
        const svgEl = document.getElementById("breedBarChart");
        if (!container || !svgEl) return;
      
        const svg = d3.select(svgEl);
      
        // Clear previous chart
        svg.selectAll("*").remove();
      
        // If no data, show a little message
        if (!rows || !rows.length) {
          const msg = svg
            .append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("text-anchor", "middle")
            .attr("fill", "#999")
            .text("No breed data available for this selection.");
          return;
        }
      
        // ---- Aggregate counts by breed_primary ----
        const countsMap = new Map();
        rows.forEach((d) => {
          let breed = d.breed_primary || "Unknown";
          breed = String(breed).trim();
          countsMap.set(breed, (countsMap.get(breed) || 0) + 1);
        });
      
        let data = Array.from(countsMap, ([breed, count]) => ({ breed, count }));
        // Sort by count desc, keep top N
        const MAX_BREEDS = 15;
        data.sort((a, b) => b.count - a.count);
        data = data.slice(0, MAX_BREEDS);
      
        const total = rows.length;
      
        // ---- Dimensions ----
        const margin = { top: 20, right: 20, bottom: 30, left: 150 };
        const fullWidth = container.clientWidth || 600;
        const fullHeight = 20 * data.length + margin.top + margin.bottom;
        const width = fullWidth - margin.left - margin.right;
        const height = fullHeight - margin.top - margin.bottom;
      
        svg
          .attr("width", fullWidth)
          .attr("height", fullHeight);
      
        const g = svg
          .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);
      
        // ---- Scales ----
        const x = d3
          .scaleLinear()
          .domain([0, d3.max(data, (d) => d.count) || 1])
          .nice()
          .range([0, width]);
      
        const y = d3
          .scaleBand()
          .domain(data.map((d) => d.breed))
          .range([0, height])
          .padding(0.15);
      
        // ---- Axes ----
        const maxCount = d3.max(data, d => d.count) || 1;
        const integerTicks = d3.range(0, maxCount + 1); // 0,1,2,3,...maxCount

        const xAxis = d3.axisBottom(x)
            .tickValues(integerTicks)
            .tickFormat(d3.format("d"));
        const yAxis = d3.axisLeft(y);
      
        g.append("g")
          .attr("transform", `translate(0,${height})`)
          .call(xAxis)
          .call((g) => g.selectAll("text").style("font-size", "10px"));
      
        g.append("g")
          .call(yAxis)
          .call((g) => g.selectAll("text").style("font-size", "10px"));
      
        // ---- Tooltip ----
        let tooltip = d3.select("#breedTooltip");
        if (tooltip.empty()) {
          tooltip = d3
            .select("body")
            .append("div")
            .attr("id", "breedTooltip")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("background", "rgba(0,0,0,0.8)")
            .style("color", "#fff")
            .style("padding", "4px 8px")
            .style("border-radius", "4px")
            .style("font-size", "11px")
            .style("opacity", 0);
        }
      
        const formatPct = d3.format(".1%");
      
        // ---- Bars ----
          // ---- Bars ----
  const bars = g.selectAll("rect.bar")
  .data(data)
  .join("rect")
  .attr("class", "bar")
  .attr("x", 0)
  .attr("y", (d) => y(d.breed))
  .attr("height", y.bandwidth())
  .attr("width", (d) => x(d.count))
  .attr("fill", "#5a8dee");

// helper to color bars based on selectedBreed
function updateBarStyles() {
  bars.attr("fill", (d) =>
    d.breed === selectedBreed ? "#f39c12" : "#5a8dee"
  );
}

updateBarStyles();

bars
  .on("mouseover", function (event, d) {
    d3.select(this).attr("fill", "#345bb3");
    tooltip
      .style("opacity", 1)
      .html(() => {
        const pct = total ? d.count / total : 0;
        return `
          <strong>${d.breed}</strong><br/>
          ${d.count} dog${d.count === 1 ? "" : "s"}<br/>
          ${formatPct(pct)} of selection
        `;
      });
  })
  .on("mousemove", function (event) {
    tooltip
      .style("left", event.pageX + 12 + "px")
      .style("top", event.pageY - 20 + "px");
  })
  .on("mouseout", function () {
    tooltip.style("opacity", 0);
    updateBarStyles(); // restore selected highlight if any
  })
  .on("click", function (event, d) {
    // Toggle selection: click same breed to clear filter
    if (selectedBreed === d.breed) {
      selectedBreed = null;
    } else {
      selectedBreed = d.breed;
    }
    cardPage = 0; // reset card pagination when changing filter
    renderDogCards(rows, shelterName);
    updateBarStyles();
  });

      
        // ---- Small subtitle at top ----
        const subtitle = shelterName === "ALL"
          ? "Top breeds across all shelters"
          : `Top breeds for ${shelterName}`;
      
        svg
          .append("text")
          .attr("x", margin.left)
          .attr("y", 12)
          .attr("fill", "#555")
          .attr("font-size", "11px")
          .text(subtitle);
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
      selectedBreed = null;
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

  function renderOriginsSankey(rows, shelterName) {
    const container = document.getElementById("originSankeyContainer");
    const svgEl = document.getElementById("originSankey");
    if (!container || !svgEl) return;
  
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove(); // clear previous chart
  
    // If no rows, show a simple "no data" message
    if (!rows || !rows.length) {
      svg
        .append("text")
        .attr("x", "50%")
        .attr("y", "50%")
        .attr("text-anchor", "middle")
        .attr("fill", "#999")
        .text("No origin data for this selection.");
      return;
    }
  
    const FOUND_FIELD = "Found";
    const SHELTER_FIELD = "shelter_name";
  
    // ---- Build link counts: Found -> Shelter ----
    const linkMap = new Map();
  
    rows.forEach((r) => {
      let from = r[FOUND_FIELD] || "Unknown origin";
      from = String(from).trim();
  
      // For ALL shelters, let each shelter be a node.
      // For a specific shelter, we still use that shelterName as target.
      let to =
        shelterName === "ALL"
          ? (r[SHELTER_FIELD] || "Unknown shelter")
          : shelterName;
  
      to = String(to).trim();
  
      const key = from + "||" + to;
      linkMap.set(key, (linkMap.get(key) || 0) + 1);
    });
  
    let linksArr = Array.from(linkMap, ([key, value]) => {
      const [from, to] = key.split("||");
      return { sourceName: from, targetName: to, value };
    });
  
    // Sort by flow size and limit number of links to keep chart readable
    const MAX_LINKS = 30;
    linksArr.sort((a, b) => b.value - a.value);
    linksArr = linksArr.slice(0, MAX_LINKS);
  
    if (!linksArr.length) {
      svg
        .append("text")
        .attr("x", "50%")
        .attr("y", "50%")
        .attr("text-anchor", "middle")
        .attr("fill", "#999")
        .text("No origin flows to display.");
      return;
    }
  
    // ---- Build node list from link endpoints ----
    const nodeNames = new Set();
    linksArr.forEach((l) => {
      nodeNames.add(l.sourceName);
      nodeNames.add(l.targetName);
    });
  
    const nodes = Array.from(nodeNames).map((name) => ({ name }));
    const nameToIndex = new Map();
    nodes.forEach((n, i) => nameToIndex.set(n.name, i));
  
    const links = linksArr.map((l) => ({
      source: nameToIndex.get(l.sourceName),
      target: nameToIndex.get(l.targetName),
      value: l.value,
    }));
  
    // ---- Dimensions & Sankey layout ----
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const fullWidth = container.clientWidth || 600;
    const fullHeight = 320;
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;
  
    svg.attr("width", fullWidth).attr("height", fullHeight);
  
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    const sankeyGen = d3
      .sankey()
      .nodeWidth(14)
      .nodePadding(10)
      .extent([
        [0, 0],
        [width, height],
      ]);
  
    const graph = sankeyGen({
      nodes: nodes.map((d) => Object.assign({}, d)),
      links: links.map((d) => Object.assign({}, d)),
    });
  
    const color = d3.scaleOrdinal(d3.schemeCategory10);
  
    // ---- Tooltip ----
    let tooltip = d3.select("#originSankeyTooltip");
    if (tooltip.empty()) {
      tooltip = d3
        .select("body")
        .append("div")
        .attr("id", "originSankeyTooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("background", "rgba(0,0,0,0.8)")
        .style("color", "#fff")
        .style("padding", "4px 8px")
        .style("border-radius", "4px")
        .style("font-size", "11px")
        .style("opacity", 0);
    }
  
    // ---- Links ----
    const link = g
      .append("g")
      .attr("fill", "none")
      .selectAll("path")
      .data(graph.links)
      .join("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", (d) => color(d.source.name))
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", (d) => Math.max(1, d.width))
      .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke-opacity", 0.8);
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${d.source.name}</strong> → <strong>${d.target.name}</strong><br/>
             ${d.value} dog${d.value === 1 ? "" : "s"}`
          );
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 12 + "px")
          .style("top", event.pageY - 20 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke-opacity", 0.4);
        tooltip.style("opacity", 0);
      });
  
    // ---- Nodes ----
    const node = g
      .append("g")
      .selectAll("g")
      .data(graph.nodes)
      .join("g");
  
    node
      .append("rect")
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("height", (d) => Math.max(1, d.y1 - d.y0))
      .attr("width", (d) => d.x1 - d.x0)
      .attr("fill", (d) => color(d.name))
      .attr("stroke", "#333");
  
    node
      .append("text")
      .attr("x", (d) => (d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6))
      .attr("y", (d) => (d.y0 + d.y1) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d) => (d.x0 < width / 2 ? "start" : "end"))
      .attr("font-size", "10px")
      .text((d) => d.name);
  }
  
  
  
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
    
  
  
  