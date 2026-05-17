// Preloader Hiding Logic
document.body.classList.add('stopscrolling');

window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    // Reduced timeout to improve Lighthouse FCP/LCP metrics
    setTimeout(() => {
      preloader.classList.add('fade-out');
      document.body.classList.remove('stopscrolling');
    }, 200);
  }
});

// Hamburger Menu Toggle
function hamburgerMenu() {
  const menu = document.getElementById('mobiletogglemenu');
  const bar1 = document.getElementById('burger-bar1');
  const bar2 = document.getElementById('burger-bar2');
  const bar3 = document.getElementById('burger-bar3');
  
  if (menu) menu.classList.toggle('show-toggle-menu');
  if (bar1) bar1.classList.toggle('hamburger-animation1');
  if (bar2) bar2.classList.toggle('hamburger-animation2');
  if (bar3) bar3.classList.toggle('hamburger-animation3');
}

// Hide Menu when a link is clicked
function hidemenubyli() {
  const menu = document.getElementById('mobiletogglemenu');
  const bar1 = document.getElementById('burger-bar1');
  const bar2 = document.getElementById('burger-bar2');
  const bar3 = document.getElementById('burger-bar3');
  
  if (menu) menu.classList.remove('show-toggle-menu');
  if (bar1) bar1.classList.remove('hamburger-animation1');
  if (bar2) bar2.classList.remove('hamburger-animation2');
  if (bar3) bar3.classList.remove('hamburger-animation3');
}

// Scroll to Top and Back to Top functionality disabled and hidden as requested

// Cursor Interaction
const cursorInner = document.getElementById("cursor-inner");
const cursorOuter = document.getElementById("cursor-outer");
const links = document.querySelectorAll("a, label, button, .mobile-navbar-tabs-li, .navbar-tabs-li");

let mouseX = 0;
let mouseY = 0;
let cursorOuterX = 0;
let cursorOuterY = 0;

document.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function animateCursor() {
  // Move inner cursor in animation frame to avoid layout thrashing
  if (cursorInner) {
    cursorInner.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
  }

  // Smoothly interpolate outer cursor position
  const speed = 0.15; // Adjustment for lag feel
  cursorOuterX += (mouseX - cursorOuterX) * speed;
  cursorOuterY += (mouseY - cursorOuterY) * speed;
  
  if (cursorOuter) {
    cursorOuter.style.transform = `translate3d(${cursorOuterX}px, ${cursorOuterY}px, 0) translate(-50%, -50%)`;
  }
  
  requestAnimationFrame(animateCursor);
}
animateCursor();

links.forEach((link) => {
  link.addEventListener("mouseenter", () => {
    if (cursorInner) cursorInner.classList.add("hover");
    if (cursorOuter) cursorOuter.classList.add("hover");
  });
  link.addEventListener("mouseleave", () => {
    if (cursorInner) cursorInner.classList.remove("hover");
    if (cursorOuter) cursorOuter.classList.remove("hover");
  });
});

// Navbar Tab Switching Logic
const navTabs = document.querySelectorAll(".navbar-tabs-li");
const sections = document.querySelectorAll("section");
const activeDot = document.getElementById("nav-active-dot");

function updateDot(tab) {
    if (activeDot && tab) {
        activeDot.style.left = `${tab.offsetLeft - 15}px`;
        activeDot.style.top = `${tab.offsetTop + tab.offsetHeight/2}px`;
    }
}

// Initial position
updateDot(document.querySelector(".navbar-tabs-li.activeThistab"));

// Bulletproof Scrollspy Navigation
function scrollSpy() {
  let currentSectionId = "";
  
  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
    
    // Trigger if scrolled past the section top minus a 30% screen height buffer
    if (scrollPosition >= sectionTop - window.innerHeight * 0.3) {
      currentSectionId = section.getAttribute("id");
    }
  });
  
  // Force active last section at the bottom of the page
  const scrollHeight = document.documentElement.scrollHeight;
  const clientHeight = document.documentElement.clientHeight;
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  if (scrollTop + clientHeight >= scrollHeight - 80) {
    currentSectionId = "projects";
  }

  if (currentSectionId) {
    let targetTab = null;
    navTabs.forEach((tab) => {
      if (tab.classList.contains(currentSectionId)) {
        targetTab = tab;
      }
    });
    
    if (targetTab && !targetTab.classList.contains("activeThistab")) {
      navTabs.forEach((tab) => tab.classList.remove("activeThistab"));
      targetTab.classList.add("activeThistab");
      updateDot(targetTab);
    }
  }
}

// Listen to scroll and load events
window.addEventListener("scroll", scrollSpy);
window.addEventListener("resize", () => {
  const activeTab = document.querySelector(".navbar-tabs-li.activeThistab");
  if (activeTab) updateDot(activeTab);
});
// Initial check
scrollSpy();

// Certification Modal Functions
function openCertModal(title, issuer, fileUrl) {
  const modal = document.getElementById("certModal");
  const modalTitle = document.getElementById("modalCertTitle");
  const modalIssuer = document.getElementById("modalCertIssuer");
  const iframe = document.getElementById("certModalIframe");
  const img = document.getElementById("certModalImg");
  const openLink = document.getElementById("modalCertOpenLink");
  
  if (modal && modalTitle && modalIssuer && iframe && img && openLink) {
    modalTitle.textContent = title;
    modalIssuer.textContent = `Verified by ${issuer}`;
    openLink.href = fileUrl;
    
    // Load appropriate element
    if (fileUrl.toLowerCase().endsWith('.pdf')) {
      iframe.src = fileUrl;
      iframe.style.display = 'block';
      img.style.display = 'none';
      img.src = '';
    } else {
      img.src = fileUrl;
      img.style.display = 'block';
      iframe.style.display = 'none';
      iframe.src = '';
    }
    
    modal.classList.add("active");
    document.body.style.overflow = "hidden"; // Prevent scrolling behind modal
  }
}

function closeCertModal(event) {
  const modal = document.getElementById("certModal");
  const iframe = document.getElementById("certModalIframe");
  const img = document.getElementById("certModalImg");
  
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
    if (iframe) iframe.src = "";
    if (img) img.src = "";
  }
}
