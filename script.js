// ============================================================
// 아스달 지지 - 랭킹 전용 script.js
// ============================================================

const rankingBody = document.getElementById("rankingBody");
const serverFilter = document.getElementById("serverFilter");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const sortFilter = document.getElementById("sortFilter");
const historyFilter = document.getElementById("historyFilter");
const rankingStatus = document.getElementById("rankingStatus");

const rankingNav = document.getElementById("rankingNav");
const marketNav = document.getElementById("marketNav");
const rankingSection = document.getElementById("rankingSection");
const marketSection = document.getElementById("marketSection");


// ============================================================
// 실제 아스달 공식 랭킹 World ID
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
// 데이터
// ============================================================

let currentData = [];

let currentHistoryDate = "current";

let historyCache = {};


// ============================================================
// 서버 선택창
// ============================================================

function buildServerFilter() {

    if (!serverFilter) {
        return;
    }

    serverFilter.innerHTML = "";

    const allOption = document.createElement("option");

    allOption.value = "all";
    allOption.textContent = "전체 서버";

    serverFilter.appendChild(allOption);


    Object.entries(worlds).forEach(
        function ([serverName, worldId]) {

            const option =
                document.createElement("option");

            option.value = String(worldId);

            option.textContent =
                serverName;

            serverFilter.appendChild(option);

        }
    );

}


// ============================================================
// World ID → 서버 이름
// ============================================================

function getServerName(worldId) {

    return Object.keys(worlds).find(
        function (name) {

            return String(worlds[name]) ===
                   String(worldId);

        }
    ) || "";

}


// ============================================================
// 숫자
// ============================================================

function formatNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "-";

    }

    const number = Number(value);

    if (!Number.isFinite(number)) {

        return "-";

    }

    return number.toLocaleString();

}


// ============================================================
// 과거 날짜
// ============================================================

async function loadHistoryDates() {

    if (!historyFilter) {
        return;
    }

    try {

        const response =
            await fetch("/api/history-dates");

        if (!response.ok) {
            return;
        }

        const result =
            await response.json();

        const dates =
            Array.isArray(result.dates)
                ? result.dates
                : [];

        historyFilter.innerHTML = "";

        const currentOption =
            document.createElement("option");

        currentOption.value = "current";
        currentOption.textContent = "현재 랭킹";

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
            "history dates error:",
            error
        );

    }

}


// ============================================================
// 전체 랭킹
// ============================================================

async function loadAllRanking() {

    if (!rankingBody) {
        return;
    }


    rankingBody.innerHTML = `
        <tr>
            <td colspan="6">
                전체 랭킹을 불러오는 중입니다...
            </td>
        </tr>
    `;


    if (rankingStatus) {

        rankingStatus.textContent =
            "공식 랭킹 데이터를 불러오는 중입니다...";

    }


    try {

        const response =
            await fetch("/api/all-ranking");


        if (!response.ok) {

            throw new Error(
                "HTTP " + response.status
            );

        }


        const result =
            await response.json();


        console.log(
            "[ALL RANKING RESPONSE]",
            result
        );


        if (!result.success) {

            throw new Error(
                result.error ||
                "랭킹 API 오류"
            );

        }


        currentData =
            Array.isArray(result.data)
                ? result.data
                : [];


        if (rankingStatus) {

            rankingStatus.textContent =
                "현재 전체 서버 랭킹 - " +
                currentData.length +
                "명";

        }


        applyFiltersAndSort();


    } catch (error) {

        console.error(
            "전체 랭킹 오류:",
            error
        );


        currentData = [];


        rankingBody.innerHTML = `
            <tr>
                <td colspan="6">
                    랭킹 데이터를 불러오지 못했습니다.
                    <br>
                    잠시 후 다시 시도해주세요.
                </td>
            </tr>
        `;


        if (rankingStatus) {

            rankingStatus.textContent =
                "랭킹 데이터를 불러오지 못했습니다.";

        }

    }

}


// ============================================================
// 특정 서버 랭킹
// ============================================================

async function loadRanking() {

    const worldId =
        serverFilter.value;


    if (
        !worldId ||
        worldId === "all"
    ) {

        await loadAllRanking();

        return;

    }


    const serverName =
        getServerName(worldId);


    rankingBody.innerHTML = `
        <tr>
            <td colspan="6">
                ${serverName} 랭킹을 불러오는 중입니다...
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
                "HTTP " + response.status
            );

        }


        const result =
            await response.json();


        console.log(
            "[RANKING RESPONSE]",
            result
        );


        if (
            !result.resultData ||
            !Array.isArray(
                result.resultData.resData
            )
        ) {

            throw new Error(
                "랭킹 데이터 형식 오류"
            );

        }


        currentData =
            result.resultData.resData.map(
                function (player) {

                    return {

                        ...player,

                        server:
                            serverName

                    };

                }
            );


        if (rankingStatus) {

            rankingStatus.textContent =
                "현재 랭킹 - " +
                serverName +
                " / " +
                currentData.length +
                "명";

        }


        applyFiltersAndSort();


    } catch (error) {

        console.error(
            "서버 랭킹 오류:",
            error
        );


        currentData = [];


        rankingBody.innerHTML = `
            <tr>
                <td colspan="6">
                    ${serverName} 랭킹을 불러오지 못했습니다.
                </td>
            </tr>
        `;

    }

}


// ============================================================
// 검색 + 정렬
// ============================================================

function applyFiltersAndSort() {

    if (!rankingBody) {
        return;
    }


    const keyword =
        searchInput
            ? searchInput.value.trim()
            : "";


    const selectedServer =
        serverFilter
            ? serverFilter.value
            : "all";


    let filtered =
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


                let serverMatch = true;


                if (
                    selectedServer !== "all"
                ) {

                    serverMatch =
                        String(
                            player.worldId || ""
                        ) ===
                        String(
                            selectedServer
                        );

                    if (!serverMatch) {

                        serverMatch =
                            player.server ===
                            getServerName(
                                selectedServer
                            );

                    }

                }


                return (
                    nicknameMatch &&
                    serverMatch
                );

            }
        );


    if (
        sortFilter &&
        sortFilter.value === "power"
    ) {

        filtered.sort(
            function (a, b) {

                return (
                    Number(b.power || 0) -
                    Number(a.power || 0)
                );

            }
        );

    }


    if (
        sortFilter &&
        sortFilter.value === "level"
    ) {

        filtered.sort(
            function (a, b) {

                return (
                    Number(b.level || 0) -
                    Number(a.level || 0)
                );

            }
        );

    }


    if (
        sortFilter &&
        sortFilter.value === "nickname"
    ) {

        filtered.sort(
            function (a, b) {

                return String(
                    a.name || ""
                ).localeCompare(
                    String(
                        b.name || ""
                    )
                );

            }
        );

    }


    displayRanking(
        filtered
    );

}


// ============================================================
// 랭킹 출력
// ============================================================

function displayRanking(data) {

    if (!rankingBody) {
        return;
    }


    rankingBody.innerHTML = "";


    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {

        rankingBody.innerHTML = `
            <tr>
                <td colspan="6">
                    랭킹 데이터가 없습니다.
                </td>
            </tr>
        `;

        return;

    }


    data.forEach(
        function (player, index) {

            const row =
                document.createElement("tr");


            const rank =
                player.totalRank ||
                player.rank ||
                index + 1;


            const nickname =
                player.name || "-";


            const job =
                player.main_job || "-";


            const level =
                player.level ?? "-";


            const power =
                formatNumber(
                    player.power
                );


            const server =
                player.server ||
                getServerName(
                    player.worldId
                ) ||
                "-";


            row.innerHTML = `

                <td>
                    ${rank}
                </td>

                <td>
                    ${nickname}
                </td>

                <td>
                    ${job}
                </td>

                <td>
                    ${level}
                </td>

                <td>
                    ${power}
                </td>

                <td>
                    ${server}
                </td>

            `;


            rankingBody.appendChild(
                row
            );

        }
    );

}


// ============================================================
// 과거 랭킹
// ============================================================

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
            "과거 랭킹이 없습니다."
        );

    }


    const result =
        await response.json();


    historyCache[date] =
        result;


    return result;

}


async function loadHistoryRanking(date) {

    rankingBody.innerHTML = `
        <tr>
            <td colspan="6">
                ${date} 랭킹을 불러오는 중입니다...
            </td>
        </tr>
    `;


    try {

        const result =
            await getHistoryData(
                date
            );


        currentData =
            Array.isArray(result.data)
                ? result.data
                : [];


        if (rankingStatus) {

            rankingStatus.textContent =
                "과거 랭킹 - " +
                date +
                " / " +
                currentData.length +
                "명";

        }


        applyFiltersAndSort();


    } catch (error) {

        console.error(
            "과거 랭킹 오류:",
            error
        );


        rankingBody.innerHTML = `
            <tr>
                <td colspan="6">
                    ${date} 랭킹 데이터를 불러오지 못했습니다.
                </td>
            </tr>
        `;

    }

}


// ============================================================
// 이벤트
// ============================================================

if (serverFilter) {

    serverFilter.addEventListener(
        "change",
        async function () {

            if (
                currentHistoryDate !==
                "current"
            ) {

                applyFiltersAndSort();

                return;

            }


            if (
                serverFilter.value === "all"
            ) {

                await loadAllRanking();

            } else {

                await loadRanking();

            }

        }
    );

}


if (historyFilter) {

    historyFilter.addEventListener(
        "change",
        async function () {

            currentHistoryDate =
                historyFilter.value;


            if (
                currentHistoryDate ===
                "current"
            ) {

                if (
                    serverFilter.value === "all"
                ) {

                    await loadAllRanking();

                } else {

                    await loadRanking();

                }

            } else {

                await loadHistoryRanking(
                    currentHistoryDate
                );

            }

        }
    );

}


if (searchButton) {

    searchButton.addEventListener(
        "click",
        function () {

            applyFiltersAndSort();

        }
    );

}


if (searchInput) {

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

}


if (sortFilter) {

    sortFilter.addEventListener(
        "change",
        function () {

            applyFiltersAndSort();

        }
    );

}


// ============================================================
// 상단 메뉴
// ============================================================

if (rankingNav) {

    rankingNav.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            rankingSection.style.display =
                "block";

            marketSection.style.display =
                "none";

        }
    );

}


if (marketNav) {

    marketNav.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            rankingSection.style.display =
                "none";

            marketSection.style.display =
                "block";

        }
    );

}


// ============================================================
// 시작
// ============================================================

buildServerFilter();

if (serverFilter) {

    serverFilter.value = "all";

}

currentHistoryDate = "current";

loadHistoryDates();

loadAllRanking();
