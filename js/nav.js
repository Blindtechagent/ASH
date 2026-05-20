// Sidebar Toggle Logic
function toggleSidebar() {
    const sidebar = document.getElementById("mySidebar");
    const overlay = document.getElementById("myOverlay");
    const toggleBtn = document.querySelector(".ash-toggle-btn");
    const mainContent = document.querySelectorAll('body > *:not(#mySidebar):not(script):not(#myOverlay)');
    
    const isOpen = sidebar.classList.contains('open');

    if (isOpen) {
        // CLOSE MENU
        sidebar.classList.remove('open');
        overlay.style.display = 'none';
        
        // Update Button for "Open" state
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('aria-label', 'Open navigation menu');
        toggleBtn.innerHTML = 'Menu &#9776;'; // Hamburger icon
        
        // Restore visibility to other elements
        mainContent.forEach(el => el.removeAttribute('aria-hidden'));
        
        toggleBtn.focus(); 
    } else {
        // OPEN MENU
        sidebar.classList.add('open');
        overlay.style.display = 'block';
        
        // Update Button for "Close" state
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.setAttribute('aria-label', 'Close navigation menu');
        toggleBtn.innerHTML = 'Close &times;'; // Cross icon
        
        // Mark active page
        setActivePage();

        // Hide other elements from screen readers
        mainContent.forEach(el => {
            if (el.id !== 'mySidebar') {
                el.setAttribute('aria-hidden', 'true');
            }
        });

        // Focus the first focusable element (close button in sidebar)
        const closeBtn = sidebar.querySelector('button');
        if (closeBtn) closeBtn.focus();
    }
}

// Function to set active page in sidebar
function setActivePage() {
    const sidebar = document.getElementById("mySidebar");
    const links = sidebar.querySelectorAll('a');
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split("/").pop() || "index.html";

    links.forEach(link => {
        const linkPage = link.getAttribute('href').split("/").pop();
        
        if (linkPage === currentPage) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        } else {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        }
    });
}

// Trap focus and Handle Escape key
document.addEventListener('keydown', function(e) {
    const sidebar = document.getElementById("mySidebar");
    if (!sidebar) return;
    const isVisible = sidebar.classList.contains('open');

    if (!isVisible) return;

    if (e.key === 'Escape') {
        toggleSidebar();
    }

    if (e.key === 'Tab') {
        const focusableElements = sidebar.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else { // Tab
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }
});

// Set active page on load as well
document.addEventListener('DOMContentLoaded', setActivePage);
