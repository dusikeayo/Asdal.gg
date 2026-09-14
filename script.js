const rankingBody = document.getElementById("rankingBody");
const serverFilter = document.getElementById("serverFilter");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const sortFilter = document.getElementById("sortFilter");

let historyFilter = document.getElementById("historyFilter");
let rankingStatus = document.getElementById("rankingStatus");


// ==============================
// 기본 요소 확인
// ==============================

if (
    !rankingBody ||
    !serverFilter ||
    !searchInput ||
    !searchButton ||
    !sortFilter
) {
    console.error("필수 HTML 요소를 찾을 수 없습니다.");
}


// ==============================
// 과거 날짜 선택창 자동 생성
// ==============================

if (!historyFilter) {

    historyFilter = document.createElement("select");
    historyFilter.id = "historyFilter";

    historyFilter.innerHTML = `
        <option value="current">현재 랭킹</option>
    `;

    const searchBox =
        document.querySelector(".search-box");

    if (searchBox) {
        searchBox.appendChild(historyFilter);
    }
}


// ==============================
// 랭킹 상태 표시 자동 생성
// ==============================

if (!rankingStatus) {

    rankingStatus = document.createElement("div");
    rankingStatus.id = "rankingStatus";

    rankingStatus.style.margin = "15px 0";
    rankingStatus.style.color = "#aaa";

    const rankingSection =
        document.querySelector(".ranking");

    if (rankingSection) {

        const title =
            rankingSection.querySelector("h2");

        if (title) {
            title.insertAdjacentElement(
                "afterend",
                rankingStatus
            );
        } else {
            rankingSection.prepend(
                rankingStatus
            );
        }
    }
}


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
// 현재 데이터
// ==============================

let currentData = [];

let currentHistoryDate = "current";

let historyCache = {};


// ==============================
// 서버 선택창 만들기
// ==============================

serverFilter.innerHTML = "";

const allOption =
    document.createElement("option");

allOption.value = "all";
allOption.textContent = "전체 서버";

serverFilter.appendChild(
    allOption
);


Object.entries(worlds).forEach(
    function ([serverName, worldId]) {

        const option =
            document.createElement("option");

        option.value = worldId;
        option.textContent = serverName;

        serverFilter.appendChild(
            option
        );

    }
);


// ==============================
// 서버 이름 찾기
// ==============================

function getServerName(worldId) {

    return Object.keys(worlds).find(
        function (name) {

            return (
                String(worlds[name]) ===
                String(worldId)
            );

        }
    ) || "";

}


// ==============================
// 숫자 표시
// ==============================

function formatNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "-";
    }

    const number =
        Number(
            String(value).replace(/,/g, "")
        );

    if (Number.isNaN(number)) {
        return "-";
    }

    return number.toLocaleString();
}


// ==============================
// 변화량 표시
// ==============================

function formatChange(value) {

    const number =
        Number(value) || 0;

    if (number > 0) {

        return `
            <span class="history-up">
                ▲ ${formatNumber(number)}
            </span>
        `;
    }

    if (number < 0) {

        return `
            <span class="history-down">
                ▼ ${formatNumber(Math.abs(number))}
            </span>
        `;
    }

    return `
        <span class="history-same">
            - 0
        </span>
    `;
}


// ==============================
// HTML 안전 처리
// ==============================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ==============================
// 순위 가져오기
// ==============================

/*
 * 중요:
 *
 * rank = 실제 순위
 * totalRank = 전체 인원 수
 *
 * 따라서 화면의 "순위"에는
 * totalRank를 사용하면 안 된다.
 */

function getPlayerRank(player) {

    if (
        player.rank !== null &&
        player.rank !== undefined &&
        player.rank !== ""
    ) {
        return Number(player.rank) || 0;
    }

    return 0;
}


// ==============================
// 과거 날짜 목록
// ==============================

async function loadHistoryDates() {

    try {

        const response =
            await fetch(
                "/api/history-dates"
            );

        if (!response.ok) {
            throw new Error(
                "날짜 목록 오류"
            );
        }

        const result =
            await response.json();

        const dates =
            result.dates || [];

        historyFilter.innerHTML = "";

        const currentOption =
            document.createElement("option");

        currentOption.value =
            "current";

        currentOption.textContent =
            "현재 랭킹";

        historyFilter.appendChild(
            currentOption
        );


        dates.forEach(
            function (date) {

                const option =
                    document.createElement("option");

                option.value = date;

                option.textContent =
                    date + " 랭킹";

                historyFilter.appendChild(
                    option
                );

            }
        );


        historyFilter.value =
            currentHistoryDate;


    } catch (error) {

        console.error(
            "과거 날짜 목록 오류:",
            error
        );
    }
}


// ==============================
// 현재 개별 서버 랭킹
// ==============================

async function loadRanking() {

    const worldId =
        serverFilter.value;

    if (
        !worldId ||
        worldId === "all"
    ) {
        return;
    }

    const serverName =
        getServerName(worldId);


    rankingBody.innerHTML = `
        <tr>
            <td colspan="7">
                ${escapeHtml(serverName)}
                랭킹을 불러오는 중입니다...
            </td>
        </tr>
    `;


    try {

        const response =
            await fetch(
                "/api/ranking?worldId=" +
                encodeURIComponent(worldId)
            );


        if (!response.ok) {

            throw new Error(
                "서버 오류: " +
                response.status
            );
        }


        const result =
            await response.json();


        /*
         * 새 server.js는
         *
         * {
         *   resultCode: 200,
         *   data: [...]
         * }
         *
         * 형식으로 반환한다.
         */

        const rows =
            result.data || [];


        if (!Array.isArray(rows)) {

            throw new Error(
                "랭킹 데이터 형식 오류"
            );
        }


        currentData =
            rows.map(
                function (player) {

                    return {

                        ...player,

                        server:
                            player.server ||
                            serverName,

                        worldId:
                            player.worldId ||
                            worldId

                    };

                }
            );


        rankingStatus.textContent =
            "현재 랭킹 - " +
            serverName +
            " / " +
            currentData.length +
            "명";


        applyFiltersAndSort();


    } catch (error) {

        console.error(
            "랭킹 불러오기 실패:",
            error
        );


        rankingBody.innerHTML = `
            <tr>
                <td colspan="7">
                    랭킹 데이터를 불러오지 못했습니다.
                </td>
            </tr>
        `;
    }
}


// ==============================
// 현재 전체 랭킹
// ==============================

async function loadAllRanking() {

    rankingBody.innerHTML = `
        <tr>
            <td colspan="7">
                전체 서버 랭킹을 불러오는 중입니다...
            </td>
        </tr>
    `;


    try {

        const response =
            await fetch(
                "/api/all-ranking"
            );


        if (!response.ok) {

            throw new Error(
                "서버 오류: " +
                response.status
            );
        }


        const result =
            await response.json();


        currentData =
            result.data || [];


        rankingStatus.textContent =
            "현재 전체 서버 랭킹 - " +
            currentData.length +
            "명";


        applyFiltersAndSort();


        await loadHistoryDates();


    } catch (error) {

        console.error(
            "전체 랭킹 불러오기 실패:",
            error
        );


        rankingBody.innerHTML = `
            <tr>
                <td colspan="7">
                    전체 랭킹을 불러오지 못했습니다.
                </td>
            </tr>
        `;
    }
}


// ==============================
// 과거 랭킹 가져오기
// ==============================

async function getHistoryData(date) {

    if (historyCache[date]) {
        return historyCache[date];
    }


    const response =
        await fetch(
            "/api/history?date=" +
            encodeURIComponent(date)
        );


    if (!response.ok) {

        throw new Error(
            "과거 랭킹 데이터가 없습니다."
        );
    }


    const result =
        await response.json();


    historyCache[date] =
        result;


    return result;
}


// ==============================
// 과거 랭킹 표시
// ==============================

async function loadHistoryRanking(date) {

    rankingBody.innerHTML = `
        <tr>
            <td colspan="7">
                ${escapeHtml(date)}
                랭킹을 불러오는 중입니다...
            </td>
        </tr>
    `;


    try {

        const result =
            await getHistoryData(date);


        currentData =
            result.data || [];


        rankingStatus.textContent =
            "과거 랭킹 - " +
            date +
            " / " +
            currentData.length +
            "명";


        applyFiltersAndSort();


    } catch (error) {

        console.error(
            "과거 랭킹 오류:",
            error
        );


        currentData = [];


        rankingBody.innerHTML = `
            <tr>
                <td colspan="7">
                    ${escapeHtml(date)}
                    의 랭킹 데이터가 없습니다.
                </td>
            </tr>
        `;
    }
}


// ==============================
// 검색 / 서버 / 정렬
// ==============================

function applyFiltersAndSort() {

    const keyword =
        searchInput.value.trim();


    const selectedServer =
        serverFilter.value;


    let filteredData =
        currentData.filter(
            function (player) {

                const nickname =
                    String(
                        player.name || ""
                    );


                const nicknameMatch =
                    nickname.includes(
                        keyword
                    );


                const serverName =
                    player.server ||
                    getServerName(
                        player.worldId
                    );


                const serverMatch =
                    selectedServer === "all" ||
                    String(
                        player.worldId || ""
                    ) ===
                    String(
                        selectedServer
                    ) ||
                    serverName ===
                    getServerName(
                        selectedServer
                    );


                return (
                    nicknameMatch &&
                    serverMatch
                );
            }
        );


    if (
        sortFilter.value === "power"
    ) {

        filteredData.sort(
            function (a, b) {

                return (
                    (Number(b.power) || 0) -
                    (Number(a.power) || 0)
                );

            }
        );
    }


    if (
        sortFilter.value === "level"
    ) {

        filteredData.sort(
            function (a, b) {

                return (
                    (Number(b.level) || 0) -
                    (Number(a.level) || 0)
                );

            }
        );
    }


    if (
        sortFilter.value === "nickname"
    ) {

        filteredData.sort(
            function (a, b) {

                return String(
                    a.name || ""
                ).localeCompare(
                    String(
                        b.name || ""
                    ),
                    "ko"
                );

            }
        );
    }


    displayRanking(
        filteredData
    );
}


// ==============================
// 랭킹 출력
// ==============================

function displayRanking(data) {

    rankingBody.innerHTML = "";


    if (data.length === 0) {

        rankingBody.innerHTML = `
            <tr>
                <td colspan="7">
                    검색 결과가 없습니다.
                </td>
            </tr>
        `;

        return;
    }


    data.forEach(
        function (player, index) {

            const row =
                document.createElement("tr");


            const nickname =
                player.name || "-";


            /*
             * 중요:
             * 기존에는 totalRank를 먼저 사용해서
             * 전체 인원 수가 순위처럼 표시될 수 있었다.
             *
             * 이제 무조건 실제 rank 사용.
             */

            const rank =
                getPlayerRank(player) ||
                index + 1;


            const guild =
                player.guild_name ||
                player.guildName ||
                "무소속";


            row.innerHTML = `

                <td>
                    ${escapeHtml(rank)}
                </td>

                <td
                    class="nickname-history"
                    title="클릭하면 서버·연맹·성장 기록을 확인할 수 있습니다."
                >
                    ${escapeHtml(nickname)}
                </td>

                <td>
                    ${escapeHtml(
                        player.main_job || "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        player.level ?? "-"
                    )}
                </td>

                <td>
                    ${
                        player.power != null
                        ? formatNumber(
                            player.power
                        )
                        : "-"
                    }
                </td>

                <td>
                    ${escapeHtml(
                        player.server || "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(guild)}
                </td>

            `;


            const nicknameCell =
                row.querySelector(
                    ".nickname-history"
                );


            nicknameCell.addEventListener(
                "click",
                function () {

                    openPlayerHistory(
                        player
                    );

                }
            );


            rankingBody.appendChild(
                row
            );

        }
    );
}


// ==============================
// 날짜 배열
// ==============================

async function loadHistoryDateArray() {

    const response =
        await fetch(
            "/api/history-dates"
        );


    if (!response.ok) {

        throw new Error(
            "날짜 목록 오류"
        );
    }


    const result =
        await response.json();


    return result.dates || [];
}


// ==============================
// 플레이어 추적 API
// ==============================

async function getPlayerTracking(
    name,
    server = "",
    worldId = ""
) {

    const params =
        new URLSearchParams();


    params.set(
        "name",
        name || ""
    );


    if (server) {

        params.set(
            "server",
            server
        );

    }


    if (worldId) {

        params.set(
            "worldId",
            worldId
        );

    }


    const response =
        await fetch(
            "/api/tracking?" +
            params.toString()
        );


    if (!response.ok) {

        throw new Error(
            "플레이어 추적 데이터를 불러오지 못했습니다."
        );
    }


    return await response.json();
}


// ==============================
// 플레이어 기록 모달
// ==============================

async function openPlayerHistory(player) {

    const modal =
        createHistoryModal();


    const content =
        modal.querySelector(
            ".player-history-content"
        );


    content.innerHTML = `

        <div class="history-loading">

            ${escapeHtml(
                player.name || "-"
            )}의 서버·연맹·성장 기록을
            불러오는 중...

        </div>

    `;


    modal.style.display =
        "flex";


    try {

        const tracking =
            await getPlayerTracking(
                player.name,
                player.server,
                player.worldId
            );


        if (
            !tracking ||
            !tracking.found ||
            !tracking.history ||
            tracking.history.length === 0
        ) {

            content.innerHTML = `

                <div class="history-empty">

                    ${escapeHtml(
                        player.name || "-"
                    )}의 과거 기록이 없습니다.

                </div>

            `;

            return;
        }


        // ==============================
        // 과거 기록 정렬
        // ==============================

        let history =
            tracking.history
                .slice()
                .sort(
                    function (a, b) {

                        return b.date.localeCompare(
                            a.date
                        );

                    }
                );


        /*
         * 현재 라이브 정보.
         *
         * rank = 실제 순위
         * totalRank = 전체 인원 수
         */

        const liveRecord = {

            date: "현재",

            name:
                player.name,

            server:
                player.server ||
                "",

            worldId:
                player.worldId ||
                "",

            level:
                player.level,

            power:
                player.power,

            rank:
                player.rank,

            totalRank:
                player.totalRank,

            main_job:
                player.main_job,

            guild_name:
                player.guild_name ||
                player.guildName ||
                ""

        };


        /*
         * 오늘 저장 데이터가 없으면
         * 라이브 데이터를 가장 위에 표시.
         */

        const today =
            new Date()
                .toISOString()
                .slice(0, 10);


        const latestHistory =
            history[0];


        if (
            !latestHistory ||
            latestHistory.date !== today
        ) {

            history.unshift(
                liveRecord
            );
        }


        // ==============================
        // 현재 기록
        // ==============================

        const current =
            history[0];


        const previous =
            history.length > 1
                ? history[1]
                : null;


        const powerChange =
            previous
                ? Number(
                    current.power || 0
                  ) -
                  Number(
                    previous.power || 0
                  )
                : 0;


        const rankChange =
            previous
                ? getPlayerRank(
                    previous
                  ) -
                  getPlayerRank(
                    current
                  )
                : 0;


        // ==============================
        // 현재 정보
        // ==============================

        let html = `

            <div class="player-history-header">

                <div class="history-player-name">
                    ${escapeHtml(
                        current.name ||
                        player.name ||
                        "-"
                    )}
                </div>

                <div class="history-player-info">

                    <span>
                        서버:
                        <strong>
                            ${escapeHtml(
                                current.server ||
                                "-"
                            )}
                        </strong>
                    </span>

                    <span>
                        연맹:
                        <strong>
                            ${escapeHtml(
                                current.guild_name ||
                                current.guildName ||
                                "무소속"
                            )}
                        </strong>
                    </span>

                    <span>
                        직업:
                        <strong>
                            ${escapeHtml(
                                current.main_job ||
                                "-"
                            )}
                        </strong>
                    </span>

                </div>

            </div>


            <div class="history-summary">

                <div class="history-summary-box">

                    <div class="history-summary-title">
                        현재 전투력
                    </div>

                    <div class="history-summary-value">
                        ${formatNumber(
                            current.power
                        )}
                    </div>

                </div>


                <div class="history-summary-box">

                    <div class="history-summary-title">
                        전투력 변화
                    </div>

                    <div class="history-summary-value">

                        ${
                            previous
                            ? formatChange(
                                powerChange
                              )
                            : "-"
                        }

                    </div>

                </div>


                <div class="history-summary-box">

                    <div class="history-summary-title">
                        순위 변화
                    </div>

                    <div class="history-summary-value">

                        ${
                            previous
                            ? formatChange(
                                rankChange
                              )
                            : "-"
                        }

                    </div>

                </div>

            </div>

        `;


        // ==============================
        // 추적 신뢰도
        // ==============================

        if (
            tracking.trackingConfidence != null
        ) {

            html += `

                <div class="tracking-section">

                    <div class="tracking-section-title">
                        캐릭터 추적 신뢰도
                    </div>

                    <div class="tracking-item">

                        <div class="tracking-change">

                            ${escapeHtml(
                                tracking.trackingConfidenceLevel ||
                                "-"
                            )}

                            <span>
                                ${escapeHtml(
                                    tracking.trackingConfidence
                                )}점
                            </span>

                        </div>

                        ${
                            tracking.trackingReasons &&
                            tracking.trackingReasons.length > 0
                            ? `
                                <div class="tracking-sub-info">
                                    ${tracking.trackingReasons
                                        .map(reason =>
                                            escapeHtml(reason)
                                        )
                                        .join(" · ")}
                                </div>
                            `
                            : ""
                        }

                    </div>

                </div>

            `;
        }


        // ==============================
        // 후보 캐릭터
        // ==============================

        if (
            tracking.candidates &&
            tracking.candidates.length > 1
        ) {

            html += `

                <div class="tracking-section">

                    <div class="tracking-section-title">
                        동일 닉네임 후보
                    </div>

                    <div class="tracking-list">

            `;


            tracking.candidates.forEach(
                function (candidate) {

                    html += `

                        <div class="tracking-item">

                            <div class="tracking-change">

                                ${escapeHtml(
                                    candidate.server ||
                                    "-"
                                )}

                                /
                                ${escapeHtml(
                                    candidate.main_job ||
                                    "-"
                                )}

                                /
                                Lv.${escapeHtml(
                                    candidate.level ||
                                    0
                                )}

                            </div>

                            <div class="tracking-sub-info">

                                전투력:
                                ${formatNumber(
                                    candidate.power
                                )}

                                /
                                순위:
                                ${
                                    candidate.rank
                                    ? formatNumber(
                                        candidate.rank
                                      ) + "위"
                                    : "-"
                                }

                                /
                                추적점수:
                                ${escapeHtml(
                                    candidate.trackingScore ??
                                    "-"
                                )}점

                                /
                                기록:
                                ${escapeHtml(
                                    candidate.historyLength ??
                                    0
                                )}개

                            </div>

                        </div>

                    `;

                }
            );


            html += `

                    </div>

                </div>

            `;
        }


        // ==============================
        // 서버 이동 기록
        // ==============================

        html += `

            <div class="tracking-section">

                <div class="tracking-section-title">
                    서버 이동 기록
                </div>

        `;


        if (
            tracking.moves &&
            tracking.moves.length > 0
        ) {

            html += `
                <div class="tracking-list">
            `;


            tracking.moves
                .slice()
                .reverse()
                .forEach(
                    function (move) {

                        const fromServer =
                            move.from ||
                            move.fromServer ||
                            "-";


                        const toServer =
                            move.to ||
                            move.toServer ||
                            "-";


                        const moveDate =
                            move.date ||
                            move.toDate ||
                            "";


                        html += `

                            <div class="tracking-item server-move">

                                <div class="tracking-date">
                                    ${escapeHtml(
                                        moveDate
                                    )}
                                </div>

                                <div class="tracking-change">

                                    <span class="tracking-old">
                                        ${escapeHtml(
                                            fromServer
                                        )}
                                    </span>

                                    <span class="tracking-arrow">
                                        →
                                    </span>

                                    <span class="tracking-new">
                                        ${escapeHtml(
                                            toServer
                                        )}
                                    </span>

                                </div>

                                ${
                                    move.score != null
                                    ? `
                                        <div class="tracking-sub-info">
                                            일치도:
                                            ${escapeHtml(
                                                move.score
                                            )}점
                                        </div>
                                    `
                                    : ""
                                }

                            </div>

                        `;

                    }
                );


            html += `
                </div>
            `;

        } else {

            html += `

                <div class="tracking-empty">
                    확인된 서버 이동 기록이 없습니다.
                </div>

            `;
        }


        html += `
            </div>
        `;


        // ==============================
        // 닉네임 변경 기록
        // ==============================

        if (
            tracking.nicknameChanges &&
            tracking.nicknameChanges.length > 0
        ) {

            html += `

                <div class="tracking-section">

                    <div class="tracking-section-title">
                        닉네임 변경 기록
                    </div>

                    <div class="tracking-list">

            `;


            tracking.nicknameChanges
                .slice()
                .reverse()
                .forEach(
                    function (change) {

                        html += `

                            <div class="tracking-item">

                                <div class="tracking-date">
                                    ${escapeHtml(
                                        change.date ||
                                        "-"
                                    )}
                                </div>

                                <div class="tracking-change">

                                    <span class="tracking-old">
                                        ${escapeHtml(
                                            change.from ||
                                            "-"
                                        )}
                                    </span>

                                    <span class="tracking-arrow">
                                        →
                                    </span>

                                    <span class="tracking-new">
                                        ${escapeHtml(
                                            change.to ||
                                            "-"
                                        )}
                                    </span>

                                </div>

                                ${
                                    change.score != null
                                    ? `
                                        <div class="tracking-sub-info">
                                            일치도:
                                            ${escapeHtml(
                                                change.score
                                            )}점
                                        </div>
                                    `
                                    : ""
                                }

                            </div>

                        `;

                    }
                );


            html += `

                    </div>

                </div>

            `;
        }


        // ==============================
        // 연맹 변경 기록
        // ==============================

        html += `

            <div class="tracking-section">

                <div class="tracking-section-title">
                    연맹 변경 기록
                </div>

        `;


        if (
            tracking.guildMoves &&
            tracking.guildMoves.length > 0
        ) {

            html += `
                <div class="tracking-list">
            `;


            tracking.guildMoves
                .slice()
                .reverse()
                .forEach(
                    function (move) {

                        const fromGuild =
                            move.from ||
                            move.fromGuild ||
                            "무소속";


                        const toGuild =
                            move.to ||
                            move.toGuild ||
                            "무소속";


                        const moveDate =
                            move.date ||
                            move.toDate ||
                            "";


                        html += `

                            <div class="tracking-item guild-move">

                                <div class="tracking-date">
                                    ${escapeHtml(
                                        moveDate
                                    )}
                                </div>

                                <div class="tracking-change">

                                    <span class="tracking-old">
                                        ${escapeHtml(
                                            fromGuild
                                        )}
                                    </span>

                                    <span class="tracking-arrow">
                                        →
                                    </span>

                                    <span class="tracking-new">
                                        ${escapeHtml(
                                            toGuild
                                        )}
                                    </span>

                                </div>

                                <div class="tracking-sub-info">

                                    서버:
                                    ${escapeHtml(
                                        current.server ||
                                        "-"
                                    )}

                                </div>

                            </div>

                        `;

                    }
                );


            html += `
                </div>
            `;

        } else {

            html += `

                <div class="tracking-empty">
                    확인된 연맹 변경 기록이 없습니다.
                </div>

            `;
        }


        html += `
            </div>
        `;


        // ==============================
        // 날짜별 전체 기록
        // ==============================

        html += `

            <div class="tracking-section">

                <div class="tracking-section-title">
                    날짜별 플레이어 기록
                </div>

                <div class="history-table-wrap">

                    <table class="history-table">

                        <thead>

                            <tr>

                                <th>날짜</th>
                                <th>서버</th>
                                <th>연맹</th>
                                <th>직업</th>
                                <th>레벨</th>
                                <th>전투력</th>
                                <th>순위</th>
                                <th>전투력 변화</th>
                                <th>순위 변화</th>

                            </tr>

                        </thead>

                        <tbody>

        `;


        history.forEach(
            function (record, index) {

                const previousRecord =
                    history[index + 1] ||
                    null;


                const recordPowerChange =
                    previousRecord
                        ? Number(
                            record.power || 0
                          ) -
                          Number(
                            previousRecord.power || 0
                          )
                        : 0;


                /*
                 * 순위 변화
                 *
                 * 이전 순위 - 현재 순위
                 *
                 * 예:
                 * 5514 -> 5532
                 * 5514 - 5532 = -18
                 * => ▼ 18
                 */

                const recordRankChange =
                    previousRecord
                        ? getPlayerRank(
                            previousRecord
                          ) -
                          getPlayerRank(
                            record
                          )
                        : 0;


                const guild =
                    record.guild_name ||
                    record.guildName ||
                    "무소속";


                /*
                 * 중요:
                 * totalRank가 아니라 rank.
                 */

                const rank =
                    getPlayerRank(
                        record
                    );


                html += `

                    <tr>

                        <td>
                            ${escapeHtml(
                                record.date
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                record.server ||
                                "-"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                guild
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                record.main_job ||
                                "-"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                record.level ??
                                "-"
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                record.power
                            )}
                        </td>

                        <td>
                            ${
                                rank > 0
                                ? formatNumber(
                                    rank
                                  ) + "위"
                                : "-"
                            }
                        </td>

                        <td>
                            ${
                                previousRecord
                                ? formatChange(
                                    recordPowerChange
                                  )
                                : "-"
                            }
                        </td>

                        <td>
                            ${
                                previousRecord
                                ? formatChange(
                                    recordRankChange
                                  )
                                : "-"
                            }
                        </td>

                    </tr>

                `;
            }
        );


        html += `

                        </tbody>

                    </table>

                </div>

            </div>

        `;


        content.innerHTML =
            html;


    } catch (error) {

        console.error(
            "플레이어 기록 오류:",
            error
        );


        content.innerHTML = `

            <div class="history-empty">

                과거 기록을 불러오지 못했습니다.

            </div>

        `;
    }
}


// ==============================
// 과거 기록 모달 생성
// ==============================

function createHistoryModal() {

    let modal =
        document.getElementById(
            "playerHistoryModal"
        );


    if (modal) {
        return modal;
    }


    modal =
        document.createElement("div");


    modal.id =
        "playerHistoryModal";


    modal.innerHTML = `

        <div class="player-history-overlay">

            <div class="player-history-modal">

                <button
                    class="player-history-close"
                    type="button"
                >
                    ×
                </button>

                <div class="player-history-content">
                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    const closeButton =
        modal.querySelector(
            ".player-history-close"
        );


    closeButton.addEventListener(
        "click",
        function () {

            modal.style.display =
                "none";

        }
    );


    const overlay =
        modal.querySelector(
            ".player-history-overlay"
        );


    overlay.addEventListener(
        "click",
        function (event) {

            if (
                event.target === overlay
            ) {

                modal.style.display =
                    "none";

            }

        }
    );


    return modal;
}


// ==============================
// 모달 스타일
// ==============================

const historyStyle =
    document.createElement("style");


historyStyle.textContent = `

#playerHistoryModal {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 99999;
}

.player-history-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.player-history-modal {
    position: relative;
    width: min(1200px, 95vw);
    max-height: 90vh;
    overflow-y: auto;
    background: #111;
    color: #fff;
    border-radius: 14px;
    padding: 28px;
    box-sizing: border-box;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

.player-history-close {
    position: absolute;
    top: 12px;
    right: 16px;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 50%;
    background: #333;
    color: #fff;
    font-size: 26px;
    cursor: pointer;
}

.player-history-close:hover {
    background: #555;
}

.history-player-name {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 10px;
}

.history-player-info {
    color: #aaa;
    margin-bottom: 22px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
}

.history-player-info strong {
    color: #fff;
}

.history-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 24px;
}

.history-summary-box {
    background: #1c1c1c;
    border-radius: 10px;
    padding: 18px;
}

.history-summary-title {
    color: #999;
    font-size: 13px;
    margin-bottom: 8px;
}

.history-summary-value {
    font-size: 21px;
    font-weight: 700;
}

.tracking-section {
    margin-top: 24px;
}

.tracking-section-title {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 12px;
}

.tracking-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.tracking-item {
    background: #1c1c1c;
    border-radius: 10px;
    padding: 14px 16px;
}

.tracking-date {
    color: #888;
    font-size: 12px;
    margin-bottom: 6px;
}

.tracking-change {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 16px;
    font-weight: 700;
}

.tracking-old {
    color: #999;
}

.tracking-arrow {
    color: #666;
}

.tracking-new {
    color: #fff;
}

.tracking-sub-info {
    margin-top: 7px;
    color: #888;
    font-size: 12px;
}

.tracking-empty {
    background: #1c1c1c;
    border-radius: 10px;
    padding: 18px;
    color: #777;
    text-align: center;
}

.history-table-wrap {
    overflow-x: auto;
}

.history-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 950px;
}

.history-table th,
.history-table td {
    padding: 12px 10px;
    border-bottom: 1px solid #292929;
    text-align: center;
    white-space: nowrap;
}

.history-table th {
    background: #1b1b1b;
    color: #aaa;
    font-size: 13px;
}

.history-table td {
    font-size: 14px;
}

.history-up {
    color: #ff5c5c;
    font-weight: 700;
}

.history-down {
    color: #4da3ff;
    font-weight: 700;
}

.history-same {
    color: #999;
}

.history-loading,
.history-empty {
    text-align: center;
    padding: 60px 20px;
    color: #aaa;
}

.nickname-history {
    cursor: pointer;
    font-weight: 600;
}

.nickname-history:hover {
    text-decoration: underline;
}

@media (max-width: 700px) {

    .history-summary {
        grid-template-columns: 1fr;
    }

    .player-history-modal {
        padding: 20px;
    }

    .history-player-info {
        flex-direction: column;
        gap: 5px;
    }

}

`;


document.head.appendChild(
    historyStyle
);


// ==============================
// 서버 변경
// ==============================

serverFilter.addEventListener(
    "change",
    async function () {

        const selectedServer =
            serverFilter.value;


        if (
            currentHistoryDate !==
            "current"
        ) {

            applyFiltersAndSort();

            return;
        }


        if (
            selectedServer === "all"
        ) {

            await loadAllRanking();

        } else {

            await loadRanking();

        }

    }
);


// ==============================
// 날짜 변경
// ==============================

historyFilter.addEventListener(
    "change",
    async function () {

        const selectedDate =
            historyFilter.value;


        currentHistoryDate =
            selectedDate;


        if (
            selectedDate ===
            "current"
        ) {

            if (
                serverFilter.value ===
                "all"
            ) {

                await loadAllRanking();

            } else {

                await loadRanking();

            }

            return;
        }


        await loadHistoryRanking(
            selectedDate
        );

    }
);


// ==============================
// 검색
// ==============================

searchButton.addEventListener(
    "click",
    function () {

        applyFiltersAndSort();

    }
);


// ==============================
// 엔터 검색
// ==============================

searchInput.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter"
        ) {

            applyFiltersAndSort();

        }

    }
);


// ==============================
// 정렬 변경
// ==============================

sortFilter.addEventListener(
    "change",
    function () {

        applyFiltersAndSort();

    }
);


// ==============================
// 시작
// ==============================

serverFilter.value =
    "all";

currentHistoryDate =
    "current";


loadHistoryDates();

loadAllRanking();


// ==============================
// 거래소 메뉴 전환
// ==============================

const rankingMenu =
    document.getElementById(
        "rankingMenu"
    );

const tradeMenu =
    document.getElementById(
        "tradeMenu"
    );

const rankingSection =
    document.getElementById(
        "rankingSection"
    );

const tradeSection =
    document.getElementById(
        "tradeSection"
    );


if (
    rankingMenu &&
    tradeMenu &&
    rankingSection &&
    tradeSection
) {

    rankingMenu.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            rankingSection.style.display =
                "block";

            tradeSection.style.display =
                "none";

        }
    );


    tradeMenu.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            rankingSection.style.display =
                "none";

            tradeSection.style.display =
                "block";

        }
    );

}
