(function (global) {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function articleHref(path) {
    return "articles/" + path;
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

  function renderByYear(container) {
    return loadArticles().then(function (articles) {
      var groups = {};
      var years = [];

      articles.forEach(function (article) {
        var year = (article.date || "").slice(0, 4) || "未知";
        if (!groups[year]) {
          groups[year] = [];
          years.push(year);
        }
        groups[year].push(article);
      });

      years.sort(function (a, b) {
        return b.localeCompare(a);
      });

      container.innerHTML = years
        .map(function (year) {
          return (
            '<section class="year-group">' +
            '<h2 class="year-title">' +
            escapeHtml(year) +
            "</h2>" +
            groups[year].map(renderArticleItem).join("") +
            "</section>"
          );
        })
        .join("");
    });
  }

  global.Articles = {
    load: loadArticles,
    renderLatest: renderLatest,
    renderByYear: renderByYear,
  };
})(window);
