// Define class for the document structure
export class Document {
}
;
// Define class for the paginated results structure
export class PaginatedResults {
}
// Define the filter options interface
export class CustomFilter {
}
;
let keyModeMap = undefined;
let searchResultsDiv = document.querySelector("#search-results");
let template = document.querySelector("#search-item-template");
let searchResultsCount = document.querySelector("#search-results-count");
let searchResultsShow = document.querySelector("#search-results-show");
let facetsDiv1 = document.querySelector("#facet1");
let facetTemplate = document.querySelector("#facet-template");
let paginationDiv = document.querySelector("#pagination");
let paginationTemplate = document.querySelector("#pagination-template");
let form = document.querySelector("#search-form");
let excludedFacets = new Set();
const excludedFacetsRaw = (form === null || form === void 0 ? void 0 : form.dataset.excludedFacets) || "[]";
try {
    const parsed = JSON.parse(excludedFacetsRaw);
    if (Array.isArray(parsed)) {
        excludedFacets = new Set(parsed
            .map(v => String(v).trim())
            .filter(v => v !== ""));
    }
}
catch (_a) {
    // Backward-compatibility for older CSV data-excluded-facets values.
    excludedFacets = new Set(excludedFacetsRaw
        .split(",")
        .map(v => v.trim())
        .filter(v => v !== ""));
}
const facetConfigs = [
    {
        name: "keyMode",
        field: "keyMode",
        container: facetsDiv1,
        labels: () => keyModeMap
    }
];
// Function to paginate results
function paginateResults(results, page = 1, resultsPerPage = 10) {
    const paginatedResults = new PaginatedResults();
    paginatedResults.page = page;
    paginatedResults.resultsPerPage = resultsPerPage;
    paginatedResults.totalResults = results.length;
    paginatedResults.totalPages = Math.ceil(paginatedResults.totalResults / resultsPerPage);
    const start = (page - 1) * resultsPerPage;
    const end = start + resultsPerPage;
    paginatedResults.results = results.slice(start, end);
    return paginatedResults;
}
// Function to aggregate facets
function aggregateFacets(results, facetName) {
    const facets = {};
    results.forEach(doc => {
        const facetValue = doc[facetName];
        if (Array.isArray(facetValue)) {
            facetValue.forEach(val => facets[val] = (facets[val] || 0) + 1);
        }
        else if (facetValue) {
            facets[facetValue] = (facets[facetValue] || 0) + 1;
        }
    });
    return facets;
}
// Function to add text or hide element
function addTextOrHide(text, element) {
    if (text) {
        element.innerHTML = text;
    }
    else {
        element.style.display = 'none';
    }
}
// Function to render the results
function renderResults(paginatedResults) {
    searchResultsCount.innerHTML = `${paginatedResults.totalResults}`;
    if (paginatedResults.totalPages > 1) {
        const first = paginatedResults.resultsPerPage * (paginatedResults.page - 1) + 1;
        const last = Math.min(first + paginatedResults.resultsPerPage - 1, paginatedResults.totalResults);
        searchResultsShow.innerHTML += ` (${first} – ${last})`;
    }
    paginatedResults.results.forEach(doc => {
        const output = document.importNode(template.content, true);
        const title = output.querySelector("a.docTitle");
        const scoringSummary = output.querySelector("p.scoringSummary");
        const keyMode = output.querySelector("p.keyMode");
        const instr = output.querySelector("p.textIncipit");
        const incipit = output.querySelector("img.incipit");
        const div = document.createElement("div");
        div.innerHTML = doc.title + " – " + doc.catalogNumber;
        title.setAttribute("href", "./resolve.html?id=" + doc.id.replace(/^https:\/\/rism.online\/(.*)$/i, "rism:$1"));
        title.appendChild(div);
        addTextOrHide(doc.scoringSummary, scoringSummary);
        if (doc.keyMode) {
            keyMode.innerHTML = (keyModeMap) ? keyModeMap[doc.keyMode] : doc.keyMode;
        }
        else
            keyMode.style.display = 'none';
        if (doc.textIncipit !== null) {
            instr.innerHTML = doc.textIncipit.join(", ").substring(0, 200) + '...';
        }
        else
            instr.style.display = 'none';
        if (doc.incipit !== undefined) {
            incipit.setAttribute("src", "./incipits/" + doc.incipit + ".svg");
        }
        else
            incipit.style.display = 'none';
        searchResultsDiv.appendChild(output);
    });
}
// Function to create a facet option node
function createFacetOption(facet, facetName, facetLabel, checked) {
    const option = document.importNode(facetTemplate.content, true);
    const label = option.querySelector("label.checkbox span");
    const input = option.querySelector("input");
    label.innerHTML = facetLabel;
    input.setAttribute("name", facetName);
    input.setAttribute("value", facet);
    if (checked) {
        input.setAttribute("checked", "true");
    }
    // Add event listener for selecting this facet
    input.addEventListener('click', () => { form.submit(); });
    return option;
}
// Function to render the facet
function renderFacet(div, facets, facetName, applied, labelMap = undefined) {
    if (!div)
        return;
    div.innerHTML = '';
    for (const facet in facets) {
        let label = (labelMap) ? labelMap[facet] : facet;
        const option = createFacetOption(facet, facetName, `${label} (${facets[facet]})`, applied.includes(facet));
        div.appendChild(option);
    }
}
// Function to create a pagination button node
function createPaginationButton(page, text, current = false) {
    const params = new URLSearchParams(location.search);
    const a = document.importNode(paginationTemplate.content, true).querySelector("a");
    a.innerHTML = text;
    params.set('page', page.toString());
    a.setAttribute("href", "?" + params.toString());
    if (current) {
        a.classList.remove("is-light");
        a.setAttribute("disabled", "true");
    }
    return a;
}
// Function to render the pagination controls
function renderPagination(paginatedResults) {
    const page = paginatedResults.page;
    // Previous Button
    if (page > 1) {
        paginationDiv.appendChild(createPaginationButton(1, "&lt;&lt;"));
        paginationDiv.appendChild(createPaginationButton(page - 1, "&lt;"));
    }
    // Page Numbers
    const pageWindow = 5; // Number of pages to display at once
    let startPage = Math.max(1, page - Math.floor(pageWindow / 2));
    let endPage = Math.min(paginatedResults.totalPages, startPage + pageWindow - 1);
    if (endPage - startPage < pageWindow - 1) {
        startPage = Math.max(1, endPage - pageWindow + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
        paginationDiv.appendChild(createPaginationButton(i, `${i}`, (page === i)));
    }
    // Next Button
    if (page < paginatedResults.totalPages) {
        paginationDiv.appendChild(createPaginationButton(page + 1, "&gt;"));
        paginationDiv.appendChild(createPaginationButton(paginatedResults.totalPages, "&gt;&gt;"));
    }
}
// Function to apply a custom filter 
function filterResults(results, filterOptions) {
    facetConfigs.forEach(facet => {
        const value = filterOptions[facet.name];
        if (!value)
            return;
        results = results.filter((doc) => doc[facet.field] === value);
    });
    return results;
}
Promise.all([
    fetch("./index/keyMode.json").then(r => r.json()),
    fetch("./index/index.json").then(r => r.json())
])
    .then(([keyModeData, documents]) => {
    keyModeMap = keyModeData;
    const idx = new FlexSearch.Document({
        document: {
            id: 'id',
            index: ['title', 'catalogNumber', 'scoringSummary', 'keyMode', 'textIncipit']
        }
    });
    documents.forEach(doc => {
        idx.add(Object.assign(Object.assign({}, doc), { textIncipit: (doc.textIncipit || []).join(" ") }));
    });
    let page = 1;
    const appliedFacetValues = {};
    let searchQuery = "";
    let filterOptions = new CustomFilter();
    // Parse the URL parameters
    const params = new URLSearchParams(document.location.search.substring(1));
    params.forEach((value, key) => {
        if (key === 'q' && value !== "") {
            document.getElementById("website-search").value = value;
            searchQuery = value;
        }
        else if (key === "page") {
            page = parseInt(value);
        }
        else {
            const facet = facetConfigs.find(f => f.name === key);
            if (facet && !excludedFacets.has(facet.name)) {
                filterOptions[facet.name] = value;
                appliedFacetValues[facet.name] = [value];
            }
        }
    });
    let searchResults = [];
    if (searchQuery !== "") {
        const matchedIds = new Set();
        const idxResults = idx.search(searchQuery, { enrich: true, limit: 10000 });
        idxResults.forEach(result => {
            result.result.forEach((id) => matchedIds.add(id));
        });
        searchResults = documents.filter(doc => matchedIds.has(doc.id));
    }
    else {
        searchResults = documents;
    }
    let filteredResults = filterResults(searchResults, filterOptions);
    // Pagination: Get results for page 1 with 20 results per page
    const resultsPerPage = 20;
    const paginatedResults = paginateResults(filteredResults, page, resultsPerPage);
    renderResults(paginatedResults);
    renderPagination(paginatedResults);
    facetConfigs.forEach(facet => {
        if (excludedFacets.has(facet.name))
            return;
        const categoryFacets = aggregateFacets(filteredResults, facet.field);
        renderFacet(facet.container, categoryFacets, facet.name, appliedFacetValues[facet.name] || [], facet.labels ? facet.labels() : undefined);
    });
})
    .catch(error => console.error("Error loading data:", error));
//# sourceMappingURL=search.js.map