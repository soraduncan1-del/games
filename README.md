# Snow Runner — Snow Rider style prototype

This repository contains a small Snow Rider–style web prototype (Snow Runner) implemented with Three.js. It is an original implementation and uses a simple SVG duck asset.

How to run locally:

1. Serve the repository with a static server. For example, using Node's http-server:

   npm install -g http-server
   http-server -c-1

2. Open the printed local URL in your browser (e.g., http://127.0.0.1:8080)

Controls:
- Arrow Left / Arrow Right: move between lanes
- Space / click / tap: jump

Notes:
- This is a minimal prototype meant to be extended. It uses procedurally spawned obstacles and a distance counter that can reach 1000+ as you play.
