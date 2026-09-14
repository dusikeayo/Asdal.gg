const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");


/* =========================================
   기본 설정
========================================= */

const PORT =
    process.env.PORT || 3000;

const ROW_PER_PAGE = 500;
const BATCH_SIZE = 3;

const DATA_DIR =
    path.join(__dirname, "data");


/* =========================================
   서버 목록
========================================= */

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


if (!fs.existsSync(DATA_DIR)) {

    fs.mkdirSync(
        DATA_DIR,
        { recursive: true }
    );
}


/* =========================================
   유틸
========================================= */

function sleep(ms) {

    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}


/*
    Render 서버 시간이 UTC일 수 있기 때문에
    한국 시간 기준으로 날짜를 계산합니다.
*/

function getTodayDate() {

    const now =
        new Date();

    const korea =
        new Date(
            now.toLocaleString(
                "en-US",
                {
                    timeZone:
                        "Asia/Seoul"
                }
            )
        );

    const year =
        korea.getFullYear();

    const month =
        String(
            korea.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            korea.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function getHistoryFile(date) {

    return path.join(
        DATA_DIR,
        `${date}.json`
    );
}


function normalizeName(name) {

    return String(name || "")
        .trim()
        .toLowerCase();
}


/* =========================================
   JSON 응답
========================================= */

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

            "Cache-Control":
                "no-cache"
        }
    );

    res.end(
        JSON.stringify(data)
    );
}


/* =========================================
   넷마블 API
========================================= */

function requestRanking(worldId) {

    return new Promise(
        (resolve, reject) => {

            const apiUrl =
                "https://arthdal.netmarble.com/front-api/ranking" +
                "?lang=ko" +
                "&page=1" +
                "&row=" +
                ROW_PER_PAGE +
                "&type=power" +
                "&worldId=" +
                encodeURIComponent(worldId) +
                "&name=";


            console.log(
                "[API]",
                apiUrl
            );


            const request =
                https.get(
                    apiUrl,
                    {
                        headers: {
                            "User-Agent":
                                "Mozilla/5.0",
                            "Accept":
                                "application/json"
                        }
                    },
                    response => {

                        let body = "";


                        response.on(
                            "data",
                            chunk => {
                                body += chunk;
                            }
                        );


                        response.on(
                            "end",
                            () => {

                                if (
                                    response.statusCode !== 200
                                ) {

                                    reject(
                                        new Error(
                                            "HTTP " +
                                            response.statusCode
                                        )
                                    );

                                    return;
                                }


                                try {

                                    const json =
                                        JSON.parse(body);

                                    resolve(json);

                                } catch (error) {

                                    reject(
                                        new Error(
                                            "JSON parse error"
                                        )
                                    );
                                }
                            }
                        );
                    }
                );


            request.on(
                "error",
                error => {
                    reject(error);
                }
            );
        }
    );
}


/* =========================================
   월드별 랭킹
========================================= */

async function getWorldRanking(
    serverName,
    worldId
) {

    console.log(
        "[WORLD START]",
        serverName,
        worldId
    );


    try {

        const response =
            await requestRanking(
                worldId
            );


        if (
            !response ||
            !response.resultData ||
            !Array.isArray(
                response.resultData.resData
            )
        ) {

            console.log(
                "[INVALID]",
                serverName
            );

            return [];
        }


        const players =
            response.resultData.resData;


        const results =
            players.map(
                player => {

                    return {
                        ...player,

                        server:
                            serverName,

                        worldId:
                            worldId
                    };
                }
            );


        /*
            같은 서버 + 같은 닉네임은 중복 제거.
            다른 서버의 같은 닉네임은 절대 제거하지 않음.
        */

        const uniqueResults = [];

        const duplicateKeys =
            new Set();


        results.forEach(
            player => {

                const key =
                    normalizeName(
                        player.server
                    ) +
                    "|" +
                    normalizeName(
                        player.name
                    );


                if (
                    duplicateKeys.has(key)
                ) {
                    return;
                }


                duplicateKeys.add(key);

                uniqueResults.push(
                    player
                );
            }
        );


        uniqueResults.sort(
            (a, b) => {

                return (
                    (Number(b.power) || 0) -
                    (Number(a.power) || 0)
                );
            }
        );


        uniqueResults.forEach(
            (player, index) => {

                player.rank =
                    index + 1;

                player.totalRank =
                    index + 1;
            }
        );


        console.log(
            "[WORLD DONE]",
            serverName,
            uniqueResults.length
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


/* =========================================
   전체 랭킹
========================================= */

async function getAllRanking() {

    let results = [];

    const entries =
        Object.entries(worlds);


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
            "[BATCH]",
            `${i + 1} ~ ${Math.min(
                i + BATCH_SIZE,
                entries.length
            )}`
        );


        const batchResults =
            await Promise.all(
                batch.map(
                    ([serverName, worldId]) => {

                        return getWorldRanking(
                            serverName,
                            worldId
                        );
                    }
                )
            );


        batchResults.forEach(
            serverData => {

                results =
                    results.concat(
                        serverData
                    );
            }
        );


        await sleep(300);
    }


    /*
        전체 중복 제거.
        서버 + 닉네임을 기준으로 하기 때문에
        다른 서버의 동명이인은 정상적으로 남습니다.
    */

    const uniqueResults = [];

    const duplicateKeys =
        new Set();


    results.forEach(
        player => {

            const key =
                normalizeName(
                    player.server
                ) +
                "|" +
                normalizeName(
                    player.name
                );


            if (
                duplicateKeys.has(key)
            ) {
                return;
            }


            duplicateKeys.add(key);

            uniqueResults.push(
                player
            );
        }
    );


    uniqueResults.sort(
        (a, b) => {

            return (
                (Number(b.power) || 0) -
                (Number(a.power) || 0)
            );
        }
    );


    uniqueResults.forEach(
        (player, index) => {

            player.totalRank =
                index + 1;
        }
    );


    console.log(
        "[ALL RANKING]",
        uniqueResults.length
    );


    return uniqueResults;
}


/* =========================================
   일일 랭킹 저장
========================================= */

function saveDailyRanking(
    ranking
) {

    return new Promise(
        (resolve, reject) => {

            const today =
                getTodayDate();

            const filePath =
                getHistoryFile(today);


            /*
                이미 해당 날짜의 파일이 있다면
                기존 8월/9월 기록을 덮어쓰지 않습니다.
            */

            if (
                fs.existsSync(filePath)
            ) {

                resolve(false);

                return;
            }


            const saveData = {

                date:
                    today,

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
                        "[SAVE]",
                        today,
                        ranking.length
                    );


                    resolve(true);
                }
            );
        }
    );
}


/* =========================================
   과거 날짜
========================================= */

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
                /^\d{4}-\d{2}-\d{2}\.json$/.test(file)
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


/* =========================================
   과거 랭킹
========================================= */

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

        const content =
            fs.readFileSync(
                filePath,
                "utf8"
            );


        return JSON.parse(
            content
        );


    } catch (error) {

        console.error(
            "[HISTORY ERROR]",
            date,
            error.message
        );

        return null;
    }
}


/* =========================================
   과거 데이터 배열 추출
========================================= */

function getHistoryPlayers(data) {

    if (!data) {
        return [];
    }


    if (
        Array.isArray(data)
    ) {

        return data;
    }


    if (
        Array.isArray(data.data)
    ) {

        return data.data;
    }


    if (
        data.resultData &&
        Array.isArray(
            data.resultData.resData
        )
    ) {

        return data.resultData.resData;
    }


    return [];
}


/* =========================================
   추적 후보 찾기
========================================= */

function findTrackingCandidates(
    name
) {

    const target =
        normalizeName(name);

    const dates =
        getHistoryDates();

    const candidates =
        new Map();


    for (
        const date of dates
    ) {

        const data =
            getHistoryRanking(date);

        const players =
            getHistoryPlayers(data);


        players.forEach(
            player => {

                if (
                    normalizeName(
                        player.name
                    ) !== target
                ) {

                    return;
                }


                const server =
                    String(
                        player.server || ""
                    );

                const worldId =
                    String(
                        player.worldId || ""
                    );


                const key =
                    `${worldId}|${normalizeName(server)}|${target}`;


                if (
                    candidates.has(key)
                ) {

                    return;
                }


                candidates.set(
                    key,
                    {
                        name:
                            player.name,

                        server:
                            server,

                        worldId:
                            worldId,

                        guild_name:
                            player.guild_name ||
                            "",

                        firstDate:
                            date
                    }
                );
            }
        );
    }


    return [
        ...candidates.values()
    ];
}


/* =========================================
   플레이어 추적
========================================= */

function getPlayerTracking(
    name,
    worldId = null
) {

    if (
        !name ||
        !String(name).trim()
    ) {

        return null;
    }


    const targetName =
        String(name).trim();

    const target =
        normalizeName(targetName);


    const targetWorld =
        worldId &&
        String(worldId) !== "all"
            ? String(worldId)
            : null;


    const dates =
        getHistoryDates()
            .sort(
                (a, b) =>
                    a.localeCompare(b)
            );


    const history = [];


    for (
        const date of dates
    ) {

        const data =
            getHistoryRanking(date);

        const players =
            getHistoryPlayers(data);


        /*
            동명이인 처리 핵심.

            worldId가 지정되어 있으면
            반드시 해당 서버의 기록만 가져옵니다.
        */

        const matches =
            players.filter(
                player => {

                    const sameName =
                        normalizeName(
                            player.name
                        ) === target;


                    if (!sameName) {
                        return false;
                    }


                    if (!targetWorld) {
                        return true;
                    }


                    return String(
                        player.worldId || ""
                    ) === targetWorld;
                }
            );


        if (
            matches.length === 0
        ) {

            continue;
        }


        /*
            worldId를 지정하지 않은 경우
            같은 날짜에 동명이인이 여러 명이면
            첫 번째 사람을 임의로 선택하지 않습니다.
        */

        let player;


        if (
            !targetWorld &&
            matches.length > 1
        ) {

            continue;
        }


        player =
            matches[0];


        history.push({

            date:
                date,

            name:
                player.name,

            server:
                player.server || "",

            worldId:
                player.worldId || "",

            level:
                Number(player.level) || 0,

            power:
                Number(player.power) || 0,

            rank:
                Number(player.rank) || 0,

            totalRank:
                Number(player.totalRank) || 0,

            main_job:
                player.main_job || "",

            guild_name:
                player.guild_name || ""
        });
    }


    /*
        같은 이름 + 서버의 기록이 없으면
        찾지 못한 것으로 처리.
    */

    if (
        history.length === 0
    ) {

        /*
            worldId를 지정하지 않았을 때
            후보가 여러 개라면 후보를 반환합니다.
        */

        if (!targetWorld) {

            const candidates =
                findTrackingCandidates(
                    targetName
                );


            if (
                candidates.length > 0
            ) {

                return {
                    name:
                        targetName,

                    found:
                        false,

                    candidates:
                        candidates,

                    history:
                        [],

                    moves:
                        [],

                    guildMoves:
                        []
                };
            }
        }


        return {
            name:
                targetName,

            found:
                false,

            candidates:
                [],

            history:
                [],

            moves:
                [],

            guildMoves:
                []
        };
    }


    const moves = [];
    const guildMoves = [];


    for (
        let i = 1;
        i < history.length;
        i++
    ) {

        const previous =
            history[i - 1];

        const current =
            history[i];


        /*
            서버 이전
        */

        if (
            previous.server &&
            current.server &&
            previous.server !==
                current.server
        ) {

            moves.push({

                fromDate:
                    previous.date,

                toDate:
                    current.date,

                fromServer:
                    previous.server,

                toServer:
                    current.server,

                fromWorldId:
                    previous.worldId,

                toWorldId:
                    current.worldId
            });
        }


        /*
            연맹 변경
        */

        const previousGuild =
            previous.guild_name ||
            "";

        const currentGuild =
            current.guild_name ||
            "";


        if (
            previousGuild !==
            currentGuild
        ) {

            guildMoves.push({

                fromDate:
                    previous.date,

                toDate:
                    current.date,

                fromGuild:
                    previousGuild ||
                    "무소속",

                toGuild:
                    currentGuild ||
                    "무소속",

                server:
                    current.server ||
                    previous.server ||
                    "",

                worldId:
                    current.worldId ||
                    previous.worldId ||
                    ""
            });
        }
    }


    return {

        name:
            history[history.length - 1]
                .name,

        found:
            true,

        candidates:
            [],

        history:
            history,

        moves:
            moves,

        guildMoves:
            guildMoves
    };
}


/* =========================================
   정적 파일
========================================= */

function serveStatic(
    req,
    res
) {

    let pathname;

    try {

        const requestUrl =
            new URL(
                req.url,
                "http://" +
                req.headers.host
            );

        pathname =
            decodeURIComponent(
                requestUrl.pathname
            );

    } catch (error) {

        res.writeHead(400);

        res.end("Bad Request");

        return;
    }


    if (
        pathname === "/"
    ) {

        pathname =
            "/index.html";
    }


    /*
        보안상 ../ 경로 차단
    */

    if (
        pathname.includes("..")
    ) {

        res.writeHead(403);

        res.end("Forbidden");

        return;
    }


    const filePath =
        path.join(
            __dirname,
            pathname
        );


    const ext =
        path.extname(
            filePath
        ).toLowerCase();


    const contentTypes = {

        ".html":
            "text/html; charset=utf-8",

        ".js":
            "application/javascript; charset=utf-8",

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

        ".webp":
            "image/webp",

        ".svg":
            "image/svg+xml",

        ".ico":
            "image/x-icon"
    };


    fs.readFile(
        filePath,
        (error, content) => {

            if (error) {

                res.writeHead(404);

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


/* =========================================
   서버
========================================= */

const server =
    http.createServer(
        async (
            req,
            res
        ) => {

            try {

                const requestUrl =
                    new URL(
                        req.url,
                        "http://" +
                        req.headers.host
                    );


                /* =========================
                   전체 랭킹
                ========================= */

                if (
                    requestUrl.pathname ===
                    "/api/all-ranking"
                ) {

                    const ranking =
                        await getAllRanking();


                    /*
                        오늘 파일이 없을 때만 저장.
                        기존 8월 기록은 건드리지 않음.
                    */

                    await saveDailyRanking(
                        ranking
                    );


                    sendJson(
                        res,
                        200,
                        {
                            total:
                                ranking.length,

                            data:
                                ranking
                        }
                    );

                    return;
                }


                /* =========================
                   특정 서버 랭킹
                ========================= */

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
                                error:
                                    "world not found"
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
                            resultData: {

                                resCode:
                                    0,

                                errorMessage:
                                    "Success",

                                resData:
                                    ranking
                            }
                        }
                    );

                    return;
                }


                /* =========================
                   플레이어 추적
                ========================= */

                if (
                    requestUrl.pathname ===
                    "/api/tracking"
                ) {

                    const name =
                        requestUrl.searchParams.get(
                            "name"
                        );


                    const worldId =
                        requestUrl.searchParams.get(
                            "worldId"
                        );


                    if (
                        !name ||
                        !name.trim()
                    ) {

                        sendJson(
                            res,
                            400,
                            {
                                error:
                                    "name required"
                            }
                        );

                        return;
                    }


                    const result =
                        getPlayerTracking(
                            name,
                            worldId
                        );


                    sendJson(
                        res,
                        200,
                        result
                    );

                    return;
                }


                /* =========================
                   과거 날짜 목록
                ========================= */

                if (
                    requestUrl.pathname ===
                    "/api/history-dates"
                ) {

                    const dates =
                        getHistoryDates();


                    sendJson(
                        res,
                        200,
                        {
                            dates:
                                dates
                        }
                    );

                    return;
                }


                /* =========================
                   과거 랭킹
                ========================= */

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
                                error:
                                    "history not found"
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


                /* =========================
                   정적 파일
                ========================= */

                serveStatic(
                    req,
                    res
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
                        error:
                            "server error"
                    }
                );
            }
        }
    );


/* =========================================
   서버 시작
========================================= */

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "================================"
        );

        console.log(
            "아스달 지지 서버 시작"
        );

        console.log(
            "PORT:",
            PORT
        );

        console.log(
            "DATA:",
            DATA_DIR
        );

        console.log(
            "TODAY:",
            getTodayDate()
        );

        console.log(
            "================================"
        );


        checkDailySave();
    }
);


/* =========================================
   하루 1회 자동 저장
========================================= */

let dailySaveRunning = false;


async function checkDailySave() {

    if (
        dailySaveRunning
    ) {

        return;
    }


    const today =
        getTodayDate();

    const filePath =
        getHistoryFile(today);


    /*
        오늘 파일이 이미 있으면
        다시 전체 API를 호출하지 않습니다.
    */

    if (
        fs.existsSync(filePath)
    ) {

        return;
    }


    dailySaveRunning = true;


    try {

        console.log(
            "[DAILY SAVE]",
            today
        );


        const ranking =
            await getAllRanking();


        await saveDailyRanking(
            ranking
        );


    } catch (error) {

        console.error(
            "[DAILY SAVE ERROR]",
            error
        );


    } finally {

        dailySaveRunning =
            false;
    }
}


setInterval(
    () => {

        checkDailySave();

    },
    60 * 1000
);
