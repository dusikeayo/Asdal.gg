const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = 3000;


// ==============================
// 아스달 월드 목록
// ==============================

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


// ==============================
// 과거 랭킹 저장 폴더
// ==============================

const DATA_DIR =
    path.join(__dirname, "data");


if (!fs.existsSync(DATA_DIR)) {

    fs.mkdirSync(DATA_DIR, {
        recursive: true
    });

    console.log(
        "data 폴더 생성 완료"
    );
}


// ==============================
// 오늘 날짜
// ==============================

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


// ==============================
// 과거 랭킹 파일 경로
// ==============================

function getHistoryFile(date) {

    return path.join(
        DATA_DIR,
        date + ".json"
    );

}


// ==============================
// 아스달 공식 API 요청
// ==============================

function getRanking(worldId, page = 1) {

    return new Promise(function(resolve, reject) {

        const apiUrl =
            "https://arthdal.netmarble.com/front-api/ranking" +
            "?lang=ko" +
            "&page=" + page +
            "&row=50" +
            "&type=power" +
            "&worldId=" + worldId +
            "&name=";


        https.get(
            apiUrl,
            function(apiRes) {

                let data = "";


                apiRes.on(
                    "data",
                    function(chunk) {

                        data += chunk;

                    }
                );


                apiRes.on(
                    "end",
                    function() {

                        try {

                            const json =
                                JSON.parse(data);

                            resolve(json);

                        } catch (error) {

                            reject(error);

                        }

                    }
                );

            }
        ).on(
            "error",
            function(error) {

                reject(error);

            }
        );

    });

}


// ==============================
// 서버 하나의 전체 랭킹
// 최대 500명
// ==============================

async function getWorldRanking(
    serverName,
    worldId
) {

    const results = [];


    for (
        let page = 1;
        page <= 10;
        page++
    ) {

        try {

            console.log(
                "[" +
                serverName +
                "] " +
                page +
                "/10 페이지 요청 중..."
            );


            const data =
                await getRanking(
                    worldId,
                    page
                );


            if (
                !data.resultData ||
                !data.resultData.resData
            ) {

                console.log(
                    "[" +
                    serverName +
                    "] " +
                    page +
                    "페이지 데이터 없음"
                );

                break;

            }


            const players =
                data.resultData.resData;


            players.forEach(
                function(player) {

                    results.push({

                        ...player,

                        server:
                            serverName,

                        worldId:
                            worldId

                    });

                }
            );


            if (
                players.length < 50
            ) {

                break;

            }


        } catch (error) {

            console.error(
                "[" +
                serverName +
                "] " +
                page +
                "페이지 요청 실패",
                error
            );

            break;

        }

    }


    // ==============================
    // 같은 서버 중복 제거
    // ==============================

    const uniqueResults = [];

    const duplicateKeys =
        new Set();


    results.forEach(
        function(player) {

            const key =
                String(
                    player.name || ""
                ) +
                "|" +
                String(
                    player.main_job || ""
                ) +
                "|" +
                String(
                    player.level || ""
                ) +
                "|" +
                String(
                    player.power || ""
                );


            if (
                duplicateKeys.has(key)
            ) {

                console.log(
                    "[" +
                    serverName +
                    "] 중복 제거: " +
                    player.name
                );

                return;

            }


            duplicateKeys.add(key);

            uniqueResults.push(
                player
            );

        }
    );


    console.log(
        "[" +
        serverName +
        "] 총 " +
        uniqueResults.length +
        "명 완료"
    );


    return uniqueResults;

}


// ==============================
// 전체 서버 랭킹
// ==============================

async function getAllRanking() {

    let results = [];


    const worldEntries =
        Object.entries(worlds);


    const batchSize = 3;


    for (
        let i = 0;
        i < worldEntries.length;
        i += batchSize
    ) {

        const batch =
            worldEntries.slice(
                i,
                i + batchSize
            );


        console.log("");

        console.log(
            "=============================="
        );


        console.log(
            "서버 " +
            (i + 1) +
            " ~ " +
            Math.min(
                i + batchSize,
                worldEntries.length
            ) +
            " 요청 시작"
        );


        console.log(
            "=============================="
        );


        const batchResults =
            await Promise.all(

                batch.map(
                    function([
                        serverName,
                        worldId
                    ]) {

                        return getWorldRanking(
                            serverName,
                            worldId
                        );

                    }
                )

            );


        batchResults.forEach(
            function(serverData) {

                results =
                    results.concat(
                        serverData
                    );

            }
        );

    }


    // ==============================
    // 전체 서버 중복 제거
    // ==============================

    const uniqueResults = [];

    const duplicateKeys =
        new Set();


    results.forEach(
        function(player) {

            const key =
                String(
                    player.server || ""
                ) +
                "|" +
                String(
                    player.name || ""
                ) +
                "|" +
                String(
                    player.main_job || ""
                ) +
                "|" +
                String(
                    player.level || ""
                ) +
                "|" +
                String(
                    player.power || ""
                );


            if (
                duplicateKeys.has(key)
            ) {

                console.log(
                    "전체 랭킹 중복 제거: " +
                    player.name +
                    " (" +
                    player.server +
                    ")"
                );

                return;

            }


            duplicateKeys.add(key);

            uniqueResults.push(
                player
            );

        }
    );


    results =
        uniqueResults;


    // ==============================
    // 전투력 높은 순
    // ==============================

    results.sort(
        function(a, b) {

            return (
                (Number(b.power) || 0) -
                (Number(a.power) || 0)
            );

        }
    );


    // ==============================
    // 전체 통합 순위
    // ==============================

    results.forEach(
        function(player, index) {

            player.totalRank =
                index + 1;

        }
    );


    console.log("");

    console.log(
        "=============================="
    );


    console.log(
        "전체 서버 랭킹 완료 : " +
        results.length +
        "명"
    );


    console.log(
        "=============================="
    );


    return results;

}


// ==============================
// 하루 1회 랭킹 저장
// ==============================

function saveDailyRanking(ranking) {

    return new Promise(
        function(resolve, reject) {

            const today =
                getTodayDate();


            const filePath =
                getHistoryFile(today);


            // 오늘 이미 저장되어 있으면 종료
            if (
                fs.existsSync(filePath)
            ) {

                console.log(
                    "[" +
                    today +
                    "] 이미 저장된 랭킹입니다."
                );

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
                function(error) {

                    if (error) {

                        console.error(
                            "랭킹 저장 실패:",
                            error
                        );

                        reject(error);

                        return;

                    }


                    console.log("");

                    console.log(
                        "=============================="
                    );


                    console.log(
                        "과거 랭킹 저장 완료"
                    );


                    console.log(
                        "날짜 : " +
                        today
                    );


                    console.log(
                        "인원 : " +
                        ranking.length +
                        "명"
                    );


                    console.log(
                        "=============================="
                    );


                    resolve(true);

                }
            );

        }
    );

}


// ==============================
// 자동 하루 1회 저장
// ==============================

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


    // 오늘 이미 저장되어 있으면 아무것도 안 함
    if (
        fs.existsSync(filePath)
    ) {

        return;

    }


    dailySaveRunning = true;


    try {

        console.log("");

        console.log(
            "=============================="
        );

        console.log(
            "오늘의 랭킹 자동 저장 시작"
        );

        console.log(
            "날짜 : " +
            today
        );

        console.log(
            "=============================="
        );


        const ranking =
            await getAllRanking();


        await saveDailyRanking(
            ranking
        );


    } catch (error) {

        console.error(
            "오늘의 랭킹 자동 저장 실패:",
            error
        );


    } finally {

        dailySaveRunning =
            false;

    }

}


// ==============================
// 저장된 날짜 목록
// ==============================

function getHistoryDates() {

    if (
        !fs.existsSync(DATA_DIR)
    ) {

        return [];

    }


    return fs.readdirSync(
        DATA_DIR
    )

    .filter(
        function(file) {

            return (
                file.endsWith(".json")
            );

        }
    )

    .map(
        function(file) {

            return file.replace(
                ".json",
                ""
            );

        }
    )

    .sort(
        function(a, b) {

            return b.localeCompare(a);

        }
    );

}


// ==============================
// 특정 날짜 랭킹 가져오기
// ==============================

function getHistoryRanking(date) {

    // 날짜 형식 검사
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

        const file =
            fs.readFileSync(
                filePath,
                "utf8"
            );


        return JSON.parse(file);


    } catch (error) {

        console.error(
            "과거 랭킹 파일 읽기 실패:",
            error
        );


        return null;

    }

}


// ==============================
// HTTP 서버
// ==============================

const server =
    http.createServer(
        async function(req, res) {

            const url =
                new URL(
                    req.url,
                    "http://" +
                    req.headers.host
                );


            // ==========================
            // 전체 서버 API
            // ==========================

            if (
                url.pathname ===
                "/api/all-ranking"
            ) {

                try {

                    const ranking =
                        await getAllRanking();


                    // 오늘 날짜 저장
                    await saveDailyRanking(
                        ranking
                    );


                    res.writeHead(
                        200,
                        {

                            "Content-Type":
                                "application/json; charset=utf-8",

                            "Access-Control-Allow-Origin":
                                "*"

                        }
                    );


                    res.end(
                        JSON.stringify({

                            total:
                                ranking.length,

                            data:
                                ranking

                        })
                    );


                } catch (error) {

                    console.error(
                        "전체 랭킹 오류:",
                        error
                    );


                    res.writeHead(
                        500,
                        {

                            "Content-Type":
                                "application/json; charset=utf-8",

                            "Access-Control-Allow-Origin":
                                "*"

                        }
                    );


                    res.end(
                        JSON.stringify({

                            error:
                                "전체 랭킹을 가져오지 못했습니다."

                        })
                    );

                }


                return;

            }


            // ==========================
            // 과거 날짜 목록 API
            // ==========================

            if (
                url.pathname ===
                "/api/history-dates"
            ) {

                const dates =
                    getHistoryDates();


                res.writeHead(
                    200,
                    {

                        "Content-Type":
                            "application/json; charset=utf-8",

                        "Access-Control-Allow-Origin":
                            "*"

                    }
                );


                res.end(
                    JSON.stringify({

                        dates:
                            dates

                    })
                );


                return;

            }


            // ==========================
            // 과거 랭킹 API
            // ==========================

            if (
                url.pathname ===
                "/api/history"
            ) {

                const date =
                    url.searchParams.get(
                        "date"
                    );


                if (!date) {

                    res.writeHead(
                        400,
                        {

                            "Content-Type":
                                "application/json; charset=utf-8",

                            "Access-Control-Allow-Origin":
                                "*"

                        }
                    );


                    res.end(
                        JSON.stringify({

                            error:
                                "날짜가 필요합니다."

                        })
                    );


                    return;

                }


                const history =
                    getHistoryRanking(
                        date
                    );


                if (!history) {

                    res.writeHead(
                        404,
                        {

                            "Content-Type":
                                "application/json; charset=utf-8",

                            "Access-Control-Allow-Origin":
                                "*"

                        }
                    );


                    res.end(
                        JSON.stringify({

                            error:
                                "해당 날짜의 랭킹 데이터가 없습니다."

                        })
                    );


                    return;

                }


                res.writeHead(
                    200,
                    {

                        "Content-Type":
                            "application/json; charset=utf-8",

                        "Access-Control-Allow-Origin":
                            "*"

                    }
                );


                res.end(
                    JSON.stringify(
                        history
                    )
                );


                return;

            }


            // ==========================
            // 개별 서버 API
            // ==========================

            if (
                url.pathname ===
                "/api/ranking"
            ) {

                const worldId =
                    url.searchParams.get(
                        "worldId"
                    );


                if (!worldId) {

                    res.writeHead(
                        400,
                        {

                            "Content-Type":
                                "application/json; charset=utf-8"

                        }
                    );


                    res.end(
                        JSON.stringify({

                            error:
                                "worldId가 필요합니다."

                        })
                    );


                    return;

                }


                try {

                    const world =
                        Object.entries(worlds)
                            .find(
                                function([
                                    serverName,
                                    id
                                ]) {

                                    return (
                                        String(id) ===
                                        String(worldId)
                                    );

                                }
                            );


                    const serverName =
                        world
                            ? world[0]
                            : "알 수 없는 서버";


                    const ranking =
                        await getWorldRanking(
                            serverName,
                            Number(worldId)
                        );


                    res.writeHead(
                        200,
                        {

                            "Content-Type":
                                "application/json; charset=utf-8",

                            "Access-Control-Allow-Origin":
                                "*"

                        }
                    );


                    res.end(
                        JSON.stringify({

                            resultData: {

                                resCode:
                                    0,

                                errorMessage:
                                    "Success",

                                resData:
                                    ranking

                            }

                        })
                    );


                } catch (error) {

                    console.error(
                        "개별 서버 랭킹 오류:",
                        error
                    );


                    res.writeHead(
                        500,
                        {

                            "Content-Type":
                                "application/json; charset=utf-8",

                            "Access-Control-Allow-Origin":
                                "*"

                        }
                    );


                    res.end(
                        JSON.stringify({

                            error:
                                "랭킹 데이터를 가져오지 못했습니다."

                        })
                    );

                }


                return;

            }


            // ==========================
            // 홈페이지 파일
            // ==========================

            let filePath =
                url.pathname === "/"
                    ? path.join(
                        __dirname,
                        "index.html"
                    )
                    : path.join(
                        __dirname,
                        url.pathname
                    );


            const ext =
                path.extname(
                    filePath
                );


            const contentTypes = {

                ".html":
                    "text/html; charset=utf-8",

                ".js":
                    "text/javascript; charset=utf-8",

                ".css":
                    "text/css; charset=utf-8",

                ".png":
                    "image/png",

                ".jpg":
                    "image/jpeg",

                ".jpeg":
                    "image/jpeg",

                ".ico":
                    "image/x-icon"

            };


            fs.readFile(
                filePath,
                function(
                    error,
                    content
                ) {

                    if (error) {

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
                                contentTypes[ext] ||
                                "application/octet-stream"

                        }
                    );


                    res.end(
                        content
                    );

                }
            );

        }
    );


// ==============================
// 서버 실행
// ==============================

server.listen(
    PORT,
    function() {

        console.log("");

        console.log(
            "================================"
        );

        console.log(
            "      아스달 지지 서버 실행"
        );

        console.log(
            "================================"
        );

        console.log(
            "http://localhost:" +
            PORT
        );

        console.log("");

        // 서버 시작 시 오늘 데이터가 없으면 저장
        checkDailySave();

    }
);


// ==============================
// 하루 1회 자동 저장 확인
// 1분마다 날짜 확인
// ==============================

setInterval(
    function() {

        checkDailySave();

    },
    60 * 1000
);