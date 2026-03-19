// ======================================================
// Privacy Insight - Background Service Worker
// ======================================================
//
// This file runs in the background of the browser as a
// service worker. It is responsible for:
//
// 1. Monitoring network requests made by browser tabs
// 2. Detecting whether those requests belong to known trackers
// 3. Storing detected trackers per tab
// 4. Updating the extension badge with tracker counts
// 5. Responding to popup UI requests for tracker information
//
// The tracker detection logic and helper utilities are
// defined in trackers.js, which we import below.

importScripts('trackers.js');


// ------------------------------------------------------
// Storage for detected trackers
// ------------------------------------------------------
//
// This object stores tracker data separately for each tab.
//
// Example structure:
//
// tabTrackers = {
//   15: {
//     trackers: Set(["google-analytics.com", "doubleclick.net"]),
//     uniqueTrackerDomains: Set(["google-analytics.com"])
//   }
// }
//
// Using a Set ensures trackers are counted uniquely,
// even if the same tracker loads multiple times.

const tabTrackers = {};


// ------------------------------------------------------
// Initialize storage for a tab
// ------------------------------------------------------
//
// Ensures that a tab has an entry in the tabTrackers object.
// This function is called before storing tracker data.
//
// Example:
// initializeTab(12)
//
// Creates:
// tabTrackers[12] = { trackers: Set(), uniqueTrackerDomains: Set() }

function initializeTab(tabId) {
  if (!tabTrackers[tabId]) {
    tabTrackers[tabId] = {
      trackers: new Set(),           // Stores tracker objects
      uniqueTrackerDomains: new Set() // Stores unique domain names
    };
  }
}


// ------------------------------------------------------
// Detect trackers from a network request
// ------------------------------------------------------
//
// This function is called whenever a network request occurs.
//
// Steps:
// 1. Extract the domain from the request URL
// 2. Check if that domain matches a known tracker
// 3. If a tracker is detected, store it for the tab

function detectTrackersInRequest(requestUrl, tabId) {

  // Extract hostname from the full request URL
  const domain = extractDomain(requestUrl);

  // If domain extraction fails, stop processing
  if (!domain) return;

  // Check if the domain belongs to a known tracker
  const tracker = isKnownTracker(domain);

  if (tracker) {

    // Ensure tab storage exists
    initializeTab(tabId);

    // Store tracker object (stringified to allow Set uniqueness)
    tabTrackers[tabId].trackers.add(JSON.stringify(tracker));

    // Also track unique domain names
    tabTrackers[tabId].uniqueTrackerDomains.add(tracker.domain);
  }
}


// ------------------------------------------------------
// Get tracker count for a specific tab
// ------------------------------------------------------
//
// Returns the number of unique trackers detected for a tab.
// If the tab has no stored trackers, return 0.

function getTrackerCount(tabId) {
  if (!tabTrackers[tabId]) return 0;
  return tabTrackers[tabId].trackers.size;
}


// ------------------------------------------------------
// Retrieve detailed tracker information for a tab
// ------------------------------------------------------
//
// This function prepares tracker data for display in the popup UI.
//
// Returned structure:
//
// {
//   count: number,
//   trackers: [{domain, description}],
//   riskLevel: { level, color }
// }

function getTrackerInfo(tabId) {

  // If the tab has no recorded trackers
  if (!tabTrackers[tabId]) {
    return {
      count: 0,
      trackers: [],
      riskLevel: { level: 'Low', color: '#4CAF50' }
    };
  }

  // Convert Set of tracker strings into an array of objects
  const trackersArray = Array.from(tabTrackers[tabId].trackers).map((tracker) =>
    JSON.parse(tracker)
  );

  return {
    count: trackersArray.length,
    trackers: trackersArray,
    riskLevel: getPrivacyRiskLevel(trackersArray.length)
  };
}


// ------------------------------------------------------
// Update extension badge
// ------------------------------------------------------
//
// The badge is the small number displayed on the extension icon.
// It shows the number of trackers detected on the current page.
//
// Example badge:
// [3]

function updateBadge(tabId) {

  const count = getTrackerCount(tabId);

  if (count > 0) {

    // Display tracker count on the extension icon
    chrome.action.setBadgeText({ text: count.toString(), tabId });

    // Set badge background color (red)
    chrome.action.setBadgeBackgroundColor({ color: '#F44336', tabId });

  } else {

    // Clear badge if no trackers detected
    chrome.action.setBadgeText({ text: '', tabId });
  }
}


// ------------------------------------------------------
// Reset tracker data when a page reloads
// ------------------------------------------------------
//
// When a tab begins loading a new page, previously detected
// trackers should be cleared so that the extension only
// reflects trackers for the current page.

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {

  if (changeInfo.status === 'loading') {

    // Reset tracker storage for this tab
    tabTrackers[tabId] = {
      trackers: new Set(),
      uniqueTrackerDomains: new Set()
    };

    updateBadge(tabId);
  }
});


// ------------------------------------------------------
// Clean up storage when a tab is closed
// ------------------------------------------------------
//
// Removing tracker data prevents memory leaks and
// ensures old tab data does not accumulate.

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabTrackers[tabId];
});


// ------------------------------------------------------
// Listen to network requests from browser tabs
// ------------------------------------------------------
//
// The Chrome webRequest API allows extensions to observe
// network activity from pages.
//
// This listener fires before request headers are sent.
//
// Each request contains details like:
// - URL
// - tabId
// - request type
//
// We use this event to detect third-party trackers.

chrome.webRequest.onBeforeSendHeaders.addListener(

  (details) => {

    // Ignore requests that do not belong to browser tabs
    if (details.tabId > 0) {

      // Detect whether the request belongs to a tracker
      detectTrackersInRequest(details.url, details.tabId);

      // Update badge count
      updateBadge(details.tabId);
    }

  },

  // Monitor requests from all URLs
  { urls: ['<all_urls>'] },

  // No additional request options needed
  []
);


// ------------------------------------------------------
// Handle popup requests
// ------------------------------------------------------
//
// When the user opens the extension popup, popup.js sends
// a message requesting tracker information for the active tab.
//
// This listener receives that message and responds with
// the tracker data.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === 'getTrackerInfo' && typeof request.tabId === 'number') {

    // Send tracker data back to the popup
    sendResponse(getTrackerInfo(request.tabId));

  }

});
