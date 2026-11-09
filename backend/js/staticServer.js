const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const host = "127.0.0.1";
const port = Number(process.env.SITE_PORT || 8080);
const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp"
};

const server = http.createServer((request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { Allow: "GET, HEAD" });
        response.end("Method not allowed");
        return;
    }

    let pathname;
    try {
        pathname = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);
    } catch {
        response.writeHead(400);
        response.end("Bad request");
        return;
    }

    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(root, relativePath);
    const pathFromRoot = path.relative(root, filePath);
    const pathParts = pathFromRoot.split(path.sep);
    const isInsideRoot = pathFromRoot === "" ||
        (!pathFromRoot.startsWith(`..${path.sep}`) && pathFromRoot !== ".." && !path.isAbsolute(pathFromRoot));

    if (!isInsideRoot || pathParts.some(part => part.startsWith(".")) ||
        pathParts.some(part => part.toLowerCase() === "node_modules")) {
        response.writeHead(404);
        response.end("Not found");
        return;
    }

    const contentType = contentTypes[path.extname(filePath).toLowerCase()];
    if (!contentType) {
        response.writeHead(404);
        response.end("Not found");
        return;
    }

    fs.stat(filePath, (statError, stats) => {
        if (statError || !stats.isFile()) {
            response.writeHead(404);
            response.end("Not found");
            return;
        }

        response.writeHead(200, {
            "Content-Length": stats.size,
            "Content-Type": contentType,
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff"
        });

        if (request.method === "HEAD") {
            response.end();
            return;
        }

        const stream = fs.createReadStream(filePath);
        stream.on("error", error => {
            console.error("Could not read website file:", error);
            if (!response.headersSent) response.writeHead(500);
            response.end("Unable to read file");
        });
        stream.pipe(response);
    });
});

server.on("error", error => {
    console.error("CampusSync local site server failed:", error.message);
    process.exitCode = 1;
});

console.log("Starting CampusSync local site...");
server.listen(port, host, () => {
    console.log(`CampusSync local site listening at http://${host}:${port}`);
});
