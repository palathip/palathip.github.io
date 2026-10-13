(function () {
  var script = document.currentScript;
  if (!script || !document.body) return;

  var rootUrl = new URL('./', script.src);

  function pageId() {
    var path = location.pathname.replace(/\\/g, '/');
    if (/\/dashboard(?:\/|\/index\.html)?$/.test(path)) return 'dashboard';
    if (/\/gen-flights(?:\/|\/index\.html)?$/.test(path)) return 'flights';
    if (/\/resume\.html$/.test(path)) return 'resume';
    return 'home';
  }

  function href(rel) {
    return new URL(rel, rootUrl).href;
  }

  var page = pageId();
  var homeHref = href('index.html');
  var items = [
    { id: 'home', label: 'Home', href: homeHref },
    { id: 'resume', label: 'Simple Resume', href: href('resume.html') },
    {
      id: 'asset',
      label: 'Digital Asset',
      href: page === 'home' ? '#digital-asset' : homeHref + '#digital-asset',
      linkId: 'navAssetLink'
    },
    {
      id: 'qr',
      label: 'QR Payment',
      href: page === 'home' ? '#qr' : homeHref + '#qr',
      linkId: 'navQrLink'
    },
    { id: 'dashboard', label: 'My Dashboard', href: href('dashboard/index.html') },
    { id: 'flights', label: 'Gen Flights', href: href('gen-flights/index.html') }
  ];

  var links = items.map(function (item) {
    var active = item.id === page;
    return '<li><a href="' + item.href + '"' +
      (item.linkId ? ' id="' + item.linkId + '"' : '') +
      (active ? ' class="active" aria-current="page"' : '') +
      '>' + item.label + '</a></li>';
  }).join('');

  var header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML =
    '<a class="logo" href="' + homeHref + '">BOOMBIBU</a>' +
    '<nav class="site-nav" aria-label="Main">' +
      '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-menu">' +
        '<span class="nav-toggle-icon" aria-hidden="true"></span>' +
        '<span class="sr-only">Menu</span>' +
      '</button>' +
      '<ul class="nav-links" id="site-menu">' + links + '</ul>' +
    '</nav>';

  document.body.insertBefore(header, document.body.firstChild);

  var navToggle = header.querySelector('.nav-toggle');
  var siteMenu = header.querySelector('#site-menu');

  function setNavOpen(open) {
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    siteMenu.classList.toggle('is-open', open);
  }

  navToggle.addEventListener('click', function () {
    setNavOpen(navToggle.getAttribute('aria-expanded') !== 'true');
  });

  siteMenu.addEventListener('click', function (event) {
    if (event.target.closest('a')) setNavOpen(false);
  });

  document.addEventListener('click', function (event) {
    if (!header.contains(event.target)) setNavOpen(false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setNavOpen(false);
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 920) setNavOpen(false);
  });
})();
