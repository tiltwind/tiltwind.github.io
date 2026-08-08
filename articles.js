(function (global) {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function articleHref(path) {
    return "articles/" + String(path).replace(/\.md$/i, "");
  }

  function renderArticleItem(article) {
    return (
      '<article class="article-item">' +
      '<div class="article-meta">' +
      '<span class="article-date">' +
      escapeHtml(article.date) +
      "</span>" +
      '<a class="article-title" href="' +
      escapeHtml(articleHref(article.path)) +
      '">' +
      escapeHtml(article.title) +
      "</a>" +
      "</div>" +
      '<p class="article-summary">' +
      escapeHtml(article.summary) +
      "</p>" +
      "</article>"
    );
  }

  function loadArticles() {
    return fetch("articles/articles.json").then(function (res) {
      if (!res.ok) throw new Error("failed to load articles");
      return res.json();
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
