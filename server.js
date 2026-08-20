```javascript
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;

const ROW_PER_PAGE = 500;
const BATCH_SIZE = 3;


// ============================================================
// 아스달 공식 API
// ============================================================

const API_HOST = "arthdal.netmarble.com";


// ============================================================
// 랭킹 서버
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
// 거래소 서버
//
// 중요:
// 거래소 API는 ranking API와 별개의 worldId를 사용할 수 있다.
// 현재 네가 사용하던 실제 API 호출 구조를 유지한다.
//
// 추후 공식 사이트에서 거래소 Select 값이 변경된 경우
// 이 부분의 ID만 변경하면 된다.
// ============================================================

const auctionServers = {

    "newworld": {
        name: "뉴월드",
        worldId: 3000
    },

    "global": {
        name: "글로벌",
        worldId: 1000
    },

    "krabon": {
        name: "크라본",
        worldId: 70110
    }

};


// ============================================================
// 데이터 폴더
// ============================================================

const DATA_DIR =
    path.join(
        __dirname,
        "data"
    );


if (
    !fs.existsSync(
        DATA_DIR
    )
) {

    fs.mkdirSync(
        DATA_DIR,
        {
            recursive: true
        }
    );

}


// ============================================================
// 공통
// ============================================================

function sleep(ms) {

    return new Promise(
        resolve => {

            setTimeout(
                resolve,
                ms
            );

        }
    );

}


function getTodayDate() {

    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );

    return (
        year +
        "-" +
        month +
        "-" +
        day
    );

}


function getHistoryFile(date) {

    return path.join(
        DATA_DIR,
        date + ".json"
    );

}


// ============================================================
// HTTPS GET 공통 함수
// ============================================================

function httpsGetJson(
    apiUrl
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            console.log(
                "[HTTPS]",
                apiUrl
            );


            const request =
                https.get(
                    apiUrl,
                    {
                        headers: {

                            "User-Agent":
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36",

                            "Accept":
                                "application/json, text/plain, */*",

                            "Accept-Language":
                                "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",

                            "Referer":
                                "https://arthdal.netmarble.com/"

                        },

                        timeout: 20000

                    },
                    response => {

                        let body = "";


                        response.setEncoding(
                            "utf8"
                        );


                        response.on(
                            "data",
                            chunk => {

                                body += chunk;

                            }
                        );


                        response.on(
                            "end",
                            () => {

                                const statusCode =
                                    response.statusCode ||
                                    0;


                                console.log(
                                    "[HTTPS RESPONSE]",
                                    statusCode
                                );


                                if (
                                    statusCode !== 200
                                ) {

                                    reject(
                                        new Error(
                                            "HTTP " +
                                            statusCode +
                                            " / " +
                                            apiUrl
                                        )
                                    );

                                    return;

                                }


                                try {

                                    const json =
                                        JSON.parse(
                                            body
                                        );


                                    resolve(
                                        json
                                    );


                                } catch (
                                    error
                                ) {

                                    console.error(
                                        "[JSON ERROR]",
                                        error.message
                                    );


                                    console.error(
                                        "[BODY]",
                                        body.substring(
                                            0,
                                            1000
                                        )
                                    );


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
                "timeout",
                () => {

                    request.destroy(
                        new Error(
                            "Request timeout"
                        )
                    );

                }
            );


            request.on(
                "error",
                error => {

                    reject(
                        error
                    );

                }
            );

        }
    );

}


// ============================================================
// 랭킹 API
// ============================================================

async function requestRanking(
    worldId,
    page = 1,
    row = ROW_PER_PAGE
) {

    const apiUrl =
        "https://" +
        API_HOST +
        "/front-api/ranking" +
        "?lang=ko" +
        "&page=" +
        encodeURIComponent(
            page
        ) +
        "&row=" +
        encodeURIComponent(
            row
        ) +
        "&type=power" +
        "&worldId=" +
        encodeURIComponent(
            worldId
        ) +
        "&name=";


    return await httpsGetJson(
        apiUrl
    );

}


// ============================================================
// 랭킹 응답에서 실제 배열 추출
// ============================================================

function extractRankingArray(
    response
) {

    if (
        response &&
        response.resultData &&
        Array.isArray(
            response.resultData.resData
        )
    ) {

        return response.resultData.resData;

    }


    if (
        response &&
        Array.isArray(
            response.resData
        )
    ) {

        return response.resData;

    }


    if (
        response &&
        response.data &&
        Array.isArray(
            response.data
        )
    ) {

        return response.data;

    }


    return [];

}


// ============================================================
// 월드별 랭킹
// ============================================================

async function getWorldRanking(
    serverName,
    worldId
) {

    console.log(
        "========================================"
    );


    console.log(
        "[WORLD START]",
        serverName,
        worldId
    );


    try {

        const response =
            await requestRanking(
                worldId,
                1,
                ROW_PER_PAGE
            );


        const players =
            extractRankingArray(
                response
            );


        console.log(
            "[WORLD DATA]",
            serverName,
            players.length
        );


        if (
            players.length === 0
        ) {

            console.log(
                "[WORLD EMPTY]",
                serverName
            );


            return [];

        }


        const results =
            players.map(
                player => {

                    return {

                        ...player,

                        server:
                            serverName,

                        worldId:
                            Number(
                                worldId
                            )

                    };

                }
            );


        // ----------------------------------------------------
        // 같은 서버 + 같은 닉네임 중복 제거
        // ----------------------------------------------------

        const uniqueResults = [];

        const duplicateKeys =
            new Set();


        results.forEach(
            player => {

                const key =
                    String(
                        player.server || ""
                    ) +
                    "|" +
                    String(
                        player.name || ""
                    );


                if (
                    duplicateKeys.has(
                        key
                    )
                ) {

                    return;

                }


                duplicateKeys.add(
                    key
                );


                uniqueResults.push(
                    player
                );

            }
        );


        // ----------------------------------------------------
        // 전투력 기준 정렬
        // ----------------------------------------------------

        uniqueResults.sort(
            (
                a,
                b
            ) => {

                return (
                    (
                        Number(
                            b.power
                        ) || 0
                    ) -
                    (
                        Number(
                            a.power
                        ) || 0
                    )
                );

            }
        );


        // ----------------------------------------------------
        // 서버 내 순위
        // ----------------------------------------------------

        uniqueResults.forEach(
            (
                player,
                index
            ) => {

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


    } catch (
        error
    ) {

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
        Object.entries(
            worlds
        );


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
            "========================================"
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
                    (
                        [
                            serverName,
                            worldId
                        ]
                    ) => {

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


        await sleep(
            300
        );

    }


    // --------------------------------------------------------
    // 전체 중복 제거
    // --------------------------------------------------------

    const uniqueResults = [];

    const duplicateKeys =
        new Set();


    results.forEach(
        player => {

            const key =
                String(
                    player.server || ""
                ) +
                "|" +
                String(
                    player.name || ""
                );


            if (
                duplicateKeys.has(
                    key
                )
            ) {

                return;

            }


            duplicateKeys.add(
                key
            );


            uniqueResults.push(
                player
            );

        }
    );


    // --------------------------------------------------------
    // 전체 전투력 순위
    // --------------------------------------------------------

    uniqueResults.sort(
        (
            a,
            b
        ) => {

            return (
                (
                    Number(
                        b.power
                    ) || 0
                ) -
                (
                    Number(
                        a.power
                    ) || 0
                )
            );

        }
    );


    uniqueResults.forEach(
        (
            player,
            index
        ) => {

            player.totalRank =
                index + 1;

        }
    );


    console.log(
        "========================================"
    );


    console.log(
        "[ALL RANKING]",
        uniqueResults.length
    );


    return uniqueResults;

}


// ============================================================
// 거래소 API
// ============================================================

async function requestAuction(
    itemName,
    worldId
) {

    if (
        worldId === undefined ||
        worldId === null
    ) {

        throw new Error(
            "거래소 worldId가 없습니다."
        );

    }


    const categories =
        "0,3,1,2,97,110,124,130,140,6,7,8,9,10,11,5,12,15,13,14,16,117,20,21,19,22,68,69,70,71,72,78,79,80,81,82,83,84,85,86,67,63,64,58,59,60,61,55,56,96,47,48,49,50,51,52,53,54,109,26,27,29,44,45,46,35,36,33,65";


    const apiUrl =
        "https://" +
        API_HOST +
        "/front-api/auction" +
        "?worldId=" +
        encodeURIComponent(
            String(
                worldId
            )
        ) +
        "&lang=ko" +
        "&page=1" +
        "&row=50" +
        "&reinforce_level_start=0" +
        "&reinforce_level_end=20" +
        "&tiers=0,1,2,3,4" +
        "&categories=" +
        categories +
        "&itemname=" +
        encodeURIComponent(
            itemName || ""
        );


    console.log(
        "========================================"
    );


    console.log(
        "[AUCTION]"
    );


    console.log(
        "[AUCTION SERVER ID]",
        worldId
    );


    console.log(
        "[AUCTION ITEM]",
        itemName || "전체"
    );


    console.log(
        "[AUCTION URL]",
        apiUrl
    );


    const response =
        await httpsGetJson(
            apiUrl
        );


    return {

        ...response,

        __requestedWorldId:
            Number(
                worldId
            )

    };

}


// ============================================================
// 거래소 응답 배열 추출
// ============================================================

function extractAuctionArray(
    response
) {

    if (
        response &&
        response.resultData &&
        Array.isArray(
            response.resultData.resData
        )
    ) {

        return response.resultData.resData;

    }


    if (
        response &&
        response.resultData &&
        Array.isArray(
            response.resultData.data
        )
    ) {

        return response.resultData.data;

    }


    if (
        response &&
        Array.isArray(
            response.resData
        )
    ) {

        return response.resData;

    }


    if (
        response &&
        Array.isArray(
            response.data
        )
    ) {

        return response.data;

    }


    return [];

}


// ============================================================
// 일일 랭킹 저장
// ============================================================

function saveDailyRanking(
    ranking
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const today =
                getTodayDate();


            const filePath =
                getHistoryFile(
                    today
                );


            if (
                fs.existsSync(
                    filePath
                )
            ) {

                resolve(
                    false
                );

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

                    if (
                        error
                    ) {

                        reject(
                            error
                        );

                        return;

                    }


                    console.log(
                        "[DAILY SAVE]",
                        today,
                        ranking.length
                    );


                    resolve(
                        true
                    );

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
        !fs.existsSync(
            DATA_DIR
        )
    ) {

        return [];

    }


    return fs
        .readdirSync(
            DATA_DIR
        )
        .filter(
            file => {

                return file.endsWith(
                    ".json"
                );

            }
        )
        .map(
            file => {

                return file.replace(
                    ".json",
                    ""
                );

            }
        )
        .filter(
            date => {

                return /^\d{4}-\d{2}-\d{2}$/.test(
                    date
                );

            }
        )
        .sort(
            (
                a,
                b
            ) => {

                return b.localeCompare(
                    a
                );

            }
        );

}


// ============================================================
// 과거 랭킹
// ============================================================

function getHistoryRanking(
    date
) {

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            date
        )
    ) {

        return null;

    }


    const filePath =
        getHistoryFile(
            date
        );


    if (
        !fs.existsSync(
            filePath
        )
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


    } catch (
        error
    ) {

        console.error(
            "[HISTORY READ ERROR]",
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

            "Cache-Control":
                "no-store"
        }
    );


    res.end(
        JSON.stringify(
            data
        )
    );

}


// ============================================================
// OPTIONS
// ============================================================

function sendOptions(
    res
) {

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

}


// ============================================================
// MIME
// ============================================================

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

    ".ico":
        "image/x-icon",

    ".svg":
        "image/svg+xml",

    ".webp":
        "image/webp"

};


// ============================================================
// 정적 파일
// ============================================================

function serveStaticFile(
    req,
    res,
    requestUrl
) {

    let filePath;


    if (
        requestUrl.pathname ===
        "/"
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
        path.resolve(
            __dirname
        );


    const resolved =
        path.resolve(
            filePath
        );


    if (
        resolved !== root &&
        !resolved.startsWith(
            root +
            path.sep
        )
    ) {

        res.writeHead(
            403,
            {
                "Content-Type":
                    "text/plain; charset=utf-8"
            }
        );


        res.end(
            "Forbidden"
        );


        return;

    }


    fs.readFile(
        resolved,
        (
            error,
            content
        ) => {

            if (
                error
            ) {

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


            const ext =
                path.extname(
                    resolved
                ).toLowerCase();


            res.writeHead(
                200,
                {
                    "Content-Type":
                        contentTypes[
                            ext
                        ] ||
                        "application/octet-stream",

                    "Cache-Control":
                        "no-cache"
                }
            );


            res.end(
                content
            );

        }
    );

}


// ============================================================
// 서버
// ============================================================

const server =
    http.createServer(
        async (
            req,
            res
        ) => {

            try {

                if (
                    req.method ===
                    "OPTIONS"
                ) {

                    sendOptions(
                        res
                    );

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


                // ==================================================
                // 상태 확인
                // ==================================================

                if (
                    requestUrl.pathname ===
                    "/api/health"
                ) {

                    sendJson(
                        res,
                        200,
                        {

                            success:
                                true,

                            server:
                                "아스달 지지",

                            time:
                                new Date().toISOString()

                        }
                    );


                    return;

                }


                // ==================================================
                // 서버 목록
                // ==================================================

                if (
                    requestUrl.pathname ===
                    "/api/servers"
                ) {

                    sendJson(
                        res,
                        200,
                        {

                            ranking:
                                Object.entries(
                                    worlds
                                ).map(
                                    (
                                        [
                                            name,
                                            worldId
                                        ]
                                    ) => {

                                        return {

                                            name:
                                                name,

                                            worldId:
                                                worldId

                                        };

                                    }
                                ),

                            auction:
                                Object.entries(
                                    auctionServers
                                ).map(
                                    (
                                        [
                                            key,
                                            server
                                        ]
                                    ) => {

                                        return {

                                            key:
                                                key,

                                            name:
                                                server.name,

                                            worldId:
                                                server.worldId

                                        };

                                    }
                                )

                        }
                    );


                    return;

                }


                // ==================================================
                // 전체 랭킹
                // ==================================================

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

                            total:
                                ranking.length,

                            data:
                                ranking

                        }
                    );


                    return;

                }


                // ==================================================
                // 특정 서버 랭킹
                // ==================================================

                if (
                    requestUrl.pathname ===
                    "/api/ranking"
                ) {

                    const worldId =
                        requestUrl.searchParams.get(
                            "worldId"
                        );


                    if (
                        !worldId
                    ) {

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
                            (
                                [
                                    name,
                                    id
                                ]
                            ) => {

                                return (
                                    String(
                                        id
                                    ) ===
                                    String(
                                        worldId
                                    )
                                );

                            }
                        );


                    if (
                        !world
                    ) {

                        sendJson(
                            res,
                            404,
                            {

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
                            Number(
                                worldId
                            )
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

                                total_count:
                                    ranking.length,

                                resData:
                                    ranking

                            }

                        }
                    );


                    return;

                }


                // ==================================================
                // 거래소
                // ==================================================

                if (
                    requestUrl.pathname ===
                    "/api/auction"
                ) {

                    const itemName =
                        requestUrl.searchParams.get(
                            "itemname"
                        ) || "";


                    const serverKey =
                        requestUrl.searchParams.get(
                            "server"
                        ) || "newworld";


                    const auctionServer =
                        auctionServers[
                            serverKey
                        ];


                    if (
                        !auctionServer
                    ) {

                        sendJson(
                            res,
                            400,
                            {

                                error:
                                    "invalid auction server",

                                availableServers:
                                    Object.keys(
                                        auctionServers
                                    )

                            }
                        );


                        return;

                    }


                    console.log(
                        "========================================"
                    );


                    console.log(
                        "[AUCTION SEARCH]"
                    );


                    console.log(
                        "[SERVER KEY]",
                        serverKey
                    );


                    console.log(
                        "[SERVER NAME]",
                        auctionServer.name
                    );


                    console.log(
                        "[WORLD ID]",
                        auctionServer.worldId
                    );


                    console.log(
                        "[ITEM]",
                        itemName || "전체"
                    );


                    try {

                        const auction =
                            await requestAuction(
                                itemName,
                                auctionServer.worldId
                            );


                        const data =
                            extractAuctionArray(
                                auction
                            );


                        console.log(
                            "[AUCTION RESULT]",
                            auctionServer.name,
                            data.length
                        );


                        sendJson(
                            res,
                            200,
                            {

                                success:
                                    true,

                                server:
                                    auctionServer.name,

                                serverKey:
                                    serverKey,

                                worldId:
                                    auctionServer.worldId,

                                count:
                                    data.length,

                                data:
                                    data,

                                // 실제 API 원본도 같이 전달
                                raw:
                                    auction

                            }
                        );


                    } catch (
                        error
                    ) {

                        console.error(
                            "[AUCTION ERROR]",
                            error
                        );


                        sendJson(
                            res,
                            502,
                            {

                                success:
                                    false,

                                error:
                                    error.message,

                                server:
                                    auctionServer.name,

                                serverKey:
                                    serverKey,

                                worldId:
                                    auctionServer.worldId

                            }
                        );

                    }


                    return;

                }


                // ==================================================
                // 거래소 테스트
                // ==================================================

                if (
                    requestUrl.pathname ===
                    "/api/auction-test"
                ) {

                    const serverKey =
                        requestUrl.searchParams.get(
                            "server"
                        ) || "newworld";


                    const auctionServer =
                        auctionServers[
                            serverKey
                        ];


                    if (
                        !auctionServer
                    ) {

                        sendJson(
                            res,
                            400,
                            {

                                error:
                                    "invalid auction server"

                            }
                        );


                        return;

                    }


                    try {

                        const result =
                            await requestAuction(
                                "",
                                auctionServer.worldId
                            );


                        sendJson(
                            res,
                            200,
                            {

                                success:
                                    true,

                                server:
                                    auctionServer.name,

                                serverKey:
                                    serverKey,

                                worldId:
                                    auctionServer.worldId,

                                raw:
                                    result,

                                extracted:
                                    extractAuctionArray(
                                        result
                                    )

                            }
                        );


                    } catch (
                        error
                    ) {

                        sendJson(
                            res,
                            502,
                            {

                                success:
                                    false,

                                error:
                                    error.message,

                                server:
                                    auctionServer.name,

                                worldId:
                                    auctionServer.worldId

                            }
                        );

                    }


                    return;

                }


                // ==================================================
                // 날짜 목록
                // ==================================================

                if (
                    requestUrl.pathname ===
                    "/api/history-dates"
                ) {

                    sendJson(
                        res,
                        200,
                        {

                            dates:
                                getHistoryDates()

                        }
                    );


                    return;

                }


                // ==================================================
                // 과거 랭킹
                // ==================================================

                if (
                    requestUrl.pathname ===
                    "/api/history"
                ) {

                    const date =
                        requestUrl.searchParams.get(
                            "date"
                        );


                    if (
                        !date
                    ) {

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


                    if (
                        !history
                    ) {

                        sendJson(
                            res,
                            404,
                            {

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


                // ==================================================
                // 정적 파일
                // ==================================================

                serveStaticFile(
                    req,
                    res,
                    requestUrl
                );


            } catch (
                error
            ) {

                console.error(
                    "[SERVER ERROR]",
                    error
                );


                sendJson(
                    res,
                    500,
                    {

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
            "========================================"
        );


        console.log(
            "아스달 지지 SERVER STARTED"
        );


        console.log(
            "PORT:",
            PORT
        );


        console.log(
            "LOCAL:",
            "http://localhost:" +
            PORT
        );


        console.log(
            "========================================"
        );


        checkDailySave();

    }
);


// ============================================================
// 하루 1회 자동 저장
// ============================================================

let dailySaveRunning =
    false;


async function checkDailySave() {

    if (
        dailySaveRunning
    ) {

        return;

    }


    const today =
        getTodayDate();


    const filePath =
        getHistoryFile(
            today
        );


    if (
        fs.existsSync(
            filePath
        )
    ) {

        return;

    }


    dailySaveRunning =
        true;


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
                "[DAILY SAVE] 랭킹 데이터가 없어 저장하지 않음"
            );

        }


    } catch (
        error
    ) {

        console.error(
            "[DAILY SAVE ERROR]",
            error
        );


    } finally {

        dailySaveRunning =
            false;

    }

}


// ============================================================
// 1분마다 날짜 확인
// ============================================================

setInterval(
    () => {

        checkDailySave();

    },
    60 * 1000
);
```
