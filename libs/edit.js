// edit.js
// Clone + Delete logic that works with your global architecture.

window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("viewport");
    const cloneBtn = document.getElementById("cloneBtn");
    const deleteBtn = document.getElementById("deleteBtn");

    // Debug: prove the file is running
    console.log("edit.js ACTIVE");

    if (!canvas || !cloneBtn || !deleteBtn) {
        console.log("edit.js: missing DOM elements");
        return;
    }

    // -----------------------------
    // CLONE SELECTED OBJECT
    // -----------------------------
    function cloneSelected() {
        const o = (typeof getSelected === "function") ? getSelected() : null;
        if (!o) {
            console.log("cloneSelected: no object selected");
            return;
        }

        const n = {
            id: makeId(),
            type: o.type,
            name: o.name + "_copy",
            x: o.x + 20,
            y: o.y + 20,
            size: o.size,
            rot: o.rot,
            scaleX: o.scaleX,
            scaleY: o.scaleY,
            roundness: o.roundness,
            thickness: o.thickness,
            op: o.op
        };

        objects.push(n);
        selectedId = n.id;

        console.log("Cloned:", n);

        drawScene(canvas);
    }

    cloneBtn.addEventListener("click", cloneSelected);

    // -----------------------------
    // DELETE SELECTED OBJECT
    // -----------------------------
    function deleteSelected() {
        if (!selectedId) {
            console.log("deleteSelected: nothing selected");
            return;
        }

        const index = objects.findIndex(o => o.id === selectedId);
        if (index === -1) {
            console.log("deleteSelected: selectedId not found");
            return;
        }

        console.log("Deleting:", objects[index]);

        objects.splice(index, 1);
        selectedId = null;

        drawScene(canvas);
    }

    deleteBtn.addEventListener("click", deleteSelected);

    // -----------------------------
    // DELETE KEY SUPPORT
    // -----------------------------
    window.addEventListener("keydown", e => {
        if (e.key === "Delete") {
            deleteSelected();
        }
    });
});

