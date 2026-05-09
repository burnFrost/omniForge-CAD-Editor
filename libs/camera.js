/* camera.js — full camera controls */

const camera = {
    x: 0,
    y: 0,
    zoom: 1,
    rot: 0,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    camStartX: 0,
    camStartY: 0
};

// Convert screen → world
function screenToWorld(px, py, canvas) {
    let x = px - canvas.width / 2;
    let y = py - canvas.height / 2;

    const c = Math.cos(-camera.rot), s = Math.sin(-camera.rot);
    const rx = x * c - y * s;
    const ry = x * s + y * c;

    return {
        x: rx / camera.zoom + camera.x,
        y: ry / camera.zoom + camera.y
    };
}

// Apply camera transform to canvas
function applyCamera(ctx, canvas) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(camera.rot);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
}

/* -------------------------
   CAMERA INPUT HANDLING
--------------------------*/

function setupCameraControls(canvas, redraw) {

    /* --- MOUSE WHEEL ZOOM --- */
    canvas.addEventListener("wheel", e => {
        e.preventDefault();
        const zoomFactor = 1.1;
        camera.zoom *= (e.deltaY < 0) ? zoomFactor : 1 / zoomFactor;
        camera.zoom = Math.max(0.1, Math.min(10, camera.zoom));
        redraw();
    });

    /* --- RIGHT MOUSE DRAG PANNING --- */
    canvas.addEventListener("mousedown", e => {
        if (e.button === 2) { // right mouse
            camera.isPanning = true;
            camera.panStartX = e.clientX;
            camera.panStartY = e.clientY;
            camera.camStartX = camera.x;
            camera.camStartY = camera.y;
        }
    });

    window.addEventListener("mousemove", e => {
        if (!camera.isPanning) return;

        const dx = (e.clientX - camera.panStartX) / camera.zoom;
        const dy = (e.clientY - camera.panStartY) / camera.zoom;

        camera.x = camera.camStartX - dx;
        camera.y = camera.camStartY - dy;

        redraw();
    });

    window.addEventListener("mouseup", () => {
        camera.isPanning = false;
    });

    /* --- PREVENT CONTEXT MENU ON RIGHT CLICK --- */
    canvas.addEventListener("contextmenu", e => e.preventDefault());

    /* --- KEYBOARD PANNING (WASD) --- */
    window.addEventListener("keydown", e => {
        const step = 20 / camera.zoom;

        if (e.key === "w") camera.y -= step;
        if (e.key === "s") camera.y += step;
        if (e.key === "a") camera.x -= step;
        if (e.key === "d") camera.x += step;

        redraw();
    });
}

