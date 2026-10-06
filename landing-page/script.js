/**
 * SUSTEE Landing Page Analytics & Interactions
 * - GA4 section_view (IntersectionObserver 50% threshold with sticky header offset)
 * - GA4 cta_click (hero, final button locations)
 */

(function () {
  'use strict';

  // Prevent duplicate script execution
  if (window.__SUSTEE_ANALYTICS_INITIALIZED__) {
    return;
  }
  window.__SUSTEE_ANALYTICS_INITIALIZED__ = true;

  /**
   * Helper to safely dispatch GA4 events
   */
  function sendGAEvent(eventName, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  }

  /* ==========================================================================
     1. SECTION VIEW MEASUREMENT (section_view)
     - Targets: #hero-title (hero), #detail-space-title (detail), #purchase-title (cta)
     - Condition: 50% element visibility, once per page load, document visible
     - Header offset: Exclude sticky header height dynamically
     ========================================================================== */
  function initSectionTracking() {
    var targets = [
      { id: 'hero-title', name: 'hero' },
      { id: 'detail-space-title', name: 'detail' },
      { id: 'purchase-title', name: 'cta' }
    ];

    var sentSections = {};

    function getHeaderHeight() {
      var header = document.getElementById('site-header') || document.querySelector('.site-header');
      if (header) {
        return header.offsetHeight || 72;
      }
      return 72;
    }

    var headerHeight = getHeaderHeight();
    var rootMarginValue = '-' + headerHeight + 'px 0px 0px 0px';

    if (!('IntersectionObserver' in window)) {
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        if (document.hidden) {
          return;
        }

        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            var el = entry.target;
            var sectionName = el.getAttribute('data-ga-section');
            if (sectionName && !sentSections[sectionName]) {
              sentSections[sectionName] = true;
              sendGAEvent('section_view', {
                section_name: sectionName
              });
              observer.unobserve(el);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: rootMarginValue,
        threshold: 0.5
      }
    );

    targets.forEach(function (item) {
      var el = document.getElementById(item.id);
      if (el) {
        el.setAttribute('data-ga-section', item.name);
        observer.observe(el);
      }
    });

    // Re-check when returning to the tab in case of visibility change
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        targets.forEach(function (item) {
          if (!sentSections[item.name]) {
            var el = document.getElementById(item.id);
            if (el) {
              var rect = el.getBoundingClientRect();
              var windowHeight = window.innerHeight || document.documentElement.clientHeight;
              var currentHeaderH = getHeaderHeight();
              var visibleTop = Math.max(rect.top, currentHeaderH);
              var visibleBottom = Math.min(rect.bottom, windowHeight);
              var visibleHeight = Math.max(0, visibleBottom - visibleTop);
              if (rect.height > 0 && (visibleHeight / rect.height) >= 0.5) {
                sentSections[item.name] = true;
                sendGAEvent('section_view', {
                  section_name: item.name
                });
                observer.unobserve(el);
              }
            }
          }
        });
      }
    });
  }

  /* ==========================================================================
     2. CTA CLICK MEASUREMENT (cta_click)
     - Targets: #cta-hero / data-cta-location="hero" (hero), #cta-final / data-cta-location="final" (final)
     - Condition: Sent on each click / Enter activation without blocking or delaying link navigation
     ========================================================================== */
  function initCTATracking() {
    var ctaConfigs = [
      { selector: '#cta-hero, [data-cta-location="hero"]', location: 'hero' },
      { selector: '#cta-final, [data-cta-location="final"]', location: 'final' }
    ];

    // Collect elements using a Set to avoid attaching multiple listeners if multiple selectors match the same node
    var registeredElements = [];

    ctaConfigs.forEach(function (config) {
      var elements = document.querySelectorAll(config.selector);
      elements.forEach(function (el) {
        if (registeredElements.indexOf(el) === -1) {
          registeredElements.push(el);

          function handleCTAActivation() {
            sendGAEvent('cta_click', {
              button_location: config.location
            });
          }

          el.addEventListener('click', handleCTAActivation, { passive: true });
        }
      });
    });
  }

  // Initialize on DOM ready or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initSectionTracking();
      initCTATracking();
    });
  } else {
    initSectionTracking();
    initCTATracking();
  }
})();
