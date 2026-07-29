(function () {
  const $ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  let currentQuery = "";
  let currentFilter = "all";

  function itemMatchesFilter(item) {
    if (currentFilter === "all") return true;
    return item.getAttribute("data-status") === currentFilter;
  }

  function itemMatchesSearch(item) {
    if (!currentQuery) return true;
    return normalize(item.textContent).includes(currentQuery);
  }

  function applySearchAndFilters() {
    const leafItems = $("[data-search-item]").filter((item) => !item.classList.contains("report-section"));
    leafItems.forEach((item) => {
      item.classList.toggle("hidden-by-search", !itemMatchesSearch(item));
      item.classList.toggle("hidden-by-filter", !itemMatchesFilter(item));
    });

    $(".report-section").forEach((section) => {
      const children = $("[data-search-item]", section).filter((item) => item !== section);
      if (!children.length) {
        section.classList.toggle("hidden-by-search", !itemMatchesSearch(section));
        section.classList.toggle("hidden-by-filter", !itemMatchesFilter(section));
        return;
      }
      const hasVisibleChild = children.some(
        (child) => !child.classList.contains("hidden-by-search") && !child.classList.contains("hidden-by-filter"),
      );
      section.classList.toggle("hidden-by-search", !hasVisibleChild);
      section.classList.toggle("hidden-by-filter", false);
    });
  }

  const searchInput = document.querySelector("[data-report-search]");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentQuery = normalize(searchInput.value);
      applySearchAndFilters();
    });
  }

  $("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.getAttribute("data-filter") || "all";
      $("[data-filter]").forEach((candidate) => candidate.setAttribute("aria-pressed", "false"));
      button.setAttribute("aria-pressed", "true");
      applySearchAndFilters();
    });
  });

  $(".tab-list").forEach((list) => {
    const buttons = $('[role="tab"]', list);
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = document.getElementById(button.getAttribute("aria-controls"));
        buttons.forEach((candidate) => candidate.setAttribute("aria-selected", "false"));
        button.setAttribute("aria-selected", "true");
        const wrapper = button.closest(".tabs");
        $('[role="tabpanel"]', wrapper).forEach((panel) => {
          panel.hidden = panel !== target;
        });
      });
    });
  });

  $("pre").forEach((pre) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-button";
    button.textContent = "copiar";
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(pre.innerText);
      button.textContent = "copiado";
      setTimeout(() => {
        button.textContent = "copiar";
      }, 1400);
    });
    pre.prepend(button);
  });

  const headings = $("main [id]");
  const tocLinks = $(".toc a[href^='#']");
  const byId = new Map(tocLinks.map((link) => [link.getAttribute("href").slice(1), link]));
  if ("IntersectionObserver" in window && headings.length && tocLinks.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          tocLinks.forEach((link) => link.classList.remove("is-active"));
          const link = byId.get(entry.target.id);
          if (link) link.classList.add("is-active");
        });
      },
      { rootMargin: "-18% 0px -72% 0px", threshold: 0.01 },
    );
    headings.forEach((heading) => observer.observe(heading));
  }
})();
