const { execSync } = require("child_process");

const port = process.env.EXPO_PORT || "8081";
let ip = "";

try {
  ip = execSync("ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1", {
    encoding: "utf8",
  }).trim();
} catch {
  ip = "";
}

if (!ip) {
  console.error("LAN IP를 찾지 못했습니다. Wi-Fi에 연결되어 있는지 확인하세요.");
  process.exit(1);
}

const url = `exp://${ip}:${port}`;
require("qrcode-terminal").generate(url, { small: true });
console.log(`\nExpo Go URL: ${url}`);
console.log("Metro: http://localhost:" + port);
console.log("(npm start 실행 중이어야 합니다. 같은 Wi-Fi에서 스캔하세요.)");
