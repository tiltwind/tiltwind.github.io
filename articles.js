(function (global) {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function articleHref(article) {
    if (article.url) return String(article.url);
    return "articles/" + String(article.path).replace(/\.md$/i, "");
  }

  function renderArticleItem(article) {
    var external = !!article.url;
    var platform = article.platform ? article.platform : "外部";

    return (
      '<article class="article-item">' +
      '<div class="article-meta">' +
      '<span class="article-date">' +
      escapeHtml(article.date) +
      "</span>" +
      '<a class="article-title" href="' +
      escapeHtml(articleHref(article)) +
      '"' +
      (external ? ' target="_blank" rel="noopener"' : "") +
      ">" +
      escapeHtml(article.title) +
      "</a>" +
      (external ? '<span class="tag">' + escapeHtml(platform) + "</span>" : "") +
      "</div>" +
      '<p class="article-summary">' +
      escapeHtml(article.summary) +
      "</p>" +
      "</article>"
    );
  }

  function fetchJson(url, optional) {
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("failed to load " + url);
        return res.json();
      })
      .catch(function (err) {
        if (optional) return [];
        throw err;
      });
  }

  function loadArticles() {
    return Promise.all([
      fetchJson("articles/articles.json", false),
      fetchJson("articles/publish-articles.json", true),
    ]).then(function (results) {
      var merged = [];
      results.forEach(function (list) {
        if (Array.isArray(list)) merged = merged.concat(list);
      });
      merged.sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      });
      return merged;
    });
  }

  function renderLatest(container, limit) {
    return loadArticles().then(function (articles) {
      var list = articles.slice(0, limit || 5);
      container.innerHTML = list.map(renderArticleItem).join("");
    });
  }

  function categoryKey(article) {
    var cats = article.categories;
    if (Array.isArray(cats) && cats.length && cats[0]) {
      return String(cats[0]);
    }
    return "其他";
  }

  function renderByCategory(container) {
    return loadArticles().then(function (articles) {
      var groups = {};
      var keys = [];

      articles.forEach(function (article) {
        var key = categoryKey(article);
        if (!groups[key]) {
          groups[key] = [];
          keys.push(key);
        }
        groups[key].push(article);
      });

      keys.sort(function (a, b) {
        if (a === "其他") return 1;
        if (b === "其他") return -1;
        return a.localeCompare(b, "zh");
      });

      container.innerHTML = keys
        .map(function (key) {
          return (
            '<section class="year-group">' +
            '<h2 class="year-title">' +
            escapeHtml(key) +
            "</h2>" +
            groups[key].map(renderArticleItem).join("") +
            "</section>"
          );
        })
        .join("");
    });
  }

  global.Articles = {
    load: loadArticles,
    renderLatest: renderLatest,
    renderByCategory: renderByCategory,
  };
})(window);
