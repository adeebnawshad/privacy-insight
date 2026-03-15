// Privacy Insight Background Service Worker
// Monitors network requests and detects trackers on each tab

importScripts('trackers.js');

// Store detected trackers per tab
// Format: { [tabId]: { trackers: Set, uniqueTrackerDomains: Set } }
const tabTrackers = {};

/**
 * Initialize tracker data for a tab
 */
function initializeTab(tabId) {
  if (!tabTrackers[tabId]) {
    tabTrackers[tabId] = {
      trackers: new Set(),
      uniqueTrackerDomains: new Set()
    };
  }
}

/**
 * Detect trackers from a request URL
 */
function detectTrackersInRequest(requestUrl, tabId) {
  const domain = extractDomain(requestUrl);
  if (!domain) return;

  const tracker = isKnownTracker(domain);
  if (tracker) {
    initializeTab(tabId);
    tabTrackers[tabId].trackers.add(JSON.stringify(tracker));
    tabTrackers[tabId].uniqueTrackerDomains.add(tracker.domain);
  }
}

/**
 * Get tracker count for a tab
 */
function getTrackerCount(tabId) {
  if (!tabTrackers[tabId]) return 0;
  return tabTrackers[tabId].trackers.size;
}

/**
 * Get detailed tracker info for a tab
 */
function getTrackerInfo(tabId) {
  if (!tabTrackers[tabId]) {
    return {
      count: 0,
      trackers: [],
      riskLevel: { level: 'Low', color: '#4CAF50' }
    };
  }

  const trackersArray = Array.from(tabTrackers[tabId].trackers).map((tracker) =>
    JSON.parse(tracker)
  );

  return {
    count: trackersArray.length,
    trackers: trackersArray,
    riskLevel: getPrivacyRiskLevel(trackersArray.length)
  };
}

/**
 * Update badge for a tab
 */
function updateBadge(tabId) {
  const count = getTrackerCount(tabId);

  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString(), tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#F44336', tabId });
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
  }
}

/**
 * Clear trackers when tab starts loading a new page
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    tabTrackers[tabId] = {
      trackers: new Set(),
      uniqueTrackerDomains: new Set()
    };
    updateBadge(tabId);
  }
});

/**
 * Clean up data when tab is closed
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabTrackers[tabId];
});

/**
 * Listen to network requests from browser tabs
 */
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (details.tabId > 0) {
      detectTrackersInRequest(details.url, details.tabId);
      updateBadge(details.tabId);
    }
  },
  { urls: ['<all_urls>'] },
  []
);

/**
 * Respond to popup requests for tracker information
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTrackerInfo' && typeof request.tabId === 'number') {
    sendResponse(getTrackerInfo(request.tabId));
  }
});
