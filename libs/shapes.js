// shapes.js
// Stores objects, draws them, hit-tests them, loads/saves them.

let objects = [];
let selectedId = null;

function makeId() {
    return Math.random().toString(36).slice(2);
}

function getSelected() {
    return objects.find(o => o.id === selectedId) || null;
}

function addShape(type, canvas) {
    const o = {
        id: makeId(),
        type,
        name: type,
        x: camera.x,
        y: camera.y,
        size: 60,
        rot: 0,
        scaleX: 1,
        scaleY: 1,
        roundness: 0,
        thickness: 10,
        op: "union"
    };

    objects.push(o);
    selectedId = o.id;
    drawScene(canvas);
}

function hitTest(px, py, canvas) {
    const p = screenToWorld(px, py, canvas);

    for (let i = objects.length - 1; i >= 0; i--) {
        const o = objects[i];

        const dx = p.x - o.x;
        const dy = p.y - o.y;

        const a = -o.rot * Math.PI / 180;
        const c = Math.cos(a), s = Math.sin(a);

        const rx = dx * c - dy * s;
        const ry = dx * s + dy * c;

        const half = o.size / 2;

        if (o.type === "circle") {
            if (rx * rx + ry * ry <= half * half) return o.id;
        } else {
            if (rx >= -half && rx <= half && ry >= -half && ry <= half) return o.id;
        }
    }

    return null;
}

function drawGrid(ctx, canvas) {
    const step = 20 * camera.zoom;

    ctx.save();
    applyCamera(ctx, canvas);

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = -2000; x < 2000; x += step) {
        ctx.moveTo(x, -2000);
        ctx.lineTo(x, 2000);
    }
    for (let y = -2000; y < 2000; y += step) {
        ctx.moveTo(-2000, y);
        ctx.lineTo(2000, y);
    }
    ctx.stroke();

    ctx.restore();
}

function drawScene(canvas) {
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas);

    ctx.save();
    applyCamera(ctx, canvas);

    for (const o of objects) {
        ctx.save();

        ctx.translate(o.x, o.y);
        ctx.rotate(o.rot * Math.PI / 180);
        ctx.scale(o.scaleX, o.scaleY);

        if (o.id === selectedId) {
            ctx.strokeStyle = "white";
        } else {
            ctx.strokeStyle = o.op === "subtract" ? "magenta" : "#4df3ff";
        }

        ctx.fillStyle = "rgba(105,105,105,0.25)";
        ctx.lineWidth = 2 / camera.zoom;

        if (o.id === selectedId) {
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 15 / camera.zoom;
        }

        const s = o.size;

        // -------------------------
        // CIRCLE
        // -------------------------
        if (o.type === "circle") {
            ctx.beginPath();
            ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // circles have no corners → no dots
        }

        // -------------------------
        // TRIANGLE
        // -------------------------
        else if (o.type === "triangle") {
            const r = s / 2;

            const p1 = { x: 0, y: -r };
            const p2 = { x: r, y: r };
            const p3 = { x: -r, y: r };

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // draw yellow dots if rounded
            if (o.roundness > 0) {
                ctx.fillStyle = "yellow";
                const dot = 4 / camera.zoom;

                ctx.beginPath();
                ctx.arc(p1.x, p1.y, dot, 0, Math.PI * 2);
                ctx.fill();

                ctx.beginPath();
                ctx.arc(p2.x, p2.y, dot, 0, Math.PI * 2);
                ctx.fill();

                ctx.beginPath();
                ctx.arc(p3.x, p3.y, dot, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // -------------------------
        // SQUARE
        // -------------------------
        else {
            const half = s / 2;

            const p1 = { x: -half, y: -half };
            const p2 = { x: half, y: -half };
            const p3 = { x: half, y: half };
            const p4 = { x: -half, y: half };

            ctx.beginPath();
            ctx.rect(-half, -half, s, s);
            ctx.fill();
            ctx.stroke();

            // draw yellow dots if rounded
            if (o.roundness > 0) {
                ctx.fillStyle = "yellow";
                const dot = 4 / camera.zoom;

                ctx.beginPath();
                ctx.arc(p1.x, p1.y, dot, 0, Math.PI * 2);
                ctx.fill();

                ctx.beginPath();
                ctx.arc(p2.x, p2.y, dot, 0, Math.PI * 2);
                ctx.fill();

                ctx.beginPath();
                ctx.arc(p3.x, p3.y, dot, 0, Math.PI * 2);
                ctx.fill();

                ctx.beginPath();
                ctx.arc(p4.x, p4.y, dot, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    ctx.restore();
}

function loadScene(data, canvas) {
    if (!data || !Array.isArray(data.objects)) return;

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
        thickness: o.thickness ?? 10,
        op: o.op === "subtract" ? "subtract" : "union"
    }));

    selectedId = objects[0]?.id || null;
    drawScene(canvas);
}

function exportScene() {
    return {
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
            thickness: o.thickness,
            op: o.op
        }))
    };
}

