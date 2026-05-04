// Add scroll effect to navbar
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Simple reveal animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
        }
    });
}, observerOptions);

document.querySelectorAll('.glass-card, .section-title').forEach(el => {
    el.style.opacity = "0";
    el.style.transform = "translateY(30px)";
    el.style.transition = "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)";
    observer.observe(el);
});

// --- Market Pulse Carousel ---
document.addEventListener("DOMContentLoaded", () => {
    const API_KEY = "d7h7g2pr01qhiu0aitcgd7h7g2pr01qhiu0aitd0";
    const API_URL = `https://finnhub.io/api/v1/news?category=general&token=${API_KEY}`;

    const carouselEl = document.getElementById("newsCarousel");
    const dotsEl = document.getElementById("newsDots");
    const statusEl = document.getElementById("status");

    if (!carouselEl) return;

    let newsData = [];
    let currentSlide = 0;
    let slideInterval = null;

    async function fetchNews() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            
            const data = await response.json();
            // Fetch up to 10 news items
            newsData = (Array.isArray(data) ? data : [])
                .filter(item => item && item.headline && item.url && item.source)
                .slice(0, 10);

            if (newsData.length === 0) {
                if (statusEl) statusEl.textContent = "No market news available.";
                return;
            }

            if (statusEl) statusEl.style.display = "none";
            
            renderCarousel();
            startAutoPlay();
            
        } catch (error) {
            console.error(error);
            if (statusEl) statusEl.textContent = "Error loading Market Pulse.";
        }
    }

    function renderCarousel() {
        if (newsData.length === 0) return;
        
        const item = newsData[currentSlide];
        
        // Render Active News
        carouselEl.innerHTML = `
            <a href="${item.url}" target="_blank" rel="noopener noreferrer">
                <span>${escapeHtml(item.source)}:</span> ${escapeHtml(item.headline)}
            </a>
        `;

        // Render Dots
        if (dotsEl) {
            dotsEl.innerHTML = newsData.map((_, index) => `
                <span class="dot ${index === currentSlide ? 'active' : ''}" data-index="${index}"></span>
            `).join("");

            // Add Click Listeners to Dots
            dotsEl.querySelectorAll('.dot').forEach(dot => {
                dot.addEventListener('click', (e) => {
                    currentSlide = parseInt(e.target.getAttribute('data-index'));
                    renderCarousel();
                    resetAutoPlay();
                });
            });
        }
    }

    function nextSlide() {
        if (newsData.length === 0) return;
        currentSlide = (currentSlide + 1) % newsData.length;
        renderCarousel();
    }

    function startAutoPlay() {
        if (slideInterval) clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, 6000); // Change slide every 6 seconds
    }

    function resetAutoPlay() {
        startAutoPlay();
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    fetchNews();
    // Refresh data every 5 minutes
    setInterval(fetchNews, 5 * 60 * 1000);
});
