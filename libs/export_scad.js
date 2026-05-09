// export_scad.js
// Exports the current scene as an OpenSCAD .scad file,
// honoring union vs subtract, position, rotation, scale,
// size, roundness, and thickness. Subtractive objects
// are extruded extremely tall so they always cut through.

function exportSCAD() {

    // Convert one object → SCAD code block
    function shapeToSCAD(o) {
        const s = o.size / 2;

        let base;

        // Base 2D shape
        if (o.type === "circle") {
            base = `circle(r=${s}, $fn=64);`;
        } else if (o.type === "triangle") {
            const r = s;
            base = `
polygon(points=[
    [0, ${-r}],
    [${r}, ${r}],
    [${-r}, ${r}]
]);`;
        } else {
            // square / default
            base = `square([${o.size}, ${o.size}], center=true);`;
        }

        // Roundness → minkowski with circle
        if (o.roundness > 0) {
            base = `
minkowski() {
    ${base}
    circle(r=${o.roundness}, $fn=32);
}`;
        }

        // Thickness:
        // - union objects use their own thickness
        // - subtractive objects must cut through everything → huge height
        const height = (o.op === "subtract") ? 9999 : o.thickness;
        const center = (o.op === "subtract") ? "true" : "false";

        base = `
linear_extrude(height=${height}, center=${center}) {
    ${base}
}`;

        // Apply transforms
        return `
translate([${o.x}, ${o.y}, 0])
rotate([0,0,${o.rot}])
scale([${o.scaleX}, ${o.scaleY}, 1])
${base}
`;
    }

    // Separate union and subtractive shapes
    const unionParts = [];
    const subtractParts = [];

    for (const o of objects) {
        const scad = shapeToSCAD(o);
        if (o.op === "subtract") {
            subtractParts.push(scad);
        } else {
            unionParts.push(scad);
        }
    }

    let scadText = "";

    if (subtractParts.length === 0) {
        // Only union shapes
        scadText = `
union() {
${unionParts.join("\n")}
}
`;
    } else if (unionParts.length === 0) {
        // Only subtractive shapes → just union them (nothing to subtract from)
        scadText = `
union() {
${subtractParts.join("\n")}
}
`;
    } else {
        // union minus all subtractive shapes
        scadText = `
difference() {
    union() {
${unionParts.join("\n")}
    }
${subtractParts.join("\n")}
}
`;
    }

// Download file
const blob = new Blob([scadText], { type: "text/plain" });
const a = document.createElement("a");
a.href = URL.createObjectURL(blob);

// ★ FIX — use the saveName field
let base = document.getElementById("saveName").value || "scene";
base = base.replace(/\.json$/i, "");   // remove .json if present
a.download = base + ".scad";


a.click();

}

// Wire up the Export SCAD button
window.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("exportSCADBtn");
    if (btn) btn.addEventListener("click", exportSCAD);
});

