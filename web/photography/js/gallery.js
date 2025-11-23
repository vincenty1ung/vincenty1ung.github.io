/**
 * Gallery Renderer
 * Fetches photos.json and renders the photography portfolio with a timeline layout.
 */

document.addEventListener("DOMContentLoaded", function () {
  loadGallery();
  setupTimelineHover();
});

/**
 * Setup timeline hover show/hide functionality
 */
function setupTimelineHover() {
  const timelineSidebar = document.getElementById("timeline-sidebar");
  const hoverZone = document.getElementById("timeline-hover-zone");

  if (!timelineSidebar || !hoverZone) {
    return;
  }

  let hideTimeout = null;
  const HIDE_DELAY = 300; // Delay before hiding (ms)

  // Show timeline when mouse enters hover zone or timeline itself
  function showTimeline() {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    timelineSidebar.classList.add("show");
    // Disable pointer events on hover zone when timeline is shown
    hoverZone.style.pointerEvents = "none";
  }

  // Hide timeline when mouse leaves
  function hideTimeline() {
    hideTimeout = setTimeout(() => {
      timelineSidebar.classList.remove("show");
      // Re-enable pointer events on hover zone when timeline is hidden
      hoverZone.style.pointerEvents = "auto";
    }, HIDE_DELAY);
  }

  // Show on hover zone
  hoverZone.addEventListener("mouseenter", showTimeline);
  hoverZone.addEventListener("mouseleave", hideTimeline);

  // Keep showing when mouse is on timeline
  timelineSidebar.addEventListener("mouseenter", showTimeline);
  timelineSidebar.addEventListener("mouseleave", hideTimeline);

  // Ensure clicks on timeline links work properly
  timelineSidebar.addEventListener(
    "click",
    function (e) {
      // Allow click events to propagate normally
      e.stopPropagation();
    },
    true
  );
}

async function loadGallery() {
  const timelineContainer = document.getElementById("timeline-sidebar");
  const galleryContainer = document.getElementById("gallery-content");

  if (!timelineContainer || !galleryContainer) {
    console.error("Containers not found");
    return;
  }

  try {
    const response = await fetch("photos.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const albums = await response.json();

    // Global gallery state
    const galleryItems = [];

    // Render Timeline (Left Sidebar)
    renderTimeline(timelineContainer, albums);

    // Render Gallery (Right Content)
    renderGallery(galleryContainer, albums, galleryItems);

    // Bind Fancybox manually using event delegation
    // This avoids issues with 'trigger' being undefined in initialPage callback
    if (typeof Fancybox !== "undefined") {
      // Unbind any existing bindings to be safe
      Fancybox.unbind("[data-fancybox]");
      Fancybox.unbind("[data-fancybox-trigger]");
      Fancybox.unbind(".gallery-item");

      // Remove existing click listener if we could (but we can't easily without storing the function)
      // So we'll just add a new one and rely on the fact that loadGallery usually runs once or on full reload
      // For safety in SPA-like navigation, we could attach to a persistent container or check a flag
      
      galleryContainer.addEventListener('click', (e) => {
        const link = e.target.closest('.gallery-item');
        if (link) {
          e.preventDefault();
          e.stopPropagation();
          
          const index = parseInt(link.dataset.index) || 0;
          
          Fancybox.show(galleryItems, {
            startIndex: index,
            groupAll: true,
            autoFocus: false,
            trapFocus: false,
            placeFocusBack: false,
            Toolbar: {
              display: {
                left: ["infobar"],
                middle: [],
                right: ["info", "zoom", "slideshow", "fullscreen", "thumbs", "close"],
              },
              items: {
                info: {
                  tpl: `<button class="f-button" type="button" title="显示/隐藏照片信息" data-fancybox-info>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                          </svg>
                        </button>`,
                  click: (event) => {
                    const instance = Fancybox.getInstance();
                    if (instance && instance.container) {
                      instance.container.classList.toggle('has-metadata-panel');
                    }
                    if (event && event.stopPropagation) event.stopPropagation();
                  }
                }
              }
            },
            on: {
              'shouldClose': (fancybox, event) => {
                 // Blur all focusable elements BEFORE the close process starts
                 // This event fires before 'closing', giving us time to remove focus
                 const container = fancybox.container;
                 if (container) {
                   const buttons = container.querySelectorAll('button, a, [tabindex]');
                   buttons.forEach(btn => {
                     if (btn instanceof HTMLElement) {
                       btn.blur();
                     }
                   });
                 }
                 // Blur active element
                 if (document.activeElement instanceof HTMLElement && 
                     document.activeElement.closest('.fancybox__container')) {
                   document.activeElement.blur();
                 }
                 // Force focus to body to ensure nothing in the modal has focus
                 document.body.focus();
                 // Return true to allow closing
                 return true;
              },
              'Carousel.change': (fancybox, carousel, toIndex, fromIndex) => {
                // Update metadata when slide changes
                // Use galleryItems as the source of truth to avoid potential sync issues with carousel.slides
                const item = galleryItems[toIndex];
                if (!item) return;
                
                const exif = item.exif;
                const filename = item.filename;
                
                // We need to wait for the container to be ready or just update if it exists
                const container = fancybox.container;
                if (!container) return;

                try {
                  const existingPanel = container.querySelector('.fancybox__metadata');
                  if (existingPanel) existingPanel.remove();
                  
                  if (exif) {
                    const metadataPanel = createMetadataPanel(exif, filename);
                    container.appendChild(metadataPanel);
                  }
                } catch (e) {
                  console.error('Failed to update metadata panel:', e);
                }
              },
              'init': (fancybox) => {
                 // Initial load handling is done via Carousel.change usually, 
                 // but let's ensure the first slide gets processed if change doesn't fire on init
                 // actually Carousel.change fires on init too usually, but let's be safe
                 // or use 'reveal' just for the first one? 
                 // actually 'Carousel.change' is reliable for navigation. 
                 // 'reveal' is good for initial load. Let's keep 'reveal' but make sure it doesn't conflict.
                 // Actually, let's just use 'Carousel.change' and trigger it manually or rely on it.
                 // Fancybox 4/5 'Carousel.change' fires when index changes.
                 // Let's also listen to 'reveal' to catch the very first load if change doesn't fire.
              },
              'reveal': (fancybox, slide) => {
                 // Keep reveal for the initial open, as change might have fired before DOM was ready?
                 // Or just to be safe.
                 const exif = slide.exif;
                 const filename = slide.filename;
                 if (!exif) return;
                 
                 const container = fancybox.container;
                 const existingPanel = container.querySelector('.fancybox__metadata');
                 // Only add if not already there (to avoid double add if change fired)
                 if (!existingPanel) {
                    const metadataPanel = createMetadataPanel(exif, filename);
                    container.appendChild(metadataPanel);
                 } else {
                    // If it exists, make sure it matches current slide?
                    // The 'Carousel.change' should handle updates.
                    // 'reveal' ensures it's there on first load.
                 }
              },
              destroy: (fancybox) => {
                const container = fancybox.container;
                if (container) {
                  container.classList.remove('has-metadata-panel');
                  const metadataPanel = container.querySelector('.fancybox__metadata');
                  if (metadataPanel) metadataPanel.remove();
                }
              }
            }
          });
        }
      });
    }


    // Bind Image Load Events
    bindImageLoadEvents();

    // Setup Scroll Spy for Timeline
    setupScrollSpy();
    
    // Set current column count after successful load
    // This prevents unnecessary reloads on initial page load
    if (typeof currentColumnCount !== 'undefined') {
      currentColumnCount = getColumnCount();
    }
  } catch (error) {
    console.error("Error loading gallery:", error);
    galleryContainer.innerHTML =
      '<p class="text-center text-red-500">Failed to load photos.</p>';
  }
}

function renderTimeline(container, albums) {
  const nav = document.createElement("nav");
  nav.className = "relative py-4 px-2";

  // Continuous vertical timeline line
  const line = document.createElement("div");
  line.className =
    "absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700";
  nav.appendChild(line);

  albums.forEach((album, albumIndex) => {
    const yearGroup = document.createElement("div");
    yearGroup.className = "mb-6 relative";

    // Year Item Container
    const yearItem = document.createElement("div");
    yearItem.className = "relative flex items-center mb-4 group cursor-pointer";

    // Year Marker (Large Dot with ring effect)
    const yearMarkerWrapper = document.createElement("div");
    yearMarkerWrapper.className =
      "absolute left-0 flex items-center justify-center z-20";

    const yearMarker = document.createElement("div");
    yearMarker.className =
      "w-5 h-5 rounded-full border-2 border-white dark:border-gray-900 bg-gray-300 dark:bg-gray-600 shadow-sm transition-all duration-300 group-hover:scale-125 group-hover:shadow-md timeline-marker";
    yearMarker.dataset.targetMarker = `year-${album.year}`;

    // Active ring effect
    const yearRing = document.createElement("div");
    yearRing.className =
      "absolute w-5 h-5 rounded-full border-2 border-transparent transition-all duration-300";
    yearMarkerWrapper.appendChild(yearRing);
    yearMarkerWrapper.appendChild(yearMarker);
    yearItem.appendChild(yearMarkerWrapper);

    // Year Link with better styling
    const yearLink = document.createElement("a");
    yearLink.href = `#year-${album.year}`;
    yearLink.className =
      "ml-10 text-xl font-bold text-gray-400 hover:text-black dark:hover:text-white transition-all duration-300 timeline-year cursor-pointer select-none";
    yearLink.dataset.target = `year-${album.year}`;
    yearLink.textContent = album.year;

    // Add smooth scroll on click
    yearLink.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("Year link clicked:", `year-${album.year}`);
      scrollToSection(`year-${album.year}`);
      // Keep timeline visible after click
      const timelineSidebar = document.getElementById("timeline-sidebar");
      if (timelineSidebar) {
        timelineSidebar.classList.add("show");
      }
    });

    yearItem.appendChild(yearLink);
    yearGroup.appendChild(yearItem);

    // Month Links with improved styling
    const photosByMonth = groupPhotosByMonth(album.photos);
    const months = Object.keys(photosByMonth).sort((a, b) =>
      b.localeCompare(a)
    );

    if (months.length > 0) {
      const monthList = document.createElement("div");
      monthList.className = "flex flex-col space-y-2 mt-1 ml-10";

      months.forEach((month, monthIndex) => {
        const monthItem = document.createElement("div");
        monthItem.className = "relative flex items-center group cursor-pointer";

        // Month Marker (Small Dot with connecting line)
        const monthMarkerWrapper = document.createElement("div");
        monthMarkerWrapper.className =
          "absolute -left-10 flex items-center justify-center z-10";

        const monthMarker = document.createElement("div");
        monthMarker.className =
          "w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 transition-all duration-300 group-hover:scale-150 group-hover:bg-gray-600 dark:group-hover:bg-gray-300 timeline-marker";
        monthMarker.dataset.targetMarker = `section-${album.year}-${month}`;

        // Connecting line from main timeline to month
        const monthConnector = document.createElement("div");
        monthConnector.className =
          "absolute left-3 w-8 h-0.5 bg-gray-300 dark:bg-gray-600";
        monthMarkerWrapper.appendChild(monthConnector);
        monthMarkerWrapper.appendChild(monthMarker);
        monthItem.appendChild(monthMarkerWrapper);

        const monthName = new Date(2000, parseInt(month) - 1, 1).toLocaleString(
          "default",
          { month: "short" }
        );
        const monthLink = document.createElement("a");
        monthLink.href = `#section-${album.year}-${month}`;
        monthLink.className =
          "text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-300 timeline-month cursor-pointer select-none";
        monthLink.dataset.target = `section-${album.year}-${month}`;
        monthLink.textContent = monthName;

        // Add smooth scroll on click
        monthLink.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          console.log("Month link clicked:", `section-${album.year}-${month}`);
          scrollToSection(`section-${album.year}-${month}`);
          // Keep timeline visible after click
          const timelineSidebar = document.getElementById("timeline-sidebar");
          if (timelineSidebar) {
            timelineSidebar.classList.add("show");
          }
        });

        monthItem.appendChild(monthLink);
        monthList.appendChild(monthItem);
      });
      yearGroup.appendChild(monthList);
    }

    nav.appendChild(yearGroup);
  });

  container.appendChild(nav);
}

/**
 * Smooth scroll to a section with offset for sticky header
 */
function scrollToSection(sectionId) {
  const element = document.getElementById(sectionId);
  if (element) {
    const headerOffset = 100; // Offset for sticky header
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    console.log("Scrolling to section:", sectionId, "offset:", offsetPosition);
    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  } else {
    console.error("Section not found:", sectionId);
  }
}

function renderGallery(container, albums, galleryItems) {
  const allPhotos = [];
  
  albums.forEach((album) => {
    const photosByMonth = groupPhotosByMonth(album.photos);
    const months = Object.keys(photosByMonth).sort((a, b) =>
      b.localeCompare(a)
    );
    
    let isFirstYearPhoto = true;

    months.forEach((month) => {
      const monthPhotos = photosByMonth[month];
      
      if (monthPhotos.length > 0) {
        // Mark the first photo of the month
        if (!monthPhotos[0].markers) {
          monthPhotos[0].markers = [];
        }
        monthPhotos[0].markers.push(`section-${album.year}-${month}`);
        
        // Mark the first photo of the year
        if (isFirstYearPhoto) {
          monthPhotos[0].markers.push(`year-${album.year}`);
          isFirstYearPhoto = false;
        }
        
        // Add all photos to the flat list
        allPhotos.push(...monthPhotos);
      }
    });
  });
  
  // Render the single unified waterfall
  renderWaterfallLayout(container, allPhotos, null, null, galleryItems);
}

function groupPhotosByMonth(photos) {
  const groups = {};
  photos.forEach((photo) => {
    const month = photo.month || "01";
    if (!groups[month]) {
      groups[month] = [];
    }
    groups[month].push(photo);
  });
  return groups;
}


// ... createPhotoCard is fine as is, but we need to update renderWaterfallLayout ...

// --- Waterfall Layout Implementation ---

// ... getColumnCount, calculatePhotoHeight, createWaterfallLayout are fine ...

/**
 * Render waterfall layout to container
 */
function renderWaterfallLayout(container, photos, year, month, galleryItems) {
  const columnCount = getColumnCount();
  
  // Populate galleryItems and assign global indices BEFORE creating layout
  photos.forEach(photo => {
    // Assign global index
    photo.waterfallIndex = galleryItems.length;
    
    // Add to global items list for Fancybox
    galleryItems.push({
      src: photo.path,
      thumb: photo.thumbnail,
      caption: photo.alt || '',
      exif: photo.exif, // Store full EXIF object
      filename: photo.filename || ''
    });
  });

  const columns = createWaterfallLayout(photos, columnCount);
  
  // Clear container
  container.innerHTML = '';
  
  // Create waterfall container
  const waterfallContainer = document.createElement('div');
  waterfallContainer.className = 'waterfall-container';
  
  // Create columns
  columns.forEach((columnPhotos, colIndex) => {
    const columnDiv = document.createElement('div');
    columnDiv.className = 'waterfall-column';
    
    columnPhotos.forEach(photo => {
      const photoCard = createPhotoCard(photo, year, month);
      columnDiv.appendChild(photoCard);
    });
    
    waterfallContainer.appendChild(columnDiv);
  });
  
  container.appendChild(waterfallContainer);
}

function createPhotoCard(photo, year, month) {
  const wrapper = document.createElement("div");
  wrapper.className = 'photo-card relative'; // Ensure relative positioning for anchors
  wrapper.dataset.index = photo.waterfallIndex;
  
  // Calculate aspect ratio for placeholder
  // Default to 3:2 (1.5) if missing
  const width = photo.width || 300;
  const height = photo.height || 200;
  const aspectRatio = `${width} / ${height}`;
  
  wrapper.style.aspectRatio = aspectRatio;
  
  const exifData = photo.exif ? JSON.stringify(photo.exif) : '';
  const filename = photo.filename || '';
  
  // Generate hidden anchors if markers exist
  let anchorsHtml = '';
  if (photo.markers && photo.markers.length > 0) {
    anchorsHtml = photo.markers.map(markerId => 
      `<div id="${markerId}" class="absolute -top-24 left-0 w-full h-0 pointer-events-none invisible"></div>`
    ).join('');
  }
  
  wrapper.innerHTML = `
    ${anchorsHtml}
    <div class="overflow-hidden w-full h-full relative img-skeleton-bg rounded-lg safari-rounded-fix">
      <div class="img-skeleton absolute inset-0 z-10">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
      <a href="javascript:;" 
         data-src="${photo.path}"
         data-index="${photo.waterfallIndex}"
         data-exif='${exifData.replace(/'/g, "&apos;")}'
         data-filename="${filename}"
         class="block w-full h-full gallery-item">
        <img
          alt="${photo.alt || ''}"
          class="block w-full h-full object-cover object-center opacity-0 animate-fade-in transition duration-300 img-hover-zoom img-loading rounded-lg"
          src="${photo.thumbnail}"
          loading="lazy"
        />
      </a>
    </div>
  `;
  
  return wrapper;
}

function bindImageLoadEvents() {
  document.querySelectorAll("img.img-loading").forEach(function (img) {
    function hideSkeleton() {
      let parent = img.closest(".img-skeleton-bg");
      let skeleton = parent ? parent.querySelector(".img-skeleton") : null;

      img.classList.remove("img-loading");
      img.classList.remove("opacity-0");
      img.style.opacity = 1;

      if (skeleton) {
        skeleton.remove();
      }
    }

    if (img.complete && img.naturalWidth > 0) {
      hideSkeleton();
    } else {
      img.addEventListener("load", hideSkeleton);
      img.addEventListener("error", hideSkeleton);
    }
  });
}

function setupScrollSpy() {
  const observerOptions = {
    root: null,
    rootMargin: "-20% 0px -60% 0px", // Active when element is in the middle-ish
    threshold: 0,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        activateTimelineItem(id);
      }
    });
  }, observerOptions);

  // Observe all year and month sections
  document
    .querySelectorAll('[id^="year-"], [id^="section-"]')
    .forEach((section) => {
      observer.observe(section);
    });
}

function activateTimelineItem(id) {
  // Reset all year texts
  document.querySelectorAll(".timeline-year").forEach((el) => {
    el.classList.remove(
      "text-black",
      "dark:text-white",
      "text-gray-800",
      "dark:text-gray-200"
    );
    el.classList.add("text-gray-400");
  });

  // Reset all month texts
  document.querySelectorAll(".timeline-month").forEach((el) => {
    el.classList.remove(
      "text-gray-700",
      "dark:text-gray-200",
      "text-black",
      "dark:text-white",
      "font-semibold"
    );
    el.classList.add("text-gray-500", "dark:text-gray-400");
  });

  // Reset all year markers
  document.querySelectorAll(".timeline-marker").forEach((el) => {
    if (
      el.closest('[data-target-marker^="year-"]') ||
      el.dataset.targetMarker?.startsWith("year-")
    ) {
      el.classList.remove(
        "bg-black",
        "dark:bg-white",
        "scale-125",
        "ring-2",
        "ring-black",
        "dark:ring-white",
        "shadow-lg"
      );
      el.classList.add("bg-gray-300", "dark:bg-gray-600");
    } else {
      el.classList.remove(
        "bg-black",
        "dark:bg-white",
        "scale-150",
        "ring-2",
        "ring-black",
        "dark:ring-white"
      );
      el.classList.add("bg-gray-400", "dark:bg-gray-500");
    }
  });

  // Activate current item
  const activeLink = document.querySelector(`[data-target="${id}"]`);
  if (activeLink) {
    if (id.startsWith("year-")) {
      activeLink.classList.remove("text-gray-400");
      activeLink.classList.add("text-black", "dark:text-white");
    } else {
      activeLink.classList.remove("text-gray-500", "dark:text-gray-400");
      activeLink.classList.add(
        "text-gray-700",
        "dark:text-gray-200",
        "font-semibold"
      );
    }
  }

  // Activate current marker with enhanced styling
  const activeMarker = document.querySelector(`[data-target-marker="${id}"]`);
  if (activeMarker) {
    if (id.startsWith("year-")) {
      activeMarker.classList.remove("bg-gray-300", "dark:bg-gray-600");
      activeMarker.classList.add(
        "bg-black",
        "dark:bg-white",
        "scale-125",
        "ring-2",
        "ring-black",
        "dark:ring-white",
        "shadow-lg"
      );
    } else {
      activeMarker.classList.remove("bg-gray-400", "dark:bg-gray-500");
      activeMarker.classList.add(
        "bg-black",
        "dark:bg-white",
        "scale-150",
        "ring-2",
        "ring-black",
        "dark:ring-white"
      );
    }
  }

  // If it's a month, also highlight the parent year (subtly)
  if (id.startsWith("section-")) {
    const year = id.split("-")[1];
    const yearLink = document.querySelector(`[data-target="year-${year}"]`);
    const yearMarker = document.querySelector(
      `[data-target-marker="year-${year}"]`
    );

    if (yearLink) {
      yearLink.classList.remove("text-gray-400");
      yearLink.classList.add("text-gray-800", "dark:text-gray-200");
    }
    if (yearMarker) {
      yearMarker.classList.remove("bg-gray-300", "dark:bg-gray-600");
      yearMarker.classList.add("bg-gray-500", "dark:bg-gray-400", "scale-110");
    }
  }
}

/**
 * Create metadata panel HTML from EXIF data
 */
function createMetadataPanel(exif, filename) {
  console.log('Creating metadata panel for:', filename, exif);
  const panel = document.createElement('div');
  panel.className = 'fancybox__metadata';
  
  // Extract key EXIF values
  const rating = exif.Rating || 0;
  const tags = extractTags(exif);
  const shootingParams = extractShootingParams(exif);
  const deviceInfo = extractDeviceInfo(exif);
  const shootingMode = extractShootingMode(exif);
  
  panel.innerHTML = `
    <!-- Header -->
    <div class="metadata-header">
      <div class="metadata-filename">${filename.replace('.jpg', '').replace('.JPG', '')}</div>
      
      ${rating > 0 ? `
      <div class="metadata-rating">
        <span class="metadata-rating-label">评分</span>
        <div class="metadata-stars">
          ${renderStarRating(rating)}
        </div>
      </div>
      ` : ''}
      
      ${tags.length > 0 ? `
      <div class="metadata-tags">
        <span class="metadata-tags-label">标签</span>
        <div>
          ${tags.map(tag => `<span class="metadata-tag">${tag}</span>`).join('')}
        </div>
      </div>
      ` : ''}
    </div>
    
    <!-- Shooting Parameters -->
    ${shootingParams.length > 0 ? `
    <div class="metadata-section">
      <div class="metadata-section-title">
        <span class="metadata-section-icon">📷</span>
        拍摄参数
      </div>
      ${shootingParams.map(param => `
        <div class="metadata-row">
          <span class="metadata-row-label">${param.icon} ${param.label}</span>
          <span class="metadata-row-value">${param.value}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    <!-- Device Info -->
    ${deviceInfo.length > 0 ? `
    <div class="metadata-section">
      <div class="metadata-section-title">
        <span class="metadata-section-icon">📱</span>
        设备信息
      </div>
      ${deviceInfo.map(info => `
        <div class="metadata-row">
          <span class="metadata-row-label">${info.icon} ${info.label}</span>
          <span class="metadata-row-value">${info.value}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    <!-- Shooting Mode -->
    ${shootingMode.length > 0 ? `
    <div class="metadata-section">
      <div class="metadata-section-title">
        <span class="metadata-section-icon">⚙️</span>
        拍摄模式
      </div>
      ${shootingMode.map(mode => `
        <div class="metadata-row">
          <span class="metadata-row-label">${mode.label}</span>
          <span class="metadata-row-value">${mode.value}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}
  `;
  
  return panel;
}



/**
 * Render star rating HTML
 */
function renderStarRating(rating) {
  const maxStars = 5;
  let stars = '';
  for (let i = 1; i <= maxStars; i++) {
    if (i <= rating) {
      stars += '<span class="metadata-star">★</span>';
    } else {
      stars += '<span class="metadata-star empty">★</span>';
    }
  }
  return stars;
}

// --- Waterfall Layout Implementation ---

/**
 * Get column count based on media queries (more accurate than width checks)
 */
function getColumnCount() {
  // Use matchMedia to match the same breakpoints as Tailwind/CSS
  // This is more reliable than checking window.innerWidth
  if (window.matchMedia('(min-width: 1200px)').matches) {
    return 5;  // Desktop
  }
  if (window.matchMedia('(min-width: 768px)').matches) {
    return 3;  // Tablet
  }
  return 2;  // Mobile
}

/**
 * Calculate photo height based on column width (optional, for estimation)
 */
function calculatePhotoHeight(photo, columnWidth) {
  if (!photo.width || !photo.height) return 200; // Default fallback
  const aspectRatio = photo.width / photo.height;
  return columnWidth / aspectRatio;
}

/**
 * Create waterfall layout data structure
 * @param {Array} photos - Array of photo objects
 * @param {number} columnCount - Number of columns
 * @returns {Array} columns - Array of arrays, where each inner array contains photos for that column
 */
function createWaterfallLayout(photos, columnCount) {
  const columnHeights = new Array(columnCount).fill(0);
  const columns = Array.from({ length: columnCount }, () => []);
  const gap = 8; // 0.5rem = 8px
  
  photos.forEach((photo) => {
    // Find the shortest column
    let minHeight = columnHeights[0];
    let minIndex = 0;
    
    for (let i = 1; i < columnCount; i++) {
      if (columnHeights[i] < minHeight) {
        minHeight = columnHeights[i];
        minIndex = i;
      }
    }
    
    // Add photo to the shortest column
    columns[minIndex].push(photo);
    
    // Update column height (using estimated height)
    // Note: We don't have exact column width here easily without DOM, 
    // so we use aspect ratio to estimate relative height addition.
    // Assuming a base width of 100 units.
    const aspectRatio = (photo.width && photo.height) ? (photo.width / photo.height) : 1.5;
    const estimatedHeight = 100 / aspectRatio; 
    columnHeights[minIndex] += estimatedHeight + gap;
  });
  
  return columns;
}

/**
 * Generate mapping from Timeline keys to global photo indices
 */
function generateTimelineMapping(albums) {
  const mapping = {};
  let globalIndex = 0;
  
  albums.forEach(album => {
    const photosByMonth = groupPhotosByMonth(album.photos);
    const months = Object.keys(photosByMonth).sort((a, b) => b.localeCompare(a));
    
    months.forEach(month => {
      const key = `${album.year}-${month}`;
      mapping[key] = globalIndex;
      globalIndex += photosByMonth[month].length;
    });
  });
  
  return mapping;
}

/**
 * Scroll to timeline section
 */
function scrollToTimelineSection(year, month) {
  const sectionId = `section-${year}-${month}`;
  scrollToSection(sectionId);
}

/**
 * Debounce function
 */
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

/**
 * Handle resize event
 */
let currentColumnCount = null; // Will be set after first gallery load

function handleResize() {
  // Only reload if the column count actually changes
  // This prevents unnecessary reloads on mobile when scrolling (browser UI changes trigger resize)
  const newColumnCount = getColumnCount();
  
  // Skip if this is the first time (currentColumnCount not yet set)
  if (currentColumnCount === null) {
    currentColumnCount = newColumnCount;
    return;
  }
  
  if (newColumnCount !== currentColumnCount) {
    currentColumnCount = newColumnCount;
    loadGallery();
  }
}

// Add resize listener
window.addEventListener('resize', debounce(handleResize, 300));


/**
 * Extract tags from EXIF data
 */
function extractTags(exif) {
  const tags = [];
  
  // Try different tag fields
  if (exif.Keywords) {
    if (Array.isArray(exif.Keywords)) {
      tags.push(...exif.Keywords);
    } else {
      tags.push(exif.Keywords);
    }
  }
  
  if (exif.Subject && !tags.includes(exif.Subject)) {
    if (Array.isArray(exif.Subject)) {
      tags.push(...exif.Subject);
    } else {
      tags.push(exif.Subject);
    }
  }
  
  return tags.filter(tag => tag && tag.trim());
}

/**
 * Extract shooting parameters from EXIF
 */
function extractShootingParams(exif) {
  const params = [];
  
  if (exif.FocalLength) {
    params.push({
      icon: '🔍',
      label: '焦距',
      value: exif.FocalLength
    });
  }
  
  if (exif.FNumber || exif.Aperture) {
    const aperture = exif.FNumber || exif.Aperture;
    params.push({
      icon: '⚪',
      label: '光圈',
      value: `f/${aperture}`
    });
  }
  
  if (exif.ExposureTime || exif.ShutterSpeed) {
    const shutter = exif.ExposureTime || exif.ShutterSpeed;
    params.push({
      icon: '⏱️',
      label: '曝光时间',
      value: shutter
    });
  }
  
  if (exif.ISO) {
    params.push({
      icon: '📊',
      label: 'ISO',
      value: exif.ISO
    });
  }
  
  return params;
}

/**
 * Extract device information from EXIF
 */
function extractDeviceInfo(exif) {
  const info = [];
  
  if (exif.Make && exif.Model) {
    info.push({
      icon: '📷',
      label: '相机',
      value: `${exif.Make} ${exif.Model}`
    });
  } else if (exif.Model) {
    info.push({
      icon: '📷',
      label: '相机',
      value: exif.Model
    });
  }
  
  if (exif.LensModel || exif.Lens) {
    info.push({
      icon: '🔭',
      label: '镜头',
      value: exif.LensModel || exif.Lens
    });
  }
  
  if (exif.FocalLengthIn35mmFormat) {
    info.push({
      icon: '📐',
      label: '35mm等效',
      value: `${exif.FocalLengthIn35mmFormat} mm`
    });
  }
  
  return info;
}

/**
 * Extract shooting mode information from EXIF
 */
function extractShootingMode(exif) {
  const modes = [];
  
  if (exif.WhiteBalance) {
    modes.push({
      label: '白平衡',
      value: exif.WhiteBalance
    });
  }
  
  if (exif.ExposureProgram) {
    modes.push({
      label: '曝光程序',
      value: exif.ExposureProgram
    });
  }
  
  if (exif.ExposureMode) {
    modes.push({
      label: '曝光模式',
      value: exif.ExposureMode
    });
  }
  
  if (exif.MeteringMode) {
    modes.push({
      label: '测光模式',
      value: exif.MeteringMode
    });
  }
  
  if (exif.Flash) {
    modes.push({
      label: '闪光灯',
      value: exif.Flash
    });
  }
  
  if (exif.SceneCaptureType) {
    modes.push({
      label: '场景捕捉类型',
      value: exif.SceneCaptureType
    });
  }

  modes.push({
      label: '版权信息',
      value: "© 2025 VINCENT CHYU PHOTOGRAPHY - ALL RIGHT RESERVED"
    });
  
  return modes;
}
