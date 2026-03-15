// ============================================
// Privacy Insight - Tracker Detection Utilities
// ============================================
//
// This file contains:
// 1. A small hardcoded database of common tracker domains
// 2. Utility functions for parsing URLs
// 3. Logic for detecting whether a domain belongs to a tracker
// 4. A simple privacy risk scoring system
//
// background.js imports this file and uses these helpers
// when inspecting network requests.

// --------------------------------------------
// Known tracker domains and descriptions
// --------------------------------------------
//
// Each key = tracker domain
// Each value = plain-language description
//
// In a production system this list would be much larger
// (for example using EasyPrivacy or Disconnect lists)

const TRACKERS = {

  // ---- Analytics Trackers ----
  'google-analytics.com': 'Google Analytics - tracks user behavior and engagement',
  'googletagmanager.com': 'Google Tag Manager - manages third-party tags and trackers',
  'analytics.google.com': 'Google Analytics - tracks user behavior and engagement',

  // ---- Facebook Trackers ----
  'facebook.com': 'Facebook - social media tracking and ad targeting',
  'connect.facebook.net': 'Facebook Connect - cross-site tracking',
  'fbcdn.net': 'Facebook CDN - serves Facebook tracking pixels',

  // ---- Advertising Networks ----
  'doubleclick.net': 'Google DoubleClick - ad serving and tracking',
  'adnxs.com': 'AppNexus - real-time bidding ad network',
  'criteo.com': 'Criteo - retargeting ads',
  'amazon-adsystem.com': 'Amazon Ad Network - ad serving',

  // ---- Product Analytics / Behavior Tracking ----
  'hotjar.com': 'Hotjar - session recording and heatmaps',
  'mixpanel.com': 'Mixpanel - product analytics',
  'segment.io': 'Segment - customer data platform',
  'amplitude.com': 'Amplitude - product analytics',

  // ---- Social Media Tracking ----
  'twitter.com': 'Twitter/X - social tracking',
  'platform.twitter.com': 'Twitter Platform - embedded content tracking',
  'pinterest.com': 'Pinterest - social tracking',

  // ---- Customer Messaging Platforms ----
  'intercom.io': 'Intercom - customer communication platform',
};


// --------------------------------------------
// Extract domain from a full URL
// --------------------------------------------
//
// Example input:
// https://www.google-analytics.com/analytics.js
//
// Output:
// google-analytics.com
//
// This function safely parses URLs using the
// built-in JavaScript URL object.

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    // If the URL is invalid, return empty string
    return '';
  }
}


// --------------------------------------------
// Check whether a domain matches a known tracker
// --------------------------------------------
//
// Returns:
// - tracker object { domain, description }
// - or null if no tracker match is found
//
// Matching logic:
// 1. Normalize the domain (lowercase, remove www)
// 2. Check exact match
// 3. Check subdomain match
//
// Example matches:
// google-analytics.com
// cdn.google-analytics.com
// www.google-analytics.com

function isKnownTracker(domain) {

  // Normalize the domain for consistent matching
  const normalized = domain.toLowerCase().replace(/^www\./, '');

  // Loop through known tracker domains
  for (const trackerDomain in TRACKERS) {

    // Match exact domain OR subdomain
    if (
      normalized === trackerDomain ||
      normalized.endsWith(`.${trackerDomain}`)
    ) {

      return {
        domain: trackerDomain,
        description: TRACKERS[trackerDomain]
      };

    }
  }

  // No tracker match found
  return null;
}


// --------------------------------------------
// Compute privacy risk level
// --------------------------------------------
//
// Converts tracker count into a simple
// Low / Medium / High risk indicator.
//
// This makes the results easier for users to
// understand without needing technical knowledge.

function getPrivacyRiskLevel(count) {

  if (count === 0) {
    return {
      level: 'Low',
      color: '#4CAF50'   // Green
    };

  } else if (count <= 2) {
    return {
      level: 'Medium',
      color: '#FFC107'   // Yellow
    };

  } else {
    return {
      level: 'High',
      color: '#F44336'   // Red
    };
  }
}
