// ============================================================
// 아스달 지지 - 수정된 전체 script.js
// 랭킹 + 서버 선택 + 과거 랭킹 + 아이템 시세
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

const itemSearchInput = document.getElementById("itemSearchInput");
const itemTierFilter = document.getElementById("itemTierFilter");
const itemSortFilter = document.getElementById("itemSortFilter");
const itemSearchButton = document.getElementById("itemSearchButton");
const marketStatus = document.getElementById("marketStatus");
const marketBody = document.getElementById("marketBody");


// ============================================================
// 서버 목록
// ============================================================

const worlds = {
    "뉴월드": 3000,
    "글로벌": 1000,
    "크라본": 70110
};


// ============================================================
// 데이터
// ============================================================

let currentData = [];
let currentHistoryDate = "current";
let historyCache = {};
let currentMarketData = [];


// ============================================================
// 서버 선택창
// ============================================================

function buildServerFilter() {

    if (!serverFilter) return;

    serverFilter.innerHTML = "";

    const allOption = document.createElement("option");

    allOption.value = "all";
    allOption.textContent = "전체 서버";

    serverFilter.appendChild(allOption);


    Object.entries(worlds).forEach(
        ([serverName, worldId]) => {

            const option =
                document.createElement("option");

            option.value = String(worldId);
            option.textContent = serverName;

            serverFilter.appendChild(option);

        }
    );

}


// ============================================================
// 서버 이름
// ============================================================

function getServerName(worldId) {

    return Object.keys(worlds).find(
        name =>
            String(worlds[name]) ===
            String(worldId)
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

    if (Number.isNaN(number)) {
        return "-";
    }

    return number.toLocaleString();

}


// ============================================================
// 변화량
// ============================================================

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


// ============================================================
// 과거 날짜 목록
// ============================================================

async function loadHistoryDates() {

    if (!historyFilter) return;

    try {

        const response =
            await fetch("/api/history-dates");

        if (!response.ok) return;

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


        dates.forEach(date => {

            const option =
                document.createElement("option");

            option.value = date;
            option.textContent = `${date} 랭킹`;

            historyFilter.appendChild(option);

        });


        historyFilter.value =
            currentHistoryDate;

    } catch (error) {

        console.error(
            "과거 날짜 목록 오류:",
            error
        );

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
                `/api/ranking?worldId=${encodeURIComponent(worldId)}`
            );


        if (!response.ok) {

            throw new Error(
                `서버 오류 ${response.status}`
            );

        }


        const result =
            await response.json();


        const data =
            result?.resultData?.resData;


        if (!Array.isArray(data)) {

            throw new Error(
                "랭킹 데이터 형식 오류"
            );

        }


        currentData =
            data.map(player => ({
                ...player,
                server: player.server || serverName
            }));


        rankingStatus.textContent =
            `현재 랭킹 - ${serverName} / ${currentData.length.toLocaleString()}명`;


        applyFiltersAndSort();


    } catch (error) {

        console.error(
            "랭킹 불러오기 실패:",
            error
        );


        currentData = [];


        rankingBody.innerHTML = `
            <tr>
                <td colspan="6">
                    랭킹 데이터를 불러오지 못했습니다.
                    <br>
                    ${error.message}
                </td>
            </tr>
        `;

    }

}


// ============================================================
// 전체 랭킹
// ============================================================

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
                `서버 오류 ${response.status}`
            );

        }


        const result =
            await response.json();


        if (
            !result ||
            !Array.isArray(result.data)
        ) {

            throw new Error(
                "전체 랭킹 데이터 형식 오류"
            );

        }


        currentData =
            result.data;


        rankingStatus.textContent =
            `현재 전체 서버 랭킹 - ${currentData.length.toLocaleString()}명`;


        applyFiltersAndSort();


        await loadHistoryDates();


    } catch (error) {

        console.error(
            "전체 랭킹 불러오기 실패:",
            error
        );


        currentData = [];


        rankingBody.innerHTML = `
            <tr>
                <td colspan="6">
                    랭킹 데이터를 불러오지 못했습니다.
                    <br>
                    ${error.message}
                </td>
            </tr>
        `;

    }

}


// ============================================================
// 과거 데이터
// ============================================================

async function getHistoryData(date) {

    if (historyCache[date]) {

        return historyCache[date];

    }


    const response =
        await fetch(
            `/api/history?date=${encodeURIComponent(date)}`
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


// ============================================================
// 과거 랭킹
// ============================================================

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
            Array.isArray(result.data)
                ? result.data
                : [];


        rankingStatus.textContent =
            `과거 랭킹 - ${date} / ${currentData.length.toLocaleString()}명`;


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


// ============================================================
// 필터 / 정렬
// ============================================================

function applyFiltersAndSort() {

    if (!rankingBody) return;


    const keyword =
        searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";


    const selectedServer =
        serverFilter
            ? serverFilter.value
            : "all";


    let filteredData =
        [...currentData];


    if (keyword) {

        filteredData =
            filteredData.filter(player => {

                const nickname =
                    String(
                        player.name || ""
                    ).toLowerCase();

                return nickname.includes(
                    keyword
                );

            });

    }


    if (
        selectedServer !== "all"
    ) {

        const serverName =
            getServerName(
                selectedServer
            );


        filteredData =
            filteredData.filter(
                player =>
                    String(
                        player.server || ""
                    ) ===
                    String(serverName)
            );

    }


    const sort =
        sortFilter
            ? sortFilter.value
            : "power";


    if (sort === "power") {

        filteredData.sort(
            (a, b) =>
                (Number(b.power) || 0) -
                (Number(a.power) || 0)
        );

    }


    if (sort === "level") {

        filteredData.sort(
            (a, b) =>
                (Number(b.level) || 0) -
                (Number(a.level) || 0)
        );

    }


    if (sort === "nickname") {

        filteredData.sort(
            (a, b) =>
                String(a.name || "")
                    .localeCompare(
                        String(b.name || ""),
                        "ko"
                    )
        );

    }


    displayRanking(
        filteredData
    );

}


// ============================================================
// 랭킹 출력
// ============================================================

function displayRanking(data) {

    if (!rankingBody) return;


    rankingBody.innerHTML = "";


    if (!Array.isArray(data) || data.length === 0) {

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
        (player, index) => {

            const row =
                document.createElement("tr");


            const nickname =
                player.name || "-";


            const rank =
                player.totalRank ||
                player.rank ||
                index + 1;


            row.innerHTML = `

                <td>${rank}</td>

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


            if (nicknameCell) {

                nicknameCell.addEventListener(
                    "click",
                    () => {

                        openPlayerHistory(
                            player
                        );

                    }
                );

            }


            rankingBody.appendChild(
                row
            );

        }
    );

}


// ============================================================
// 플레이어 현재 데이터 찾기
// ============================================================

async function findPlayerInCurrentRanking(player) {

    const found =
        currentData.find(
            item =>
                String(item.name || "") ===
                    String(player.name || "") &&
                String(item.server || "") ===
                    String(player.server || "")
        );


    if (found) {
        return found;
    }


    try {

        const response =
            await fetch("/api/all-ranking");


        if (!response.ok) {
            return null;
        }


        const result =
            await response.json();


        const data =
            Array.isArray(result.data)
                ? result.data
                : [];


        return data.find(
            item =>
                String(item.name || "") ===
                    String(player.name || "") &&
                String(item.server || "") ===
                    String(player.server || "")
        ) || null;


    } catch (error) {

        console.error(
            "현재 플레이어 검색 실패:",
            error
        );

        return null;

    }

}


// ============================================================
// 날짜 목록
// ============================================================

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


    return Array.isArray(result.dates)
        ? result.dates
        : [];

}


// ============================================================
// 플레이어 기록
// ============================================================

async function getPlayerHistory(player) {

    const dates =
        await loadHistoryDateArray();


    const records = [];


    for (const date of dates) {

        try {

            const history =
                await getHistoryData(
                    date
                );


            const data =
                Array.isArray(history.data)
                    ? history.data
                    : [];


            const match =
                data.find(
                    item =>
                        String(item.name || "") ===
                            String(player.name || "") &&
                        String(item.server || "") ===
                            String(player.server || "")
                );


            if (match) {

                records.push({

                    date: date,

                    name: match.name,

                    server: match.server,

                    main_job: match.main_job,

                    level: match.level,

                    power:
                        Number(match.power) || 0,

                    rank:
                        Number(
                            match.totalRank ||
                            match.rank
                        ) || 0

                });

            }

        } catch (error) {

            console.error(
                `${date} 기록 확인 실패:`,
                error
            );

        }

    }


    let currentPlayer =
        player;


    const found =
        await findPlayerInCurrentRanking(
            player
        );


    if (found) {

        currentPlayer =
            found;

    }


    if (currentPlayer) {

        records.unshift({

            date: "현재",

            name: currentPlayer.name,

            server: currentPlayer.server,

            main_job: currentPlayer.main_job,

            level: currentPlayer.level,

            power:
                Number(currentPlayer.power) || 0,

            rank:
                Number(
                    currentPlayer.totalRank ||
                    currentPlayer.rank
                ) || 0

        });

    }


    records.sort(
        (a, b) => {

            if (a.date === "현재") {
                return -1;
            }

            if (b.date === "현재") {
                return 1;
            }

            return b.date.localeCompare(
                a.date
            );

        }
    );


    return records;

}


// ============================================================
// 플레이어 기록 모달
// ============================================================

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


        if (records.length === 0) {

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
            (record, index) => {

                const previousRecord =
                    records[index + 1] || null;


                const recordPowerChange =
                    previousRecord
                        ? record.power -
                          previousRecord.power
                        : 0;


                const recordRankChange =
                    previousRecord
                        ? previousRecord.rank -
                          record.rank
                        : 0;


                html += `

                    <tr>

                        <td>${record.date}</td>

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
                                    ? formatChange(recordPowerChange)
                                    : "-"
                            }
                        </td>

                        <td>
                            ${
                                previousRecord
                                    ? formatChange(recordRankChange)
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


// ============================================================
// 기록 모달 생성
// ============================================================

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
        () => {

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
        event => {

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


// ============================================================
// 서버 변경
// ============================================================

if (serverFilter) {

    serverFilter.addEventListener(
        "change",
        async () => {

            currentHistoryDate =
                "current";


            if (historyFilter) {

                historyFilter.value =
                    "current";

            }


            if (
                serverFilter.value ===
                "all"
            ) {

                await loadAllRanking();

            } else {

                await loadRanking();

            }

        }
    );

}


// ============================================================
// 과거 날짜 변경
// ============================================================

if (historyFilter) {

    historyFilter.addEventListener(
        "change",
        async () => {

            currentHistoryDate =
                historyFilter.value;


            if (
                currentHistoryDate ===
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
                currentHistoryDate
            );

        }
    );

}


// ============================================================
// 검색
// ============================================================

if (searchButton) {

    searchButton.addEventListener(
        "click",
        () => {

            applyFiltersAndSort();

        }
    );

}


if (searchInput) {

    searchInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                applyFiltersAndSort();

            }

        }
    );

}


// ============================================================
// 정렬
// ============================================================

if (sortFilter) {

    sortFilter.addEventListener(
        "change",
        () => {

            applyFiltersAndSort();

        }
    );

}


// ============================================================
// 랭킹 메뉴
// ============================================================

if (rankingNav) {

    rankingNav.addEventListener(
        "click",
        event => {

            event.preventDefault();


            if (rankingSection) {

                rankingSection.style.display =
                    "block";

            }


            if (marketSection) {

                marketSection.style.display =
                    "none";

            }

        }
    );

}


// ============================================================
// 시세 메뉴
// ============================================================

if (marketNav) {

    marketNav.addEventListener(
        "click",
        async event => {

            event.preventDefault();


            if (rankingSection) {

                rankingSection.style.display =
                    "none";

            }


            if (marketSection) {

                marketSection.style.display =
                    "block";

            }


            await loadMarket();

        }
    );

}


// ============================================================
// 거래소 API
// ============================================================

async function loadMarket() {

    if (!marketBody) return;


    const itemName =
        itemSearchInput
            ? itemSearchInput.value.trim()
            : "";


    marketBody.innerHTML = `
        <tr>
            <td colspan="8">
                아이템 시세를 불러오는 중입니다...
            </td>
        </tr>
    `;


    if (marketStatus) {

        marketStatus.textContent =
            "거래소 데이터를 불러오는 중입니다...";

    }


    try {

        const url =
            `/api/auction?server=newworld&itemname=${encodeURIComponent(itemName)}`;


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                `거래소 서버 오류 ${response.status}`
            );

        }


        const result =
            await response.json();


        let data = [];


        if (
            Array.isArray(result)
        ) {

            data = result;

        } else if (
            Array.isArray(result.data)
        ) {

            data = result.data;

        } else if (
            result.resultData &&
            Array.isArray(
                result.resultData.resData
            )
        ) {

            data =
                result.resultData.resData;

        } else if (
            result.raw &&
            result.raw.resultData &&
            Array.isArray(
                result.raw.resultData.resData
            )
        ) {

            data =
                result.raw.resultData.resData;

        }


        currentMarketData =
            data;


        displayMarket(
            currentMarketData
        );


    } catch (error) {

        console.error(
            "아이템 시세 오류:",
            error
        );


        currentMarketData = [];


        marketBody.innerHTML = `
            <tr>
                <td colspan="8">
                    아이템 시세를 불러오지 못했습니다.
                    <br>
                    ${error.message}
                </td>
            </tr>
        `;


        if (marketStatus) {

            marketStatus.textContent =
                "거래소 데이터를 불러오지 못했습니다.";

        }

    }

}


// ============================================================
// 거래소 출력
// ============================================================

function displayMarket(data) {

    if (!marketBody) return;


    marketBody.innerHTML = "";


    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {

        marketBody.innerHTML = `
            <tr>
                <td colspan="8">
                    등록된 아이템이 없습니다.
                </td>
            </tr>
        `;


        if (marketStatus) {

            marketStatus.textContent =
                "검색 결과 0개";

        }

        return;

    }


    let filtered =
        [...data];


    const keyword =
        itemSearchInput
            ? itemSearchInput.value.trim().toLowerCase()
            : "";


    if (keyword) {

        filtered =
            filtered.filter(item => {

                const name =
                    String(
                        item.item_name ||
                        item.itemName ||
                        item.name ||
                        ""
                    ).toLowerCase();


                return name.includes(
                    keyword
                );

            });

    }


    if (
        itemTierFilter &&
        itemTierFilter.value !==
            "all"
    ) {

        const selectedTier =
            itemTierFilter.value;


        filtered =
            filtered.filter(item => {

                const tier =
                    String(
                        item.tier_name ||
                        item.tierName ||
                        item.tier ||
                        item.grade ||
                        ""
                    );


                return (
                    tier ===
                    selectedTier
                );

            });

    }


    const sort =
        itemSortFilter
            ? itemSortFilter.value
            : "lowest";


    if (sort === "lowest") {

        filtered.sort(
            (a, b) =>
                getItemPrice(a) -
                getItemPrice(b)
        );

    }


    if (sort === "highest") {

        filtered.sort(
            (a, b) =>
                getItemHighestPrice(b) -
                getItemHighestPrice(a)
        );

    }


    if (sort === "average") {

        filtered.sort(
            (a, b) =>
                getItemAveragePrice(b) -
                getItemAveragePrice(a)
        );

    }


    if (sort === "trade") {

        filtered.sort(
            (a, b) =>
                getItemTradeCount(b) -
                getItemTradeCount(a)
        );

    }


    filtered.forEach(item => {

        const itemName =
            item.item_name ||
            item.itemName ||
            item.name ||
            "-";


        const tier =
            item.tier_name ||
            item.tierName ||
            item.tier ||
            item.grade ||
            "-";


        const quality =
            item.quality ||
            item.quality_name ||
            item.qualityName ||
            "-";


        const lowest =
            getItemPrice(item);


        const average =
            getItemAveragePrice(item);


        const highest =
            getItemHighestPrice(item);


        const trade =
            getItemTradeCount(item);


        const current =
            item.current_count ??
            item.currentCount ??
            item.registered_count ??
            item.registeredCount ??
            item.count ??
            "-";


        const row =
            document.createElement(
                "tr"
            );


        row.innerHTML = `

            <td>${itemName}</td>

            <td>${tier}</td>

            <td>${quality}</td>

            <td>
                ${
                    lowest
                        ? formatNumber(lowest)
                        : "-"
                }
            </td>

            <td>
                ${
                    average
                        ? formatNumber(average)
                        : "-"
                }
            </td>

            <td>
                ${
                    highest
                        ? formatNumber(highest)
                        : "-"
                }
            </td>

            <td>
                ${
                    trade
                        ? formatNumber(trade)
                        : "-"
                }
            </td>

            <td>${current}</td>

        `;


        marketBody.appendChild(
            row
        );

    });


    if (marketStatus) {

        marketStatus.textContent =
            `검색 결과 ${filtered.length.toLocaleString()}개`;

    }

}


// ============================================================
// 가격 추출
// ============================================================

function getItemPrice(item) {

    const value =
        item.lowest_price ??
        item.lowestPrice ??
        item.min_price ??
        item.minPrice ??
        item.price ??
        item.sell_price ??
        item.sellPrice;


    return Number(value) || 0;

}


function getItemAveragePrice(item) {

    const value =
        item.average_price ??
        item.averagePrice ??
        item.avg_price ??
        item.avgPrice ??
        item.average;


    return Number(value) || 0;

}


function getItemHighestPrice(item) {

    const value =
        item.highest_price ??
        item.highestPrice ??
        item.max_price ??
        item.maxPrice ??
        item.highest;


    return Number(value) || 0;

}


function getItemTradeCount(item) {

    const value =
        item.trade_count ??
        item.tradeCount ??
        item.transaction_count ??
        item.transactionCount ??
        item.volume ??
        item.quantity;


    return Number(value) || 0;

}


// ============================================================
// 시세 검색
// ============================================================

if (itemSearchButton) {

    itemSearchButton.addEventListener(
        "click",
        () => {

            loadMarket();

        }
    );

}


if (itemSearchInput) {

    itemSearchInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                loadMarket();

            }

        }
    );

}


if (itemTierFilter) {

    itemTierFilter.addEventListener(
        "change",
        () => {

            displayMarket(
                currentMarketData
            );

        }
    );

}


if (itemSortFilter) {

    itemSortFilter.addEventListener(
        "change",
        () => {

            displayMarket(
                currentMarketData
            );

        }
    );

}


// ============================================================
// 시작
// ============================================================

buildServerFilter();


if (serverFilter) {

    serverFilter.value =
        "all";

}


currentHistoryDate =
    "current";


if (historyFilter) {

    historyFilter.value =
        "current";

}


loadHistoryDates();

loadAllRanking();
