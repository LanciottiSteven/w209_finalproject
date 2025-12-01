// static/js/shelter.js

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
    let selectedBreed = null;
    let selectedOrigin = null;
  
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

    const originTreemapContainer = document.getElementById("originTreemapContainer");
    const originTreemapSvgEl = document.getElementById("originTreemap");

  
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
  
    // ---------- TABLE (now just clears; d3TableWithControls removed) ----------
    function renderShelterTable(rows) {
      if (!stateTableEl) return;
      stateTableEl.innerHTML = "";
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
      const step = Math.ceil(maxCount / 5);  // ~5 ticks
      const integerTicks = d3.range(0, maxCount + 1, step);

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
          if (selectedBreed === d.breed) {
            selectedBreed = null;
          } else {
            selectedBreed = d.breed;
          }
          cardPage = 0;
          renderDogCards(baseRows, shelterName);
          renderOriginsSankey(baseRows, shelterName);
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
          if (selectedOrigin === d.source.name) {
            selectedOrigin = null;
          } else {
            selectedOrigin = d.source.name;
          }
          cardPage = 0;
          renderDogCards(baseRows, shelterName);
          renderBreedChart(baseRows, shelterName);
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
    function renderOriginTreemap(baseRows, shelterName) {
        if (!originTreemapContainer || !originTreemapSvgEl) return;
      
        const svg = d3.select(originTreemapSvgEl);
        svg.selectAll("*").remove();
      
        // 🚫 Don't render anything meaningful until a specific shelter is selected
        if (!shelterName || shelterName === "ALL") {
          svg
            .attr("width", originTreemapContainer.clientWidth || 600)
            .attr("height", 320)
            .append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("text-anchor", "middle")
            .attr("fill", "#999")
            .style("font-size", "11px")
            .text("Select a shelter to view treemap.");
          return;
        }
      
        // ✅ Filter rows to the selected shelter
        let rows = (baseRows || []).filter(
          (r) => r[SHELTER_FIELD] === shelterName
        );
      
        // Apply same filters as cards (breed + origin)
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
      
        if (!rows || !rows.length) {
          svg
            .attr("width", originTreemapContainer.clientWidth || 600)
            .attr("height", 320)
            .append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("text-anchor", "middle")
            .attr("fill", "#999")
            .style("font-size", "11px")
            .text("No data for treemap.");
          return;
        }
      
        // ---- Build hierarchy: Origin -> Breed -> Dog ----
        const byOrigin = d3.group(
          rows,
          (d) => (d[FOUND_FIELD] || "Unknown origin").toString().trim(),
          (d) => (d.breed_primary || "Unknown").toString().trim()
        );
      
        const rootData = {
          name: "All origins",
          children: Array.from(byOrigin, ([origin, breedsMap]) => ({
            name: origin,
            children: Array.from(breedsMap, ([breed, dogs]) => ({
              name: breed,
              children: dogs.map((dog) => ({
                name: dog.name || "Unknown",
                value: 1,
                origin,
                breed,
              })),
            })),
          })),
        };
      
        // Layout dimensions (shared across zoom levels)
        const margin = { top: 18, right: 16, bottom: 16, left: 16 };
        const fullWidth = originTreemapContainer.clientWidth || 600;
        const fullHeight = 300;  // match Sankey height
        const width = fullWidth - margin.left - margin.right;
        const height = fullHeight - margin.top - margin.bottom;

        svg.attr("width", fullWidth).attr("height", fullHeight);


                
      
        const fullRootData = rootData; // keep original for "Back" behavior
      
        // Shared tooltip
        let tooltip = d3.select("#originTreemapTooltip");
        if (tooltip.empty()) {
          tooltip = d3
            .select("body")
            .append("div")
            .attr("id", "originTreemapTooltip")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("background", "rgba(0,0,0,0.8)")
            .style("color", "#fff")
            .style("padding", "4px 8px")
            .style("border-radius", "4px")
            .style("font-size", "11px")
            .style("opacity", 0);
        }
      
        /**
         * Draw a treemap view for the given "currentData" subtree.
         * currentData is an object with {name, children...} like rootData or one of its children.
         */
        function drawTreemap(currentData, levelLabel) {
          svg.selectAll("*").remove();
      
          const g = svg
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
      
          // Build hierarchy for this subtree
          const root = d3
            .hierarchy(currentData)
            .sum((d) => (d.value ? d.value : 0))
            .sort((a, b) => (b.value || 0) - (a.value || 0));
      
          d3
            .treemap()
            .size([width, height])
            .paddingInner(1)
            .paddingOuter(2)(root);
      
          // Show one level down from current root (children)
          const nodes = root.children || [];
      
          // Header label / breadcrumb
          g
            .append("text")
            .attr("x", 2)
            .attr("y", -4)
            .attr("fill", "#111")
            .style("font-size", "11px")
            .style("font-weight", "600")
            .text(levelLabel || "Origins");
      
          // "Back" link when not at top
          if (currentData !== fullRootData) {
            g
              .append("text")
              .attr("x", width)
              .attr("y", -4)
              .attr("text-anchor", "end")
              .attr("fill", "#2563eb")
              .style("font-size", "11px")
              .style("cursor", "pointer")
              .text("⟵ Back to origins")
              .on("click", () => drawTreemap(fullRootData, "Origins"));
          }
      
          const nodeGroups = g
            .selectAll("g.treemap-node")
            .data(nodes)
            .join("g")
            .attr("class", "treemap-node")
            .attr("transform", (d) => `translate(${d.x0},${d.y0})`);
      
          // Color by origin (use dog.origin if present; otherwise use node name)
          const allLeaves = root.leaves();
          const color = d3
            .scaleOrdinal(d3.schemeCategory10)
            .domain(
              Array.from(
                new Set(
                  allLeaves.map(
                    (d) => d.data.origin || d.parent?.parent?.data.name || d.data.name
                  )
                )
              )
            );
      
          nodeGroups
            .append("rect")
            .attr("width", (d) => Math.max(0, d.x1 - d.x0))
            .attr("height", (d) => Math.max(0, d.y1 - d.y0))
            .attr("fill", (d) => {
              // Leaves (dogs) have d.data.origin; origins / breeds won't
              const originName =
                d.data.origin || d.parent?.parent?.data.name || d.data.name;
              return color(originName);
            })
            .attr("stroke", "#fff")
            .on("mouseover", function (event, d) {
              d3.select(this).attr("stroke", "#000");
      
              const isRootLevel = currentData === fullRootData;
              const hasChildren = !!d.children && d.children.length > 0;
              let html = "";
      
              if (isRootLevel && hasChildren) {
                // Origin level
                html = `<strong>Origin:</strong> ${d.data.name}<br/>
                        Dogs: ${d.value || 0}`;
              } else if (!isRootLevel && hasChildren) {
                // Breed level within a specific origin
                const originName = currentData.name;
                html = `<strong>Breed:</strong> ${d.data.name}<br/>
                        Origin: ${originName}<br/>
                        Dogs: ${d.value || 0}`;
              } else {
                // Leaf (dog) level
                const originName =
                  d.data.origin || currentData.origin || currentData.name;
                html = `<strong>Dog:</strong> ${d.data.name}<br/>
                        Breed: ${d.data.breed || currentData.name}<br/>
                        Origin: ${originName}`;
              }
      
              tooltip.style("opacity", 1).html(html);
            })
            .on("mousemove", function (event) {
              tooltip
                .style("left", event.pageX + 12 + "px")
                .style("top", event.pageY - 20 + "px");
            })
            .on("mouseout", function () {
              d3.select(this).attr("stroke", "#fff");
              tooltip.style("opacity", 0);
            })
            .on("click", function (event, d) {
              // Drill down only if node has children
              if (d.children && d.children.length) {
                let nextLabel;
                const isRootLevel = currentData === fullRootData;
      
                if (isRootLevel) {
                  // Going from Origins -> Breeds
                  nextLabel = `Breeds from ${d.data.name}`;
                } else {
                  // Going from Breeds -> Dogs
                  nextLabel = `Dogs in ${d.data.name}`;
                }
      
                drawTreemap(d.data, nextLabel);
              }
            });
      
          // Short label (name) inside each tile
          nodeGroups
            .append("text")
            .attr("x", 3)
            .attr("y", 11)
            .attr("font-size", "9px")
            .attr("fill", "#000")
            .attr("pointer-events", "none")
            .text((d) => d.data.name)
            .each(function (d) {
              const rectWidth = d.x1 - d.x0;
              const text = d3.select(this);
              const textNode = this;
              if (textNode.getComputedTextLength() > rectWidth - 6) {
                let txt = d.data.name;
                while (txt.length && textNode.getComputedTextLength() > rectWidth - 10) {
                  txt = txt.slice(0, -1);
                  text.text(txt + "…");
                }
              }
            });
        }
      
        // 🔰 Initial view: Origins level
        drawTreemap(fullRootData, "Origins");
      }
      
      
    // ---------- BREED FORCE NETWORK ----------
    function renderBreedForceGraph(rows, shelterName) {
      if (!breedForceContainer || !breedForceSvgEl) return;
  
      const svg = d3.select(breedForceSvgEl);
      svg.selectAll("*").remove();
  
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
  
      const byOrigin = d3.group(rows, (d) =>
        String(d[FOUND_FIELD] || "Unknown origin").trim()
      );
  
      const breedCounts = new Map();
      const pairCounts = new Map();
  
      for (const [origin, group] of byOrigin.entries()) {
        const breeds = Array.from(
          new Set(
            group
              .map((r) => (r.breed_primary || "Unknown").toString().trim())
              .filter((b) => b)
          )
        );
  
        breeds.forEach((b) => {
          breedCounts.set(b, (breedCounts.get(b) || 0) + 1);
        });
  
        for (let i = 0; i < breeds.length; i++) {
          for (let j = i + 1; j < breeds.length; j++) {
            const b1 = breeds[i];
            const b2 = breeds[j];
            const key = b1 < b2 ? `${b1}||${b2}` : `${b2}||${b1}`;
            pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
          }
        }
      }
  
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
  
      let links = Array.from(pairCounts, ([key, value]) => {
        const [b1, b2] = key.split("||");
        return { source: b1, target: b2, value };
      }).filter((l) => keptBreeds.has(l.source) && keptBreeds.has(l.target));
  
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
  
      const nodes = breedList;
  
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
  
      const maxCount = d3.max(nodes, (d) => d.count) || 1;
      const rScale = d3.scaleSqrt().domain([1, maxCount]).range([6, 20]);
  
      const simulation = d3
        .forceSimulation(nodes)
        .force(
          "link",
          d3.forceLink(links).id((d) => d.id)
            .distance((d) => 60 + 10 * d.value)
            .strength(0.4)
        )
        .force("charge", d3.forceManyBody().strength(-140))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius((d) => rScale(d.count) + 4));
  
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
  
      const link = g
        .append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", (d) => Math.max(1, d.value));
  
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
               Seen in ${d.count} origin${d.count === 1 ? "" : "s"} in this selection`
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
        .attr("fill", "#000")
        .text((d) => d.id);
  
      simulation.on("tick", () => {
        link
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);
  
        node.attr("transform", (d) => `translate(${d.x},${d.y})`);
      });
  
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
  
    // ---------- RADAR + GAUGE HELPERS ----------
    function mapAgeToScore(age) {
      const a = (age || "").toLowerCase();
      if (a === "baby") return 1.0;
      if (a === "young") return 0.75;
      if (a === "adult") return 0.5;
      if (a === "senior") return 0.25;
      return 0.5;
    }
  
    function mapSizeToScore(size) {
      const s = (size || "").toLowerCase();
      if (s === "small") return 1.0;
      if (s === "medium") return 0.75;
      if (s === "large") return 0.5;
      if (s === "xlarge" || s === "extra large") return 0.25;
      return 0.5;
    }
  
    function mapYesNoToScore(v) {
      const raw = (v ?? "").toString().toLowerCase().trim();
      if (raw === "1" || raw === "yes" || raw === "true") return 1.0;
      if (raw === "0" || raw === "no" || raw === "false") return 0.0;
      return 0.5;
    }
  
    function mapSexToScore(sex) {
      const s = (sex || "").toLowerCase();
      if (s === "male" || s === "m") return 1.0;
      if (s === "female" || s === "f") return 0.7;
      return 0.85;
    }
  
    function normalizeYesNoLabel(v) {
        const raw = (v ?? "").toString().toLowerCase().trim();
        if (raw === "1" || raw === "yes" || raw === "true") return "Yes";
        if (raw === "0" || raw === "no" || raw === "false") return "No";
        return "Unknown";
      }
      
      function buildRadarDataForDog(dog) {
        return [
          {
            axis: "Age",
            value: mapAgeToScore(dog.age),
            raw: dog.age ?? "Unknown"
          },
          {
            axis: "Size",
            value: mapSizeToScore(dog.size),
            raw: dog.size ?? "Unknown"
          },
          {
            axis: "Kids",
            value: mapYesNoToScore(dog.env_children),
            raw: normalizeYesNoLabel(dog.env_children)
          },
          {
            axis: "Dogs",
            value: mapYesNoToScore(dog.env_dogs),
            raw: normalizeYesNoLabel(dog.env_dogs)
          },
          {
            axis: "Sex",
            value: mapSexToScore(dog.sex),
            raw: dog.sex ?? "Unknown"
          },
        ];
      }
      
  
    function drawSimilarityGauge(containerSelector, similarity) {
        const container = d3.select(containerSelector);
        container.selectAll("*").remove();
      
        const node = container.node();
        if (!node) return;
      
        // Dynamically size but cap the max width so it doesn't blow up
        const containerWidth = node.clientWidth || 200;
        const maxWidth = 220;
        const width = Math.min(containerWidth, maxWidth);
        const height = Math.max(90, width * 0.45); // short, compact gauge
      
        const outerRadius = Math.min(width, height * 2) * 0.45;
        const innerRadius = outerRadius - 10;
      
        const svg = container
          .append("svg")
          .attr("width", "100%")
          .attr("height", height)
          .attr("viewBox", `0 0 ${width} ${height}`)
          .attr("preserveAspectRatio", "xMidYMid meet");
      
        const g = svg
          .append("g")
          .attr("transform", `translate(${width / 2},${height})`);
      
        const bgArc = d3.arc()
          .innerRadius(innerRadius)
          .outerRadius(outerRadius)
          .startAngle(-Math.PI)
          .endAngle(0);
      
        g.append("path")
          .attr("d", bgArc)
          .attr("fill", "#eee");
      
        const clamped = Math.max(0, Math.min(1, similarity || 0));
        const fgArc = d3.arc()
          .innerRadius(innerRadius)
          .outerRadius(outerRadius)
          .startAngle(-Math.PI)
          .endAngle(-Math.PI + Math.PI * clamped);
      
        g.append("path")
          .attr("d", fgArc)
          .attr("fill", "#5a8dee");
      
        g.append("text")
          .attr("text-anchor", "middle")
          .attr("y", -outerRadius * 0.8)
          .style("font-size", Math.max(11, width * 0.11) + "px")
          .text(`${(clamped * 100).toFixed(0)}%`);
      
        g.append("text")
          .attr("text-anchor", "middle")
          .attr("y", -outerRadius * 0.55)
          .style("font-size", "9px")
          .style("fill", "#666")
          .text("Match");
      }
      
  
      function drawRadarChart(containerSelector, data) {
        const container = d3.select(containerSelector);
        container.selectAll("*").remove();
      
        if (!data || !data.length) {
          container
            .append("p")
            .attr("class", "text-muted small mb-0")
            .text("No profile data.");
          return;
        }
      
        const node = container.node();
        if (!node) return;
      
        const containerWidth = node.clientWidth || 220;
        const maxSide = 260;                 // cap so it doesn't get huge
        const side = Math.min(containerWidth, maxSide);
        const width = side;
        const height = side * 0.9;          // slightly squat so it fits under the gauge
        const margin = 18;
        const radius = Math.min(width, height) / 2 - margin;
        const levels = 4;
        const angleSlice = (Math.PI * 2) / data.length;
      
        const svg = container
          .append("svg")
          .attr("width", "100%")
          .attr("height", height)
          .attr("viewBox", `0 0 ${width} ${height}`)
          .attr("preserveAspectRatio", "xMidYMid meet");
      
        const g = svg
          .append("g")
          .attr("transform", `translate(${width / 2},${height / 2})`);
      
        const rScale = d3.scaleLinear().domain([0, 1]).range([0, radius]);
      
        // Grid circles
        for (let l = 1; l <= levels; l++) {
          const r = (radius / levels) * l;
          g.append("circle")
            .attr("r", r)
            .attr("fill", "none")
            .attr("stroke", "#eee");
        }
      
        // Axes & labels
        const axis = g
          .selectAll(".axis")
          .data(data)
          .join("g")
          .attr("class", "axis");
      
        axis
          .append("line")
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", (d, i) =>
            rScale(1) * Math.cos(angleSlice * i - Math.PI / 2)
          )
          .attr("y2", (d, i) =>
            rScale(1) * Math.sin(angleSlice * i - Math.PI / 2)
          )
          .attr("stroke", "#ccc");
      
        axis
          .append("text")
          .attr("x", (d, i) =>
            rScale(1.15) * Math.cos(angleSlice * i - Math.PI / 2)
          )
          .attr("y", (d, i) =>
            rScale(1.15) * Math.sin(angleSlice * i - Math.PI / 2)
          )
          .attr("dy", "0.35em")
          .style("font-size", "9px")
          .style("text-anchor", "middle")
          .text((d) => d.axis);
      
        const line = d3
          .lineRadial()
          .radius((d) => rScale(d.value))
          .angle((d, i) => i * angleSlice)
          .curve(d3.curveLinearClosed);
      
        // Radar area shape
        g.append("path")
          .datum(data)
          .attr("d", line)
          .attr("fill", "rgba(90, 141, 238, 0.25)")
          .attr("stroke", "#5a8dee")
          .attr("stroke-width", 2);
      
        // Tooltip (shared for all points)
        let tooltip = d3.select("#radarTooltip");
        if (tooltip.empty()) {
          tooltip = d3
            .select("body")
            .append("div")
            .attr("id", "radarTooltip")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("background", "rgba(0,0,0,0.8)")
            .style("color", "#fff")
            .style("padding", "4px 8px")
            .style("border-radius", "4px")
            .style("font-size", "11px")
            .style("opacity", 0);
        }
      
        // Hoverable points at each vertex
        const points = g
          .selectAll("circle.radar-point")
          .data(data)
          .join("circle")
          .attr("class", "radar-point")
          .attr("r", 3)
          .attr("cx", (d, i) =>
            rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2)
          )
          .attr("cy", (d, i) =>
            rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2)
          )
          .attr("fill", "#5a8dee")
          .attr("stroke", "#fff")
          .attr("stroke-width", 1)
          .on("mouseover", function (event, d) {
            d3.select(this).attr("fill", "#345bb3");
      
            tooltip
              .style("opacity", 1)
              .html(() => {
                const rawVal = d.raw ?? "";
                return `<strong>${d.axis}</strong><br/>${rawVal}`;
              });
          })
          .on("mousemove", function (event) {
            tooltip
              .style("left", event.pageX + 12 + "px")
              .style("top", event.pageY - 20 + "px");
          })
          .on("mouseout", function () {
            d3.select(this).attr("fill", "#5a8dee");
            tooltip.style("opacity", 0);
          });
      }
      
      
  
    // ---------- RECOMMENDER RESULTS WITH SCROLLSPY ----------
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
  
      const sorted = [...matches].sort((a, b) => {
        const sa = a.similarity ?? 0;
        const sb = b.similarity ?? 0;
        return sb - sa;
      });
  
      const navLinksHtml = sorted
        .map((m, i) => {
          const sim = typeof m.similarity === "number" ? m.similarity : 0;
          const pct = (sim * 100).toFixed(0);
          const label = m.name || `Dog ${i + 1}`;
          return `
            <a href="#dog-rec-${i}" class="list-group-item list-group-item-action">
              ${label}
              <span class="d-block small text-muted">${pct}% match</span>
            </a>
          `;
        })
        .join("");
  
      const sectionsHtml = sorted
        .map((m, i) => {
          const sim = typeof m.similarity === "number" ? m.similarity : 0;
          const pct = (sim * 100).toFixed(1);
  
          const name = m.name ?? "Unknown";
          const age = m.age ?? "Unknown";
          const breed = m.breed_primary ?? "Unknown";
          const size = m.size ?? "Unknown";
          const sex = m.sex ?? "Unknown";
          const shelter = m.shelter_name ?? "Unknown shelter";
          const address = m.shelter_address ?? "";
          const kids = m.env_children ?? "";
          const dogs = m.env_dogs ?? "";
          const cats = m.env_cats ?? "";
          const house = m.house_trained ?? "";
          const special = m.special_needs ?? "";
  
          let img = m.image || null;
          if (img) {
            img = String(img).trim();
            const parts = img.split(/[\\/]/);
            const fileName = parts[parts.length - 1];
            if (
              !img.startsWith("http://") &&
              !img.startsWith("https://") &&
              !img.startsWith("/")
            ) {
              img = window.dog_image_base
                ? window.dog_image_base + fileName
                : "/static/images/" + fileName;
            }
          } else {
            img = "/static/images/image2.jpg";
          }
  
          return `
            <section id="dog-rec-${i}" class="mb-4">
              <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                  <div>
                    <strong>${name}</strong>
                    <span class="text-muted small d-block">
                      ${breed} • ${age} • ${size} • ${sex}
                    </span>
                    <span class="text-muted small d-block">
                      ${shelter}${address ? " • " + address : ""}
                    </span>
                  </div>
                  <span class="badge bg-primary">${pct}% match</span>
                </div>
                <div class="card-body">
                  <div class="row g-3 align-items-stretch">
  
                    <!-- Dog flip card (same style as main dog cards) -->
                    <div class="col-lg-4 col-md-5">
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
                            <div class="px-2 small text-center">
                              <p class="mb-1"><strong>Good with kids:</strong> ${kids}</p>
                              <p class="mb-1"><strong>Good with dogs:</strong> ${dogs}</p>
                              <p class="mb-1"><strong>Good with cats:</strong> ${cats}</p>
                              <p class="mb-1"><strong>House trained:</strong> ${house}</p>
                              <p class="mb-0"><strong>Special needs:</strong> ${special}</p>
                            </div>
                          </div>
  
                        </div>
                      </div>
                    </div>
  
                    <!-- Visualizations stacked vertically -->
                    <div class="col-lg-8 col-md-7">
                      <div class="row g-3">
                        <div class="col-12">
                          <h6 class="mb-1">Similarity meter</h6>
                          <div id="similarityGauge-${i}" style="min-height: 120px;"></div>
                        </div>
                        <div class="col-12">
                          <h6 class="mb-1">Profile radar</h6>
                          <div id="radarChart-${i}" style="min-height: 220px;"></div>
                        </div>
                      </div>
                    </div>
  
                  </div>
                </div>
              </div>
            </section>
          `;
        })
        .join("");
  
      matchResultsEl.innerHTML = `
        <div class="row">
          <nav class="col-md-3 d-none d-md-block">
            <div class="position-sticky" style="top: 1rem;">
              <div class="list-group" id="matchScrollspyList">
                ${navLinksHtml}
              </div>
            </div>
          </nav>
  
          <div class="col-md-9">
            <div id="matchScrollspyScroll"
                 data-bs-spy="scroll"
                 data-bs-target="#matchScrollspyList"
                 data-bs-smooth-scroll="true"
                 class="scrollspy-example"
                 tabindex="0"
                 style="max-height: 640px; overflow-y: auto; position: relative;">
              ${sectionsHtml}
            </div>
          </div>
        </div>
      `;
  
      if (window.bootstrap && bootstrap.ScrollSpy) {
        const scrollSpyEl = document.getElementById("matchScrollspyScroll");
        const existing = bootstrap.ScrollSpy.getInstance(scrollSpyEl);
        if (existing) existing.dispose();
        new bootstrap.ScrollSpy(scrollSpyEl, {
          target: "#matchScrollspyList",
          offset: 10,
        });
      }
  
      sorted.forEach((dog, i) => {
        drawSimilarityGauge(`#similarityGauge-${i}`, dog.similarity ?? 0);
        drawRadarChart(`#radarChart-${i}`, buildRadarDataForDog(dog));
      });
    }
  
    // ---------- MAIN DASHBOARD UPDATE ----------
    function updateShelterDashboard(rows, shelterName) {
      renderShelterTable(rows);
      updateCarouselMetrics(rows, shelterName);
      renderBreedChart(rows, shelterName);
      renderOriginsSankey(rows, shelterName);
      renderOriginTreemap(rows, shelterName);
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
  
        const topN = formData.get("top_n");
        if (topN) {
          payload.top_n = parseInt(topN, 10);
        }
  
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
  
  