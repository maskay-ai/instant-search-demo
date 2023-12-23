/* global instantsearch algoliasearch */

app({
  appId: "latency",
  apiKey: "6be0576ff61c053d5f9a3225e2a90f76",
  indexName: "instant_search",
  searchParameters: {
    hitsPerPage: 10,
  },
});

function app(opts) {
  // ---------------------
  //
  //  Init
  //
  // ---------------------

  (function() {
    const urlParams = new URLSearchParams(window.location.search);
    var engine =
      urlParams.get("engine") == null ? "algolia" : urlParams.get("engine");
    document.getElementById("engine").value = engine;

    console.log(`Load ${engine}`);
  })();

  const customSearchClient = {
    search(requests) {
      const engine = document.getElementById("engine").value;
      return fetch("http://localhost:8080/1/indexes/*/queries/" + engine, {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests }),
      }).then((res) => res.json());
    },
  };

  console.log(`Onload engine ${document.getElementById("engine").value}`);

  const search = instantsearch({
    searchClient:
      document.getElementById("engine").value == "algolia"
        ? algoliasearch(opts.appId, opts.apiKey)
        : customSearchClient,
    indexName: opts.indexName,
    routing: true,
    searchFunction: opts.searchFunction,
  });

  const engine = document
    .getElementById("engine")
    .addEventListener("change", function() {
      console.log(`Changed to ${this.value}`);
      if (!window.location.href.indexOf("engine=" + this.value) > -1) {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set("engine", this.value);
        window.location.search = urlParams;
      }
    });

  // ---------------------
  //
  //  Default widgets
  //
  // ---------------------
  search.addWidgets([
    instantsearch.widgets.searchBox({
      container: "#search-input",
      placeholder: "Search for products by name, type, brand, ...",
    }),
    instantsearch.widgets.hits({
      container: "#hits",
      templates: {
        item: getTemplate("hit"),
        empty: getTemplate("no-results"),
      },
      transformItems(items) {
        return items.map((item) => {
          /* eslint-disable no-param-reassign */
          item.starsLayout = getStarsHTML(item.rating);
          item.categories = getCategoryBreadcrumb(item);
          return item;
        });
      },
    }),
    instantsearch.widgets.stats({
      container: "#stats",
    }),
    instantsearch.widgets.sortBy({
      container: "#sort-by",
      items: [
        {
          value: opts.indexName,
          label: "Most relevant",
        },
        {
          value: `${opts.indexName}_price_asc`,
          label: "Lowest price",
        },
        {
          value: `${opts.indexName}_price_desc`,
          label: "Highest price",
        },
      ],
    }),
    instantsearch.widgets.pagination({
      container: "#pagination",
      scrollTo: "#search-input",
    }),

    // ---------------------
    //
    //  Filtering widgets
    //
    // ---------------------
    instantsearch.widgets.panel({
      templates: {
        header: getHeaderTemplate("category"),
      },
    })(instantsearch.widgets.hierarchicalMenu)({
      container: "#hierarchical-categories",
      attributes: [
        "hierarchicalCategories.lvl0",
        "hierarchicalCategories.lvl1",
        "hierarchicalCategories.lvl2",
      ],
      showParentLevel: true,
      templates: {
        item:
          '<a href="{{url}}" class="facet-item {{#isRefined}}active{{/isRefined}}"><span class="facet-name"><i class="fa fa-angle-right"></i> {{label}}</span class="facet-name"><span class="ais-HierarchicalMenu-count">{{count}}</span></a>', // eslint-disable-line
      },
    }),
    instantsearch.widgets.panel({
      templates: {
        header: getHeaderTemplate("brand"),
      },
    })(instantsearch.widgets.refinementList)({
      container: "#brand",
      attribute: "brand",
      limit: 5,
      showMore: true,
      showMoreLimit: 10,
      searchable: true,
      searchablePlaceholder: "Search for brands",
      templates: {
        searchableNoResults:
          '<div class="sffv_no-results">No matching brands.</div>',
        showMoreText: `
          {{#isShowingMore}}
            <span class="isShowingLess"></span>
            Show less
          {{/isShowingMore}}
          {{^isShowingMore}}
            <span class="isShowingMore"></span>
            Show more
          {{/isShowingMore}}
        `,
      },
    }),
    instantsearch.widgets.panel({
      templates: {
        header: getHeaderTemplate("price"),
      },
    })(instantsearch.widgets.rangeSlider)({
      container: "#price",
      attribute: "price",
      tooltips: {
        format(rawValue) {
          return `$${Math.round(rawValue).toLocaleString()}`;
        },
      },
    }),
    instantsearch.widgets.panel({
      templates: {
        header: getHeaderTemplate("rating"),
      },
    })(instantsearch.widgets.ratingMenu)({
      container: "#stars",
      attribute: "rating",
      max: 5,
      labels: {
        andUp: "& Up",
      },
    }),
    instantsearch.widgets.panel({
      templates: {
        header: getHeaderTemplate("shipping"),
      },
    })(instantsearch.widgets.toggleRefinement)({
      container: "#free-shipping",
      attribute: "free_shipping",
      label: "Free Shipping",
      values: {
        on: true,
      },
    }),
    instantsearch.widgets.panel({
      templates: {
        header: getHeaderTemplate("type"),
      },
    })(instantsearch.widgets.menu)({
      container: "#type",
      attribute: "type",
      limit: 10,
      showMore: true,
      templates: {
        showMoreText: `
          {{#isShowingMore}}
            <span class="isShowingLess"></span>
            Show less
          {{/isShowingMore}}
          {{^isShowingMore}}
            <span class="isShowingMore"></span>
            Show more
          {{/isShowingMore}}
        `,
      },
    }),
  ]);

  search.start();
}

// ---------------------
//
//  Helper functions
//
// ---------------------
function getTemplate(templateName) {
  return document.querySelector(`#${templateName}-template`).innerHTML;
}

function getHeaderTemplate(name) {
  return `<div class="ais-header"><h5>${name}</h5></div>`;
}

function getCategoryBreadcrumb(item) {
  const highlightValues = item._highlightResult
    ? item._highlightResult.categories || []
    : [];
  return highlightValues.map((category) => category.value).join(" > ");
}

function getStarsHTML(rating, maxRating) {
  let html = "";
  const newRating = maxRating || 5;

  for (let i = 0; i < newRating; ++i) {
    html += `<span class="ais-star-rating--star${
      i < rating ? "" : "__empty"
    }"></span>`;
  }

  return html;
}
