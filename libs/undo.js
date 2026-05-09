// undo.js
// Global undo/redo stack for scene changes

let undoStack = [];
let redoStack = [];
let isRecording = true;

// Save a deep copy of the scene
function snapshotScene() {
    return JSON.parse(JSON.stringify(objects));
}

// Push current state to undo stack
function pushUndoState() {
    if (!isRecording) return;
    undoStack.push(snapshotScene());
    redoStack = []; // clear redo on new action
}

// Restore a scene snapshot
function restoreScene(state, canvas) {
    objects = JSON.parse(JSON.stringify(state));
    selectedId = objects[0]?.id || null;
    drawScene(canvas);
}

// UNDO
function undo(canvas) {
    if (undoStack.length === 0) return;

    const current = snapshotScene();
    redoStack.push(current);

    const prev = undoStack.pop();
    restoreScene(prev, canvas);
}

// REDO
function redo(canvas) {
    if (redoStack.length === 0) return;

    const current = snapshotScene();
    undoStack.push(current);

    const next = redoStack.pop();
    restoreScene(next, canvas);
}

// -----------------------------
// HOOK INTO APP EVENTS
// -----------------------------
window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("viewport");
    const undoBtn = document.getElementById("undoBtn");
    const redoBtn = document.getElementById("RedoBtn");

    // Buttons
    undoBtn.addEventListener("click", () => undo(canvas));
    redoBtn.addEventListener("click", () => redo(canvas));

    // Keyboard shortcuts
    window.addEventListener("keydown", e => {
        if (e.ctrlKey && e.key === "z") undo(canvas);
        if (e.ctrlKey && e.key === "y") redo(canvas);
    });

    // -----------------------------
    // AUTO‑RECORDING HOOKS
    // -----------------------------

    // Wrap addShape
    const _addShape = addShape;
    addShape = function(type, canvas) {
        pushUndoState();
        _addShape(type, canvas);
    };

    // Wrap cloneSelected
    const _cloneSelected = window.cloneSelected;
    if (_cloneSelected) {
        window.cloneSelected = function() {
            pushUndoState();
            _cloneSelected();
        };
    }

    // Wrap deleteSelected
    const _deleteSelected = window.deleteSelected;
    if (_deleteSelected) {
        window.deleteSelected = function() {
            pushUndoState();
            _deleteSelected();
        };
    }

    // Wrap Apply button property changes
    const applyBtn = document.getElementById("applyBtn");
    applyBtn.addEventListener("click", () => {
        pushUndoState();
    });

    // Wrap dragging (start + end)
    let wasDragging = false;

    canvas.addEventListener("mousedown", () => {
        wasDragging = true;
        pushUndoState();
    });

    canvas.addEventListener("mouseup", () => {
        if (wasDragging) {
            wasDragging = false;
        }
    });
});

