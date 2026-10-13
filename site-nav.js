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

  if (document.head) {
    var hasMono = false;
    var fontLinks = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < fontLinks.length; i++) {
      if ((fontLinks[i].href || '').indexOf('JetBrains+Mono') !== -1) hasMono = true;
    }
    if (!hasMono) {
      var font = document.createElement('link');
      font.rel = 'stylesheet';
      font.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@600;700&display=swap';
      document.head.appendChild(font);
    }
  }

  var page = pageId();
  var homeHref = href('index.html');
  var items = [
    { id: 'home', label: 'Home', href: homeHref },
    { id: 'resume', label: 'Resume', href: href('resume.html') },
    { id: 'asset', label: 'Digital Asset', href: '#digital-asset', linkId: 'navAssetLink' },
    { id: 'qr', label: 'QR Payment', href: '#qr', linkId: 'navQrLink' },
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

  window.addEventListener('resize', function () {
    if (window.innerWidth > 920) setNavOpen(false);
  });

  var modalHtml = "<!-- QR Payment: \u0e40\u0e25\u0e37\u0e2d\u0e01\u0e0a\u0e48\u0e2d\u0e07\u0e17\u0e32\u0e07 -->\n  <div class=\"qr-modal-overlay\" id=\"qrPickerModal\">\n    <div class=\"qr-picker-modal\">\n      <button type=\"button\" class=\"qr-modal-close\" id=\"qrPickerClose\" aria-label=\"\u0e1b\u0e34\u0e14\">\u00d7</button>\n      <div class=\"qr-modal-header\">\n        <h2>QR Payment</h2>\n        <p>\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e0a\u0e48\u0e2d\u0e07\u0e17\u0e32\u0e07\u0e23\u0e31\u0e1a\u0e40\u0e07\u0e34\u0e19</p>\n      </div>\n      <div class=\"qr-picker-grid\">\n        <button type=\"button\" class=\"qr-picker-btn\" id=\"qrPickKbank\" aria-label=\"KBANK \u2014 Thai QR \u0e01\u0e2a\u0e34\u0e01\u0e23\u0e44\u0e17\u0e22\">\n          <img src=\"images/kbank-logo.png\" alt=\"\" class=\"qr-picker-icon\" width=\"64\" height=\"64\" decoding=\"async\">\n          <span class=\"qr-picker-label qr-picker-label--kbank\">KBANK</span>\n        </button>\n        <button type=\"button\" class=\"qr-picker-btn\" id=\"qrPickMake\" aria-label=\"MAKE by KBANK\">\n          <img src=\"images/make-by-kbank-logo.png\" alt=\"\" class=\"qr-picker-icon qr-picker-icon--make\" width=\"64\" height=\"64\" decoding=\"async\">\n          <span class=\"qr-picker-label qr-picker-label--make\">MAKE</span>\n        </button>\n      </div>\n    </div>\n  </div>\n\n  <!-- QR Payment Modal (KBANK) -->\n  <div class=\"qr-modal-overlay\" id=\"qrModal\">\n    <div class=\"qr-modal\">\n      <button type=\"button\" class=\"qr-modal-close\" id=\"qrModalClose\" aria-label=\"\u0e1b\u0e34\u0e14\">\u00d7</button>\n      <div class=\"qr-modal-header\">\n        <h2>Thai QR Payment</h2>\n        <p>\u0e2a\u0e41\u0e01\u0e19 QR \u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e42\u0e2d\u0e19\u0e40\u0e07\u0e34\u0e19</p>\n        <span class=\"qr-channel-badge\">KBANK</span>\n      </div>\n      <img src=\"images/qr-payment.png\" alt=\"QR Payment - \u0e19\u0e32\u0e22 \u0e1e\u0e25\u0e32\u0e18\u0e34\u0e1b \u0e27\u0e38\u0e12\u0e34\u0e1b\u0e23\u0e30\u0e22\u0e39\u0e23\" class=\"qr-modal-image\">\n      <div class=\"qr-modal-info\">\n        <div class=\"qr-modal-info-item\">\n          <span class=\"qr-modal-info-label\">\u0e0a\u0e37\u0e48\u0e2d</span>\n          <span class=\"qr-modal-info-value\">\u0e19\u0e32\u0e22 \u0e1e\u0e25\u0e32\u0e18\u0e34\u0e1b \u0e27\u0e38\u0e12\u0e34\u0e1b\u0e23\u0e30\u0e22\u0e39\u0e23</span>\n        </div>\n        <div class=\"qr-modal-info-item\">\n          <span class=\"qr-modal-info-label\">\u0e1a\u0e31\u0e0d\u0e0a\u0e35</span>\n          <div class=\"qr-modal-account-row\">\n            <span class=\"account-num\">517-2-15834-1</span>\n            <button type=\"button\" class=\"qr-copy-btn\" id=\"qrCopyBtn\" data-copy=\"517-2-15834-1\">Copy</button>\n          </div>\n        </div>\n        <div class=\"qr-modal-info-item\">\n          <span class=\"qr-modal-info-label\">\u0e18\u0e19\u0e32\u0e04\u0e32\u0e23</span>\n          <span class=\"qr-modal-info-value qr-bank-value\"><img src=\"images/kbank-logo.png\" alt=\"\" class=\"qr-bank-icon\" onerror=\"this.style.display='none'\">\u0e01\u0e2a\u0e34\u0e01\u0e23\u0e44\u0e17\u0e22</span>\n        </div>\n        <div class=\"qr-modal-info-footer\">\u2713 \u0e23\u0e31\u0e1a\u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49\u0e08\u0e32\u0e01\u0e17\u0e38\u0e01\u0e18\u0e19\u0e32\u0e04\u0e32\u0e23</div>\n      </div>\n    </div>\n  </div>\n\n  <!-- QR Payment Modal (MAKE) \u2014 \u0e42\u0e04\u0e23\u0e07\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e40\u0e14\u0e35\u0e22\u0e27\u0e01\u0e31\u0e1a KBANK -->\n  <div class=\"qr-modal-overlay\" id=\"makeQrModal\">\n    <div class=\"qr-modal\">\n      <button type=\"button\" class=\"qr-modal-close\" id=\"makeQrModalClose\" aria-label=\"\u0e1b\u0e34\u0e14\">\u00d7</button>\n      <div class=\"qr-modal-header\">\n        <h2>Thai QR Payment</h2>\n        <p>\u0e2a\u0e41\u0e01\u0e19 QR \u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e42\u0e2d\u0e19\u0e40\u0e07\u0e34\u0e19</p>\n        <span class=\"qr-channel-badge qr-channel-badge-make\">MAKE</span>\n      </div>\n      <img src=\"images/qr-payment-make.png\" alt=\"QR Payment MAKE \u2014 \u0e19\u0e32\u0e22 \u0e1e\u0e25\u0e32\u0e18\u0e34\u0e1b \u0e27\u0e38\u0e12\u0e34\u0e1b\u0e23\u0e30\u0e22\u0e39\u0e23\" class=\"qr-modal-image\">\n      <div class=\"qr-modal-info\">\n        <div class=\"qr-modal-info-item\">\n          <span class=\"qr-modal-info-label\">\u0e0a\u0e37\u0e48\u0e2d</span>\n          <span class=\"qr-modal-info-value\">\u0e19\u0e32\u0e22 \u0e1e\u0e25\u0e32\u0e18\u0e34\u0e1b \u0e27\u0e38\u0e12\u0e34\u0e1b\u0e23\u0e30\u0e22\u0e39\u0e23</span>\n        </div>\n        <div class=\"qr-modal-info-item\">\n          <span class=\"qr-modal-info-label\">\u0e1a\u0e31\u0e0d\u0e0a\u0e35</span>\n          <div class=\"qr-modal-account-row\">\n            <span class=\"account-num\">093-1-36473-1</span>\n            <button type=\"button\" class=\"qr-copy-btn\" id=\"makeQrCopyBtn\" data-copy=\"093-1-36473-1\">Copy</button>\n          </div>\n        </div>\n        <div class=\"qr-modal-info-item\">\n          <span class=\"qr-modal-info-label\">\u0e0a\u0e48\u0e2d\u0e07\u0e17\u0e32\u0e07</span>\n          <span class=\"qr-modal-info-value qr-bank-value\"><img src=\"images/make-by-kbank-logo.png\" alt=\"\" class=\"qr-bank-icon qr-bank-icon--rounded\" onerror=\"this.style.display='none'\">MAKE by KBANK</span>\n        </div>\n        <div class=\"qr-modal-info-footer\">\u2713 \u0e23\u0e31\u0e1a\u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49\u0e08\u0e32\u0e01\u0e17\u0e38\u0e01\u0e18\u0e19\u0e32\u0e04\u0e32\u0e23</div>\n      </div>\n    </div>\n  </div>\n\n  <!-- Digital Asset Modal -->\n  <div class=\"asset-modal-overlay\" id=\"assetModal\">\n    <div class=\"asset-modal\">\n      <button type=\"button\" class=\"asset-modal-close\" id=\"assetModalClose\" aria-label=\"\u0e1b\u0e34\u0e14\">\u00d7</button>\n      <div class=\"asset-modal-header\">\n        <h2>Digital Asset</h2>\n        <p>Wallet addresses</p>\n      </div>\n\n      <div class=\"asset-section\">\n        <h3 class=\"asset-section-title\"><span class=\"asset-section-icon-wrap\"><img src=\"https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/OKX_logo.svg/80px-OKX_logo.svg.png\" alt=\"\" onerror=\"this.src='https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/matic.png'\"></span>OKX</h3>\n        <div class=\"asset-wallet-group\">\n          <div class=\"asset-wallet-item\">\n            <div class=\"asset-wallet-item-inner\">\n              <span class=\"asset-coin-name\"><img src=\"https://static.oklink.com/cdn/assets/imgs/243/230501A8E74482AB.png\" alt=\"\" class=\"asset-coin-icon\" onerror=\"this.style.display='none'\">EVM<span class=\"asset-evm-icons-inline\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/etc.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/bnb.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://static.oklink.com/cdn/assets/imgs/243/230501A8E74482AB.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/usdt.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/usdc.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/matic.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/dai.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/avax.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/base/info/logo.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/arbitrum/info/logo.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/optimism/info/logo.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/uni.png\" alt=\"\" onerror=\"this.remove()\"></span></span>\n              <span class=\"asset-address\">0xa58b55dfce2d0afc4ac416b113effddee0a5b702</span>\n            </div>\n            <button type=\"button\" class=\"asset-copy-btn\" data-copy=\"0xa58b55dfce2d0afc4ac416b113effddee0a5b702\">Copy</button>\n          </div>\n        </div>\n      </div>\n\n      <div class=\"asset-section\">\n        <h3 class=\"asset-section-title\"><span class=\"asset-section-icon-wrap\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/bnb.png\" alt=\"\" onerror=\"this.style.display='none'\"></span>Binance</h3>\n        <div class=\"asset-wallet-group\">\n          <div class=\"asset-wallet-item\">\n            <div class=\"asset-wallet-item-inner\">\n              <span class=\"asset-coin-name\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/bnb.png\" alt=\"\" class=\"asset-coin-icon\" onerror=\"this.style.display='none'\">EVM<span class=\"asset-evm-icons-inline\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/etc.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/bnb.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/usdt.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/usdc.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/matic.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/dai.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/avax.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/base/info/logo.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/arbitrum/info/logo.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/optimism/info/logo.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/uni.png\" alt=\"\" onerror=\"this.remove()\"></span></span>\n              <span class=\"asset-address\">0x1f100bfcf7820ce79157fd6adb9b6618345f198c</span>\n            </div>\n            <button type=\"button\" class=\"asset-copy-btn\" data-copy=\"0x1f100bfcf7820ce79157fd6adb9b6618345f198c\">Copy</button>\n          </div>\n        </div>\n      </div>\n\n      <div class=\"asset-section\">\n        <h3 class=\"asset-section-title\"><span class=\"asset-section-icon-wrap\"><img src=\"images/walletofsatoshi-icon.png\" alt=\"\" onerror=\"this.src='https://assets.coingecko.com/coins/images/1/small/bitcoin.png'\"></span>Wallet of Satoshi</h3>\n        <div class=\"asset-wallet-group\">\n          <div class=\"asset-wallet-item\">\n            <div class=\"asset-wallet-item-inner\">\n              <span class=\"asset-coin-name\"><img src=\"images/lightning-icon.png\" alt=\"\" class=\"asset-coin-icon\" onerror=\"this.style.display='none'\">BTC&nbsp;&nbsp;&nbsp;LIGHTNING</span>\n              <span class=\"asset-address\">boombibu@walletofsatoshi.com</span>\n            </div>\n            <button type=\"button\" class=\"asset-copy-btn\" data-copy=\"boombibu@walletofsatoshi.com\">Copy</button>\n          </div>\n        </div>\n      </div>\n\n      <div class=\"asset-section\">\n        <h3 class=\"asset-section-title\"><span class=\"asset-section-icon-wrap\"><img src=\"images/hardware-wallet-icon.svg\" alt=\"\" onerror=\"this.style.display='none'\"></span>My Wallet</h3>\n        <div class=\"asset-wallet-group\">\n          <div class=\"asset-wallet-item\">\n            <div class=\"asset-wallet-item-inner\">\n              <span class=\"asset-coin-name\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/btc.png\" alt=\"\" class=\"asset-coin-icon\" onerror=\"this.style.display='none'\">BTC&nbsp;&nbsp;&nbsp;ON-CHAIN</span>\n              <span class=\"asset-address\">bc1qh4z460g6nsh630s9wyfh8zlweuykc5f97rtrr2</span>\n            </div>\n            <button type=\"button\" class=\"asset-copy-btn\" data-copy=\"bc1qh4z460g6nsh630s9wyfh8zlweuykc5f97rtrr2\">Copy</button>\n          </div>\n          <div class=\"asset-wallet-item\">\n            <div class=\"asset-wallet-item-inner\">\n              <span class=\"asset-coin-name\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/eth.png\" alt=\"\" class=\"asset-coin-icon\" onerror=\"this.style.display='none'\">EVM<span class=\"asset-evm-icons-inline\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/etc.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/bnb.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://static.oklink.com/cdn/assets/imgs/243/230501A8E74482AB.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/usdt.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/usdc.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/matic.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/dai.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/avax.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/base/info/logo.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/arbitrum/info/logo.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/optimism/info/logo.png\" alt=\"\" onerror=\"this.remove()\"><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/uni.png\" alt=\"\" onerror=\"this.remove()\"></span></span>\n              <span class=\"asset-address\">0x37cFA9f9fd9D5031492C3D1B87379206ffA4838F</span>\n            </div>\n            <button type=\"button\" class=\"asset-copy-btn\" data-copy=\"0x37cFA9f9fd9D5031492C3D1B87379206ffA4838F\">Copy</button>\n          </div>\n        </div>\n      </div>\n\n      <div class=\"asset-modal-footer\">\n        <p><sup>*</sup> EVM address supports tokens on EVM networks such as</p>\n        <div class=\"asset-desc-coins\">\n          <span><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/eth.png\" alt=\"\" onerror=\"this.parentElement.remove()\">Ethereum</span>\n          <span><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/etc.png\" alt=\"\" onerror=\"this.parentElement.remove()\">ETC</span>\n          <span><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/bnb.png\" alt=\"\" onerror=\"this.parentElement.remove()\">BNB</span>\n          <span><img src=\"https://static.oklink.com/cdn/assets/imgs/243/230501A8E74482AB.png\" alt=\"\" onerror=\"this.parentElement.remove()\">X Layer</span>\n          <span><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/usdt.png\" alt=\"\" onerror=\"this.parentElement.remove()\">USDT</span>\n          <span><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/usdc.png\" alt=\"\" onerror=\"this.parentElement.remove()\">USDC</span>\n          <span><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/matic.png\" alt=\"\" onerror=\"this.parentElement.remove()\">POL</span>\n          <span><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/dai.png\" alt=\"\" onerror=\"this.parentElement.remove()\">DAI</span>\n          <span><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/avax.png\" alt=\"\" onerror=\"this.parentElement.remove()\">AVAL</span>\n          <span><img src=\"https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/base/info/logo.png\" alt=\"\" onerror=\"this.parentElement.remove()\">Base</span>\n          <span><img src=\"https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/arbitrum/info/logo.png\" alt=\"\" onerror=\"this.parentElement.remove()\">Arbitrum</span>\n          <span><img src=\"https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/optimism/info/logo.png\" alt=\"\" onerror=\"this.parentElement.remove()\">OP</span>\n          <span><img src=\"https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/32/color/uni.png\" alt=\"\" onerror=\"this.parentElement.remove()\">Uniswap</span>\n        </div>\n      </div>\n\n    </div>\n  </div>";
  var holder = document.createElement('div');
  holder.innerHTML = modalHtml.replace(/src="images\//g, 'src="' + rootUrl.href + 'images/');
  while (holder.firstChild) document.body.appendChild(holder.firstChild);

  var qrPickerModal = document.getElementById('qrPickerModal');
  var qrModal = document.getElementById('qrModal');
  var makeQrModal = document.getElementById('makeQrModal');
  var assetModal = document.getElementById('assetModal');

  function anyModalOpen() {
    return qrPickerModal.classList.contains('active') ||
      qrModal.classList.contains('active') ||
      makeQrModal.classList.contains('active') ||
      assetModal.classList.contains('active');
  }

  function syncScroll() {
    document.body.style.overflow = anyModalOpen() ? 'hidden' : '';
  }

  function openQrPicker() {
    qrPickerModal.classList.add('active');
    syncScroll();
  }

  function closeQrPicker() {
    qrPickerModal.classList.remove('active');
    syncScroll();
  }

  function openKbankQrModal() {
    qrModal.classList.add('active');
    syncScroll();
  }

  function closeQrModal() {
    qrModal.classList.remove('active');
    syncScroll();
  }

  function openMakeQrModal() {
    makeQrModal.classList.add('active');
    syncScroll();
  }

  function closeMakeQrModal() {
    makeQrModal.classList.remove('active');
    syncScroll();
  }

  function openAssetModal() {
    assetModal.classList.add('active');
    syncScroll();
  }

  function closeAssetModal() {
    assetModal.classList.remove('active');
    syncScroll();
  }

  function onBackdrop(overlay, close) {
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) close();
    });
  }

  document.getElementById('navQrLink').addEventListener('click', function (event) {
    event.preventDefault();
    openQrPicker();
  });
  document.getElementById('navAssetLink').addEventListener('click', function (event) {
    event.preventDefault();
    openAssetModal();
  });

  document.addEventListener('click', function (event) {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('#qrServiceItem')) openQrPicker();
    else if (event.target.closest('#assetServiceItem')) openAssetModal();
  });

  document.getElementById('qrPickerClose').addEventListener('click', closeQrPicker);
  document.getElementById('qrPickKbank').addEventListener('click', function () {
    closeQrPicker();
    openKbankQrModal();
  });
  document.getElementById('qrPickMake').addEventListener('click', function () {
    closeQrPicker();
    openMakeQrModal();
  });
  document.getElementById('qrModalClose').addEventListener('click', closeQrModal);
  document.getElementById('makeQrModalClose').addEventListener('click', closeMakeQrModal);
  document.getElementById('assetModalClose').addEventListener('click', closeAssetModal);
  onBackdrop(qrPickerModal, closeQrPicker);
  onBackdrop(qrModal, closeQrModal);
  onBackdrop(makeQrModal, closeMakeQrModal);
  onBackdrop(assetModal, closeAssetModal);

  function copyText(btn) {
    var text = btn.getAttribute('data-copy');
    navigator.clipboard.writeText(text).then(function () {
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(function () {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 1500);
    }).catch(function () {
      btn.textContent = 'Error';
      setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
    });
  }

  document.getElementById('qrCopyBtn').addEventListener('click', function () {
    copyText(this);
  });
  document.getElementById('makeQrCopyBtn').addEventListener('click', function () {
    copyText(this);
  });
  assetModal.addEventListener('click', function (event) {
    var btn = event.target.closest('.asset-copy-btn');
    if (!btn) return;
    copyText(btn);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (assetModal.classList.contains('active')) closeAssetModal();
    else if (makeQrModal.classList.contains('active')) closeMakeQrModal();
    else if (qrModal.classList.contains('active')) closeQrModal();
    else if (qrPickerModal.classList.contains('active')) closeQrPicker();
    else setNavOpen(false);
  });

  function openFromHash() {
    if (location.hash === '#digital-asset') openAssetModal();
    else if (location.hash === '#qr') openQrPicker();
  }

  openFromHash();
  window.addEventListener('hashchange', openFromHash);
})();
