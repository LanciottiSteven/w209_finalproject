// static/js/shelter.js

(function () {
    const shelterData = window.shelter_data || [];

    let currentShelterName = "ALL";
  
    console.log("🔍 Incoming shelter_data:", shelterData);
    if (shelterData.length > 0) {
      console.log("🔍 Columns in first row:", Object.keys(shelterData[0]));
    }
  
    if (!shelterData.length) {
      console.warn("No shelter_data found.");
      return;
    }
  
    const SHELTER_FIELD = "shelter_name";
    const FOUND_FIELD = "Found";
  
    const CARDS_PER_PAGE = 12;
    let cardPage = 0;
    let selectedBreed = null;    // from bar chart
    let selectedOrigin = null;   // from sankey
  
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
  
    const breedChartContainer = document.getElementById("breedBarChartContainer");
    const breedChartSvgEl = document.getElementById("breedBarChart");
  
    const sankeyContainer = document.getElementById("originSankeyContainer");
    const sankeySvgEl = document.getElementById("originSankey");

    const breedForceContainer = document.getElementById("breedForceContainer");
    const breedForceSvgEl = document.getElementById("breedForce");

    // Recommender form elements
    const matchFormEl = document.getElementById("matchForm");
    const matchResultsEl = document.getElementById("matchResults");

  
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
      stateTableEl.innerHTML = "";
  
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
  
      const counts = new Map();
      rows.forEach((r) => {
        let key = r[FOUND_FIELD] || "Unknown";
        key = String(key).trim();
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
  
    // ---------- BREED BAR CHART ----------
    function renderBreedChart(baseRows, shelterName) {
      if (!breedChartContainer || !breedChartSvgEl) return;
  
      const svg = d3.select(breedChartSvgEl);
      svg.selectAll("*").remove();
  
      // Apply origin filter ONLY for the bar chart (if any)
      let rows = baseRows;
      if (selectedOrigin) {
        rows = rows.filter((d) => {
          const o = (d[FOUND_FIELD] || "Unknown origin").trim();
          return o === selectedOrigin;
        });
      }
  
      if (!rows || !rows.length) {
        svg
          .append("text")
          .attr("x", "50%")
          .attr("y", "50%")
          .attr("text-anchor", "middle")
          .attr("fill", "#999")
          .text("No breed data available for this selection.");
        return;
      }
  
      const countsMap = new Map();
      rows.forEach((d) => {
        let breed = d.breed_primary || "Unknown";
        breed = String(breed).trim();
        countsMap.set(breed, (countsMap.get(breed) || 0) + 1);
      });
  
      let data = Array.from(countsMap, ([breed, count]) => ({ breed, count }));
      const MAX_BREEDS = 15;
      data.sort((a, b) => b.count - a.count);
      data = data.slice(0, MAX_BREEDS);
  
      const total = rows.length;
  
      const margin = { top: 20, right: 20, bottom: 30, left: 150 };
      const fullWidth = breedChartContainer.clientWidth || 600;
      const fullHeight = 20 * data.length + margin.top + margin.bottom;
      const width = fullWidth - margin.left - margin.right;
      const height = fullHeight - margin.top - margin.bottom;
  
      svg.attr("width", fullWidth).attr("height", fullHeight);
  
      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
  
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
  
      const maxCount = d3.max(data, (d) => d.count) || 1;
      const integerTicks = d3.range(0, maxCount + 1);
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
  
      // Tooltip
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
  
      const bars = g
        .selectAll("rect.bar")
        .data(data)
        .join("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", (d) => y(d.breed))
        .attr("height", y.bandwidth())
        .attr("width", (d) => x(d.count));
  
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
          updateBarStyles();
        })
        .on("click", function (event, d) {
          // Toggle breed selection
          if (selectedBreed === d.breed) {
            selectedBreed = null;
          } else {
            selectedBreed = d.breed;
          }
          cardPage = 0;
          renderDogCards(baseRows, shelterName);
          renderOriginsSankey(baseRows, shelterName); // update sankey with breed filter
          updateBarStyles();
        });
  
      const subtitleParts = [];
      if (shelterName === "ALL") {
        subtitleParts.push("All shelters");
      } else {
        subtitleParts.push(shelterName);
      }
      if (selectedOrigin) {
        subtitleParts.push(`from ${selectedOrigin}`);
      }
      const subtitle = `Top breeds for ${subtitleParts.join(" • ")}`;
  
      svg
        .append("text")
        .attr("x", margin.left)
        .attr("y", 12)
        .attr("fill", "#555")
        .attr("font-size", "11px")
        .text(subtitle);
    }
  
    // ---------- ORIGINS SANKEY ----------
    function renderOriginsSankey(baseRows, shelterName) {
      if (!sankeyContainer || !sankeySvgEl) return;
  
      const svg = d3.select(sankeySvgEl);
      svg.selectAll("*").remove();
  
      // Apply breed filter ONLY for the sankey (if any)
      let rows = baseRows;
      if (selectedBreed) {
        rows = rows.filter((d) => {
          const b = (d.breed_primary || "Unknown").trim();
          return b === selectedBreed;
        });
      }
  
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
  
      const linkMap = new Map();

rows.forEach((r) => {
  let from = r[FOUND_FIELD] || "Unknown origin";
  from = String(from).trim();

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
  
      const margin = { top: 10, right: 10, bottom: 10, left: 10 };
      const fullWidth = sankeyContainer.clientWidth || 600;
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
  
      const link = g
        .append("g")
        .attr("fill", "none")
        .selectAll("path")
        .data(graph.links)
        .join("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke-width", (d) => Math.max(1, d.width));
  
      function updateLinkStyles() {
        link
          .attr("stroke", (d) => color(d.source.name))
          .attr("stroke-opacity", (d) =>
            selectedOrigin
              ? d.source.name === selectedOrigin
                ? 0.8
                : 0.15
              : 0.4
          );
      }
  
      updateLinkStyles();
  
      link
        .on("mouseover", function (event, d) {
          d3.select(this).attr("stroke-opacity", 0.9);
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
          tooltip.style("opacity", 0);
          updateLinkStyles();
        })
        .on("click", function (event, d) {
          // Toggle origin filter
          if (selectedOrigin === d.source.name) {
            selectedOrigin = null;
          } else {
            selectedOrigin = d.source.name;
          }
          cardPage = 0;
          renderDogCards(baseRows, shelterName);
          renderBreedChart(baseRows, shelterName); // update bar chart with origin filter
          updateLinkStyles();
        });
  
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
        .attr("text-anchor", (d) =>
          d.x0 < width / 2 ? "start" : "end"
        )
        .attr("font-size", "10px")
        .text((d) => d.name);
    }
    
    function renderBreedForceGraph(rows, shelterName) {
        if (!breedForceContainer || !breedForceSvgEl) return;
      
        const svg = d3.select(breedForceSvgEl);
        svg.selectAll("*").remove();
      
        // If no data, show message
        if (!rows || !rows.length) {
          svg
            .append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("text-anchor", "middle")
            .attr("fill", "#999")
            .text("No data available for breed network.");
          return;
        }
      
        const FOUND_FIELD = "Found";
      
        // ---- 1. Group rows by origin and compute co-occurrence of breeds ----
        const byOrigin = d3.group(rows, (d) =>
          String(d[FOUND_FIELD] || "Unknown origin").trim()
        );
      
        const breedCounts = new Map();      // node weights
        const pairCounts = new Map();       // edge weights
      
        for (const [origin, group] of byOrigin.entries()) {
          // Unique breeds in this origin
          const breeds = Array.from(
            new Set(
              group
                .map((r) => (r.breed_primary || "Unknown").toString().trim())
                .filter((b) => b)
            )
          );
      
          // Count each breed's presence at this origin
          breeds.forEach((b) => {
            breedCounts.set(b, (breedCounts.get(b) || 0) + 1);
          });
      
          // For each unordered pair of breeds at this origin, increment link weight
          for (let i = 0; i < breeds.length; i++) {
            for (let j = i + 1; j < breeds.length; j++) {
              const b1 = breeds[i];
              const b2 = breeds[j];
              const key = b1 < b2 ? `${b1}||${b2}` : `${b2}||${b1}`;
              pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
            }
          }
        }
      
        // ---- 2. Pick top breeds to keep graph manageable ----
        let breedList = Array.from(breedCounts, ([breed, count]) => ({
          id: breed,
          count,
        }));
      
        if (!breedList.length) {
          svg
            .append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("text-anchor", "middle")
            .attr("fill", "#999")
            .text("No breeds to show in network.");
          return;
        }
      
        const MAX_NODES = 12;
        breedList.sort((a, b) => b.count - a.count);
        breedList = breedList.slice(0, MAX_NODES);
      
        const keptBreeds = new Set(breedList.map((b) => b.id));
      
        // ---- 3. Build links only between kept breeds ----
        let links = Array.from(pairCounts, ([key, value]) => {
          const [b1, b2] = key.split("||");
          return { source: b1, target: b2, value };
        }).filter((l) => keptBreeds.has(l.source) && keptBreeds.has(l.target));
      
        // Limit number of links
        const MAX_LINKS = 40;
        links.sort((a, b) => b.value - a.value);
        links = links.slice(0, MAX_LINKS);
      
        if (!links.length) {
          svg
            .append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("text-anchor", "middle")
            .attr("fill", "#999")
            .text("Not enough breed co-occurrences to form a network.");
          return;
        }
      
        const nodes = breedList; // already in {id, count} form
      
        // ---- 4. Dimensions & setup ----
        const margin = { top: 10, right: 10, bottom: 10, left: 10 };
        const fullWidth = breedForceContainer.clientWidth || 600;
        const fullHeight = 360;
        const width = fullWidth - margin.left - margin.right;
        const height = fullHeight - margin.top - margin.bottom;
      
        svg.attr("width", fullWidth).attr("height", fullHeight);
      
        const g = svg
          .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);
      
        const color = d3.scaleOrdinal(d3.schemeCategory10);
      
        // Node radius scaled by count
        const maxCount = d3.max(nodes, (d) => d.count) || 1;
        const rScale = d3.scaleSqrt().domain([1, maxCount]).range([6, 20]);
      
        // ---- 5. Force simulation ----
        const simulation = d3
          .forceSimulation(nodes)
          .force(
            "link",
            d3.forceLink(links).id((d) => d.id)
              .distance((d) => 60 + 10 * d.value) // longer with stronger co-occurrence
              .strength(0.4)
          )
          .force("charge", d3.forceManyBody().strength(-140))
          .force("center", d3.forceCenter(width / 2, height / 2))
          .force("collision", d3.forceCollide().radius((d) => rScale(d.count) + 4));
      
        // ---- 6. Tooltip ----
        let tooltip = d3.select("#breedForceTooltip");
        if (tooltip.empty()) {
          tooltip = d3
            .select("body")
            .append("div")
            .attr("id", "breedForceTooltip")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("background", "rgba(0,0,0,0.8)")
            .style("color", "#fff")
            .style("padding", "4px 8px")
            .style("border-radius", "4px")
            .style("font-size", "11px")
            .style("opacity", 0);
        }
      
        // ---- 7. Links ----
        const link = g
          .append("g")
          .attr("stroke", "#999")
          .attr("stroke-opacity", 0.6)
          .selectAll("line")
          .data(links)
          .join("line")
          .attr("stroke-width", (d) => Math.max(1, d.value));
      
        // ---- 8. Nodes (group for circle + label) ----
        const node = g
          .append("g")
          .selectAll("g")
          .data(nodes)
          .join("g")
          .call(
            d3
              .drag()
              .on("start", (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
              })
              .on("drag", (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
              })
              .on("end", (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
              })
          );
      
        node
          .append("circle")
          .attr("r", (d) => rScale(d.count))
          .attr("fill", (d) => color(d.id))
          .on("mouseover", function (event, d) {
            tooltip
              .style("opacity", 1)
              .html(
                `<strong>${d.id}</strong><br/>
                 Seen in ${d.count} origin${
                   d.count === 1 ? "" : "s"
                 } in this selection`
              );
          })
          .on("mousemove", function (event) {
            tooltip
              .style("left", event.pageX + 12 + "px")
              .style("top", event.pageY - 20 + "px");
          })
          .on("mouseout", function () {
            tooltip.style("opacity", 0);
          });
      
        node
          .append("text")
          .attr("text-anchor", "middle")
          .attr("dy", 3)
          .attr("font-size", "9px")
          .attr("fill", "#fff")
          .text((d) => d.id);
      
        // ---- 9. Tick handler ----
        simulation.on("tick", () => {
          link
            .attr("x1", (d) => d.source.x)
            .attr("y1", (d) => d.source.y)
            .attr("x2", (d) => d.target.x)
            .attr("y2", (d) => d.target.y);
      
          node.attr("transform", (d) => `translate(${d.x},${d.y})`);
        });
      
        // ---- 10. Subtitle ----
        const subtitle =
          shelterName === "ALL"
            ? "Breed co-occurrence across all shelters"
            : `Breed co-occurrence for ${shelterName}`;
      
        svg
          .append("text")
          .attr("x", margin.left)
          .attr("y", 14)
          .attr("fill", "#555")
          .attr("font-size", "11px")
          .text(subtitle);
      }
      


    // ---------- DOG CARDS ----------
    function renderDogCards(baseRows, shelterName) {
      if (!dogCardsContainer) return;
  
      dogCardsContainer.innerHTML = "";
      if (dogCardsPagerEl) dogCardsPagerEl.innerHTML = "";
  
      if (shelterName === "ALL") {
        dogCardsContainer.innerHTML = `
          <p class="text-muted mt-2">
            Select a shelter from the dropdown to view individual dog cards.
          </p>
        `;
        return;
      }
  
      // Apply BOTH filters: breed + origin
      let rows = baseRows;
  
      if (selectedBreed) {
        rows = rows.filter((d) => {
          const b = (d.breed_primary || "Unknown").trim();
          return b === selectedBreed;
        });
      }
  
      if (selectedOrigin) {
        rows = rows.filter((d) => {
          const o = (d[FOUND_FIELD] || "Unknown origin").trim();
          return o === selectedOrigin;
        });
      }
  
      const totalCards = rows.length;
      if (!totalCards) {
        let msg = "No dogs found for this shelter.";
        if (selectedBreed && selectedOrigin) {
          msg = `No dogs found for breed "${selectedBreed}" from "${selectedOrigin}".`;
        } else if (selectedBreed) {
          msg = `No dogs found for breed "${selectedBreed}" in this shelter.`;
        } else if (selectedOrigin) {
          msg = `No dogs found from "${selectedOrigin}" in this shelter.`;
        }
  
        dogCardsContainer.innerHTML = `
          <p class="text-muted mt-2">${msg}</p>
        `;
        return;
      }
  
      const totalPages = Math.max(1, Math.ceil(totalCards / CARDS_PER_PAGE));
      cardPage = Math.min(cardPage, totalPages - 1);
  
      const start = cardPage * CARDS_PER_PAGE;
      const end = Math.min(start + CARDS_PER_PAGE, totalCards);
      const pageRows = rows.slice(start, end);
  
      pageRows.forEach((dog) => {
        const card = document.createElement("div");
        card.className = "col-12 col-sm-6 col-md-4 col-lg-3";
  
        // Image handling
        let img = dog.image || null;
        if (img) {
          img = String(img).trim();
          const parts = img.split(/[\\/]/);
          const fileName = parts[parts.length - 1];
          if (
            img.startsWith("http://") ||
            img.startsWith("https://") ||
            img.startsWith("/")
          ) {
            // use as-is
          } else if (window.dog_image_base) {
            img = window.dog_image_base + fileName;
          } else {
            img = "/static/images/" + fileName;
          }
        } else {
          img = "/static/images/image2.jpg";
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
  
      // Pagination controls
      if (dogCardsPagerEl && totalPages > 1) {
        const prevBtn = document.createElement("button");
        prevBtn.className = "btn btn-sm btn-outline-secondary";
        prevBtn.textContent = "Prev";
        prevBtn.disabled = cardPage === 0;
        prevBtn.onclick = () => {
          cardPage = Math.max(0, cardPage - 1);
          renderDogCards(baseRows, shelterName);
        };
  
        const nextBtn = document.createElement("button");
        nextBtn.className = "btn btn-sm btn-outline-secondary";
        nextBtn.textContent = "Next";
        nextBtn.disabled = cardPage >= totalPages - 1;
        nextBtn.onclick = () => {
          cardPage = Math.min(totalPages - 1, cardPage + 1);
          renderDogCards(baseRows, shelterName);
        };
  
        const info = document.createElement("span");
        info.className = "text-muted small me-2";
        info.textContent = `Page ${cardPage + 1} of ${totalPages} • Showing ${
          start + 1
        }–${end} of ${totalCards}`;
  
        dogCardsPagerEl.appendChild(info);
        dogCardsPagerEl.appendChild(prevBtn);
        dogCardsPagerEl.appendChild(nextBtn);
      }
    }
    
        // ---------- RECOMMENDER RESULTS ----------
        function renderMatchResults(matches) {
            if (!matchResultsEl) return;
      
            if (!matches || !matches.length) {
              matchResultsEl.innerHTML = `
                <div class="alert alert-warning py-2 my-2">
                  No matches found for those preferences. Try relaxing your criteria.
                </div>
              `;
              return;
            }
      
            const rowsHtml = matches
              .map((m) => {
                const simPct = m.similarity != null
                  ? `${(m.similarity * 100).toFixed(1)}%`
                  : "–";
      
                return `
                  <tr>
                    <td>${m.name ?? "Unknown"}</td>
                    <td>${m.shelter_name ?? "Unknown"}</td>
                    <td>${m.shelter_address ?? "Unknown"}</td>
                    <td>${m.breed_primary ?? "Unknown"}</td>
                    <td>${m.age ?? "Unknown"}</td>
                    <td>${m.size ?? "Unknown"}</td>
                    <td>${m.sex ?? "Unknown"}</td>
                    <td>${m.env_children ?? ""}</td>
                    <td>${m.env_dogs ?? ""}</td>
                    <td>${m.env_cats ?? ""}</td>
                    <td>${m.house_trained ?? ""}</td>
                    <td>${m.special_needs ?? ""}</td>
                    <td>${m.kmeans_cluster}</td>
                    <td>${simPct}</td>
                  </tr>
                `;
              })
              .join("");
      
            matchResultsEl.innerHTML = `
              <div class="card">
                <div class="card-header py-2">
                  <strong>Recommended matches</strong>
                </div>
                <div class="table-responsive">
                  <table class="table table-sm mb-0">
                    <thead class="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Shelter Name</th>
                        <th>Shelter Address</th>
                        <th>Breed</th>
                        <th>Age</th>
                        <th>Size</th>
                        <th>Sex</th>
                        <th>Kids</th>
                        <th>Dogs</th>
                        <th>Cats</th>
                        <th>House trained</th>
                        <th>Special needs</th>
                        <th>Group</th>
                        <th>Similarity</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${rowsHtml}
                    </tbody>
                  </table>
                </div>
              </div>
            `;
          }
      



    // ---------- MAIN DASHBOARD UPDATE ----------
    function updateShelterDashboard(rows, shelterName) {
      renderShelterTable(rows);
      updateCarouselMetrics(rows, shelterName);
      renderBreedChart(rows, shelterName);
      renderOriginsSankey(rows, shelterName);
      renderBreedForceGraph(rows, shelterName);
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
        selectedBreed = null;
        selectedOrigin = null;
        currentShelterName = "ALL";
        updateShelterDashboard(shelterData, "ALL");
      });
    }
  
    function selectShelter(shelterName) {
      const meta = shelterMap.get(shelterName);
  
      dropdownBtn.text(shelterName);
      label.text(`${shelterName} • ${meta ? meta.count : 0} dogs`);
  
      cardPage = 0;
      selectedBreed = null;
      selectedOrigin = null;
      currentShelterName = shelterName;
  
      const rows = shelterData.filter(
        (r) => r[SHELTER_FIELD] === shelterName
      );
  
      updateShelterDashboard(rows, shelterName);
    }

        // ---------- RECOMMENDER FORM LOGIC ----------
if (matchFormEl && matchResultsEl) {
    matchFormEl.addEventListener("submit", async (event) => {
      event.preventDefault();
  
      const formData = new FormData(matchFormEl);
      const payload = {};
  
      const keys = [
        "age",
        "size",
        "sex",
        "coat",
        "env_children",
        "breed_mixed",
        "env_dogs",
        "env_cats",
        "house_trained",
        "special_needs",
      ];
  
      // 👇 NEW: send the currently selected shelter
      // If "ALL", we send null so backend can treat it as "no shelter filter".
      const shelterNameForPayload =
        currentShelterName && currentShelterName !== "ALL"
          ? currentShelterName
          : null;
  
      payload.shelter_name = shelterNameForPayload;
  
      keys.forEach((k) => {
        const v = formData.get(k);
        if (v !== null && v !== "") {
          payload[k] = String(v);
        }
      });
  
      // Top N
      const topN = formData.get("top_n");
      if (topN) {
        payload.top_n = parseInt(topN, 10);
      }
  
      // Optional: show "loading" message
      matchResultsEl.innerHTML = `
        <p class="text-muted small">Finding matches…</p>
      `;
  
      try {
        const resp = await fetch("/api/recommend_dogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
  
        if (!resp.ok) {
          console.error("Recommend API error:", resp.status, resp.statusText);
          matchResultsEl.innerHTML = `
            <div class="alert alert-danger py-2 my-2">
              There was a problem finding matches. Please try again.
            </div>
          `;
          return;
        }
  
        const data = await resp.json();
        console.log("🔍 Recommendation response:", data);
        renderMatchResults(data.matches || []);
      } catch (err) {
        console.error("Recommend request failed:", err);
        matchResultsEl.innerHTML = `
          <div class="alert alert-danger py-2 my-2">
            Could not reach the recommendation service.
          </div>
        `;
      }
    });
  }
  
      
  
    // ---------- INIT ----------
    renderShelterList("");
    label.text("Showing all shelters");
    updateShelterDashboard(shelterData, "ALL");
  })();
  
  
  // ---------------------------------------------------------
  // d3TableWithControls helper
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
  
  
    
  
  
  