const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const url = require("url");


// ======================================================
// 기본 설정
// ======================================================

const PORT = process.env.PORT || 3000;

const ROW_PER_PAGE = 500;

const BATCH_SIZE = 3;

const DATA_DIR =
    path.join(__dirname, "data");


// ======================================================
// 아스달 서버
// ======================================================

const WORLDS = {

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


const WORLD_IDS = Object.fromEntries(
    Object.entries(WORLDS).map(
        ([name, id]) => [
            String(id),
            name
        ]
    )
);


// ======================================================
// 공통 함수
// ======================================================

function numberValue(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return 0;
    }

    const number =
        Number(
            String(value)
                .replace(/,/g, "")
        );

    return Number.isFinite(number)
        ? number
        : 0;
}


function normalizeText(value) {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();

}


function safeFileName(value) {

    return String(value)
        .replace(/[^0-9\-]/g, "");

}


function getWorldName(worldId) {

    return (
        WORLD_IDS[
            String(worldId)
        ] || ""
    );

}


function getWorldId(serverName) {

    return (
        WORLDS[
            String(serverName || "")
        ] || ""
    );

}


function sendJson(res, data, statusCode = 200) {

    const body =
        JSON.stringify(data);


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


    res.end(body);

}


function sendText(
    res,
    text,
    statusCode = 200
) {

    res.writeHead(
        statusCode,
        {
            "Content-Type":
                "text/plain; charset=utf-8"
        }
    );


    res.end(text);

}


// ======================================================
// 정적 파일
// ======================================================

const MIME_TYPES = {

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

    ".gif":
        "image/gif",

    ".svg":
        "image/svg+xml",

    ".ico":
        "image/x-icon"

};


function serveStaticFile(
    req,
    res,
    pathname
) {

    let filePath =
        pathname === "/"
            ? path.join(
                __dirname,
                "index.html"
            )
            : path.join(
                __dirname,
                pathname
            );


    filePath =
        path.normalize(
            filePath
        );


    if (
        !filePath.startsWith(
            path.normalize(
                __dirname
            )
        )
    ) {

        sendText(
            res,
            "Forbidden",
            403
        );

        return;
    }


    fs.readFile(
        filePath,
        function (error, data) {

            if (error) {

                sendText(
                    res,
                    "Not Found",
                    404
                );

                return;
            }


            const ext =
                path.extname(
                    filePath
                )
                .toLowerCase();


            res.writeHead(
                200,
                {
                    "Content-Type":
                        MIME_TYPES[ext] ||
                        "application/octet-stream"
                }
            );


            res.end(data);

        }
    );

}


// ======================================================
// Netmarble API
// ======================================================

function requestJson(
    targetUrl
) {

    return new Promise(
        function (resolve, reject) {

            const parsed =
                new URL(targetUrl);


            const request =
                https.get(
                    {
                        hostname:
                            parsed.hostname,

                        path:
                            parsed.pathname +
                            parsed.search,

                        headers: {
                            "User-Agent":
                                "Mozilla/5.0",

                            "Accept":
                                "application/json"
                        }
                    },

                    function (response) {

                        let body = "";


                        response.on(
                            "data",
                            function (chunk) {

                                body +=
                                    chunk.toString();

                            }
                        );


                        response.on(
                            "end",
                            function () {

                                if (
                                    response.statusCode <
                                        200 ||
                                    response.statusCode >=
                                        300
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

                                    resolve(
                                        JSON.parse(
                                            body
                                        )
                                    );

                                } catch (
                                    error
                                ) {

                                    reject(
                                        error
                                    );

                                }

                            }
                        );

                    }
                );


            request.on(
                "error",
                reject
            );


            request.setTimeout(
                15000,
                function () {

                    request.destroy();

                    reject(
                        new Error(
                            "API timeout"
                        )
                    );

                }
            );

        }
    );

}


// ======================================================
// Netmarble 서버 랭킹
// ======================================================

async function getWorldRanking(
    worldId
) {

    const targetUrl =
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


    const result =
        await requestJson(
            targetUrl
        );


    const resultData =
        result.resultData ||
        result.data ||
        {};


    const rows =
        resultData.resData ||
        resultData.data ||
        result.resData ||
        [];


    const totalCount =
        numberValue(
            resultData.total_count ||
            resultData.totalCount ||
            result.total_count
        );


    const serverName =
        getWorldName(
            worldId
        );


    if (
        !Array.isArray(rows)
    ) {

        return [];

    }


    return rows.map(
        function (player, index) {

            return {

                rank:
                    numberValue(
                        player.rank
                    ) ||
                    index + 1,

                name:
                    player.name || "",

                level:
                    numberValue(
                        player.level
                    ),

                power:
                    numberValue(
                        player.power
                    ),

                main_job:
                    player.main_job ||
                    "",

                guild_name:
                    player.guild_name ||
                    player.guildName ||
                    "",

                server:
                    serverName,

                worldId:
                    String(worldId),

                /*
                 * totalRank는 실제 순위가 아니라
                 * 해당 서버의 전체 랭킹 인원 수.
                 */
                totalRank:
                    totalCount ||
                    rows.length

            };

        }
    );

}


// ======================================================
// 전체 서버 랭킹
// ======================================================

async function getAllRanking() {

    const worldEntries =
        Object.entries(
            WORLDS
        );


    const result = [];


    for (
        let i = 0;
        i < worldEntries.length;
        i += BATCH_SIZE
    ) {

        const batch =
            worldEntries.slice(
                i,
                i + BATCH_SIZE
            );


        const batchResult =
            await Promise.all(
                batch.map(
                    async function (
                        [serverName, worldId]
                    ) {

                        try {

                            return await getWorldRanking(
                                worldId
                            );

                        } catch (
                            error
                        ) {

                            console.error(
                                "랭킹 오류:",
                                serverName,
                                error.message
                            );

                            return [];

                        }

                    }
                )
            );


        batchResult.forEach(
            function (rows) {

                result.push(
                    ...rows
                );

            }
        );

    }


    /*
     * 전체 서버 전투력 기준 정렬
     */

    result.sort(
        function (a, b) {

            if (
                b.power !== a.power
            ) {

                return (
                    b.power -
                    a.power
                );

            }


            return (
                b.level -
                a.level
            );

        }
    );


    /*
     * 전체 서버 순위는
     * 여기서 새롭게 부여.
     */

    result.forEach(
        function (player, index) {

            player.rank =
                index + 1;

        }
    );


    return result;

}


// ======================================================
// 과거 데이터 읽기
// ======================================================

function getHistoryDates() {

    if (
        !fs.existsSync(
            DATA_DIR
        )
    ) {

        return [];

    }


    return fs.readdirSync(
        DATA_DIR
    )
        .filter(
            function (fileName) {

                return (
                    /^\d{4}-\d{2}-\d{2}\.json$/
                        .test(
                            fileName
                        )
                );

            }
        )
        .map(
            function (fileName) {

                return fileName
                    .replace(
                        ".json",
                        ""
                    );

            }
        )
        .sort();

}


function normalizeHistoryRows(
    raw
) {

    /*
     * 과거 JSON 형식이
     *
     * [ ... ]
     *
     * 또는
     *
     * { data: [...] }
     *
     * 둘 중 어느 것이든 처리.
     */

    if (
        Array.isArray(raw)
    ) {

        return raw;

    }


    if (
        raw &&
        Array.isArray(raw.data)
    ) {

        return raw.data;

    }


    if (
        raw &&
        raw.resultData &&
        Array.isArray(
            raw.resultData.resData
        )
    ) {

        return raw.resultData.resData;

    }


    return [];

}


function readHistoryDate(
    date
) {

    const fileName =
        safeFileName(
            date
        ) +
        ".json";


    const filePath =
        path.join(
            DATA_DIR,
            fileName
        );


    if (
        !fs.existsSync(
            filePath
        )
    ) {

        return [];

    }


    try {

        const raw =
            JSON.parse(
                fs.readFileSync(
                    filePath,
                    "utf8"
                )
            );


        return normalizeHistoryRows(
            raw
        )
            .map(
                function (
                    player,
                    index
                ) {

                    const server =
                        player.server ||
                        getWorldName(
                            player.worldId
                        );


                    return {

                        rank:
                            numberValue(
                                player.rank
                            ) ||
                            index + 1,

                        name:
                            player.name ||
                            "",

                        level:
                            numberValue(
                                player.level
                            ),

                        power:
                            numberValue(
                                player.power
                            ),

                        main_job:
                            player.main_job ||
                            "",

                        guild_name:
                            player.guild_name ||
                            player.guildName ||
                            "",

                        server:
                            server,

                        worldId:
                            String(
                                player.worldId ||
                                getWorldId(
                                    server
                                ) ||
                                ""
                            ),

                        totalRank:
                            numberValue(
                                player.totalRank
                            )

                    };

                }
            );

    } catch (
        error
    ) {

        console.error(
            "히스토리 읽기 오류:",
            date,
            error.message
        );


        return [];

    }

}


// ======================================================
// 전체 과거 데이터
// ======================================================

function loadAllHistory() {

    const dates =
        getHistoryDates();


    const result = [];


    dates.forEach(
        function (date) {

            const rows =
                readHistoryDate(
                    date
                );


            rows.forEach(
                function (player) {

                    result.push({

                        ...player,

                        date

                    });

                }
            );

        }
    );


    return {
        dates,
        rows: result
    };

}


// ======================================================
// 플레이어 비교용 점수
// ======================================================

function clamp(
    value,
    min,
    max
) {

    return Math.max(
        min,
        Math.min(
            max,
            value
        )
    );

}


/*
 * 두 기록이 같은 캐릭터일 가능성을 계산한다.
 *
 * 핵심:
 *
 * 같은 닉네임이라고 무조건 같은 사람이 아니다.
 *
 * 서버 / 연맹 / 직업 / 레벨 / 전투력 / 순위 등의
 * 연속성을 종합해서 점수를 만든다.
 */

function calculateIdentityScore(
    current,
    previous,
    options = {}
) {

    if (
        !current ||
        !previous
    ) {

        return {
            score: -999,
            reasons: []
        };

    }


    let score = 0;

    const reasons = [];


    const sameName =
        normalizeText(
            current.name
        ) ===
        normalizeText(
            previous.name
        );


    const sameServer =
        String(
            current.worldId || ""
        ) ===
        String(
            previous.worldId || ""
        );


    const sameGuild =
        normalizeText(
            current.guild_name
        ) ===
        normalizeText(
            previous.guild_name
        );


    const sameJob =
        normalizeText(
            current.main_job
        ) ===
        normalizeText(
            previous.main_job
        );


    const currentLevel =
        numberValue(
            current.level
        );


    const previousLevel =
        numberValue(
            previous.level
        );


    const levelDifference =
        Math.abs(
            currentLevel -
            previousLevel
        );


    const currentPower =
        numberValue(
            current.power
        );


    const previousPower =
        numberValue(
            previous.power
        );


    const powerDifference =
        Math.abs(
            currentPower -
            previousPower
        );


    const powerPercent =
        previousPower > 0
            ? powerDifference /
              previousPower
            : 999;


    const currentRank =
        numberValue(
            current.rank
        );


    const previousRank =
        numberValue(
            previous.rank
        );


    const rankDifference =
        Math.abs(
            currentRank -
            previousRank
        );


    // ------------------------------------------
    // 닉네임
    // ------------------------------------------

    if (sameName) {

        score += 45;

        reasons.push(
            "동일 닉네임 +45"
        );

    } else {

        /*
         * 닉네임 변경은 가능하지만
         * 동일 닉네임보다 훨씬 낮게 시작한다.
         */

        score += 0;

        reasons.push(
            "닉네임 변경 후보"
        );

    }


    // ------------------------------------------
    // 서버
    // ------------------------------------------

    if (sameServer) {

        score += 12;

        reasons.push(
            "동일 서버 +12"
        );

    } else {

        /*
         * 서버가 달라졌다고 감점하지 않는다.
         *
         * 서버 이전을 추적해야 하기 때문.
         */

        score += 0;

    }


    // ------------------------------------------
    // 연맹
    // ------------------------------------------

    if (
        current.guild_name &&
        previous.guild_name &&
        sameGuild
    ) {

        score += 14;

        reasons.push(
            "동일 연맹 +14"
        );

    }


    // ------------------------------------------
    // 직업
    // ------------------------------------------

    if (
        current.main_job &&
        previous.main_job &&
        sameJob
    ) {

        score += 12;

        reasons.push(
            "동일 직업 +12"
        );

    }


    // ------------------------------------------
    // 레벨
    // ------------------------------------------

    if (
        levelDifference === 0
    ) {

        score += 8;

        reasons.push(
            "레벨 동일 +8"
        );

    } else if (
        levelDifference <= 1
    ) {

        score += 8;

        reasons.push(
            "레벨 차이 1 +8"
        );

    } else if (
        levelDifference <= 3
    ) {

        score += 6;

        reasons.push(
            "레벨 차이 2~3 +6"
        );

    } else if (
        levelDifference <= 5
    ) {

        score += 3;

        reasons.push(
            "레벨 차이 4~5 +3"
        );

    } else if (
        levelDifference <= 10
    ) {

        score -= 5;

        reasons.push(
            "레벨 차이 큼 -5"
        );

    } else {

        score -= 20;

        reasons.push(
            "레벨 차이 매우 큼 -20"
        );

    }


    // ------------------------------------------
    // 전투력
    // ------------------------------------------

    if (
        powerDifference === 0
    ) {

        score += 8;

        reasons.push(
            "전투력 동일 +8"
        );

    } else if (
        powerPercent <= 0.03
    ) {

        score += 8;

        reasons.push(
            "전투력 변화 3% 이내 +8"
        );

    } else if (
        powerPercent <= 0.10
    ) {

        score += 6;

        reasons.push(
            "전투력 변화 10% 이내 +6"
        );

    } else if (
        powerPercent <= 0.25
    ) {

        score += 3;

        reasons.push(
            "전투력 변화 25% 이내 +3"
        );

    } else if (
        powerPercent <= 0.50
    ) {

        score -= 5;

        reasons.push(
            "전투력 변화 큼 -5"
        );

    } else {

        score -= 12;

        reasons.push(
            "전투력 변화 매우 큼 -12"
        );

    }


    // ------------------------------------------
    // 순위
    // ------------------------------------------

    if (
        currentRank > 0 &&
        previousRank > 0
    ) {

        if (
            rankDifference <= 10
        ) {

            score += 5;

        } else if (
            rankDifference <= 100
        ) {

            score += 3;

        } else if (
            rankDifference <= 1000
        ) {

            score += 1;

        } else if (
            rankDifference <= 5000
        ) {

            score -= 2;

        } else {

            score -= 5;

        }

    }


    // ------------------------------------------
    // 서버 이전 보정
    // ------------------------------------------

    if (
        !sameServer &&
        sameJob &&
        levelDifference <= 3 &&
        powerPercent <= 0.25
    ) {

        score += 8;

        reasons.push(
            "서버 이전 가능성 +8"
        );

    }


    // ------------------------------------------
    // 연맹 변경 보정
    // ------------------------------------------

    if (
        !sameGuild &&
        sameJob &&
        levelDifference <= 3 &&
        powerPercent <= 0.25
    ) {

        score += 6;

        reasons.push(
            "연맹 변경 가능성 +6"
        );

    }


    // ------------------------------------------
    // 닉네임 변경 보정
    // ------------------------------------------

    if (
        !sameName &&
        sameJob &&
        levelDifference <= 2 &&
        powerPercent <= 0.15
    ) {

        score += 15;

        reasons.push(
            "닉네임 변경 강한 후보 +15"
        );

    }


    return {

        score: Math.round(
            score
        ),

        reasons

    };

}


// ======================================================
// 후보 생성
// ======================================================

function getCandidatesForDate(
    rows,
    target,
    allowNicknameChange = true
) {

    const targetName =
        normalizeText(
            target.name
        );


    const candidates = [];


    rows.forEach(
        function (player) {

            const candidateName =
                normalizeText(
                    player.name
                );


            /*
             * 1순위:
             * 동일 닉네임
             */

            if (
                candidateName ===
                targetName
            ) {

                candidates.push({
                    player,
                    type: "same-name"
                });

                return;
            }


            /*
             * 2순위:
             * 닉네임 변경 후보
             *
             * 모든 캐릭터를 무조건 후보로 넣으면
             * 잘못된 연결 가능성이 너무 높기 때문에
             * 직업 / 레벨 / 전투력 기준으로
             * 1차 필터링한다.
             */

            if (
                allowNicknameChange
            ) {

                const score =
                    calculateIdentityScore(
                        target,
                        player
                    );


                if (
                    score.score >= 55
                ) {

                    candidates.push({
                        player,
                        type: "nickname-change"
                    });

                }

            }

        }
    );


    return candidates;

}


// ======================================================
// 날짜별 최적 후보 선택
// ======================================================

function chooseBestCandidate(
    currentRecord,
    previousRows,
    options = {}
) {

    const candidates =
        getCandidatesForDate(
            previousRows,
            currentRecord,
            options.allowNicknameChange !== false
        );


    if (
        candidates.length === 0
    ) {

        return null;

    }


    const scored =
        candidates.map(
            function (candidate) {

                const identity =
                    calculateIdentityScore(
                        currentRecord,
                        candidate.player
                    );


                let finalScore =
                    identity.score;


                /*
                 * 동일 닉네임을 기본적으로 우선한다.
                 */

                if (
                    candidate.type ===
                    "same-name"
                ) {

                    finalScore += 15;

                }


                /*
                 * 닉네임 변경 후보는
                 * 훨씬 높은 점수를 요구한다.
                 */

                if (
                    candidate.type ===
                    "nickname-change"
                ) {

                    finalScore -= 15;

                }


                return {

                    ...candidate,

                    score:
                        finalScore,

                    reasons:
                        identity.reasons

                };

            }
        );


    scored.sort(
        function (a, b) {

            return (
                b.score -
                a.score
            );

        }
    );


    const best =
        scored[0];


    const second =
        scored[1];


    /*
     * 동명이인이 있을 때
     * 점수 차이가 충분하지 않으면
     * 억지로 선택하지 않는다.
     */

    if (
        second &&
        best.type ===
            "same-name" &&
        best.score -
            second.score <
            5
    ) {

        /*
         * 그래도 서버/직업/레벨/전투력이
         * 명확하게 맞는 경우는 허용.
         */

        const bestIdentity =
            calculateIdentityScore(
                currentRecord,
                best.player
            );


        if (
            bestIdentity.score <
            65
        ) {

            return null;

        }

    }


    /*
     * 동일 닉네임 후보는
     * 최소 점수 50 이상.
     */

    if (
        best.type ===
            "same-name" &&
        best.score < 50
    ) {

        return null;

    }


    /*
     * 닉네임 변경 후보는
     * 최소 70점 이상만 허용.
     */

    if (
        best.type ===
            "nickname-change" &&
        best.score < 70
    ) {

        return null;

    }


    return best;

}


// ======================================================
// 플레이어 기록 추적
// ======================================================

function trackPlayer(
    currentPlayer
) {

    const allHistory =
        loadAllHistory();


    const dates =
        allHistory.dates;


    /*
     * 날짜별 데이터를 빠르게 사용하기 위해
     * Map 생성.
     */

    const rowsByDate =
        new Map();


    dates.forEach(
        function (date) {

            rowsByDate.set(
                date,
                readHistoryDate(
                    date
                )
            );

        }
    );


    /*
     * 가장 최근 기록부터 거꾸로 연결한다.
     *
     * 현재 캐릭터
     * ↓
     * 9월 14일
     * ↓
     * 9월 13일
     * ↓
     * ...
     * ↓
     * 8월 21일
     */

    let current =
        {
            ...currentPlayer
        };


    const history = [];


    const selectedCandidates = [];


    /*
     * 현재 API 기록을 기준점으로 넣는다.
     */

    history.push({

        date: "현재",

        ...current

    });


    /*
     * 가장 최신 과거 날짜부터 검색.
     */

    for (
        let dateIndex =
            dates.length - 1;

        dateIndex >= 0;

        dateIndex--
    ) {

        const date =
            dates[dateIndex];


        const rows =
            rowsByDate.get(
                date
            ) || [];


        /*
         * 같은 날짜의 동일 캐릭터가
         * 현재와 중복되는 것을 막는다.
         *
         * 현재와 바로 전날/최근 기록을
         * 연결하는 것은 허용.
         */

        const best =
            chooseBestCandidate(
                current,
                rows,
                {
                    allowNicknameChange:
                        true
                }
            );


        if (!best) {

            continue;

        }


        const selected =
            {
                ...best.player,

                date

            };


        /*
         * 이미 같은 날짜가 들어갔다면
         * 중복 방지.
         */

        if (
            history.some(
                function (item) {

                    return (
                        item.date ===
                        date
                    );

                }
            )
        ) {

            continue;

        }


        history.push(
            selected
        );


        selectedCandidates.push({

            date,

            score:
                best.score,

            type:
                best.type,

            name:
                best.player.name,

            server:
                best.player.server,

            worldId:
                best.player.worldId,

            level:
                best.player.level,

            power:
                best.player.power,

            rank:
                best.player.rank,

            guild_name:
                best.player.guild_name,

            reasons:
                best.reasons

        });


        /*
         * 다음 날짜를 찾을 때는
         * 방금 선택된 과거 기록을 기준으로 한다.
         *
         * 이것이 중요하다.
         *
         * 현재와 8월 기록을 직접 비교하는 것이 아니라
         *
         * 현재
         * ↓
         * 9/14
         * ↓
         * 8/21
         *
         * 식으로 체인을 만든다.
         */

        current =
            {
                ...best.player
            };

    }


    /*
     * 오래된 날짜 → 최신 날짜 순으로
     * 다시 정렬.
     */

    history.sort(
        function (a, b) {

            if (
                a.date === "현재"
            ) {
                return -1;
            }


            if (
                b.date === "현재"
            ) {
                return 1;
            }


            return (
                b.date.localeCompare(
                    a.date
                )
            );

        }
    );


    // ==================================================
    // 변화 기록 계산
    // ==================================================

    const serverMoves = [];

    const guildMoves = [];

    const nicknameChanges = [];


    for (
        let i = 0;

        i <
        history.length - 1;

        i++
    ) {

        const current =
            history[i];

        const previous =
            history[i + 1];


        /*
         * 서버 이동
         */

        if (
            current.server &&
            previous.server &&
            current.server !==
                previous.server
        ) {

            const identity =
                calculateIdentityScore(
                    current,
                    previous
                );


            serverMoves.push({

                date:
                    current.date,

                from:
                    previous.server,

                to:
                    current.server,

                fromWorldId:
                    previous.worldId,

                toWorldId:
                    current.worldId,

                score:
                    identity.score

            });

        }


        /*
         * 연맹 변경
         */

        const currentGuild =
            current.guild_name ||
            "";

        const previousGuild =
            previous.guild_name ||
            "";


        if (
            currentGuild !==
                previousGuild
        ) {

            guildMoves.push({

                date:
                    current.date,

                from:
                    previousGuild ||
                    "(없음)",

                to:
                    currentGuild ||
                    "(없음)",

                server:
                    current.server || ""

            });

        }


        /*
         * 닉네임 변경
         */

        if (
            normalizeText(
                current.name
            ) !==
            normalizeText(
                previous.name
            )
        ) {

            const identity =
                calculateIdentityScore(
                    current,
                    previous
                );


            /*
             * 실제 닉네임 변경으로 판단된
             * 경우만 기록.
             */

            if (
                identity.score >= 65
            ) {

                nicknameChanges.push({

                    date:
                        current.date,

                    from:
                        previous.name,

                    to:
                        current.name,

                    score:
                        identity.score

                });

            }

        }

    }


    /*
     * 추적 신뢰도 계산
     */

    let trackingConfidence =
        0;


    if (
        selectedCandidates.length > 0
    ) {

        const scores =
            selectedCandidates.map(
                function (item) {

                    return item.score;

                }
            );


        const average =
            scores.reduce(
                function (sum, value) {

                    return (
                        sum +
                        value
                    );

                },
                0
            ) /
            scores.length;


        trackingConfidence =
            Math.round(
                clamp(
                    average,
                    0,
                    100
                )
            );

    }


    let trackingConfidenceLevel =
        "낮음";


    if (
        trackingConfidence >= 85
    ) {

        trackingConfidenceLevel =
            "매우 높음";

    } else if (
        trackingConfidence >= 70
    ) {

        trackingConfidenceLevel =
            "높음";

    } else if (
        trackingConfidence >= 55
    ) {

        trackingConfidenceLevel =
            "보통";

    }


    const trackingReasons = [];


    if (
        history.length > 1
    ) {

        trackingReasons.push(
            `과거 ${history.length - 1}개 기록 연결`
        );

    }


    if (
        serverMoves.length > 0
    ) {

        trackingReasons.push(
            `서버 이동 ${serverMoves.length}회`
        );

    }


    if (
        guildMoves.length > 0
    ) {

        trackingReasons.push(
            `연맹 변경 ${guildMoves.length}회`
        );

    }


    if (
        nicknameChanges.length > 0
    ) {

        trackingReasons.push(
            `닉네임 변경 ${nicknameChanges.length}회`
        );

    }


    return {

        found:
            history.length > 0,

        history,

        moves:
            serverMoves,

        guildMoves,

        nicknameChanges,

        trackingConfidence,

        trackingConfidenceLevel,

        trackingReasons,

        selectedCandidates

    };

}


// ======================================================
// 동명이인 후보 조회
// ======================================================

function getPlayerCandidates(
    currentPlayer
) {

    const {
        rows
    } =
        loadAllHistory();


    const candidates = [];


    rows.forEach(
        function (record) {

            if (
                normalizeText(
                    record.name
                ) !==
                normalizeText(
                    currentPlayer.name
                )
            ) {

                return;

            }


            const score =
                calculateIdentityScore(
                    currentPlayer,
                    record
                );


            candidates.push({

                ...record,

                trackingScore:
                    score.score,

                trackingReasons:
                    score.reasons

            });

        }
    );


    /*
     * 날짜 + 서버 + 닉네임 기준 중복 제거
     */

    const unique =
        new Map();


    candidates.forEach(
        function (candidate) {

            const key =
                [
                    candidate.date,
                    candidate.server,
                    candidate.name
                ].join("|");


            if (
                !unique.has(key)
            ) {

                unique.set(
                    key,
                    candidate
                );

            }

        }
    );


    const result =
        Array.from(
            unique.values()
        );


    /*
     * 같은 서버 / 같은 직업 / 비슷한 레벨과
     * 전투력에 가까운 후보가 위로 오도록.
     */

    result.sort(
        function (a, b) {

            return (
                b.trackingScore -
                a.trackingScore
            );

        }
    );


    /*
     * 후보 캐릭터별 요약
     */

    const groups =
        new Map();


    result.forEach(
        function (candidate) {

            const key =
                [
                    candidate.server,
                    candidate.name,
                    candidate.main_job
                ].join("|");


            if (
                !groups.has(key)
            ) {

                groups.set(
                    key,
                    {

                        name:
                            candidate.name,

                        server:
                            candidate.server,

                        worldId:
                            candidate.worldId,

                        main_job:
                            candidate.main_job,

                        level:
                            candidate.level,

                        power:
                            candidate.power,

                        rank:
                            candidate.rank,

                        trackingScore:
                            candidate.trackingScore,

                        historyLength:
                            0

                    }
                );

            }


            groups.get(
                key
            ).historyLength++;

        }
    );


    return Array.from(
        groups.values()
    )
        .sort(
            function (a, b) {

                return (
                    b.trackingScore -
                    a.trackingScore
                );

            }
        );

}


// ======================================================
// 현재 날짜 기록 생성
// ======================================================

function makeHistoryRecord(
    player
) {

    return {

        date:
            player.date ||
            "",

        name:
            player.name ||
            "",

        server:
            player.server ||
            "",

        worldId:
            player.worldId ||
            "",

        level:
            numberValue(
                player.level
            ),

        power:
            numberValue(
                player.power
            ),

        rank:
            numberValue(
                player.rank
            ),

        totalRank:
            numberValue(
                player.totalRank
            ),

        main_job:
            player.main_job ||
            "",

        guild_name:
            player.guild_name ||
            player.guildName ||
            ""

    };

}


// ======================================================
// API 서버
// ======================================================

const server =
    http.createServer(
        async function (
            req,
            res
        ) {

            try {

                const parsedUrl =
                    url.parse(
                        req.url,
                        true
                    );


                const pathname =
                    parsedUrl.pathname;


                const query =
                    parsedUrl.query;


                // ======================================
                // 전체 랭킹
                // ======================================

                if (
                    pathname ===
                    "/api/all-ranking"
                ) {

                    const ranking =
                        await getAllRanking();


                    sendJson(
                        res,
                        {
                            resultCode: 200,
                            data: ranking,
                            total:
                                ranking.length
                        }
                    );


                    return;

                }


                // ======================================
                // 특정 서버 랭킹
                // ======================================

                if (
                    pathname ===
                    "/api/ranking"
                ) {

                    const worldId =
                        String(
                            query.worldId ||
                            ""
                        );


                    if (
                        !worldId ||
                        !WORLD_IDS[worldId]
                    ) {

                        sendJson(
                            res,
                            {
                                resultCode: 400,
                                message:
                                    "worldId가 필요합니다."
                            },
                            400
                        );

                        return;

                    }


                    const ranking =
                        await getWorldRanking(
                            worldId
                        );


                    sendJson(
                        res,
                        {
                            resultCode: 200,
                            data: ranking,
                            total:
                                ranking.length
                        }
                    );


                    return;

                }


                // ======================================
                // 과거 날짜 목록
                // ======================================

                if (
                    pathname ===
                    "/api/history-dates"
                ) {

                    const dates =
                        getHistoryDates();


                    sendJson(
                        res,
                        {
                            resultCode: 200,
                            dates
                        }
                    );


                    return;

                }


                // ======================================
                // 특정 날짜 랭킹
                // ======================================

                if (
                    pathname ===
                    "/api/history"
                ) {

                    const date =
                        String(
                            query.date ||
                            ""
                        );


                    if (
                        !/^\d{4}-\d{2}-\d{2}$/
                            .test(
                                date
                            )
                    ) {

                        sendJson(
                            res,
                            {
                                resultCode: 400,
                                message:
                                    "올바른 날짜가 필요합니다."
                            },
                            400
                        );

                        return;

                    }


                    const data =
                        readHistoryDate(
                            date
                        );


                    sendJson(
                        res,
                        {
                            resultCode: 200,
                            date,
                            data,
                            total:
                                data.length
                        }
                    );


                    return;

                }


                // ======================================
                // 플레이어 추적
                // ======================================

                if (
                    pathname ===
                    "/api/tracking"
                ) {

                    const name =
                        String(
                            query.name ||
                            ""
                        ).trim();


                    const serverName =
                        String(
                            query.server ||
                            ""
                        ).trim();


                    const worldId =
                        String(
                            query.worldId ||
                            ""
                        ).trim();


                    if (!name) {

                        sendJson(
                            res,
                            {
                                resultCode: 400,
                                found: false,
                                message:
                                    "닉네임이 필요합니다."
                            },
                            400
                        );

                        return;

                    }


                    /*
                     * 현재 API에서 최신 플레이어 정보를
                     * 가져온다.
                     *
                     * 서버가 넘어온 경우 해당 서버를 우선.
                     */

                    let currentPlayer =
                        null;


                    if (
                        worldId &&
                        WORLD_IDS[worldId]
                    ) {

                        const ranking =
                            await getWorldRanking(
                                worldId
                            );


                        currentPlayer =
                            ranking.find(
                                function (
                                    player
                                ) {

                                    return (
                                        normalizeText(
                                            player.name
                                        ) ===
                                        normalizeText(
                                            name
                                        )
                                    );

                                }
                            ) ||
                            null;

                    }


                    /*
                     * worldId가 없거나
                     * 해당 서버에서 찾지 못한 경우
                     * 전체 랭킹에서 찾는다.
                     */

                    if (
                        !currentPlayer
                    ) {

                        const ranking =
                            await getAllRanking();


                        currentPlayer =
                            ranking.find(
                                function (
                                    player
                                ) {

                                    const nameMatch =
                                        normalizeText(
                                            player.name
                                        ) ===
                                        normalizeText(
                                            name
                                        );


                                    const serverMatch =
                                        !serverName ||
                                        player.server ===
                                            serverName;


                                    return (
                                        nameMatch &&
                                        serverMatch
                                    );

                                }
                            ) ||
                            null;

                    }


                    /*
                     * 그래도 못 찾으면
                     * 이름만으로 전체 랭킹에서 검색.
                     */

                    if (
                        !currentPlayer
                    ) {

                        const ranking =
                            await getAllRanking();


                        currentPlayer =
                            ranking.find(
                                function (
                                    player
                                ) {

                                    return (
                                        normalizeText(
                                            player.name
                                        ) ===
                                        normalizeText(
                                            name
                                        )
                                    );

                                }
                            ) ||
                            null;

                    }


                    if (
                        !currentPlayer
                    ) {

                        sendJson(
                            res,
                            {
                                resultCode: 200,
                                found: false,
                                name
                            }
                        );

                        return;

                    }


                    /*
                     * 현재 플레이어의 기록 추적.
                     */

                    const tracking =
                        trackPlayer(
                            currentPlayer
                        );


                    /*
                     * 동명이인 후보도 함께 제공.
                     */

                    const candidates =
                        getPlayerCandidates(
                            currentPlayer
                        );


                    sendJson(
                        res,
                        {
                            resultCode: 200,

                            found: true,

                            current:
                                makeHistoryRecord(
                                    {
                                        ...currentPlayer,
                                        date:
                                            "현재"
                                    }
                                ),

                            history:
                                tracking.history,

                            moves:
                                tracking.moves,

                            guildMoves:
                                tracking.guildMoves,

                            nicknameChanges:
                                tracking.nicknameChanges,

                            candidates,

                            trackingConfidence:
                                tracking.trackingConfidence,

                            trackingConfidenceLevel:
                                tracking.trackingConfidenceLevel,

                            trackingReasons:
                                tracking.trackingReasons,

                            selectedCandidates:
                                tracking.selectedCandidates

                        }
                    );


                    return;

                }


                // ======================================
                // 일반 정적 파일
                // ======================================

                serveStaticFile(
                    req,
                    res,
                    pathname
                );


            } catch (
                error
            ) {

                console.error(
                    "SERVER ERROR:",
                    error
                );


                sendJson(
                    res,
                    {
                        resultCode: 500,
                        message:
                            error.message ||
                            "서버 오류"
                    },
                    500
                );

            }

        }
    );


// ======================================================
// 서버 시작
// ======================================================

server.listen(
    PORT,
    function () {

        console.log(
            "SERVER STARTED"
        );

        console.log(
            "PORT",
            PORT
        );

        console.log(
            "http://localhost:" +
            PORT
        );

    }
);
