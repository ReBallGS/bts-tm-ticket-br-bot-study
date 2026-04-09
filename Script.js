// ==UserScript==
// @name         TicketMaster
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Fast execution of reserving tickets in cart
// @match        https://www1.ticketmaster.co.uk/*
// @match        https://www1.ticketmaster.com/*
// @match        https://www1.ticketmaster.com.br/*
// @match        https://www.ticketmaster.com.br/*
// @match        https://www1.ticketmaster.ie/*
// @run-at       document-start
// @grant        none
// ==/UserScript==


var CONFIG = {
  selectedProfile: 'conservador', // 'conservador' | 'turbo'
  numberOfTickets: 2,
  targetEventSlug: 'pre-venda-army-membership-bts-world-tour-arirang-28-10',
  targetCrowderFallbackPath: '/shop/www.ticketmaster.com.br/seat/status/194723/54572',
  profiles: {
    conservador: {
      defaultRefreshIntervalSeconds: 2.3,
      turboRefreshIntervalSeconds: 0.8,
      maxRandomDelayMs: 550,
      alertCooldownMs: 15000,
      noSeatsRefreshIntervalSeconds: 2.6,
      pauseWhenTabHidden: true,
      debugEnabled: true,
      waitForElementTimeoutMs: 8000,
      heartbeatLogEveryAttempts: 10
    },
    turbo: {
      defaultRefreshIntervalSeconds: 0.8,
      turboRefreshIntervalSeconds: 0.5,
      maxRandomDelayMs: 300,
      alertCooldownMs: 12000,
      noSeatsRefreshIntervalSeconds: 1.2,
      pauseWhenTabHidden: false,
      debugEnabled: true,
      waitForElementTimeoutMs: 7000,
      heartbeatLogEveryAttempts: 8
    }
  }
};

var refreshIntervalSeconds = 1;
var numberOfTickets = CONFIG.numberOfTickets;
var maxRandomDelayMs = 300;
var targetEventSlug = CONFIG.targetEventSlug;
var targetCrowderFallbackPath = CONFIG.targetCrowderFallbackPath;
var runLoopLock = false;
var attemptCount = 0;
var lastAlertAt = 0;
var alertCooldownMs = 15000;
var turboModeEnabled = false;
var defaultRefreshIntervalSeconds = 1;
var turboRefreshIntervalSeconds = 0.5;
var latestCrowderPathSeen = null;
var bootLogged = false;
var debugEnabled = true;
var pauseWhenTabHidden = true;
var waitForElementTimeoutMs = 8000;
var heartbeatLogEveryAttempts = 10;
var noSeatsRefreshIntervalSeconds = 2.6;
var nextHeartbeatAttempt = 0;

function computeNextHeartbeatAttempt(baseAttempt) {
  var randomWindow = 8 + Math.floor(Math.random() * 5); // 8-12
  return baseAttempt + randomWindow;
}

function applySelectedProfile() {
  var profile = CONFIG.profiles[CONFIG.selectedProfile] || CONFIG.profiles.conservador;
  defaultRefreshIntervalSeconds = profile.defaultRefreshIntervalSeconds;
  turboRefreshIntervalSeconds = profile.turboRefreshIntervalSeconds;
  refreshIntervalSeconds = defaultRefreshIntervalSeconds;
  maxRandomDelayMs = profile.maxRandomDelayMs;
  alertCooldownMs = profile.alertCooldownMs;
  pauseWhenTabHidden = profile.pauseWhenTabHidden;
  debugEnabled = profile.debugEnabled;
  waitForElementTimeoutMs = profile.waitForElementTimeoutMs;
  heartbeatLogEveryAttempts = profile.heartbeatLogEveryAttempts;
  noSeatsRefreshIntervalSeconds = profile.noSeatsRefreshIntervalSeconds || defaultRefreshIntervalSeconds;
  nextHeartbeatAttempt = computeNextHeartbeatAttempt(attemptCount);
}

applySelectedProfile();

function SkipPopup() {
  var knownPopupButtons = [
    '//button[@class = "modal-dialog__button landing-modal-footer__skip-button"]',
    '//button[contains(@class, "onetrust-close-btn-handler")]',
    '//button[contains(@id, "onetrust-accept-btn-handler")]',
    '//button[contains(@class, "modal-dialog__button")]'
  ];

  for (var i = 0; i < knownPopupButtons.length; i++) {
    var popupButton = getElementByXpath(knownPopupButtons[i]);
    if (popupButton) {
      try { popupButton.click(); } catch (ex) {}
    }
  }
}

function CheckForFilterPanel() {
  var filterBar = getElementByXpath('//div[contains(@class, "filter-bar__content")]');
  if (filterBar) {
    return filterBar;
  }
  return document.querySelector('.quick-picks, .quick-picks__list, [data-testid="quick-picks"]');
}

function ProcessFilterPanel(filterBar) {
  // Click first ticket result in list
  ClickElement('(//ul/li[contains(@class, "quick-picks__list-item")])[1]/div/div');

  // Change ticket quantity and click the best buy/add button
  waitForElement('.offer-card, [data-testid="offer-card"], button', function() {
    ChangeTicketQuantity();
    clickAnyBuyButton();

    // If a section-change modal appears, accept replacement seats
    waitForElement('.button-aux, .modal-dialog__button', function() {
      var sectionChangeBuyButton = getElementByXpath('//button[contains(@class, "button-aux") and contains(@class, "modal-dialog__button")]');
      if (sectionChangeBuyButton) {
        try { sectionChangeBuyButton.click(); } catch (ex) {}
      }
    });
  });
}

function ChangeTicketQuantity() {
  var rightPanelCurrentTicketCountElement = getElementByXpath('//div[contains(@class, "qty-picker__number")]');
  if (!rightPanelCurrentTicketCountElement) {
    return;
  }

  var currentTicketCount = parseInt(rightPanelCurrentTicketCountElement.innerText, 10);
  if (isNaN(currentTicketCount)) {
    return;
  }

  var ticketQuantityDifference = numberOfTickets - currentTicketCount;
  if (ticketQuantityDifference > 0) {
    var ticketIncrementElement = getElementByXpath('//button[contains(@class, "qty-picker__button--increment")]');
    for (var i = 0; i < ticketQuantityDifference; i++) {
      try { if (ticketIncrementElement) ticketIncrementElement.click(); } catch (ex) {}
    }
  } else if (ticketQuantityDifference < 0) {
    ticketQuantityDifference = Math.abs(ticketQuantityDifference);
    var ticketDecrementElement = getElementByXpath('//button[contains(@class, "qty-picker__button--decrement")]');
    for (var j = 0; j < ticketQuantityDifference; j++) {
      try { if (ticketDecrementElement) ticketDecrementElement.click(); } catch (ex) {}
    }
  }
}

function CheckForGeneralAdmission() {
  var buyButtonById = document.querySelector('#buyButton');
  if (buyButtonById) {
    return buyButtonById;
  }

  var buyButton = getElementByXpath('//button[@id = "offer-card-buy-button"]');
  if (buyButton) {
    return buyButton;
  }
  return findBuyButtonByText();
}
    
function ProcessGeneralAdmission(generalAdmissionBuyButton) {
  ChangeTicketQuantity();
  try { generalAdmissionBuyButton.click(); } catch (ex) {}
}

function reload() {
  window.top.document.location.replace(window.top.document.location.href);
}


function ClickElement(path) {
  var element = getElementByXpath(path);
  if (element !== null && typeof element.click !== 'undefined') {
    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.click();
    } catch (ex) {}
    return element;
  }
  return null;
}

function findBuyButtonByText() {
  var candidates = Array.prototype.slice.call(document.querySelectorAll('button, a[role="button"], a.btn'));
  var terms = ['comprar', 'ingressos', 'buy', 'get tickets', 'adicionar', 'adicionar ao carrinho'];
  for (var i = 0; i < candidates.length; i++) {
    var txt = (candidates[i].innerText || candidates[i].textContent || '').trim().toLowerCase();
    for (var t = 0; t < terms.length; t++) {
      if (txt.indexOf(terms[t]) !== -1) {
        return candidates[i];
      }
    }
  }
  return null;
}

function clickAnyBuyButton() {
  var mobileBuy = document.querySelector('#buyButton');
  if (mobileBuy && typeof mobileBuy.click !== 'undefined') {
    try {
      mobileBuy.scrollIntoView({ behavior: 'smooth', block: 'center' });
      mobileBuy.click();
    } catch (ex) {}
    return true;
  }

  var explicit = ClickElement('//button[@id = "offer-card-buy-button"]');
  if (explicit) {
    return true;
  }

  var generic = findBuyButtonByText();
  if (generic) {
    try {
      generic.scrollIntoView({ behavior: 'smooth', block: 'center' });
      generic.click();
    } catch (ex) {}
    return true;
  }

  return false;
}

function isEventPage() {
  return /\/event\//i.test(window.location.href);
}

function isTargetEventPage() {
  return window.location.href.indexOf('/event/' + targetEventSlug) !== -1;
}

function randomDelayMs() {
  return Math.floor(Math.random() * maxRandomDelayMs);
}

function nowTimeLabel() {
  return new Date().toLocaleTimeString('pt-BR', { hour12: false });
}

function logBot(message) {
  if (!debugEnabled) return;
  console.log('[TM Bot][' + nowTimeLabel() + '][tentativa ' + attemptCount + '] ' + message);
}

function bootLogOnce() {
  if (bootLogged) return;
  bootLogged = true;
  console.log('[TM Bot] Script carregado em: ' + window.location.href);
  console.log(
    '[TM Bot] Perfil ativo: ' + CONFIG.selectedProfile +
    ' | intervalo=' + defaultRefreshIntervalSeconds + 's' +
    ' | turbo=' + turboRefreshIntervalSeconds + 's' +
    ' | delayAleatorioMax=' + maxRandomDelayMs + 'ms' +
    ' | pauseAbaOculta=' + (pauseWhenTabHidden ? 'sim' : 'nao')
  );
}

function playAlertSound() {
  try {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    var ctx = new AudioCtx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1046;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(function() {
      try {
        osc.stop();
        ctx.close();
      } catch (ex) {}
    }, 350);
  } catch (ex) {}
}

function notifySeatsFound(count) {
  var now = Date.now();
  if ((now - lastAlertAt) < alertCooldownMs) {
    return;
  }
  lastAlertAt = now;
  if (!turboModeEnabled) {
    if (count < numberOfTickets) {
      logBot('Assentos insuficientes para TURBO (' + count + '/' + numberOfTickets + ')');
      return;
    }
    turboModeEnabled = true;
    refreshIntervalSeconds = turboRefreshIntervalSeconds;
    logBot('Modo TURBO ativado (' + refreshIntervalSeconds + 's)');
  }
  playAlertSound();
  try { alert('[TM Bot] Assentos encontrados: ' + count); } catch (ex) {}
}

function hookNetworkForSeatStatus() {
  try {
    var originalFetch = window.fetch;
    if (originalFetch && !window.__tmBotFetchHooked) {
      window.__tmBotFetchHooked = true;
      window.fetch = function(input, init) {
        try {
          var url = '';
          if (typeof input === 'string') url = input;
          else if (input && input.url) url = input.url;
          var m = (url || '').match(/\/shop\/www\.ticketmaster\.com\.br\/seat\/status\/\d+\/\d+/);
          if (m && m[0]) latestCrowderPathSeen = m[0];
        } catch (ex) {}
        return originalFetch.call(this, input, init);
      };
    }
  } catch (ex) {}

  try {
    if (!window.__tmBotXhrHooked && window.XMLHttpRequest && window.XMLHttpRequest.prototype) {
      window.__tmBotXhrHooked = true;
      var originalOpen = window.XMLHttpRequest.prototype.open;
      window.XMLHttpRequest.prototype.open = function(method, url) {
        try {
          var m = String(url || '').match(/\/shop\/www\.ticketmaster\.com\.br\/seat\/status\/\d+\/\d+/);
          if (m && m[0]) latestCrowderPathSeen = m[0];
        } catch (ex) {}
        return originalOpen.apply(this, arguments);
      };
    }
  } catch (ex) {}
}

function getCrowderPathFromPerformance() {
  try {
    if (!window.performance || !window.performance.getEntriesByType) return null;
    var entries = window.performance.getEntriesByType('resource');
    for (var i = entries.length - 1; i >= 0; i--) {
      var url = entries[i].name || '';
      var m = url.match(/\/shop\/www\.ticketmaster\.com\.br\/seat\/status\/\d+\/\d+/);
      if (m && m[0]) return m[0];
    }
  } catch (ex) {}
  return null;
}

function checkCartEntry() {
  var href = (window.location.href || '').toLowerCase();
  if (href.indexOf('cart') !== -1 || href.indexOf('carrinho') !== -1) {
    console.log('ENTROU NO CARRINHO 🔥');
    playAlertSound();
    return true;
  }
  return false;
}

function scheduleReload() {
  setTimeout(function() {
    reload();
  }, (refreshIntervalSeconds * 1000) + randomDelayMs());
}

function scheduleNextRun() {
  setTimeout(function() {
    if (pauseWhenTabHidden && document.hidden) {
      runLoopLock = false;
      logBot('Aba em segundo plano, adiando execucao...');
      scheduleNextRun();
      return;
    }
    runLoopLock = false;
    run();
  }, Math.max(refreshIntervalSeconds * 1000, 1200) + randomDelayMs());
}

function tryCrowderSeatPolling() {
  // Endpoint observed in HAR. IDs may change per event/session.
  var crowderPath = null;
  var scripts = document.querySelectorAll('script');
  for (var i = 0; i < scripts.length; i++) {
    var txt = scripts[i].textContent || '';
    var m = txt.match(/\/shop\/www\.ticketmaster\.com\.br\/seat\/status\/\d+\/\d+/);
    if (m && m[0]) {
      crowderPath = m[0];
      break;
    }
  }

  if (!crowderPath && isTargetEventPage()) {
    crowderPath = targetCrowderFallbackPath;
  }

  if (!crowderPath && latestCrowderPathSeen) {
    crowderPath = latestCrowderPathSeen;
  }

  if (!crowderPath) {
    crowderPath = getCrowderPathFromPerformance();
  }

  if (!crowderPath) {
    logBot('seat/status nao encontrado no HTML');
    return false;
  }

  var url = 'https://public.getcrowder.com' + crowderPath;
  logBot('Consultando seat/status: ' + crowderPath);
  fetch(url, { credentials: 'include' })
    .then(function(resp) { return resp.json(); })
    .then(function(data) {
      if (data && Array.isArray(data.seats) && data.seats.length > 0) {
        logBot('Assentos encontrados: ' + data.seats.length);
        notifySeatsFound(data.seats.length);
        clickAnyBuyButton();
        scheduleNextRun();
      } else {
        refreshIntervalSeconds = noSeatsRefreshIntervalSeconds;
        logBot('Sem assentos agora, aguardando proxima tentativa...');
        scheduleNextRun();
      }
    })
    .catch(function() {
      logBot('Falha no seat/status, aguardando proxima tentativa...');
      scheduleNextRun();
    });

  return true;
}

function run() {
  if (runLoopLock) {
    return;
  }
  runLoopLock = true;
  attemptCount += 1;
  if (nextHeartbeatAttempt <= 0 || attemptCount >= nextHeartbeatAttempt) {
    logBot('Heartbeat: script ativo e monitorando pagina.');
    nextHeartbeatAttempt = computeNextHeartbeatAttempt(attemptCount);
  }

  if (!turboModeEnabled) {
    refreshIntervalSeconds = defaultRefreshIntervalSeconds;
  }

  if (checkCartEntry()) {
    runLoopLock = false;
    return;
  }

  var success = false;
  SkipPopup();

  if (!isEventPage()) {
    logBot('Fora da pagina de evento, aguardando...');
    scheduleNextRun();
    return;
  }

  // Ticket type 1: quick picks/filter panel
  if (!success) {
    var filterBar = CheckForFilterPanel();
    if (filterBar) {
      logBot('Quick picks/filter panel encontrado');
      success = true;
      ProcessFilterPanel(filterBar);
    }
  }

  // Ticket type 2: general admission / direct buy button
  if (!success) {
    var generalAdmissionBuyButton = CheckForGeneralAdmission();
    if (generalAdmissionBuyButton) {
      logBot('Fluxo general admission detectado');
      success = true;
      ProcessGeneralAdmission(generalAdmissionBuyButton);
    }
  }

  // Ticket type 3: check seat-status endpoint seen in HAR
  var crowdPollingStarted = false;
  if (!success) {
    crowdPollingStarted = tryCrowderSeatPolling();
  }

  if (!success && !crowdPollingStarted) {
    scheduleNextRun();
  } else if (success) {
    scheduleNextRun();
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  bootLogOnce();
  hookNetworkForSeatStatus();
  setTimeout(run, 50);
} else {
  document.addEventListener('DOMContentLoaded', function() {
    bootLogOnce();
    hookNetworkForSeatStatus();
    run();
  });
}
function getElementByXpath(path) {
  return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

var waitForElement = function(selector, callback) {
  var start = Date.now();
  var tick = function() {
    if (document.querySelector(selector)) {
      callback();
      return;
    }
    if ((Date.now() - start) >= waitForElementTimeoutMs) {
      logBot('Timeout aguardando elemento: ' + selector);
      return;
    }
    setTimeout(tick, 100);
  };
  tick();
};

// Legacy block replaced by run() flow above.
