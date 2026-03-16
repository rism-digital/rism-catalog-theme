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
let searchResultsDiv = document.querySelector("#search-results");
let template = document.querySelector("#search-item-template");
let searchResultsCount = document.querySelector("#search-results-count");
let searchResultsShow = document.querySelector("#search-results-show");
let facetKeyMode = document.querySelector("#facet1");
let facetRelationships = document.querySelector("#facet2");
let facetTemplate = document.querySelector("#facet-template");
let paginationDiv = document.querySelector("#pagination");
let paginationTemplate = document.querySelector("#pagination-template");
let form = document.querySelector("#search-form");
let dateFromInput = document.querySelector("#date-from");
let dateToInput = document.querySelector("#date-to");
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
        container: facetKeyMode
    },
    {
        name: "relationships",
        field: "relationships",
        container: facetRelationships
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
            keyMode.innerHTML = doc.keyMode;
        }
        else
            keyMode.style.display = 'none';
        if (Array.isArray(doc.textIncipit) && doc.textIncipit.length > 0) {
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
function renderFacet(div, facets, facetName, applied) {
    if (!div)
        return;
    div.innerHTML = '';
    const sortedFacets = Object.keys(facets).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    for (const facet of sortedFacets) {
        const option = createFacetOption(facet, facetName, `${facet} (${facets[facet]})`, applied.includes(facet));
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
        results = results.filter((doc) => {
            const fieldValue = doc[facet.field];
            if (Array.isArray(fieldValue)) {
                return fieldValue.includes(value);
            }
            return fieldValue === value;
        });
    });
    if (!excludedFacets.has("dateRange")) {
        const from = filterOptions.dateFrom;
        const to = filterOptions.dateTo;
        if (from || to) {
            results = results.filter((doc) => {
                const docEarliest = doc.earliestDate;
                const docLatest = doc.latestDate;
                if (docEarliest === undefined || docLatest === undefined)
                    return false;
                if (from && docLatest < from)
                    return false;
                if (to && docEarliest > to)
                    return false;
                return true;
            });
        }
    }
    return results;
}
function parseYearInput(value) {
    if (!value)
        return undefined;
    const match = value.match(/-?\d{1,4}/);
    if (!match)
        return undefined;
    return parseInt(match[0], 10);
}
function computeDateBounds(documents) {
    let min = undefined;
    let max = undefined;
    documents.forEach((doc) => {
        if (doc.earliestDate !== undefined) {
            min = (min === undefined) ? doc.earliestDate : Math.min(min, doc.earliestDate);
        }
        if (doc.latestDate !== undefined) {
            max = (max === undefined) ? doc.latestDate : Math.max(max, doc.latestDate);
        }
    });
    return { min, max };
}
fetch("./index/index.json").then(r => r.json())
    .then((documents) => {
    const idx = new FlexSearch.Document({
        document: {
            id: 'id',
            index: ['title', 'catalogNumber', 'scoringSummary', 'keyMode', 'relationships', 'textIncipit']
        }
    });
    documents.forEach(doc => {
        idx.add(Object.assign(Object.assign({}, doc), { relationships: (doc.relationships || []).join(" "), textIncipit: (doc.textIncipit || []).join(" ") }));
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
        else if (key === "dateFrom" && !excludedFacets.has("dateRange")) {
            filterOptions.dateFrom = parseYearInput(value);
            if (dateFromInput)
                dateFromInput.value = value;
        }
        else if (key === "dateTo" && !excludedFacets.has("dateRange")) {
            filterOptions.dateTo = parseYearInput(value);
            if (dateToInput)
                dateToInput.value = value;
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
    if (!excludedFacets.has("dateRange")) {
        const dateBounds = computeDateBounds(documents);
        if (dateFromInput && dateBounds.min !== undefined && !dateFromInput.placeholder) {
            dateFromInput.placeholder = dateBounds.min.toString();
        }
        if (dateToInput && dateBounds.max !== undefined && !dateToInput.placeholder) {
            dateToInput.placeholder = dateBounds.max.toString();
        }
    }
    facetConfigs.forEach(facet => {
        if (excludedFacets.has(facet.name))
            return;
        const categoryFacets = aggregateFacets(filteredResults, facet.field);
        renderFacet(facet.container, categoryFacets, facet.name, appliedFacetValues[facet.name] || []);
    });
})
    .catch(error => console.error("Error loading data:", error));
//# sourceMappingURL=search.js.map