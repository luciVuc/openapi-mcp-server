// Main JavaScript functionality for the documentation site

document.addEventListener("DOMContentLoaded", function () {
  // Initialize all components
  initNavigation();
  initTabs();
  initScrollToTop();
  initCopyButtons();
  initSmoothScrolling();
  initAccordions();
  initModals();
  initAnimations();
  initSearch();
});

// Navigation functionality
function initNavigation() {
  const navToggle = document.getElementById("nav-toggle");
  const navMenu = document.getElementById("nav-menu");

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", function () {
      navToggle.classList.toggle("active");
      navMenu.classList.toggle("active");
    });

    // Close menu when clicking on links
    const navLinks = navMenu.querySelectorAll(".nav-link");
    navLinks.forEach((link) => {
      link.addEventListener("click", function () {
        navToggle.classList.remove("active");
        navMenu.classList.remove("active");
      });
    });

    // Close menu when clicking outside
    document.addEventListener("click", function (event) {
      if (
        !navToggle.contains(event.target) &&
        !navMenu.contains(event.target)
      ) {
        navToggle.classList.remove("active");
        navMenu.classList.remove("active");
      }
    });
  }

  // Highlight active nav item based on scroll position
  highlightActiveNavItem();
  window.addEventListener("scroll", highlightActiveNavItem);
}

// Highlight active navigation item based on scroll position
function highlightActiveNavItem() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  const scrollPosition = window.scrollY + 100;

  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    const sectionId = section.getAttribute("id");

    if (
      scrollPosition >= sectionTop &&
      scrollPosition < sectionTop + sectionHeight
    ) {
      navLinks.forEach((link) => {
        link.classList.remove("active");
        if (link.getAttribute("href") === `#${sectionId}`) {
          link.classList.add("active");
        }
      });
    }
  });
}

// Tab functionality
function initTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const targetTab = this.getAttribute("data-tab");

      // Remove active class from all buttons and panes
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabPanes.forEach((pane) => pane.classList.remove("active"));

      // Add active class to clicked button and corresponding pane
      this.classList.add("active");
      const targetPane = document.getElementById(`${targetTab}-tab`);
      if (targetPane) {
        targetPane.classList.add("active");
      }
    });
  });
}

// Scroll to top button
function initScrollToTop() {
  // Create scroll to top button
  const scrollToTopButton = document.createElement("a");
  scrollToTopButton.href = "#home";
  scrollToTopButton.className = "scroll-to-top";
  scrollToTopButton.innerHTML = "↑";
  scrollToTopButton.setAttribute("aria-label", "Scroll to top");
  document.body.appendChild(scrollToTopButton);

  // Show/hide button based on scroll position
  window.addEventListener("scroll", function () {
    if (window.scrollY > 300) {
      scrollToTopButton.classList.add("visible");
    } else {
      scrollToTopButton.classList.remove("visible");
    }
  });

  // Smooth scroll to top
  scrollToTopButton.addEventListener("click", function (e) {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

// Copy button functionality
function initCopyButtons() {
  const copyButtons = document.querySelectorAll(".copy-btn");

  copyButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const targetId = this.getAttribute("data-copy");
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        const textToCopy = targetElement.textContent || targetElement.innerText;

        // Use the Clipboard API if available
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard
            .writeText(textToCopy)
            .then(() => {
              showCopyFeedback(this, "Copied!");
            })
            .catch(() => {
              fallbackCopyToClipboard(textToCopy, this);
            });
        } else {
          fallbackCopyToClipboard(textToCopy, this);
        }
      }
    });
  });
}

// Fallback copy functionality for older browsers
function fallbackCopyToClipboard(text, button) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand("copy");
    showCopyFeedback(button, "Copied!");
  } catch (err) {
    showCopyFeedback(button, "Failed to copy");
  }

  document.body.removeChild(textArea);
}

// Show copy feedback
function showCopyFeedback(button, message) {
  const originalText = button.textContent;
  button.textContent = message;
  button.style.backgroundColor = "#10b981";

  setTimeout(() => {
    button.textContent = originalText;
    button.style.backgroundColor = "";
  }, 2000);
}

// Smooth scrolling for anchor links
function initSmoothScrolling() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  anchorLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href").substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        e.preventDefault();
        const offsetTop = targetElement.offsetTop - 80; // Account for fixed navbar

        window.scrollTo({
          top: offsetTop,
          behavior: "smooth",
        });

        // Update URL without causing scroll
        if (history.pushState) {
          history.pushState(null, null, `#${targetId}`);
        }
      }
    });
  });
}

// Accordion functionality
function initAccordions() {
  const accordionHeaders = document.querySelectorAll(".accordion-header");

  accordionHeaders.forEach((header) => {
    header.addEventListener("click", function () {
      const accordionItem = this.parentElement;
      const isActive = accordionItem.classList.contains("active");

      // Close all accordion items
      const allItems = document.querySelectorAll(".accordion-item");
      allItems.forEach((item) => item.classList.remove("active"));

      // Open clicked item if it wasn't active
      if (!isActive) {
        accordionItem.classList.add("active");
      }
    });
  });
}

// Modal functionality
function initModals() {
  const modalTriggers = document.querySelectorAll("[data-modal]");
  const modals = document.querySelectorAll(".modal");
  const closeButtons = document.querySelectorAll(".modal-close");

  // Open modal
  modalTriggers.forEach((trigger) => {
    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      const modalId = this.getAttribute("data-modal");
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = "block";
        document.body.style.overflow = "hidden";
      }
    });
  });

  // Close modal
  closeButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const modal = this.closest(".modal");
      if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "";
      }
    });
  });

  // Close modal when clicking outside
  modals.forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === this) {
        this.style.display = "none";
        document.body.style.overflow = "";
      }
    });
  });

  // Close modal with Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      modals.forEach((modal) => {
        if (modal.style.display === "block") {
          modal.style.display = "none";
          document.body.style.overflow = "";
        }
      });
    }
  });
}

// Animation on scroll
function initAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("fade-in");
      }
    });
  }, observerOptions);

  // Observe elements that should animate
  const animateElements = document.querySelectorAll(
    ".feature-card, .doc-card, .community-card, .example-card, .arch-component",
  );
  animateElements.forEach((element) => {
    observer.observe(element);
  });
}

// Search functionality (basic implementation)
function initSearch() {
  const searchInput = document.querySelector(".search-input");

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      const query = this.value.toLowerCase().trim();

      if (query.length > 2) {
        performSearch(query);
      } else {
        clearSearchResults();
      }
    });
  }
}

// Perform search (basic implementation - can be enhanced)
function performSearch(query) {
  const searchableElements = document.querySelectorAll(
    "h1, h2, h3, h4, p, .feature-card, .doc-card",
  );
  const results = [];

  searchableElements.forEach((element) => {
    const text = element.textContent.toLowerCase();
    if (text.includes(query)) {
      results.push({
        element: element,
        text: element.textContent.trim(),
        score: calculateSearchScore(text, query),
      });
    }
  });

  // Sort by relevance score
  results.sort((a, b) => b.score - a.score);

  // Display results (basic implementation)
  displaySearchResults(results.slice(0, 5), query);
}

// Calculate search relevance score
function calculateSearchScore(text, query) {
  let score = 0;

  // Exact match gets highest score
  if (text.includes(query)) {
    score += 10;
  }

  // Word boundary matches get higher score
  const words = query.split(" ");
  words.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const matches = text.match(regex);
    if (matches) {
      score += matches.length * 5;
    }
  });

  return score;
}

// Display search results
function displaySearchResults(results, query) {
  // This is a basic implementation
  // In a real application, you might want to show results in a dropdown or modal
  console.log(`Search results for "${query}":`, results);
}

// Clear search results
function clearSearchResults() {
  // Clear any displayed search results
  console.log("Search cleared");
}

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Performance optimization for scroll events
const debouncedHighlightNav = debounce(highlightActiveNavItem, 10);
window.addEventListener("scroll", debouncedHighlightNav);

// Theme toggle functionality (if needed)
function initThemeToggle() {
  const themeToggle = document.querySelector(".theme-toggle");

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      document.body.classList.toggle("dark-theme");
      const isDark = document.body.classList.contains("dark-theme");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }

  // Apply saved theme
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  }
}

// Error handling for external resources
window.addEventListener("error", function (e) {
  console.warn("Resource failed to load:", e.target.src || e.target.href);
});

// Analytics integration (placeholder)
function trackEvent(category, action, label) {
  // Integration with analytics service (Google Analytics, etc.)
  if (typeof gtag !== "undefined") {
    gtag("event", action, {
      event_category: category,
      event_label: label,
    });
  }
}

// Track clicks on important buttons
document.addEventListener("click", function (e) {
  if (e.target.matches(".btn-primary")) {
    trackEvent("Interaction", "click", "Primary Button");
  }

  if (e.target.matches(".nav-link")) {
    trackEvent("Navigation", "click", e.target.textContent.trim());
  }

  if (e.target.matches(".copy-btn")) {
    trackEvent("Interaction", "copy", "Code Copy");
  }
});

// Progressive enhancement for JavaScript-dependent features
function enhanceExperience() {
  // Add class to indicate JavaScript is enabled
  document.documentElement.classList.add("js-enabled");

  // Hide no-js warnings
  const noJsElements = document.querySelectorAll(".no-js");
  noJsElements.forEach((element) => {
    element.style.display = "none";
  });
}

// Initialize progressive enhancement
enhanceExperience();

// Expose useful functions globally for potential external use
window.OpenAPIMCPDocs = {
  trackEvent,
  debounce,
  throttle,
  showCopyFeedback,
};
