/* =========================================================
   NIVASH PORTFOLIO - HIGH-PERFORMANCE 3D MODEL & UI ENGINE
   - Front-Facing Multi-Angle 3D Turntable (Zero Back Pose)
   - Razor-sharp rendering with ABSOLUTELY ZERO motion blur / ghosting
   - Smooth continuous scroll-based & inertial drag rotation
   - Right-side positioning with enlarged scale
   - Interactive mouse parallax depth & physics
   - Clean scroll reveal animations & theme switcher
========================================================= */

// Canvas & 2D Rendering Context
const canvas = document.getElementById("characterCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

// UI Elements
const themeToggle = document.getElementById("themeToggle");
const toastContainer = document.getElementById("toastContainer");
const btnCopyEmail = document.getElementById("btnCopyEmail");
const copyBtnLabel = document.getElementById("copyBtnLabel");
const emailAddress = "nivashnivash868@gmail.com";

// Front-Facing Model Frames (Back Pose Excluded)
// Frame 0: Full Front View (0°)
// Frame 1: Left View (-45° to -70°)
// Frame 4: Front-Right 3/4 View (+30° to +50°)
// Frame 3: Right View (+60° to +75°)
const TOTAL_FRAMES = 5;
const modelFrames = [];
let loadedCount = 0;
let isLoaded = false;

for (let i = 0; i < TOTAL_FRAMES; i++) {
    const img = new Image();
    img.src = `character_${i}.png`;
    img.onload = () => {
        loadedCount++;
        if (loadedCount >= TOTAL_FRAMES) {
            isLoaded = true;
            resizeCanvas();
            requestRender();
        }
    };
    modelFrames.push(img);
}

// State & Physics
let currentAngle = 0;        // Frontal angle (-75° to +75°)
let targetAngle = 0;         // Target angle for smooth exponential interpolation
let isDragging = false;
let startX = 0;
let lastDragX = 0;
let dragVelocity = 0;
let mousePos = { x: 0, y: 0 };       // Instant mouse position (-1 to 1)
let targetMouse = { x: 0, y: 0 };    // Smooth mouse target for parallax

let canvasWidth = 0;
let canvasHeight = 0;
let isLoopRunning = false;
let needsRedraw = true;

// High-DPI Canvas Resize Handler
function resizeCanvas() {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

    canvasWidth = rect.width;
    canvasHeight = rect.height;

    canvas.width = Math.round(canvasWidth * dpr);
    canvas.height = Math.round(canvasHeight * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    needsRedraw = true;
    renderFrame();
}

// Calculate Page Scroll Progress (0.0 to 1.0)
function getScrollProgress() {
    const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (totalScroll <= 0) return 0;
    const currentScroll = window.scrollY || window.pageYOffset;
    return Math.max(0, Math.min(1, currentScroll / totalScroll));
}

// Get Discrete Frontal Frame Index (Back Pose Excluded)
function getFrontalFrameIndex(angle) {
    // angle range: -75° (Left) to +75° (Right)
    if (angle < -25) {
        return 1; // Left View
    } else if (angle >= -25 && angle < 18) {
        return 0; // Full Front View
    } else if (angle >= 18 && angle < 50) {
        return 4; // Front-Right View
    } else {
        return 3; // Right View
    }
}

// Dynamic Ground Contact Floor Shadow
function drawGroundShadow(centerX, groundY, width) {
    if (!ctx) return;
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(centerX, groundY, width * 0.40, width * 0.07, 0, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(
        centerX, groundY, 0,
        centerX, groundY, width * 0.40
    );
    if (isLight) {
        grad.addColorStop(0, "rgba(15, 23, 42, 0.28)");
        grad.addColorStop(0.6, "rgba(15, 23, 42, 0.08)");
        grad.addColorStop(1, "rgba(15, 23, 42, 0)");
    } else {
        grad.addColorStop(0, "rgba(0, 0, 0, 0.65)");
        grad.addColorStop(0.5, "rgba(14, 165, 233, 0.12)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    }
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
}

// Render Sharp Enlarged 3D Model on Right Side with Zero Blur
function renderFrame() {
    if (!ctx || !canvasWidth || !canvasHeight || !isLoaded) return;

    // Clear canvas completely
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Pick discrete sharp frame with zero opacity crossfade
    const frameIndex = getFrontalFrameIndex(currentAngle);
    const activeImg = modelFrames[frameIndex];

    if (!activeImg || !activeImg.complete) return;

    // Sizing & Positioning calculations (Enlarged Scale)
    const aspect = activeImg.width / activeImg.height;
    let targetHeight = canvasHeight * 0.94; // Significantly increased size
    let targetWidth = targetHeight * aspect;

    if (targetWidth > canvasWidth * 0.96) {
        targetWidth = canvasWidth * 0.96;
        targetHeight = targetWidth / aspect;
    }

    // Parallax mouse tilt offset for 3D depth perception
    const tiltX = mousePos.x * 8;
    const tiltY = mousePos.y * 4;

    const posX = Math.round((canvasWidth - targetWidth) / 2 + tiltX);
    const posY = Math.round((canvasHeight - targetHeight) / 2 + 10 + tiltY);
    const groundY = Math.round(posY + targetHeight * 0.94);

    // 1. Draw subtle contact floor shadow
    drawGroundShadow(Math.round(canvasWidth / 2 + tiltX), groundY, targetWidth);

    // 2. Render Single 100% Opaque, Razor-Sharp Frame
    ctx.save();
    ctx.globalAlpha = 1.0; // 100% sharp, no ghosting
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(activeImg, posX, posY, targetWidth, targetHeight);
    ctx.restore();
}

// Animation & Physics Loop (60/120 FPS requestAnimationFrame)
function loop() {
    let activeMovement = false;

    // 1. Drag inertial deceleration
    if (!isDragging && Math.abs(dragVelocity) > 0.02) {
        targetAngle += dragVelocity;
        // Clamp to frontal arc (-70° to +70°)
        targetAngle = Math.max(-70, Math.min(70, targetAngle));
        dragVelocity *= 0.90; // Damping
        activeMovement = true;
    }

    // 2. Smooth exponential spring interpolation towards targetAngle
    const diff = targetAngle - currentAngle;
    if (Math.abs(diff) > 0.02) {
        currentAngle += diff * 0.07; // Smooth cinematic easing
        activeMovement = true;
    } else {
        currentAngle = targetAngle;
    }

    // 3. Smooth mouse parallax interpolation
    const mouseDiffX = targetMouse.x - mousePos.x;
    const mouseDiffY = targetMouse.y - mousePos.y;
    if (Math.abs(mouseDiffX) > 0.005 || Math.abs(mouseDiffY) > 0.005) {
        mousePos.x += mouseDiffX * 0.06;
        mousePos.y += mouseDiffY * 0.06;
        activeMovement = true;
    }

    if (activeMovement || needsRedraw || isDragging) {
        renderFrame();
        needsRedraw = false;
    }

    requestAnimationFrame(loop);
}

function requestRender() {
    if (!isLoopRunning) {
        isLoopRunning = true;
        requestAnimationFrame(loop);
    }
}

// Page Scroll Synchronization: Smoothly pivots across frontal perspectives
function onScroll() {
    if (!isDragging) {
        const progress = getScrollProgress();
        // Dynamic, cinematic front-facing swivel wave (-65° to +65°)
        targetAngle = Math.sin(progress * Math.PI * 2.2) * 65;
    }
    updateActiveNavLink();
}
window.addEventListener("scroll", onScroll, { passive: true });

// Mouse & Touch Drag Interactions
function onDragStart(clientX) {
    isDragging = true;
    startX = clientX;
    lastDragX = clientX;
    dragVelocity = 0;
}

function onDragMove(clientX) {
    if (!isDragging) return;
    const deltaX = clientX - lastDragX;
    lastDragX = clientX;

    // Drag sensitivity within frontal arc
    targetAngle += deltaX * 0.55;
    targetAngle = Math.max(-70, Math.min(70, targetAngle));
    dragVelocity = deltaX * 0.55;
}

function onDragEnd() {
    isDragging = false;
}

if (canvas) {
    canvas.addEventListener("mousedown", (e) => onDragStart(e.clientX));
    canvas.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) onDragStart(e.touches[0].clientX);
    }, { passive: true });
}

window.addEventListener("mousemove", (e) => {
    if (isDragging) {
        onDragMove(e.clientX);
    }
    // Parallax mouse position normalized from -1 to 1
    targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouse.y = (e.clientY / window.innerHeight) * 2 - 1;
});

window.addEventListener("touchmove", (e) => {
    if (isDragging && e.touches.length === 1) {
        onDragMove(e.touches[0].clientX);
    }
}, { passive: true });

window.addEventListener("mouseup", onDragEnd);
window.addEventListener("touchend", onDragEnd);

// Smooth Section Reveal Animations (IntersectionObserver)
function initScrollReveal() {
    const revealElements = document.querySelectorAll(
        ".hero-content, .section-header, .glass-card, .skill-card, .project-card, .contact-card"
    );

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("revealed");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    revealElements.forEach((el) => {
        el.classList.add("reveal-item");
        observer.observe(el);
    });
}

// Active Nav Link Tracker on Scroll
const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll("section[id]");

function updateActiveNavLink() {
    const scrollY = window.pageYOffset + 220;
    sections.forEach((current) => {
        const sectionHeight = current.offsetHeight;
        const sectionTop = current.offsetTop;
        const sectionId = current.getAttribute("id");
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            navLinks.forEach((link) => {
                link.classList.remove("active");
                if (link.getAttribute("href") === `#${sectionId}`) {
                    link.classList.add("active");
                }
            });
        }
    });
}

// Toast System
function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        toast.style.opacity = "0";
        toast.style.transform = "translateY(12px) scale(0.95)";
        setTimeout(() => toast.remove(), 400);
    }, 2800);
}

// Copy Email to Clipboard
if (btnCopyEmail) {
    btnCopyEmail.addEventListener("click", () => {
        navigator.clipboard.writeText(emailAddress).then(() => {
            if (copyBtnLabel) copyBtnLabel.textContent = "Copied! ✨";
            btnCopyEmail.style.background = "rgba(14, 165, 233, 0.25)";
            btnCopyEmail.style.borderColor = "var(--cyan)";
            showToast("📋 Copied <b>nivashnivash868@gmail.com</b> to clipboard!");
            setTimeout(() => {
                if (copyBtnLabel) copyBtnLabel.textContent = "Copy";
                btnCopyEmail.style.background = "";
                btnCopyEmail.style.borderColor = "";
            }, 2500);
        }).catch(() => {
            showToast("⚠️ Could not copy automatically. Email: nivashnivash868@gmail.com");
        });
    });
}

// Theme Switcher Engine (Light / Dark)
function applyTheme(theme) {
    if (theme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
    } else {
        document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("portfolio_theme", theme);
    needsRedraw = true;
    renderFrame();
}

const savedTheme = localStorage.getItem("portfolio_theme") || "dark";
applyTheme(savedTheme);

if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        const isCurrentlyLight = document.documentElement.getAttribute("data-theme") === "light";
        const newTheme = isCurrentlyLight ? "dark" : "light";
        applyTheme(newTheme);
        showToast(newTheme === "light" ? "☀️ Switched to Light Theme" : "🌙 Switched to Dark Theme");
    });
}

// Window resize handler
window.addEventListener("resize", () => {
    resizeCanvas();
    needsRedraw = true;
});

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    initScrollReveal();
    resizeCanvas();
    requestRender();
});

// Fallback init
resizeCanvas();
requestRender();