const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.env.EXPO_PORT || "8081";
const projectRoot = path.join(__dirname, "..");
const touchTargets = ["App.tsx", "index.ts"];

function get(pathname) {
  return new Promise((resolve, reject) => {
    http
      .get(`http://localhost:${port}${pathname}`, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode, body }));
      })
      .on("error", reject);
  });
}

function post(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "localhost", port, path: pathname, method: "POST", headers: { "Content-Length": 0 } },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

function touchSources() {
  const now = new Date();
  for (const file of touchTargets) {
    const full = path.join(projectRoot, file);
    if (!fs.existsSync(full)) continue;
    const t = fs.statSync(full);
    fs.utimesSync(full, now, now);
    void t;
  }
}

async function main() {
  try {
    const status = await get("/status");
    if (!String(status.body).includes("running")) {
      console.error("Metro가 꺼져 있어요. 먼저 npm start 를 실행하세요.");
      process.exit(1);
    }

    touchSources();

    const attempts = ["/reload?platform=ios", "/reload?platform=android", "/reload"];
    for (const pathname of attempts) {
      try {
        await post(pathname);
      } catch {
        // ignore per-path failures
      }
    }

    console.log("리로드 요청 완료 (App.tsx 변경 감지 → Metro 재번들)");
    console.log("");
    console.log("Expo Go가 안 바뀌면:");
    console.log("  · 폰 흔들기 → Reload");
    console.log("  · 또는 npm start 터미널에서 r (QR 터미널 말고)");
    console.log("");
    console.log("참고: zsh에서 r 만 치면 직전 명령(QR 등)이 반복됩니다.");
    console.log("      리로드는 npm run reload 를 쓰세요.");
  } catch {
    console.error("Metro(:" + port + ")에 연결할 수 없어요. npm start 가 실행 중인지 확인하세요.");
    process.exit(1);
  }
}

main();
