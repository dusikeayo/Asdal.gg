const rankingBody = document.getElementById("rankingBody");
const serverFilter = document.getElementById("serverFilter");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const sortFilter = document.getElementById("sortFilter");

const historyFilter = document.getElementById("historyFilter");
const rankingStatus = document.getElementById("rankingStatus");


// ========================================
// 거래소 요소
// ========================================

const rankingSection = document.getElementById("rankingSection");
const marketSection = document.getElementById("marketSection");

const rankingNav = document.getElementById("rankingNav");
const marketNav = document.getElementById("marketNav");

const itemSearchInput = document.getElementById("itemSearchInput");
const itemTierFilter = document.getElementById("itemTierFilter");
const itemSortFilter = document.getElementById("itemSortFilter");
const itemSearchButton = document.getElementById("itemSearchButton");

const marketStatus = document.getElementById("marketStatus");
const marketBody = document.getElementById("marketBody");


// ========================================
// 서버 목록
// ========================================

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


// ========================================
// 전역 데이터
// ========================================

let currentData = [];

let currentHistoryDate = "current";

let historyCache = {};

let currentMarketData = [];


// ========================================
// 서버 선택창
// ========================================

serverFilter.innerHTML = "";

const allOption = document.createElement("option");

allOption.value = "all";
allOption.textContent = "전체 서버";

serverFilter.appendChild(allOption);


Object.entries(worlds).forEach(
    function ([serverName, worldId]) {

        const option = document.createElement("option");

        option.value = worldId;
        option.textContent = serverName;

        serverFilter.appendChild(option);

    }
);


// ========================================
// 서버 이름
// ========================================

function getServerName(worldId) {

    return Object.keys(worlds).find(
        function (name) {

            return String(worlds[name]) === String(worldId);

        }
    ) || "";

}


// ========================================
// 숫자 표시
// ========================================

function formatNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "-";

    }

    const number = Number(value);

    if (Number.isNaN(number)) {

        return "-";

    }

    return number.toLocaleString();

}


// ========================================
// 변화량
// ========================================

function formatChange(value) {

    const number = Number(value) || 0;


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


// ========================================
// 과거 날짜
// ========================================

async function loadHistoryDates() {

    try {

        const response =
            await fetch("/api/history-dates");


        if (!response.ok) {

            throw new Error("날짜 목록 오류");

        }


        const result =
            await response.json();


        const dates =
            result.dates || [];


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
                option.textContent = date + " 랭킹";

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


// ========================================
// 현재 서버 랭킹
// ========================================

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
                "서버 오류: " +
                response.status
            );

        }


        const result =
            await response.json();


        if (
            !result.resultData ||
            !result.resultData.resData
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
                <td colspan="6">
                    랭킹 데이터를 불러오지 못했습니다.
                </td>
            </tr>
        `;

    }

}


// ========================================
// 전체 랭킹
// ========================================

async function loadAllRanking() {

    rankingBody.innerHTML = `
        <tr>
            <td colspan="6">
                전체 서버 랭킹을 불러오는 중입니다...
            </td>
        </tr>
    `;


    try {

        const response =
            await fetch("/api/all-ranking");


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
                <td colspan="6">
                    전체 랭킹을 불러오지 못했습니다.
                </td>
            </tr>
        `;

    }

}


// ========================================
// 과거 데이터
// ========================================

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


// ========================================
// 과거 랭킹
// ========================================

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
                <td colspan="6">
                    ${date}의 랭킹 데이터가 없습니다.
                </td>
            </tr>
        `;

    }

}


// ========================================
// 랭킹 필터 / 정렬
// ========================================

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


                const serverMatch =
                    selectedServer === "all" ||
                    player.server ===
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
                    )
                );

            }
        );

    }


    displayRanking(
        filteredData
    );

}


// ========================================
// 랭킹 출력
// ========================================

function displayRanking(data) {

    rankingBody.innerHTML = "";


    if (data.length === 0) {

        rankingBody.innerHTML = `
            <tr>
                <td colspan="6">
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


            const rank =
                player.totalRank ||
                index + 1;


            row.innerHTML = `

                <td>
                    ${rank}
                </td>

                <td
                    class="nickname-history"
                    title="클릭하면 과거 전투력을 확인할 수 있습니다."
                >
                    ${nickname}
                </td>

                <td>
                    ${player.main_job || "-"}
                </td>

                <td>
                    ${player.level ?? "-"}
                </td>

                <td>
                    ${
                        player.power != null
                        ? formatNumber(player.power)
                        : "-"
                    }
                </td>

                <td>
                    ${player.server || "-"}
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


// ========================================
// 날짜 배열
// ========================================

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


// ========================================
// 현재 플레이어 찾기
// ========================================

async function findPlayerInCurrentRanking(player) {

    try {

        const found =
            currentData.find(
                function (item) {

                    return (
                        String(item.name || "") ===
                        String(player.name || "") &&

                        String(item.server || "") ===
                        String(player.server || "")
                    );

                }
            );


        if (found) {

            return found;

        }


        const response =
            await fetch(
                "/api/all-ranking"
            );


        if (!response.ok) {

            return null;

        }


        const result =
            await response.json();


        const data =
            result.data || [];


        return data.find(
            function (item) {

                return (
                    String(item.name || "") ===
                    String(player.name || "") &&

                    String(item.server || "") ===
                    String(player.server || "")
                );

            }
        ) || null;


    } catch (error) {

        console.error(
            "현재 플레이어 검색 실패:",
            error
        );

        return null;

    }

}


// ========================================
// 플레이어 과거 기록
// ========================================

async function getPlayerHistory(player) {

    const dates =
        await loadHistoryDateArray();


    const records = [];


    for (
        const date of dates
    ) {

        try {

            const history =
                await getHistoryData(
                    date
                );


            const data =
                history.data || [];


            const match =
                data.find(
                    function (item) {

                        return (

                            String(
                                item.name || ""
                            ) ===
                            String(
                                player.name || ""
                            ) &&

                            String(
                                item.server || ""
                            ) ===
                            String(
                                player.server || ""
                            )

                        );

                    }
                );


            if (match) {

                records.push({

                    date:
                        date,

                    name:
                        match.name,

                    server:
                        match.server,

                    main_job:
                        match.main_job,

                    level:
                        match.level,

                    power:
                        Number(
                            match.power
                        ) || 0,

                    rank:
                        Number(
                            match.totalRank
                        ) || 0

                });

            }


        } catch (error) {

            console.error(
                date +
                " 기록 확인 실패:",
                error
            );

        }

    }


    let currentPlayer =
        player;


    if (
        currentHistoryDate !==
        "current"
    ) {

        const found =
            await findPlayerInCurrentRanking(
                player
            );


        if (found) {

            currentPlayer =
                found;

        } else {

            currentPlayer =
                null;

        }

    }


    if (currentPlayer) {

        records.unshift({

            date:
                "현재",

            name:
                currentPlayer.name,

            server:
                currentPlayer.server,

            main_job:
                currentPlayer.main_job,

            level:
                currentPlayer.level,

            power:
                Number(
                    currentPlayer.power
                ) || 0,

            rank:
                Number(
                    currentPlayer.totalRank
                ) || 0

        });

    }


    records.sort(
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


            return b.date.localeCompare(
                a.date
            );

        }
    );


    return records;

}


// ========================================
// 플레이어 기록 모달
// ========================================

async function openPlayerHistory(player) {

    const modal =
        createHistoryModal();


    const content =
        modal.querySelector(
            ".player-history-content"
        );


    content.innerHTML = `

        <div class="history-loading">
            ${player.name || "-"}의 과거 기록을 불러오는 중...
        </div>

    `;


    modal.style.display =
        "flex";


    try {

        const records =
            await getPlayerHistory(
                player
            );


        if (
            records.length === 0
        ) {

            content.innerHTML = `

                <div class="history-empty">
                    과거 랭킹 기록이 없습니다.
                </div>

            `;

            return;

        }


        const current =
            records[0];


        const previous =
            records.length > 1
                ? records[1]
                : null;


        const powerChange =
            previous
                ? current.power - previous.power
                : 0;


        const rankChange =
            previous
                ? previous.rank - current.rank
                : 0;


        let html = `

            <div class="player-history-header">

                <div class="history-player-name">
                    ${player.name || "-"}
                </div>

                <div class="history-player-info">
                    ${player.server || "-"}
                    ·
                    ${player.main_job || "-"}
                </div>

            </div>


            <div class="history-summary">

                <div class="history-summary-box">

                    <div class="history-summary-title">
                        현재 전투력
                    </div>

                    <div class="history-summary-value">
                        ${formatNumber(current.power)}
                    </div>

                </div>


                <div class="history-summary-box">

                    <div class="history-summary-title">
                        전투력 변화
                    </div>

                    <div class="history-summary-value">
                        ${
                            previous
                            ? formatChange(powerChange)
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
                            ? formatChange(rankChange)
                            : "-"
                        }
                    </div>

                </div>

            </div>


            <div class="history-table-wrap">

                <table class="history-table">

                    <thead>

                        <tr>

                            <th>날짜</th>
                            <th>서버</th>
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


        records.forEach(
            function (record, index) {

                const previousRecord =
                    records[index + 1] || null;


                const powerChange =
                    previousRecord
                        ? record.power -
                          previousRecord.power
                        : 0;


                const rankChange =
                    previousRecord
                        ? previousRecord.rank -
                          record.rank
                        : 0;


                html += `

                    <tr>

                        <td>
                            ${record.date}
                        </td>

                        <td>
                            ${record.server || "-"}
                        </td>

                        <td>
                            ${record.main_job || "-"}
                        </td>

                        <td>
                            ${record.level ?? "-"}
                        </td>

                        <td>
                            ${formatNumber(record.power)}
                        </td>

                        <td>
                            ${
                                record.rank
                                ? formatNumber(record.rank) + "위"
                                : "-"
                            }
                        </td>

                        <td>
                            ${
                                previousRecord
                                ? formatChange(powerChange)
                                : "-"
                            }
                        </td>

                        <td>
                            ${
                                previousRecord
                                ? formatChange(rankChange)
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


// ========================================
// 기록 모달
// ========================================

function createHistoryModal() {

    let modal =
        document.getElementById(
            "playerHistoryModal"
        );


    if (modal) {

        return modal;

    }


    modal =
        document.createElement(
            "div"
        );


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


// ========================================
// 거래소 API
// ========================================

async function loadMarket(itemName = "") {

    marketBody.innerHTML = `
        <tr>
            <td colspan="8">
                아이템 시세를 불러오는 중입니다...
            </td>
        </tr>
    `;


    marketStatus.textContent =
        "아스달 거래소 데이터를 불러오는 중입니다.";


    try {

        const response =
            await fetch(
                "/api/auction?itemname=" +
                encodeURIComponent(itemName)
            );


        if (!response.ok) {

            throw new Error(
                "거래소 서버 오류: " +
                response.status
            );

        }


        const result =
            await response.json();


        if (
            !result.resultData ||
            !Array.isArray(result.resultData.resData)
        ) {

            throw new Error(
                "거래소 데이터 형식 오류"
            );

        }


        currentMarketData =
            result.resultData.resData;


        marketStatus.textContent =
            "거래소 아이템 " +
            formatNumber(
                result.resultData.total_count ||
                currentMarketData.length
            ) +
            "개";


        applyMarketFilters();


    } catch (error) {

        console.error(
            "거래소 불러오기 실패:",
            error
        );


        marketStatus.textContent =
            "거래소 데이터를 불러오지 못했습니다.";


        marketBody.innerHTML = `
            <tr>
                <td colspan="8">
                    거래소 데이터를 불러오지 못했습니다.
                </td>
            </tr>
        `;

    }

}


// ========================================
// 거래소 필터 / 정렬
// ========================================

function applyMarketFilters() {

    const keyword =
        itemSearchInput.value.trim();


    const tier =
        itemTierFilter.value;


    let data =
        currentMarketData.filter(
            function (item) {

                const name =
                    String(
                        item.item_name || ""
                    );


                const nameMatch =
                    name.includes(
                        keyword
                    );


                const tierMatch =
                    tier === "all" ||
                    item.tier === tier;


                return (
                    nameMatch &&
                    tierMatch
                );

            }
        );


    if (
        itemSortFilter.value ===
        "lowest"
    ) {

        data.sort(
            function (a, b) {

                return (
                    (Number(a.trade_lowest_price) || 0) -
                    (Number(b.trade_lowest_price) || 0)
                );

            }
        );

    }


    if (
        itemSortFilter.value ===
        "highest"
    ) {

        data.sort(
            function (a, b) {

                return (
                    (Number(b.trade_highest_price) || 0) -
                    (Number(a.trade_highest_price) || 0)
                );

            }
        );

    }


    if (
        itemSortFilter.value ===
        "average"
    ) {

        data.sort(
            function (a, b) {

                return (
                    (Number(b.trade_avg_price) || 0) -
                    (Number(a.trade_avg_price) || 0)
                );

            }
        );

    }


    if (
        itemSortFilter.value ===
        "trade"
    ) {

        data.sort(
            function (a, b) {

                return (
                    (Number(b.trade_count) || 0) -
                    (Number(a.trade_count) || 0)
                );

            }
        );

    }


    displayMarket(data);

}


// ========================================
// 거래소 출력
// ========================================

function displayMarket(data) {

    marketBody.innerHTML = "";


    if (data.length === 0) {

        marketBody.innerHTML = `
            <tr>
                <td colspan="8">
                    검색 결과가 없습니다.
                </td>
            </tr>
        `;

        return;

    }


    data.forEach(
        function (item) {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    <div style="font-weight:700;">
                        ${item.item_name || "-"}
                    </div>

                    ${
                        item.reinforce_level
                        ? `
                            <div style="
                                color:#777;
                                font-size:11px;
                                margin-top:3px;
                            ">
                                강화 +${item.reinforce_level}
                            </div>
                        `
                        : ""
                    }
                </td>

                <td>
                    ${item.tier || "-"}
                </td>

                <td>
                    ${item.quality || "-"}
                </td>

                <td>
                    ${formatNumber(item.trade_lowest_price)}
                </td>

                <td>
                    <strong>
                        ${formatNumber(item.trade_avg_price)}
                    </strong>
                </td>

                <td>
                    ${formatNumber(item.trade_highest_price)}
                </td>

                <td>
                    ${formatNumber(item.trade_count)}
                </td>

                <td>
                    ${formatNumber(item.regist_count)}
                </td>

            `;


            marketBody.appendChild(
                row
            );

        }
    );

}


// ========================================
// 랭킹 / 거래소 화면 전환
// ========================================

function showRanking() {

    rankingSection.style.display =
        "block";

    marketSection.style.display =
        "none";

}


function showMarket() {

    rankingSection.style.display =
        "none";

    marketSection.style.display =
        "block";


    if (
        currentMarketData.length === 0
    ) {

        loadMarket();

    }

}


// ========================================
// 메뉴
// ========================================

rankingNav.addEventListener(
    "click",
    function (event) {

        event.preventDefault();

        showRanking();

    }
);


marketNav.addEventListener(
    "click",
    function (event) {

        event.preventDefault();

        showMarket();

    }
);


// ========================================
// 서버 변경
// ========================================

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


// ========================================
// 날짜 변경
// ========================================

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


// ========================================
// 랭킹 검색
// ========================================

searchButton.addEventListener(
    "click",
    function () {

        applyFiltersAndSort();

    }
);


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


// ========================================
// 랭킹 정렬
// ========================================

sortFilter.addEventListener(
    "change",
    function () {

        applyFiltersAndSort();

    }
);


// ========================================
// 거래소 검색
// ========================================

itemSearchButton.addEventListener(
    "click",
    function () {

        loadMarket(
            itemSearchInput.value.trim()
        );

    }
);


itemSearchInput.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter"
        ) {

            loadMarket(
                itemSearchInput.value.trim()
            );

        }

    }
);


// ========================================
// 거래소 등급
// ========================================

itemTierFilter.addEventListener(
    "change",
    function () {

        applyMarketFilters();

    }
);


// ========================================
// 거래소 정렬
// ========================================

itemSortFilter.addEventListener(
    "change",
    function () {

        applyMarketFilters();

    }
);


// ========================================
// 시작
// ========================================

serverFilter.value =
    "all";

currentHistoryDate =
    "current";

showRanking();

loadHistoryDates();

loadAllRanking();
