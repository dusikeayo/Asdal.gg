const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;

const ROW_PER_PAGE = 500;
const BATCH_SIZE = 3;


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
// 프론트에서 아래 key를 보내면 해당 worldId로 API 요청
//
// newworld -> 뉴월드
// krabon   -> 크라본
// global   -> 글로벌
// ============================================================

const auctionServers = {

    newworld: {
        key: "newworld",
        name: "뉴월드",
        worldId: 3000
    },

    krabon: {
        key: "krabon",
        name: "크라본",
        worldId: 70110
    },

    global: {
        key: "global",
        name: "글로벌",
        worldId: 1000
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
// 랭킹 API
// ============================================================

function requestRanking(
    worldId
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const apiUrl =
                "https://arthdal.netmarble.com/front-api/ranking" +
                "?lang=ko" +
                "&page=1" +
                "&row=" +
                ROW_PER_PAGE +
                "&type=power" +
                "&worldId=" +
                encodeURIComponent(
                    worldId
                ) +
                "&name=";


            console.log(
                "[RANKING API]",
                apiUrl
            );


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
                                response.statusCode !==
                                200
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
                                    JSON.parse(
                                        body
                                    );


                                resolve(
                                    json
                                );


                            } catch (
                                error
                            ) {

                                reject(
                                    new Error(
                                        "JSON parse error"
                                    )
                                );

                            }

                        }
                    );

                }
            ).on(
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
// 월드별 랭킹
// ============================================================

async function getWorldRanking(
    serverName,
    worldId
) {

    console.log(
        "================================"
    );

    console.log(
        "[WORLD] " +
        serverName +
        " START"
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
                "[STOP] " +
                serverName +
                " invalid data"
            );

            return [];

        }


        const players =
            response.resultData.resData;


        console.log(
            "[DATA] " +
            serverName +
            " " +
            players.length +
            "명"
        );


        console.log(
            "[TOTAL COUNT] " +
            serverName +
            " " +
            (
                response.resultData.total_count ||
                players.length
            )
        );


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


        const uniqueResults = [];

        const duplicateKeys =
            new Set();


        results.forEach(
            player => {

                const key =
                    String(
                        player.server ||
                        ""
                    ) +
                    "|" +
                    String(
                        player.name ||
                        ""
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

                player.rank =
                    index + 1;

                player.totalRank =
                    index + 1;

            }
        );


        console.log(
            "[WORLD] " +
            serverName +
            " DONE " +
            uniqueResults.length
        );


        return uniqueResults;


    } catch (
        error
    ) {

        console.error(
            "[ERROR] " +
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
            "================================"
        );


        console.log(
            "[BATCH] " +
            (
                i + 1
            ) +
            " ~ " +
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


    const uniqueResults = [];

    const duplicateKeys =
        new Set();


    results.forEach(
        player => {

            const key =
                String(
                    player.server ||
                    ""
                ) +
                "|" +
                String(
                    player.name ||
                    ""
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
        "================================"
    );


    console.log(
        "[ALL] TOTAL " +
        uniqueResults.length
    );


    return uniqueResults;

}


// ============================================================
// 거래소 API
// ============================================================

function requestAuction(
    itemName = "",
    worldId
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            if (
                worldId === undefined ||
                worldId === null
            ) {

                reject(
                    new Error(
                        "거래소 worldId가 없습니다."
                    )
                );

                return;

            }


            const categories =
                [
                    0,
                    3,
                    1,
                    2,
                    97,
                    110,
                    124,
                    130,
                    140,
                    6,
                    7,
                    8,
                    9,
                    10,
                    11,
                    5,
                    12,
                    15,
                    13,
                    14,
                    16,
                    117,
                    20,
                    21,
                    19,
                    22,
                    68,
                    69,
                    70,
                    71,
                    72,
                    78,
                    79,
                    80,
                    81,
                    82,
                    83,
                    84,
                    85,
                    86,
                    67,
                    63,
                    64,
                    58,
                    59,
                    60,
                    61,
                    55,
                    56,
                    96,
                    47,
                    48,
                    49,
                    50,
                    51,
                    52,
                    53,
                    54,
                    109,
                    26,
                    27,
                    29,
                    44,
                    45,
                    46,
                    35,
                    36,
                    33,
                    65
                ].join(",");


            const params = new URLSearchParams({

                worldId:
                    String(
                        worldId
                    ),

                lang:
                    "ko",

                page:
                    "1",

                row:
                    "50",

                reinforce_level_start:
                    "0",

                reinforce_level_end:
                    "20",

                tiers:
                    "0,1,2,3,4",

                categories:
                    categories,

                itemname:
                    itemName

            });


            const apiUrl =
                "https://arthdal.netmarble.com/front-api/auction?" +
                params.toString();


            console.log(
                "================================"
            );

            console.log(
                "[AUCTION REQUEST]"
            );

            console.log(
                "[AUCTION WORLD ID]",
                worldId
            );

            console.log(
                "[AUCTION ITEM]",
                itemName || "전체"
            );

            console.log(
                "[AUCTION API]",
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
                                "application/json",

                            "Referer":
                                "https://arthdal.netmarble.com/",

                            "Accept-Language":
                                "ko-KR,ko;q=0.9"

                        }
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

                                console.log(
                                    "[AUCTION HTTP]",
                                    response.statusCode,
                                    "WORLD",
                                    worldId
                                );


                                if (
                                    response.statusCode !==
                                    200
                                ) {

                                    reject(
                                        new Error(
                                            "Auction HTTP " +
                                            response.statusCode +
                                            " / worldId=" +
                                            worldId
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
                                        "[AUCTION JSON ERROR]",
                                        error.message
                                    );


                                    console.error(
                                        "[AUCTION BODY]",
                                        body.substring(
                                            0,
                                            1000
                                        )
                                    );


                                    reject(
                                        new Error(
                                            "Auction JSON parse error"
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

                    reject(
                        error
                    );

                }
            );

        }
    );

}


// ============================================================
// 거래소 서버 찾기
// ============================================================

function getAuctionServer(
    serverKey
) {

    if (
        !serverKey
    ) {

        return null;

    }


    const key =
        String(
            serverKey
        ).trim().toLowerCase();


    return (
        auctionServers[
            key
        ] || null
    );

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
                        "[SAVE] " +
                        today +
                        " " +
                        ranking.length +
                        "명"
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
            file =>
                file.endsWith(
                    ".json"
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
            (
                a,
                b
            ) =>
                b.localeCompare(
                    a
                )
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
        JSON.stringify(
            data
        )
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

                const requestUrl =
                    new URL(
                        req.url,
                        "http://" +
                        req.headers.host
                    );


                // ==================================================
                // CORS OPTIONS
                // ==================================================

                if (
                    req.method ===
                    "OPTIONS"
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
                                    String(id) ===
                                    String(worldId)
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
                                    "world not found"
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

                                resData:
                                    ranking

                            }
                        }
                    );


                    return;

                }


                // ==================================================
                // 거래소 서버 목록
                // ==================================================

                if (
                    requestUrl.pathname ===
                    "/api/auction-servers"
                ) {

                    sendJson(
                        res,
                        200,
                        {
                            data:
                                Object.values(
                                    auctionServers
                                ).map(
                                    server => {

                                        return {

                                            key:
                                                server.key,

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


                    /*
                     * 프론트에서 보내는 값:
                     *
                     * /api/auction?server=newworld
                     * /api/auction?server=krabon
                     * /api/auction?server=global
                     *
                     */

                    const serverKey =
                        requestUrl.searchParams.get(
                            "server"
                        ) || "newworld";


                    const auctionServer =
                        getAuctionServer(
                            serverKey
                        );


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
                                    Object.values(
                                        auctionServers
                                    ).map(
                                        server => {

                                            return {

                                                key:
                                                    server.key,

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


                    console.log(
                        "================================"
                    );


                    console.log(
                        "[AUCTION SEARCH]"
                    );


                    console.log(
                        "[AUCTION SERVER]",
                        auctionServer.name
                    );


                    console.log(
                        "[AUCTION KEY]",
                        auctionServer.key
                    );


                    console.log(
                        "[AUCTION WORLD ID]",
                        auctionServer.worldId
                    );


                    console.log(
                        "[AUCTION ITEM]",
                        itemName || "전체"
                    );


                    const auction =
                        await requestAuction(
                            itemName,
                            auctionServer.worldId
                        );


                    /*
                     * 아스달 API 응답 구조가
                     *
                     * resultData.resData
                     *
                     * 또는
                     *
                     * resData
                     *
                     * 중 하나인 경우 모두 처리
                     */

                    let auctionData = [];


                    if (
                        auction &&
                        auction.resultData &&
                        Array.isArray(
                            auction.resultData.resData
                        )
                    ) {

                        auctionData =
                            auction.resultData.resData;

                    } else if (
                        auction &&
                        Array.isArray(
                            auction.resData
                        )
                    ) {

                        auctionData =
                            auction.resData;

                    }


                    /*
                     * 각각의 거래소 데이터에
                     * 현재 선택한 서버 정보를 추가
                     *
                     * 프론트에서 서버를 확실하게
                     * 구분할 수 있도록 함.
                     */

                    auctionData =
                        auctionData.map(
                            item => {

                                return {

                                    ...item,

                                    auctionServer:
                                        auctionServer.name,

                                    auctionServerKey:
                                        auctionServer.key,

                                    auctionWorldId:
                                        auctionServer.worldId

                                };

                            }
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
                                auctionServer.key,

                            worldId:
                                auctionServer.worldId,

                            itemName:
                                itemName,

                            total:
                                auctionData.length,

                            data:
                                auctionData,

                            raw:
                                auction

                        }
                    );


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


                // ==================================================
                // 정적 파일
                // ==================================================

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


                // ==================================================
                // 경로 보안
                // ==================================================

                const normalizedFilePath =
                    path.normalize(
                        filePath
                    );


                const normalizedRoot =
                    path.normalize(
                        __dirname +
                        path.sep
                    );


                if (
                    !normalizedFilePath.startsWith(
                        normalizedRoot
                    ) &&
                    normalizedFilePath !==
                    path.normalize(
                        __dirname
                    )
                ) {

                    res.writeHead(
                        403
                    );

                    res.end(
                        "Forbidden"
                    );

                    return;

                }


                // ==================================================
                // 파일 확장자
                // ==================================================

                const ext =
                    path.extname(
                        normalizedFilePath
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

                    ".ico":
                        "image/x-icon",

                    ".svg":
                        "image/svg+xml",

                    ".webp":
                        "image/webp"

                };


                fs.readFile(
                    normalizedFilePath,
                    (
                        error,
                        content
                    ) => {

                        if (
                            error
                        ) {

                            res.writeHead(
                                404
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
                                    contentTypes[
                                        ext
                                    ] ||
                                    "application/octet-stream"
                            }
                        );


                        res.end(
                            content
                        );

                    }
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
            "================================"
        );

        console.log(
            "SERVER STARTED"
        );

        console.log(
            "PORT " +
            PORT
        );

        console.log(
            "http://localhost:" +
            PORT
        );

        console.log(
            "================================"
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
            "[DAILY SAVE] 오늘 랭킹 저장 시작"
        );


        const ranking =
            await getAllRanking();


        await saveDailyRanking(
            ranking
        );


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


setInterval(
    () => {

        checkDailySave();

    },
    60 * 1000
);
