// file.js
// Combined JSON save + load system

function setupFileIO(canvas) {

    const dropZone = document.getElementById("dropZone");
    const saveBtn = document.getElementById("saveBtn");
    const saveName = document.getElementById("saveName");
    const newBtn = document.getElementById("newBtn");
    const loadBtn = document.getElementById("loadBtn");

    // -----------------------------
    // DRAG & DROP LOAD JSON
    // -----------------------------
    dropZone.addEventListener("dragover", e => {
        e.preventDefault();
        dropZone.style.borderColor = "var(--accent)";
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.style.borderColor = "var(--accent-soft)";
    });

    dropZone.addEventListener("drop", e => {
        e.preventDefault();
        dropZone.style.borderColor = "var(--accent-soft)";

        const file = e.dataTransfer.files[0];
        if (!file || !file.name.endsWith(".json")) return;

        // update the text field with the dropped file name
        saveName.value = file.name;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                loadFullAppState(data, canvas);
            } catch (err) {
                console.error("Invalid JSON:", err);
            }
        };
        reader.readAsText(file);
    });

    // -----------------------------
    // NEW JSON
    // -----------------------------
    if (newBtn) {
        newBtn.addEventListener("click", () => {
            objects = [];
            selectedId = null;
            saveName.value = "";
            drawScene(canvas);
        });
    }

    // -----------------------------
    // LOAD JSON (file picker)
    // -----------------------------
    if (loadBtn) {
        loadBtn.addEventListener("click", () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json,application/json";

            input.addEventListener("change", () => {
                const file = input.files[0];
                if (!file || !file.name.endsWith(".json")) return;

                saveName.value = file.name;

                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const data = JSON.parse(reader.result);
                        loadFullAppState(data, canvas);
                    } catch (err) {
                        console.error("Invalid JSON:", err);
                    }
                };
                reader.readAsText(file);
            });

            input.click();
        });
    }

    // -----------------------------
    // SAVE JSON
    // -----------------------------
    saveBtn.addEventListener("click", () => {
        let name = (saveName.value || "scene.json").trim();
        if (!name.endsWith(".json")) name += ".json";

        const data = exportFullAppState();

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json"
        });

        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
    });
}

function exportFullAppState() {

    return {
        app: {
            gridSize: parseInt(document.getElementById("gridSize").value, 10),
            snap: document.getElementById("snapToggle").checked
        },

        objects: objects.map(o => ({
            id: o.id,
            type: o.type,
            name: o.name,
            x: o.x,
            y: o.y,
            size: o.size,
            rot: o.rot,
            scaleX: o.scaleX,
            scaleY: o.scaleY,
            roundness: o.roundness,
            thickness: o.thickness,   // NEW
            op: o.op
        }))
    };
}

function loadFullAppState(data, canvas) {

    if (data.app) {
        if (data.app.gridSize !== undefined) {
            document.getElementById("gridSize").value = data.app.gridSize;
        }
        if (data.app.snap !== undefined) {
            document.getElementById("snapToggle").checked = data.app.snap;
        }
    }

    if (Array.isArray(data.objects)) {
        objects = data.objects.map(o => ({
            id: o.id || makeId(),
            type: o.type || "square",
            name: o.name || o.type || "obj",
            x: o.x ?? 0,
            y: o.y ?? 0,
            size: o.size ?? 60,
            rot: o.rot ?? 0,
            scaleX: o.scaleX ?? 1,
            scaleY: o.scaleY ?? 1,
            roundness: o.roundness ?? 0,
            thickness: o.thickness ?? 10,   // NEW
            op: o.op === "subtract" ? "subtract" : "union"
        }));
    }

    selectedId = objects[0]?.id || null;
    drawScene(canvas);
}

