const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);

const API_BASE = "https://arthdal.netmarble.com/front-api";

const RANKING_ROW = 500;
const RANKING_MAX_PAGES = 20;
const REQUEST_TIMEOUT = 15000;

// ============================================================
// 아스달 월드
// ============================================================

const worlds = {
    "크라본": 70110,

    "하제산": 32201,
    "추산도": 32202,
    "남달산": 32203,

    "이브나": 12301,
    "이나이신기": 12302,
    "윤슬": 12303,
    "아라문해슬라": 12304,
    "다르쿠스": 12305,
    "미하제": 12306,
    "시아르": 12307,

    "토로스": 92701,
    "레오": 70314,
    "벨라": 70315,
    "파보": 70316,
    "아라": 70319,
    "오리온": 70320,
    "리라": 70321
};

// ============================================================
// 데이터 폴더
// ============================================================

const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
        recursive: true
    });
}

// ============================================================
// 공통
// ============================================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function toNumber(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return 0;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    const cleaned = String(value)
        .replace(/,/g, "")
        .replace(/[^0-9.-]/g, "");

    const number = Number(cleaned);

    return Number.isFinite(number) ? number : 0;
}

// ============================================================
// HTTPS JSON 요청
// ============================================================

function requestJson(url) {
    return new Promise((resolve, reject) => {

        const request = https.get(
            url,
            {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36",

                    "Accept":
                        "application/json, text/plain, */*",

                    "Accept-Language":
                        "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",

                    "Referer":
                        "https://arthdal.netmarble.com/"
                },

                timeout: REQUEST_TIMEOUT
            },

            response => {

                let body = "";

                response.setEncoding("utf8");

                response.on("data", chunk => {
                    body += chunk;
                });

                response.on("end", () => {

                    const status =
                        Number(response.statusCode) || 0;

                    if (status < 200 || status >= 300) {
                        reject(
                            new Error(
                                "HTTP " +
                                status +
                                "\n" +
                                body.substring(0, 500)
                            )
                        );
                        return;
                    }

                    try {

                        const json = JSON.parse(body);

                        resolve(json);

                    } catch (error) {

                        reject(
                            new Error(
                                "JSON parse error\n" +
                                body.substring(0, 500)
                            )
                        );

                    }
                });
            }
        );

        request.on("timeout", () => {
            request.destroy(
                new Error("Request timeout")
            );
        });

        request.on("error", error => {
            reject(error);
        });
    });
}

// ============================================================
// 공식 랭킹 API
// ============================================================

async function requestRankingPage(worldId, page) {

    const params = new URLSearchParams();

    params.set("lang", "ko");
    params.set("page", String(page));
    params.set("row", String(RANKING_ROW));
    params.set("type", "power");
    params.set("worldId", String(worldId));
    params.set("name", "");

    const apiUrl =
        API_BASE +
        "/ranking?" +
        params.toString();

    console.log("[RANKING API]", apiUrl);

    return requestJson(apiUrl);
}

// ============================================================
// 공식 API 데이터 추출
// ============================================================

function extractRankingData(response) {

    if (!response) {
        return [];
    }

    if (
        response.resultData &&
        Array.isArray(response.resultData.resData)
    ) {
        return response.resultData.resData;
    }

    if (Array.isArray(response.resData)) {
        return response.resData;
    }

    if (Array.isArray(response.data)) {
        return response.data;
    }

    if (
        response.resultData &&
        Array.isArray(response.resultData.data)
    ) {
        return response.resultData.data;
    }

    return [];
}

// ============================================================
// 특정 서버 랭킹
// ============================================================

async function getWorldRanking(serverName, worldId) {

    console.log(
        "================================"
    );

    console.log(
        "[WORLD START]",
        serverName,
        "worldId=",
        worldId
    );

    let results = [];
    let totalCount = 0;

    try {

        for (
            let page = 1;
            page <= RANKING_MAX_PAGES;
            page++
        ) {

            const response =
                await requestRankingPage(
                    worldId,
                    page
                );

            const players =
                extractRankingData(
                    response
                );

            if (
                response &&
                response.resultData
            ) {
                totalCount =
                    toNumber(
                        response.resultData.total_count
                    );
            }

            console.log(
                "[RANKING PAGE]",
                serverName,
                "page=",
                page,
                "count=",
                players.length,
                "total=",
                totalCount
            );

            if (players.length === 0) {
                break;
            }

            for (const player of players) {

                results.push({
                    ...player,

                    server: serverName,

                    worldId: Number(worldId)
                });

            }

            if (players.length < RANKING_ROW) {
                break;
            }

            if (
                totalCount > 0 &&
                results.length >= totalCount
            ) {
                break;
            }

            await sleep(150);
        }

        // 중복 제거
        const uniqueResults = [];
        const duplicateKeys = new Set();

        for (const player of results) {

            const key =
                String(player.server || "") +
                "|" +
                String(player.name || "");

            if (duplicateKeys.has(key)) {
                continue;
            }

            duplicateKeys.add(key);

            uniqueResults.push(player);
        }

        // 전투력 순 정렬
        uniqueResults.sort((a, b) => {

            return (
                toNumber(b.power) -
                toNumber(a.power)
            );

        });

        // 서버 순위
        uniqueResults.forEach(
            (player, index) => {

                player.rank = index + 1;

            }
        );

        console.log(
            "[WORLD DONE]",
            serverName,
            uniqueResults.length,
            "명"
        );

        return uniqueResults;

    } catch (error) {

        console.error(
            "[WORLD ERROR]",
            serverName,
            error.message
        );

        return [];
    }
}

// ============================================================
// 전체 랭킹
// ============================================================

async function getAllRanking() {

    let results = [];

    const entries =
        Object.entries(worlds);

    const BATCH_SIZE = 3;

    for (
        let i = 0;
        i < entries.length;
        i += BATCH_SIZE
    ) {

        const batch =
            entries.slice(
                i,
                i + BATCH_SIZE
            );

        console.log(
            "================================"
        );

        console.log(
            "[RANKING BATCH]",
            i + 1,
            "~",
            Math.min(
                i + BATCH_SIZE,
                entries.length
            )
        );

        const batchResults =
            await Promise.all(
                batch.map(
                    ([serverName, worldId]) =>
                        getWorldRanking(
                            serverName,
                            worldId
                        )
                )
            );

        for (
            const serverData of batchResults
        ) {

            results =
                results.concat(serverData);

        }

        await sleep(300);
    }

    // 전체 중복 제거
    const uniqueResults = [];
    const duplicateKeys = new Set();

    for (const player of results) {

        const key =
            String(player.server || "") +
            "|" +
            String(player.name || "");

        if (duplicateKeys.has(key)) {
            continue;
        }

        duplicateKeys.add(key);

        uniqueResults.push(player);
    }

    // 전체 전투력 순
    uniqueResults.sort((a, b) => {

        return (
            toNumber(b.power) -
            toNumber(a.power)
        );

    });

    // 전체 순위
    uniqueResults.forEach(
        (player, index) => {

            player.totalRank =
                index + 1;

        }
    );

    console.log(
        "================================"
    );

    console.log(
        "[ALL RANKING]",
        uniqueResults.length,
        "명"
    );

    return uniqueResults;
}

// ============================================================
// 날짜
// ============================================================

function getTodayDate() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            now.getDate()
        ).padStart(2, "0");

    return (
        year +
        "-" +
        month +
        "-" +
        day
    );
}

// ============================================================
// 기록 파일
// ============================================================

function getHistoryFile(date) {

    return path.join(
        DATA_DIR,
        date + ".json"
    );
}

// ============================================================
// 하루 랭킹 저장
// ============================================================

function saveDailyRanking(ranking) {

    return new Promise(
        (resolve, reject) => {

            const today =
                getTodayDate();

            const filePath =
                getHistoryFile(today);

            if (
                fs.existsSync(filePath)
            ) {

                resolve(false);
                return;
            }

            const saveData = {

                date: today,

                savedAt:
                    new Date().toISOString(),

                total:
                    ranking.length,

                data:
                    ranking
            };

            fs.writeFile(
                filePath,

                JSON.stringify(
                    saveData,
                    null,
                    2
                ),

                "utf8",

                error => {

                    if (error) {
                        reject(error);
                        return;
                    }

                    console.log(
                        "[DAILY SAVE]",
                        today,
                        ranking.length,
                        "명"
                    );

                    resolve(true);
                }
            );
        }
    );
}

// ============================================================
// 과거 날짜
// ============================================================

function getHistoryDates() {

    if (
        !fs.existsSync(DATA_DIR)
    ) {
        return [];
    }

    return fs
        .readdirSync(DATA_DIR)

        .filter(
            file =>
                /^\d{4}-\d{2}-\d{2}\.json$/.test(
                    file
                )
        )

        .map(
            file =>
                file.replace(
                    ".json",
                    ""
                )
        )

        .sort(
            (a, b) =>
                b.localeCompare(a)
        );
}

// ============================================================
// 과거 랭킹
// ============================================================

function getHistoryRanking(date) {

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
        return null;
    }

    const filePath =
        getHistoryFile(date);

    if (
        !fs.existsSync(filePath)
    ) {
        return null;
    }

    try {

        return JSON.parse(
            fs.readFileSync(
                filePath,
                "utf8"
            )
        );

    } catch (error) {

        console.error(
            "[HISTORY ERROR]",
            error.message
        );

        return null;
    }
}

// ============================================================
// JSON 응답
// ============================================================

function sendJson(
    res,
    statusCode,
    data
) {

    res.writeHead(
        statusCode,
        {
            "Content-Type":
                "application/json; charset=utf-8",

            "Access-Control-Allow-Origin":
                "*",

            "Access-Control-Allow-Methods":
                "GET, OPTIONS",

            "Access-Control-Allow-Headers":
                "Content-Type"
        }
    );

    res.end(
        JSON.stringify(data)
    );
}

// ============================================================
// OPTIONS
// ============================================================

function handleOptions(req, res) {

    if (
        req.method !== "OPTIONS"
    ) {
        return false;
    }

    res.writeHead(
        204,
        {
            "Access-Control-Allow-Origin":
                "*",

            "Access-Control-Allow-Methods":
                "GET, OPTIONS",

            "Access-Control-Allow-Headers":
                "Content-Type"
        }
    );

    res.end();

    return true;
}

// ============================================================
// 정적 파일
// ============================================================

function serveStatic(
    req,
    res,
    requestUrl
) {

    let filePath;

    if (
        requestUrl.pathname === "/"
    ) {

        filePath =
            path.join(
                __dirname,
                "index.html"
            );

    } else {

        const cleanPath =
            decodeURIComponent(
                requestUrl.pathname
            ).replace(
                /^\/+/,
                ""
            );

        filePath =
            path.join(
                __dirname,
                cleanPath
            );
    }

    const root =
        path.resolve(__dirname);

    const resolved =
        path.resolve(filePath);

    if (
        resolved !== root &&
        !resolved.startsWith(
            root + path.sep
        )
    ) {

        res.writeHead(403);
        res.end("Forbidden");

        return;
    }

    const ext =
        path.extname(
            resolved
        ).toLowerCase();

    const contentTypes = {

        ".html":
            "text/html; charset=utf-8",

        ".js":
            "text/javascript; charset=utf-8",

        ".css":
            "text/css; charset=utf-8",

        ".json":
            "application/json; charset=utf-8",

        ".png":
            "image/png",

        ".jpg":
            "image/jpeg",

        ".jpeg":
            "image/jpeg",

        ".gif":
            "image/gif",

        ".svg":
            "image/svg+xml",

        ".ico":
            "image/x-icon",

        ".webp":
            "image/webp"
    };

    fs.readFile(
        resolved,
        (error, content) => {

            if (error) {

                res.writeHead(
                    404,
                    {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    }
                );

                res.end(
                    "Not Found"
                );

                return;
            }

            res.writeHead(
                200,
                {
                    "Content-Type":
                        contentTypes[ext] ||
                        "application/octet-stream"
                }
            );

            res.end(content);
        }
    );
}

// ============================================================
// 서버
// ============================================================

const server =
    http.createServer(
        async (req, res) => {

            try {

                if (
                    handleOptions(
                        req,
                        res
                    )
                ) {
                    return;
                }

                const requestUrl =
                    new URL(
                        req.url,
                        "http://" +
                        (
                            req.headers.host ||
                            "localhost"
                        )
                    );

                // ------------------------------------------------
                // 상태
                // ------------------------------------------------

                if (
                    requestUrl.pathname ===
                    "/api/status"
                ) {

                    sendJson(
                        res,
                        200,
                        {
                            success: true,

                            server:
                                "아스달 지지",

                            api:
                                API_BASE +
                                "/ranking",

                            rankingServers:
                                worlds,

                            time:
                                new Date().toISOString()
                        }
                    );

                    return;
                }

                // ------------------------------------------------
                // 전체 랭킹
                // ------------------------------------------------

                if (
                    requestUrl.pathname ===
                    "/api/all-ranking"
                ) {

                    const ranking =
                        await getAllRanking();

                    await saveDailyRanking(
                        ranking
                    );

                    sendJson(
                        res,
                        200,
                        {
                            success: true,

                            total:
                                ranking.length,

                            data:
                                ranking
                        }
                    );

                    return;
                }

                // ------------------------------------------------
                // 특정 서버 랭킹
                // ------------------------------------------------

                if (
                    requestUrl.pathname ===
                    "/api/ranking"
                ) {

                    const worldId =
                        requestUrl.searchParams.get(
                            "worldId"
                        );

                    if (!worldId) {

                        sendJson(
                            res,
                            400,
                            {
                                success: false,

                                error:
                                    "worldId required"
                            }
                        );

                        return;
                    }

                    const world =
                        Object.entries(
                            worlds
                        ).find(
                            ([name, id]) =>
                                String(id) ===
                                String(worldId)
                        );

                    if (!world) {

                        sendJson(
                            res,
                            404,
                            {
                                success: false,

                                error:
                                    "world not found",

                                worldId:
                                    worldId
                            }
                        );

                        return;
                    }

                    const ranking =
                        await getWorldRanking(
                            world[0],
                            Number(worldId)
                        );

                    sendJson(
                        res,
                        200,
                        {
                            success: true,

                            resultData: {

                                resCode: 0,

                                errorMessage:
                                    "Success",

                                total_count:
                                    ranking.length,

                                resData:
                                    ranking
                            }
                        }
                    );

                    return;
                }

                // ------------------------------------------------
                // 과거 날짜
                // ------------------------------------------------

                if (
                    requestUrl.pathname ===
                    "/api/history-dates"
                ) {

                    sendJson(
                        res,
                        200,
                        {
                            success: true,

                            dates:
                                getHistoryDates()
                        }
                    );

                    return;
                }

                // ------------------------------------------------
                // 과거 랭킹
                // ------------------------------------------------

                if (
                    requestUrl.pathname ===
                    "/api/history"
                ) {

                    const date =
                        requestUrl.searchParams.get(
                            "date"
                        );

                    if (!date) {

                        sendJson(
                            res,
                            400,
                            {
                                success: false,

                                error:
                                    "date required"
                            }
                        );

                        return;
                    }

                    const history =
                        getHistoryRanking(
                            date
                        );

                    if (!history) {

                        sendJson(
                            res,
                            404,
                            {
                                success: false,

                                error:
                                    "history not found",

                                date:
                                    date
                            }
                        );

                        return;
                    }

                    sendJson(
                        res,
                        200,
                        history
                    );

                    return;
                }

                // ------------------------------------------------
                // 정적 파일
                // ------------------------------------------------

                serveStatic(
                    req,
                    res,
                    requestUrl
                );

            } catch (error) {

                console.error(
                    "[SERVER ERROR]",
                    error
                );

                sendJson(
                    res,
                    500,
                    {
                        success: false,

                        error:
                            error.message ||
                            "server error"
                    }
                );
            }
        }
    );

// ============================================================
// 서버 시작
// ============================================================

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "================================"
        );

        console.log(
            "아스달 지지 SERVER STARTED"
        );

        console.log(
            "PORT:",
            PORT
        );

        console.log(
            "NODE:",
            process.version
        );

        console.log(
            "RANKING API:",
            API_BASE +
            "/ranking"
        );

        console.log(
            "================================"
        );

        checkDailySave();
    }
);

// ============================================================
// 하루 1회 랭킹 저장
// ============================================================

let dailySaveRunning = false;

async function checkDailySave() {

    if (dailySaveRunning) {
        return;
    }

    const today =
        getTodayDate();

    const filePath =
        getHistoryFile(today);

    if (
        fs.existsSync(filePath)
    ) {
        return;
    }

    dailySaveRunning = true;

    try {

        console.log(
            "[DAILY SAVE] 시작"
        );

        const ranking =
            await getAllRanking();

        if (
            ranking.length > 0
        ) {

            await saveDailyRanking(
                ranking
            );

        } else {

            console.log(
                "[DAILY SAVE] 랭킹 0명"
            );
        }

    } catch (error) {

        console.error(
            "[DAILY SAVE ERROR]",
            error
        );

    } finally {

        dailySaveRunning = false;
    }
}

setInterval(
    () => {
        checkDailySave();
    },
    60 * 1000
);
