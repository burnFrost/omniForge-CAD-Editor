// app.js
// Handles selection, dragging, snapping, property editing, and UI wiring.

window.addEventListener("DOMContentLoaded", () => {

    const canvas = document.getElementById("viewport");
    const shapeButtons = document.querySelectorAll('.tool-button[data-shape]');

    // PROPERTY INPUTS
    const nameInput = document.getElementById("objName");
    const posXInput = document.getElementById("posX");
    const posYInput = document.getElementById("posY");
    const sizeInput = document.getElementById("size");
    const scaleXInput = document.getElementById("scaleX");
    const scaleYInput = document.getElementById("scaleY");
    const rotInput = document.getElementById("rot");
    const roundnessInput = document.getElementById("roundness");
    const thicknessInput = document.getElementById("thickness");
    const booleanToggle = document.getElementById("booleanToggle");
    const applyBtn = document.getElementById("applyBtn");

    const snapToggle = document.getElementById("snapToggle");
    const gridSizeSelect = document.getElementById("gridSize");

    // Resize canvas to container
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        drawScene(canvas);
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    setupCameraControls(canvas, () => drawScene(canvas));

    // File IO
    setupFileIO(canvas);

    // SHAPE BUTTONS
    shapeButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const type = btn.getAttribute("data-shape");
            addShape(type, canvas);
            syncPropertiesFromSelection();
        });
    });

    // DRAGGING STATE
    let isDragging = false;
    let dragId = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    function getGridSize() {
        return parseInt(gridSizeSelect.value, 10) || 16;
    }

    function snap(v) {
        if (!snapToggle.checked) return v;
        const g = getGridSize();
        return Math.round(v / g) * g;
    }

    function selectObject(id) {
        selectedId = id;
        syncPropertiesFromSelection();
        drawScene(canvas);
    }

    // UPDATE PROPERTY PANEL FROM SELECTED OBJECT
    function syncPropertiesFromSelection() {
        const o = getSelected();
        const disabled = !o;

        [
            nameInput, posXInput, posYInput, sizeInput,
            scaleXInput, scaleYInput, rotInput,
            roundnessInput, thicknessInput, booleanToggle, applyBtn
        ].forEach(el => el.disabled = disabled);

        if (!o) {
            nameInput.value = "";
            posXInput.value = "";
            posYInput.value = "";
            sizeInput.value = "";
            scaleXInput.value = "";
            scaleYInput.value = "";
            rotInput.value = "";
            roundnessInput.value = "";
            thicknessInput.value = "";
            booleanToggle.checked = false;
            return;
        }

        nameInput.value = o.name;
        posXInput.value = o.x;
        posYInput.value = o.y;
        sizeInput.value = o.size;
        scaleXInput.value = o.scaleX;
        scaleYInput.value = o.scaleY;
        rotInput.value = o.rot;
        roundnessInput.value = o.roundness;
        thicknessInput.value = o.thickness;
        booleanToggle.checked = o.op === "subtract";
    }

    // APPLY BUTTON → WRITE PROPERTIES BACK
    applyBtn.addEventListener("click", () => {
        const o = getSelected();
        if (!o) return;

        o.name = nameInput.value || o.type;
        o.x = Number(posXInput.value);
        o.y = Number(posYInput.value);
        o.size = Number(sizeInput.value);
        o.scaleX = Number(scaleXInput.value);
        o.scaleY = Number(scaleYInput.value);
        o.rot = Number(rotInput.value);
        o.roundness = Number(roundnessInput.value);
        o.thickness = Number(thicknessInput.value);
        o.op = booleanToggle.checked ? "subtract" : "union";

        drawScene(canvas);
    });

    // CANVAS MOUSE EVENTS
    canvas.addEventListener("mousedown", e => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const id = hitTest(x, y, canvas);

        if (id) {
            selectObject(id);

            const o = getSelected();
            const world = screenToWorld(x, y, canvas);

            dragId = id;
            isDragging = true;
            dragOffsetX = o.x - world.x;
            dragOffsetY = o.y - world.y;
        } else {
            selectedId = null;
            syncPropertiesFromSelection();
            drawScene(canvas);
        }
    });

    canvas.addEventListener("mousemove", e => {
        if (!isDragging || !dragId) return;

        const o = objects.find(obj => obj.id === dragId);
        if (!o) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const world = screenToWorld(x, y, canvas);

        let nx = world.x + dragOffsetX;
        let ny = world.y + dragOffsetY;

        nx = snap(nx);
        ny = snap(ny);

        o.x = nx;
        o.y = ny;

        syncPropertiesFromSelection();
        drawScene(canvas);
    });

    function endDrag() {
        isDragging = false;
        dragId = null;
    }

    canvas.addEventListener("mouseup", endDrag);
    canvas.addEventListener("mouseleave", endDrag);

    syncPropertiesFromSelection();
});

