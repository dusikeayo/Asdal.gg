const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);

const RANKING_ROW = 500;
const RANKING_MAX_PAGES = 20;
const BATCH_SIZE = 3;
const REQUEST_TIMEOUT = 15000;

// ============================================================
// 아스달 공식 API
// ============================================================

const API_HOST = "arthdal.netmarble.com";

const API_BASE =
"https://" +
API_HOST +
"/front-api";

// ============================================================
// 랭킹 서버
// ============================================================

const worlds = {

```
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
```

};

// ============================================================
// 거래소 서버
//
// 거래소 API도 공식 /front-api/auction 엔드포인트를 사용한다.
//
// 중요:
// 거래소의 worldId는 랭킹 worldId와 반드시 같은 의미라고
// 가정하지 않는다.
// 아래 값은 현재 사이트에서 사용 중인 거래소 그룹 ID를
// 별도로 관리한다.
// ============================================================

const auctionServers = {

```
"newworld": {
    key: "newworld",
    name: "뉴월드",
    worldId: 3000
},

"global": {
    key: "global",
    name: "글로벌",
    worldId: 1000
},

"krabon": {
    key: "krabon",
    name: "크라본",
    worldId: 70110
}
```

};

// ============================================================
// 데이터 폴더
// ============================================================

const DATA_DIR =
path.join(
__dirname,
"data"
);

if (!fs.existsSync(DATA_DIR)) {

```
fs.mkdirSync(
    DATA_DIR,
    {
        recursive: true
    }
);
```

}

// ============================================================
// 공통
// ============================================================

function sleep(ms) {

```
return new Promise(
    resolve => setTimeout(
        resolve,
        ms
    )
);
```

}

function getTodayDate() {

```
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
```

}

function getHistoryFile(date) {

```
return path.join(
    DATA_DIR,
    date + ".json"
);
```

}

function toNumber(value) {

```
if (
    value === null ||
    value === undefined ||
    value === ""
) {

    return 0;

}


if (
    typeof value === "number"
) {

    return Number.isFinite(
        value
    )
        ? value
        : 0;

}


const cleaned =
    String(value)
        .replace(
            /,/g,
            ""
        )
        .replace(
            /[^0-9.-]/g,
            ""
        );


const number =
    Number(
        cleaned
    );


return Number.isFinite(
    number
)
    ? number
    : 0;
```

}

// ============================================================
// HTTPS 요청
// ============================================================

function requestJson(
url,
options = {}
) {

```
return new Promise(
    (resolve, reject) => {

        const request =
            https.get(
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

                    timeout:
                        options.timeout ||
                        REQUEST_TIMEOUT

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

                            const status =
                                Number(
                                    response.statusCode
                                ) || 0;


                            if (
                                status < 200 ||
                                status >= 300
                            ) {

                                reject(
                                    new Error(
                                        "HTTP " +
                                        status +
                                        " / " +
                                        url +
                                        "\n" +
                                        body.substring(
                                            0,
                                            500
                                        )
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
                                        "JSON parse error / HTTP " +
                                        status +
                                        "\n" +
                                        body.substring(
                                            0,
                                            500
                                        )
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
```

}

// ============================================================
// 랭킹 API 1페이지
// ============================================================

async function requestRankingPage(
worldId,
page
) {

```
const params =
    new URLSearchParams();


params.set(
    "lang",
    "ko"
);


params.set(
    "page",
    String(page)
);


params.set(
    "row",
    String(RANKING_ROW)
);


params.set(
    "type",
    "power"
);


params.set(
    "worldId",
    String(worldId)
);


params.set(
    "name",
    ""
);


const apiUrl =
    API_BASE +
    "/ranking?" +
    params.toString();


console.log(
    "[RANKING API]",
    apiUrl
);


return requestJson(
    apiUrl
);
```

}

// ============================================================
// 랭킹 데이터 배열 추출
// ============================================================

function extractRankingData(
response
) {

```
if (
    !response
) {

    return [];

}


if (
    response.resultData &&
    Array.isArray(
        response.resultData.resData
    )
) {

    return response.resultData.resData;

}


if (
    Array.isArray(
        response.resData
    )
) {

    return response.resData;

}


if (
    Array.isArray(
        response.data
    )
) {

    return response.data;

}


if (
    response.resultData &&
    Array.isArray(
        response.resultData.data
    )
) {

    return response.resultData.data;

}


return [];
```

}

// ============================================================
// 월드 전체 랭킹
//
// 공식 API가 page/row 구조를 사용하므로 1페이지 하나만
// 가져오지 않고 total_count를 확인해서 필요한 페이지를
// 반복해서 가져온다.
// ============================================================

async function getWorldRanking(
serverName,
worldId
) {

```
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


        if (
            !response
        ) {

            break;

        }


        const players =
            extractRankingData(
                response
            );


        if (
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


        if (
            players.length === 0
        ) {

            break;

        }


        for (
            const player of players
        ) {

            results.push({

                ...player,

                server:
                    serverName,

                worldId:
                    Number(
                        worldId
                    )

            });

        }


        if (
            players.length < RANKING_ROW
        ) {

            break;

        }


        if (
            totalCount > 0 &&
            results.length >= totalCount
        ) {

            break;

        }


        await sleep(
            150
        );

    }


    // ----------------------------------------------------
    // 서버 내부 중복 제거
    // ----------------------------------------------------

    const uniqueResults = [];

    const duplicateKeys =
        new Set();


    for (
        const player of results
    ) {

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

            continue;

        }


        duplicateKeys.add(
            key
        );


        uniqueResults.push(
            player
        );

    }


    // ----------------------------------------------------
    // 전투력 순 정렬
    // ----------------------------------------------------

    uniqueResults.sort(
        (a, b) => {

            return (
                toNumber(
                    b.power
                ) -
                toNumber(
                    a.power
                )
            );

        }
    );


    // ----------------------------------------------------
    // 서버 내부 순위
    // ----------------------------------------------------

    uniqueResults.forEach(
        (player, index) => {

            player.rank =
                index + 1;

        }
    );


    console.log(
        "[WORLD DONE]",
        serverName,
        uniqueResults.length,
        "명"
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
```

}

// ============================================================
// 전체 랭킹
// ============================================================

async function getAllRanking() {

```
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
                ([serverName, worldId]) => {

                    return getWorldRanking(
                        serverName,
                        worldId
                    );

                }
            )
        );


    for (
        const serverData of batchResults
    ) {

        results =
            results.concat(
                serverData
            );

    }


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


for (
    const player of results
) {

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

        continue;

    }


    duplicateKeys.add(
        key
    );


    uniqueResults.push(
        player
    );

}


// --------------------------------------------------------
// 전체 전투력 순
// --------------------------------------------------------

uniqueResults.sort(
    (a, b) => {

        return (
            toNumber(
                b.power
            ) -
            toNumber(
                a.power
            )
        );

    }
);


// --------------------------------------------------------
// 전체 순위
// --------------------------------------------------------

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
```

}

// ============================================================
// 거래소 API
// ============================================================

function buildAuctionUrl(
itemName,
worldId
) {

```
const params =
    new URLSearchParams();


params.set(
    "worldId",
    String(worldId)
);


params.set(
    "lang",
    "ko"
);


params.set(
    "page",
    "1"
);


params.set(
    "row",
    "50"
);


params.set(
    "reinforce_level_start",
    "0"
);


params.set(
    "reinforce_level_end",
    "20"
);


params.set(
    "tiers",
    "0,1,2,3,4"
);


params.set(
    "categories",
    "0,3,1,2,97,110,124,130,140,6,7,8,9,10,11,5,12,15,13,14,16,117,20,21,19,22,68,69,70,71,72,78,79,80,81,82,83,84,85,86,67,63,64,58,59,60,61,55,56,96,47,48,49,50,51,52,53,54,109,26,27,29,44,45,46,35,36,33,65"
);


params.set(
    "itemname",
    itemName || ""
);


return (
    API_BASE +
    "/auction?" +
    params.toString()
);
```

}

// ============================================================
// 거래소 데이터 배열 찾기
//
// 실제 API 응답 구조가 변경되더라도 가능한 배열 위치를
// 여러 곳에서 찾도록 구성.
// ============================================================

function findAuctionArray(
object
) {

```
if (
    Array.isArray(
        object
    )
) {

    return object;

}


if (
    !object ||
    typeof object !== "object"
) {

    return [];

}


const directPaths = [

    ["resultData", "resData"],
    ["resultData", "data"],
    ["resData"],
    ["data"],
    ["items"],
    ["list"],
    ["auctionList"],
    ["result"]

];


for (
    const pathParts of directPaths
) {

    let value =
        object;


    for (
        const part of pathParts
    ) {

        if (
            value &&
            typeof value === "object"
        ) {

            value =
                value[part];

        } else {

            value =
                null;

            break;

        }

    }


    if (
        Array.isArray(
            value
        )
    ) {

        return value;

    }

}


return [];
```

}

// ============================================================
// 거래소 원본 데이터에서 상품명 추출
// ============================================================

function getAuctionItemName(
item
) {

```
return (
    item.item_name ??
    item.itemName ??
    item.name ??
    item.item_nm ??
    item.product_name ??
    item.productName ??
    "-"
);
```

}

// ============================================================
// 거래소 가격 추출
// ============================================================

function getAuctionPrice(
item
) {

```
return toNumber(
    item.price ??
    item.sell_price ??
    item.sellPrice ??
    item.sale_price ??
    item.salePrice ??
    item.unit_price ??
    item.unitPrice ??
    item.lowest_price ??
    item.lowestPrice ??
    item.min_price ??
    item.minPrice
);
```

}

// ============================================================
// 거래소 수량 추출
// ============================================================

function getAuctionQuantity(
item
) {

```
return toNumber(
    item.quantity ??
    item.qty ??
    item.count ??
    item.amount ??
    item.stock ??
    item.registered_count ??
    item.registeredCount ??
    item.current_count ??
    item.currentCount
);
```

}

// ============================================================
// 거래소 상품 요약
//
// 프론트에서 사용하는
// 최저가 / 평균가 / 최고가 / 거래량 / 등록량
// 형태로 변환한다.
// ============================================================

function normalizeAuctionItems(
items,
serverInfo
) {

```
const grouped =
    new Map();


for (
    const raw of items
) {

    if (
        !raw ||
        typeof raw !== "object"
    ) {

        continue;

    }


    const name =
        String(
            getAuctionItemName(
                raw
            )
        );


    if (
        !name ||
        name === "-"
    ) {

        continue;

    }


    const price =
        getAuctionPrice(
            raw
        );


    const quantity =
        getAuctionQuantity(
            raw
        );


    const tier =
        raw.tier_name ??
        raw.tierName ??
        raw.tier ??
        raw.grade ??
        raw.grade_name ??
        raw.gradeName ??
        "-";


    const quality =
        raw.quality ??
        raw.quality_name ??
        raw.qualityName ??
        "-";


    if (
        !grouped.has(
            name
        )
    ) {

        grouped.set(
            name,
            {
                item_name:
                    name,

                tier_name:
                    tier,

                quality:
                    quality,

                prices:
                    [],

                quantity:
                    0,

                raw:
                    []

            }
        );

    }


    const group =
        grouped.get(
            name
        );


    if (
        price > 0
    ) {

        group.prices.push(
            price
        );

    }


    group.quantity +=
        quantity;


    if (
        group.raw.length < 10
    ) {

        group.raw.push(
            raw
        );

    }

}


const result = [];


for (
    const group of grouped.values()
) {

    const prices =
        group.prices.sort(
            (a, b) =>
                a - b
        );


    const lowest =
        prices.length > 0
            ? prices[0]
            : 0;


    const highest =
        prices.length > 0
            ? prices[
                prices.length - 1
            ]
            : 0;


    const average =
        prices.length > 0
            ? Math.round(
                prices.reduce(
                    (
                        total,
                        value
                    ) =>
                        total + value,
                    0
                ) /
                prices.length
            )
            : 0;


    result.push({

        item_name:
            group.item_name,

        tier_name:
            group.tier_name,

        quality:
            group.quality,

        lowest_price:
            lowest,

        average_price:
            average,

        highest_price:
            highest,

        trade_count:
            prices.length,

        current_count:
            group.quantity,

        server:
            serverInfo.name,

        worldId:
            serverInfo.worldId,

        raw:
            group.raw

    });

}


result.sort(
    (a, b) => {

        return (
            toNumber(
                a.lowest_price
            ) -
            toNumber(
                b.lowest_price
            )
        );

    }
);


return result;
```

}

// ============================================================
// 거래소 요청
// ============================================================

async function getAuction(
serverKey,
itemName = ""
) {

```
const serverInfo =
    auctionServers[
        serverKey
    ];


if (
    !serverInfo
) {

    throw new Error(
        "Invalid auction server: " +
        serverKey
    );

}


const apiUrl =
    buildAuctionUrl(
        itemName,
        serverInfo.worldId
    );


console.log(
    "================================"
);


console.log(
    "[AUCTION SERVER]",
    serverInfo.name
);


console.log(
    "[AUCTION WORLD ID]",
    serverInfo.worldId
);


console.log(
    "[AUCTION ITEM]",
    itemName || "전체"
);


console.log(
    "[AUCTION API]",
    apiUrl
);


const response =
    await requestJson(
        apiUrl
    );


const items =
    findAuctionArray(
        response
    );


console.log(
    "[AUCTION RESULT]",
    serverInfo.name,
    items.length,
    "개"
);


const normalized =
    normalizeAuctionItems(
        items,
        serverInfo
    );


return {

    server:
        serverInfo.name,

    serverKey:
        serverInfo.key,

    worldId:
        serverInfo.worldId,

    count:
        normalized.length,

    data:
        normalized,

    rawData:
        items,

    raw:
        response

};
```

}

// ============================================================
// 일일 랭킹 저장
// ============================================================

function saveDailyRanking(
ranking
) {

```
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
                    ranking.length,
                    "명"
                );


                resolve(
                    true
                );

            }
        );

    }
);
```

}

// ============================================================
// 과거 날짜
// ============================================================

function getHistoryDates() {

```
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
        (
            a,
            b
        ) =>
            b.localeCompare(
                a
            )
    );
```

}

// ============================================================
// 과거 랭킹
// ============================================================

function getHistoryRanking(
date
) {

```
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

    return JSON.parse(
        fs.readFileSync(
            filePath,
            "utf8"
        )
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
```

}

// ============================================================
// JSON 응답
// ============================================================

function sendJson(
res,
statusCode,
data
) {

```
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
```

}

// ============================================================
// OPTIONS
// ============================================================

function handleOptions(
req,
res
) {

```
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
```

}

// ============================================================
// 정적 파일
// ============================================================

function serveStatic(
req,
res,
requestUrl
) {

```
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
        403
    );


    res.end(
        "Forbidden"
    );


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
```

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

```
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


            // ==================================================
            // 상태 확인
            // ==================================================

            if (
                requestUrl.pathname ===
                "/api/status"
            ) {

                sendJson(
                    res,
                    200,
                    {

                        success:
                            true,

                        server:
                            "아스달 지지",

                        apiHost:
                            API_HOST,

                        rankingEndpoint:
                            API_BASE +
                            "/ranking",

                        auctionEndpoint:
                            API_BASE +
                            "/auction",

                        rankingServers:
                            worlds,

                        auctionServers:
                            auctionServers,

                        time:
                            new Date().toISOString()

                    }
                );


                return;

            }


            // ==================================================
            // 랭킹 - 전체
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

                        success:
                            true,

                        total:
                            ranking.length,

                        data:
                            ranking

                    }
                );


                return;

            }


            // ==================================================
            // 랭킹 - 특정 서버
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
                            success:
                                false,

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
                        ) =>
                            String(
                                id
                            ) ===
                            String(
                                worldId
                            )
                    );


                if (
                    !world
                ) {

                    sendJson(
                        res,
                        404,
                        {
                            success:
                                false,

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

                        success:
                            true,

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

                        success:
                            true,

                        servers:
                            Object.values(
                                auctionServers
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

                const serverKey =
                    (
                        requestUrl.searchParams.get(
                            "server"
                        ) ||
                        "newworld"
                    ).toLowerCase();


                const itemName =
                    requestUrl.searchParams.get(
                        "itemname"
                    ) ||
                    "";


                const serverInfo =
                    auctionServers[
                        serverKey
                    ];


                if (
                    !serverInfo
                ) {

                    sendJson(
                        res,
                        400,
                        {

                            success:
                                false,

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


                try {

                    const auction =
                        await getAuction(
                            serverKey,
                            itemName
                        );


                    sendJson(
                        res,
                        200,
                        {

                            success:
                                true,

                            server:
                                auction.server,

                            serverKey:
                                auction.serverKey,

                            worldId:
                                auction.worldId,

                            count:
                                auction.count,

                            data:
                                auction.data,

                            rawData:
                                auction.rawData,

                            raw:
                                auction.raw

                        }
                    );


                } catch (
                    error
                ) {

                    console.error(
                        "[AUCTION ERROR]",
                        serverInfo.name,
                        error
                    );


                    sendJson(
                        res,
                        502,
                        {

                            success:
                                false,

                            error:
                                "공식 거래소 API 요청 실패",

                            message:
                                error.message,

                            server:
                                serverInfo.name,

                            worldId:
                                serverInfo.worldId

                        }
                    );

                }


                return;

            }


            // ==================================================
            // 과거 날짜
            // ==================================================

            if (
                requestUrl.pathname ===
                "/api/history-dates"
            ) {

                sendJson(
                    res,
                    200,
                    {

                        success:
                            true,

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
                            success:
                                false,

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
                            success:
                                false,

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

            serveStatic(
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

                    success:
                        false,

                    error:
                        error.message ||
                        "server error"

                }
            );

        }

    }
);
```

// ============================================================
// 서버 시작
// ============================================================

server.listen(
PORT,
"0.0.0.0",
() => {

```
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
        "AUCTION API:",
        API_BASE +
        "/auction"
    );

    console.log(
        "================================"
    );


    checkDailySave();

}
```

);

// ============================================================
// 하루 1회 자동 저장
// ============================================================

let dailySaveRunning =
false;

async function checkDailySave() {

```
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
            "[DAILY SAVE] 랭킹 0명이라 저장하지 않음"
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
```

}

setInterval(
() => {

```
    checkDailySave();

},
60 * 1000
```

);
