import ForceGraph3D from "3d-force-graph";
import * as THREE from "three";
import json from "./graphData.json";

// ─── COLORS ──────────────────────────────────────────────
const NODE_COLOR = "#059669";
const NODE_HOVER_COLOR = "#ffe213";
const NODE_CONNECTED = "#e37622";
const LINK_COLOR = "rgba(130, 168, 245, 0.8)";
const LINK_HOVER_COLOR = "#ffe213";
const BG_COLOR = "#0a0a0a";

// ─── STATE ───────────────────────────────────────────────
var graphData = json;
var Graph = null;
var hoveredNode = null;
var keysPressed = {};
const MOVE_SPEED = 3;
const ROTATE_SPEED = 0.015;
const ROLL_SPEED = 0.02;

// ─── BUILD LOOKUPS ──────────────────────────────────────
var nodeMap = {};
graphData.nodes.forEach(function (n) {
  nodeMap[n.id] = n;
});

var adjNodes = {};
var adjLinks = {};
graphData.links.forEach(function (l) {
  var src = typeof l.source === "object" ? l.source.id : l.source;
  var tgt = typeof l.target === "object" ? l.target.id : l.target;
  if (!adjNodes[src]) adjNodes[src] = new Set();
  if (!adjNodes[tgt]) adjNodes[tgt] = new Set();
  adjNodes[src].add(tgt);
  adjNodes[tgt].add(src);
  var key = src + "__" + tgt;
  if (!adjLinks[src]) adjLinks[src] = [];
  if (!adjLinks[tgt]) adjLinks[tgt] = [];
  adjLinks[src].push(key);
  adjLinks[tgt].push(key);
});

// ─── INIT GRAPH ─────────────────────────────────────────
Graph = ForceGraph3D()(document.getElementById("graph-container"))
  .graphData(graphData)
  .backgroundColor(BG_COLOR)
  .nodeVal(function (n) {
    return Math.max(1, Math.sqrt(n.degree || 1));
  })
  .nodeColor(function (n) {
    if (hoveredNode) {
      if (n.id === hoveredNode.id) return NODE_HOVER_COLOR;
      if (adjNodes[hoveredNode.id] && adjNodes[hoveredNode.id].has(n.id))
        return NODE_CONNECTED;
    }
    return NODE_COLOR;
  })
  .nodeOpacity(0.9)
  .nodeLabel(function (n) {
    return ""
  })
  .linkWidth(2.0)
  .linkOpacity(0.5)
  .linkDirectionalArrowLength(6)
  .linkDirectionalArrowRelPos(0.5)
  .linkDirectionalArrowColor(function (l) {
    if (hoveredNode) {
      var src = typeof l.source === "object" ? l.source.id : l.source;
      var tgt = typeof l.target === "object" ? l.target.id : l.target;
      if (src === hoveredNode.id || tgt === hoveredNode.id)
        return LINK_HOVER_COLOR;
    }
    return LINK_COLOR;
  })
  .linkColor(function (l) {
    if (hoveredNode) {
      var src = typeof l.source === "object" ? l.source.id : l.source;
      var tgt = typeof l.target === "object" ? l.target.id : l.target;
      if (src === hoveredNode.id || tgt === hoveredNode.id)
        return LINK_HOVER_COLOR;
    }
    return LINK_COLOR;
  })
  .linkDirectionalParticles(function (l) {
    if (hoveredNode) {
      var src = typeof l.source === "object" ? l.source.id : l.source;
      var tgt = typeof l.target === "object" ? l.target.id : l.target;
      if (src === hoveredNode.id || tgt === hoveredNode.id) return 2;
    }
    return 0;
  })
  .linkDirectionalParticleWidth(1.2)
  .linkDirectionalParticleColor(function () {
    return NODE_HOVER_COLOR;
  })
  .onNodeHover(function (node) {
    hoveredNode = node || null;
    document.body.style.cursor = node ? "pointer" : "default";
    updateNodePanel(node);
  })
  .onNodeClick(function (node) {
    if (!node) return;
    var distance = 200;
    var distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
    Graph.cameraPosition(
      { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
      node,
      1500
    );
  })
  .onLinkClick(function (link) {
    selectedEdge = link;
    showEdgeCard(link);
  })
  .warmupTicks(80)
  .cooldownTicks(200)
  .cooldownTime(8000)
  .d3AlphaDecay(0.03)
  .d3VelocityDecay(0.4)
  .onEngineStop(function () {
    Graph.zoomToFit(1000, 50);
  });

// Adjust force engine
Graph.d3Force("charge").strength(-30);
Graph.d3Force("link").distance(60);

// Hide loading after a delay
setTimeout(function () {
  document.getElementById("loading-overlay").classList.add("hidden");
}, 1500);

// ─── NODE PANEL ─────────────────────────────────────────
function updateNodePanel(node) {
  var panel = document.getElementById("node-panel");
  if (!node) {
    panel.innerHTML =
      '<h2 id="np-default-msg" style="font-size:15px;font-weight:400;color:#666;">Hover over a node to see details</h2>';
    return;
  }
  var html = "<h2>" + escHtml(node.title) + "</h2>";
  html += "<h3>by " + escHtml(node.author) + "</h3>";
  var meta = [];
  if (node.year) meta.push("" + node.year);
  if (node.genre) meta.push(node.genre);
  if (node.country) meta.push(node.country);
  if (node.medium) meta.push(node.medium);
  if (meta.length)
    html += '<div class="meta">' + escHtml(meta.join(" · ")) + "</div>";
  html +=
    '<div class="meta" style="margin-top:4px;">Connections: ' +
    (node.degree || 0) +
    "</div>";
  panel.innerHTML = html;
}

// ─── EDGE CARD ──────────────────────────────────────────
function showEdgeCard(link) {
  var srcId = typeof link.source === "object" ? link.source.id : link.source;
  var tgtId = typeof link.target === "object" ? link.target.id : link.target;
  var srcNode = nodeMap[srcId];
  var tgtNode = nodeMap[tgtId];

  var html = "";

  // Source work (epigraph source)
  html += '<div class="label">Epigraph Source</div>';
  html +=
    '<div class="value"><strong>' +
    escHtml(srcNode ? srcNode.title : srcId) +
    "</strong><br/>";
  html += "by " + escHtml(srcNode ? srcNode.author : "Unknown");
  if (srcNode && srcNode.year) html += " (" + srcNode.year + ")";
  html += "</div>";

  // Epigraph text
  if (link.epigraph) {
    html += '<div class="divider"></div>';
    html += '<div class="label">Epigraph Text</div>';
    html +=
      '<div class="epigraph-text">"' + escHtml(link.epigraph) + '"</div>';
  }

  html += '<div class="arrow-indicator">↓</div>';

  // Target work (contains the epigraph)
  html += '<div class="label">Referenced By</div>';
  html +=
    '<div class="value"><strong>' +
    escHtml(tgtNode ? tgtNode.title : tgtId) +
    "</strong><br/>";
  html += "by " + escHtml(tgtNode ? tgtNode.author : "Unknown");
  if (tgtNode && tgtNode.year) html += " (" + tgtNode.year + ")";
  html += "</div>";

  if (tgtNode && tgtNode.genre) {
    html +=
      '<div class="value" style="margin-top:-6px;font-size:11px;color:#888;">Genre: ' +
      escHtml(tgtNode.genre) +
      "</div>";
  }

  document.getElementById("edge-card-body").innerHTML = html;
  document.getElementById("edge-card").classList.add("visible");
}

window.closeEdgeCard = function () {
  document.getElementById("edge-card").classList.remove("visible");
  selectedEdge = null;
};

// ─── KEYBOARD CONTROLS (WASD + QE + Arrows) ────────────
document.addEventListener("keydown", function (e) {
  if (e.target.tagName === "INPUT") return;
  keysPressed[e.key.toLowerCase()] = true;
});
document.addEventListener("keyup", function (e) {
  keysPressed[e.key.toLowerCase()] = false;
});

function animateControls() {
  if (!Graph) {
    requestAnimationFrame(animateControls);
    return;
  }

  var camera = Graph.camera();
  var controls = Graph.controls();
  if (!camera) {
    requestAnimationFrame(animateControls);
    return;
  }

  // Get camera's local direction vectors
  var forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  var right = new THREE.Vector3();
  right.crossVectors(forward, camera.up).normalize();
  var up = camera.up.clone().normalize();

  // WASD movement
  if (keysPressed["w"]) {
    camera.position.addScaledVector(forward, MOVE_SPEED);
    if (controls && controls.target)
      controls.target.addScaledVector(forward, MOVE_SPEED);
  }
  if (keysPressed["s"]) {
    camera.position.addScaledVector(forward, -MOVE_SPEED);
    if (controls && controls.target)
      controls.target.addScaledVector(forward, -MOVE_SPEED);
  }
  if (keysPressed["a"]) {
    camera.position.addScaledVector(right, -MOVE_SPEED);
    if (controls && controls.target)
      controls.target.addScaledVector(right, -MOVE_SPEED);
  }
  if (keysPressed["d"]) {
    camera.position.addScaledVector(right, MOVE_SPEED);
    if (controls && controls.target)
      controls.target.addScaledVector(right, MOVE_SPEED);
  }

  // Arrow keys for rotation (orbit-style)
  if (keysPressed["arrowup"]) {
    if (controls && controls.target) {
      var offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(right, -ROTATE_SPEED);
      camera.position.copy(controls.target).add(offset);
      camera.lookAt(controls.target);
    }
  }
  if (keysPressed["arrowdown"]) {
    if (controls && controls.target) {
      var offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(right, ROTATE_SPEED);
      camera.position.copy(controls.target).add(offset);
      camera.lookAt(controls.target);
    }
  }
  if (keysPressed["arrowleft"]) {
    if (controls && controls.target) {
      var offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(up, ROTATE_SPEED);
      camera.position.copy(controls.target).add(offset);
      camera.lookAt(controls.target);
    }
  }
  if (keysPressed["arrowright"]) {
    if (controls && controls.target) {
      var offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(up, -ROTATE_SPEED);
      camera.position.copy(controls.target).add(offset);
      camera.lookAt(controls.target);
    }
  }

  requestAnimationFrame(animateControls);
}

animateControls();

// ─── SEARCH ─────────────────────────────────────────────
(function setupSearch() {
  var nodes = graphData.nodes;
  var input = document.getElementById("search-input");
  var resultsEl = document.getElementById("search-results");
  var debounceTimer = null;

  input.addEventListener("input", function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      var q = input.value.trim().toLowerCase();
      if (q.length < 2) {
        resultsEl.classList.remove("visible");
        resultsEl.innerHTML = "";
        return;
      }
      var matches = nodes
        .filter(function (n) {
          return (
            (n.title && n.title.toLowerCase().includes(q)) ||
            (n.author && n.author.toLowerCase().includes(q))
          );
        })
        .slice(0, 15);

      if (matches.length === 0) {
        resultsEl.innerHTML =
          '<div style="padding:10px;color:#666;font-size:12px;">No results found</div>';
      } else {
        resultsEl.innerHTML = matches
          .map(function (n) {
            return (
              '<div class="search-result-item" data-id="' +
              escAttr(n.id) +
              '">' +
              '<div class="sr-title">' +
              escHtml(n.title) +
              "</div>" +
              '<div class="sr-author">' +
              escHtml(n.author) +
              (n.year ? " · " + n.year : "") +
              "</div>" +
              "</div>"
            );
          })
          .join("");

        resultsEl.querySelectorAll(".search-result-item").forEach(function (el) {
          el.addEventListener("click", function () {
            var nodeId = el.getAttribute("data-id");
            var gd = Graph.graphData();
            var rNode = gd.nodes.find(function (n) {
              return n.id === nodeId;
            });
            if (rNode && Graph) {
              var distance = 200;
              var distRatio =
                1 +
                distance /
                  Math.hypot(rNode.x || 0, rNode.y || 0, rNode.z || 0);
              Graph.cameraPosition(
                {
                  x: (rNode.x || 0) * distRatio,
                  y: (rNode.y || 0) * distRatio,
                  z: (rNode.z || 0) * distRatio,
                },
                rNode,
                1500
              );
              hoveredNode = rNode;
              updateNodePanel(rNode);
            }
            resultsEl.classList.remove("visible");
            input.value = "";
          });
        });
      }
      resultsEl.classList.add("visible");
    }, 200);
  });

  // Close results on outside click
  document.addEventListener("click", function (e) {
    if (!e.target.closest("#search-container")) {
      resultsEl.classList.remove("visible");
    }
  });

  // Prevent keyboard controls when typing
  input.addEventListener("keydown", function (e) {
    e.stopPropagation();
  });
})();

// ─── UTILS ──────────────────────────────────────────────
function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(str) {
  return escHtml(str).replace(/'/g, "&#39;");
}
