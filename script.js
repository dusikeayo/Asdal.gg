// ============================================================
// 아스달 지지 - 전체 script.js
// 랭킹 + 과거 랭킹 + 플레이어 기록 + 거래소
// ============================================================


// ============================================================
// HTML 요소
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
// 랭킹 서버
// ============================================================

const worlds = {

    "뉴월드": 3000,
    "글로벌": 1000,
    "크라본": 70110

};


// ============================================================
// 랭킹 서버 그룹
// ============================================================

const serverGroups = {

    "뉴월드": [
        ["뉴월드", 3000]
    ],

    "글로벌": [
        ["글로벌", 1000]
    ],

    "크라본": [
        ["크라본", 70110]
    ]

};


// ============================================================
// 거래소 서버
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
// 전역 데이터
// ============================================================

let currentData = [];

let currentHistoryDate = "current";

let historyCache = {};

let currentMarketData = [];

let currentAuctionServer = "newworld";


// ============================================================
// 공통 숫자 처리
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
// 변화량 표시
// ============================================================

function formatChange(value) {

    const number = Number(value) || 0;

    if (number > 0) {

        return `
            <span style="
                color:#4ade80;
                font-weight:bold;
            ">
                ▲ ${formatNumber(number)}
            </span>
        `;

    }

    if (number < 0) {

        return `
            <span style="
                color:#f87171;
                font-weight:bold;
            ">
                ▼ ${formatNumber(Math.abs(number))}
            </span>
        `;

    }

    return `
        <span style="
            color:#999;
        ">
            - 0
        </span>
    `;

}


// ============================================================
// 서버 이름
// ============================================================

function getServerName(worldId) {

    return Object.keys(worlds).find(
        function (name) {

            return String(worlds[name]) === String(worldId);

        }
    ) || "";

}


// ============================================================
// 랭킹 서버 선택창
// ============================================================

function buildServerFilter() {

    if (!serverFilter) {
        return;
    }

    serverFilter.innerHTML = "";

    const allOption =
        document.createElement("option");

    allOption.value = "all";
    allOption.textContent = "전체 서버";

    serverFilter.appendChild(allOption);


    Object.entries(serverGroups).forEach(
        function ([groupName, servers]) {

            const group =
                document.createElement("optgroup");

            group.label = groupName;


            servers.forEach(
                function ([serverName, worldId]) {

                    const option =
                        document.createElement("option");

                    option.value = worldId;
                    option.textContent = serverName;

                    group.appendChild(option);

                }
            );


            serverFilter.appendChild(group);

        }
    );

}


// ============================================================
// 거래소 서버 선택창
// ============================================================

let auctionServerFilter =
    document.getElementById("auctionServerFilter");


function buildAuctionServerFilter() {

    if (!auctionServerFilter) {

        const searchBox =
            document.querySelector(".market-search-box");

        if (!searchBox) {
            return;
        }


        auctionServerFilter =
            document.createElement("select");

        auctionServerFilter.id =
            "auctionServerFilter";


        auctionServerFilter.innerHTML = `

            <option value="newworld">
                뉴월드 거래소
            </option>

            <option value="global">
                글로벌 거래소
            </option>

            <option value="krabon">
                크라본 거래소
            </option>

        `;


        searchBox.insertBefore(
            auctionServerFilter,
            searchBox.firstChild
        );

    }


    auctionServerFilter.value =
        currentAuctionServer;


    auctionServerFilter.onchange =
        function () {

            currentAuctionServer =
                auctionServerFilter.value;

            loadMarket();

        };

}


// ============================================================
// 과거 랭킹 날짜
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

                historyFilter.appendChild(option);

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

                ${serverName}
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
                "서버 오류 " +
                response.status
            );

        }


        const result =
            await response.json();


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

                    <br><br>

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
                "서버 오류 " +
                response.status
            );

        }


        const result =
            await response.json();


        currentData =
            Array.isArray(result.data)
                ? result.data
                : [];


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

                    전체 랭킹 데이터를 불러오지 못했습니다.

                    <br><br>

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


// ============================================================
// 과거 랭킹
// ============================================================

async function loadHistoryRanking(date) {

    rankingBody.innerHTML = `

        <tr>

            <td colspan="6">

                ${date}
                랭킹을 불러오는 중입니다...

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

                    ${date}
                    의 랭킹 데이터가 없습니다.

                </td>

            </tr>

        `;

    }

}


// ============================================================
// 검색 / 정렬
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


                let serverMatch = true;


                if (
                    selectedServer !== "all"
                ) {

                    serverMatch =
                        String(
                            player.server || ""
                        ) ===
                        String(
                            getServerName(
                                selectedServer
                            )
                        );

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
        sortFilter &&
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
        sortFilter &&
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


    displayRanking(filteredData);

}


// ============================================================
// 랭킹 출력
// ============================================================

function displayRanking(data) {

    rankingBody.innerHTML = "";


    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {

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
                player.rank ||
                index + 1;


            row.innerHTML = `

                <td>
                    ${rank}
                </td>

                <td
                    class="nickname-history"
                    style="
                        cursor:pointer;
                        color:#4da6ff;
                        font-weight:bold;
                        text-decoration:underline;
                    "
                    title="클릭하면 과거 기록을 확인할 수 있습니다."
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
                    function (event) {

                        event.preventDefault();
                        event.stopPropagation();

                        console.log(
                            "[아스달 지지] 이름 클릭:",
                            player.name,
                            player.server
                        );


                        openPlayerHistory(
                            player
                        );

                    }
                );

            }


            rankingBody.appendChild(row);

        }
    );

}


// ============================================================
// 현재 랭킹에서 플레이어 찾기
// ============================================================

async function findPlayerInCurrentRanking(player) {

    try {

        const found =
            currentData.find(
                function (item) {

                    return (

                        String(
                            item.name || ""
                        ) ===
                        String(
                            player.name || ""
                        )

                        &&

                        String(
                            item.server || ""
                        ) ===
                        String(
                            player.server || ""
                        )

                    );

                }
            );


        if (found) {
            return found;
        }


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
            function (item) {

                return (

                    String(
                        item.name || ""
                    ) ===
                    String(
                        player.name || ""
                    )

                    &&

                    String(
                        item.server || ""
                    ) ===
                    String(
                        player.server || ""
                    )

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


// ============================================================
// 플레이어 과거 기록 가져오기
// ============================================================

async function getPlayerHistory(player) {

    const dates =
        await loadHistoryDateArray();


    const records = [];


    for (
        const date of dates
    ) {

        try {

            const history =
                await getHistoryData(date);


            const data =
                Array.isArray(history.data)
                    ? history.data
                    : [];


            const match =
                data.find(
                    function (item) {

                        return (

                            String(
                                item.name || ""
                            ) ===
                            String(
                                player.name || ""
                            )

                            &&

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

                    date: date,

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
                            match.totalRank ||
                            match.rank
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


    const foundCurrent =
        await findPlayerInCurrentRanking(
            player
        );


    if (foundCurrent) {

        currentPlayer =
            foundCurrent;

    }


    if (currentPlayer) {

        records.unshift({

            date: "현재",

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
                    currentPlayer.totalRank ||
                    currentPlayer.rank
                ) || 0

        });

    }


    records.sort(
        function (a, b) {

            if (a.date === "현재") {
                return -1;
            }

            if (b.date === "현재") {
                return 1;
            }

            return String(b.date)
                .localeCompare(
                    String(a.date)
                );

        }
    );


    return records;

}


// ============================================================
// 날짜 목록
// ============================================================

async function loadHistoryDateArray() {

    const response =
        await fetch("/api/history-dates");


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
// 플레이어 기록 모달 열기
// ============================================================

async function openPlayerHistory(player) {

    console.log(
        "[아스달 지지] 플레이어 기록 열기:",
        player
    );


    const modal =
        createHistoryModal();


    const content =
        modal.querySelector(
            ".player-history-content"
        );


    content.innerHTML = `

        <div style="
            text-align:center;
            padding:50px 20px;
            font-size:18px;
        ">

            ${player.name || "-"}
            의 과거 기록을 불러오는 중...

        </div>

    `;


    // 강제로 화면에 표시
    modal.style.display = "flex";


    try {

        const records =
            await getPlayerHistory(
                player
            );


        if (
            !records ||
            records.length === 0
        ) {

            content.innerHTML = `

                <div style="
                    text-align:center;
                    padding:60px 20px;
                    font-size:18px;
                ">

                    <div style="
                        font-size:24px;
                        margin-bottom:15px;
                    ">
                        ${player.name || "-"}
                    </div>

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
                ? current.power -
                  previous.power
                : 0;


        const rankChange =
            previous
                ? previous.rank -
                  current.rank
                : 0;


        let html = `

            <div style="
                margin-bottom:25px;
            ">

                <div style="
                    font-size:28px;
                    font-weight:bold;
                    margin-bottom:8px;
                ">

                    ${player.name || "-"}

                </div>


                <div style="
                    color:#aaa;
                    font-size:15px;
                ">

                    ${player.server || "-"}
                    ·
                    ${player.main_job || "-"}

                </div>

            </div>


            <div style="
                display:grid;
                grid-template-columns:
                    repeat(3, 1fr);
                gap:15px;
                margin-bottom:30px;
            ">


                <div style="
                    background:#1c1c1c;
                    border-radius:10px;
                    padding:20px;
                    text-align:center;
                ">

                    <div style="
                        color:#999;
                        font-size:14px;
                        margin-bottom:10px;
                    ">

                        현재 전투력

                    </div>

                    <div style="
                        font-size:24px;
                        font-weight:bold;
                    ">

                        ${formatNumber(current.power)}

                    </div>

                </div>


                <div style="
                    background:#1c1c1c;
                    border-radius:10px;
                    padding:20px;
                    text-align:center;
                ">

                    <div style="
                        color:#999;
                        font-size:14px;
                        margin-bottom:10px;
                    ">

                        전투력 변화

                    </div>

                    <div style="
                        font-size:20px;
                        font-weight:bold;
                    ">

                        ${
                            previous
                            ? formatChange(powerChange)
                            : "-"
                        }

                    </div>

                </div>


                <div style="
                    background:#1c1c1c;
                    border-radius:10px;
                    padding:20px;
                    text-align:center;
                ">

                    <div style="
                        color:#999;
                        font-size:14px;
                        margin-bottom:10px;
                    ">

                        순위 변화

                    </div>

                    <div style="
                        font-size:20px;
                        font-weight:bold;
                    ">

                        ${
                            previous
                            ? formatChange(rankChange)
                            : "-"
                        }

                    </div>

                </div>


            </div>


            <div style="
                overflow-x:auto;
            ">

                <table style="
                    width:100%;
                    border-collapse:collapse;
                    min-width:800px;
                ">

                    <thead>

                        <tr>

                            <th style="padding:12px;">
                                날짜
                            </th>

                            <th style="padding:12px;">
                                서버
                            </th>

                            <th style="padding:12px;">
                                직업
                            </th>

                            <th style="padding:12px;">
                                레벨
                            </th>

                            <th style="padding:12px;">
                                전투력
                            </th>

                            <th style="padding:12px;">
                                순위
                            </th>

                            <th style="padding:12px;">
                                전투력 변화
                            </th>

                            <th style="padding:12px;">
                                순위 변화
                            </th>

                        </tr>

                    </thead>


                    <tbody>

        `;


        records.forEach(
            function (record, index) {

                const previousRecord =
                    records[index + 1] ||
                    null;


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

                        <td style="padding:12px;">
                            ${record.date}
                        </td>

                        <td style="padding:12px;">
                            ${record.server || "-"}
                        </td>

                        <td style="padding:12px;">
                            ${record.main_job || "-"}
                        </td>

                        <td style="padding:12px;">
                            ${record.level ?? "-"}
                        </td>

                        <td style="padding:12px;">
                            ${formatNumber(record.power)}
                        </td>

                        <td style="padding:12px;">

                            ${
                                record.rank
                                ? formatNumber(record.rank) + "위"
                                : "-"
                            }

                        </td>

                        <td style="padding:12px;">

                            ${
                                previousRecord
                                ? formatChange(recordPowerChange)
                                : "-"
                            }

                        </td>

                        <td style="padding:12px;">

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

            <div style="
                text-align:center;
                padding:60px 20px;
            ">

                <div style="
                    font-size:20px;
                    margin-bottom:15px;
                ">

                    기록을 불러오지 못했습니다.

                </div>


                <div style="
                    color:#888;
                    font-size:14px;
                ">

                    ${error.message}

                </div>

            </div>

        `;

    }

}


// ============================================================
// 플레이어 기록 모달 생성
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
        document.createElement("div");


    modal.id =
        "playerHistoryModal";


    // CSS 파일과 관계없이 무조건 보이도록 설정
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100vw";
    modal.style.height = "100vh";

    modal.style.background =
        "rgba(0, 0, 0, 0.8)";

    modal.style.display = "none";

    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";

    modal.style.zIndex = "999999";

    modal.style.boxSizing = "border-box";


    modal.innerHTML = `

        <div
            class="player-history-modal"
            style="
                position:relative;
                width:90%;
                max-width:1200px;
                max-height:85vh;
                overflow:auto;

                background:#111;
                color:#fff;

                border:1px solid #333;
                border-radius:15px;

                padding:30px;

                box-sizing:border-box;

                box-shadow:
                    0 20px 80px
                    rgba(0,0,0,0.7);
            "
        >

            <button
                id="playerHistoryClose"
                type="button"
                style="
                    position:absolute;
                    top:12px;
                    right:15px;

                    width:40px;
                    height:40px;

                    border:0;
                    border-radius:50%;

                    background:#222;
                    color:#fff;

                    font-size:28px;
                    line-height:40px;

                    cursor:pointer;

                    z-index:10;
                "
            >
                ×
            </button>


            <div
                class="player-history-content"
            >

            </div>

        </div>

    `;


    document.body.appendChild(modal);


    const closeButton =
        modal.querySelector(
            "#playerHistoryClose"
        );


    closeButton.addEventListener(
        "click",
        function () {

            modal.style.display =
                "none";

        }
    );


    modal.addEventListener(
        "click",
        function (event) {

            if (
                event.target === modal
            ) {

                modal.style.display =
                    "none";

            }

        }
    );


    // ESC 키로 닫기
    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                modal.style.display === "flex"
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

}


// ============================================================
// 과거 날짜 변경
// ============================================================

if (historyFilter) {

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

}


// ============================================================
// 검색
// ============================================================

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


// ============================================================
// 정렬
// ============================================================

if (sortFilter) {

    sortFilter.addEventListener(
        "change",
        function () {

            applyFiltersAndSort();

        }
    );

}


// ============================================================
// 랭킹 / 거래소 전환
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

            loadMarket();

        }
    );

}


// ============================================================
// 거래소 불러오기
// ============================================================

async function loadMarket() {

    if (!marketBody) {
        return;
    }


    const itemName =
        itemSearchInput
            ? itemSearchInput.value.trim()
            : "";


    const server =
        currentAuctionServer;


    const serverInfo =
        auctionServers[server];


    marketBody.innerHTML = `

        <tr>

            <td colspan="8">

                ${
                    serverInfo
                    ? serverInfo.name
                    : ""
                }

                거래소를 불러오는 중입니다...

            </td>

        </tr>

    `;


    if (marketStatus) {

        marketStatus.textContent =
            (
                serverInfo
                ? serverInfo.name
                : ""
            ) +
            " 거래소 데이터를 불러오는 중입니다...";

    }


    try {

        const apiUrl =
            "/api/auction" +
            "?server=" +
            encodeURIComponent(server) +
            "&itemname=" +
            encodeURIComponent(itemName);


        console.log(
            "[MARKET REQUEST]",
            apiUrl
        );


        const response =
            await fetch(apiUrl);


        if (!response.ok) {

            throw new Error(
                "거래소 서버 오류 " +
                response.status
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
            result.resultData &&
            Array.isArray(
                result.resultData.data
            )
        ) {

            data =
                result.resultData.data;

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


        marketBody.innerHTML = `

            <tr>

                <td colspan="8">

                    거래소 데이터를 불러오지 못했습니다.

                    <br><br>

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

    if (!marketBody) {
        return;
    }


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

            const serverInfo =
                auctionServers[
                    currentAuctionServer
                ];


            marketStatus.textContent =
                (
                    serverInfo
                    ? serverInfo.name
                    : ""
                ) +
                " 거래소 검색 결과 0개";

        }


        return;

    }


    let filtered =
        [...data];


    const keyword =
        itemSearchInput
            ? itemSearchInput.value.trim()
            : "";


    if (keyword) {

        filtered =
            filtered.filter(
                function (item) {

                    const name =
                        String(
                            item.item_name ||
                            item.itemName ||
                            item.name ||
                            ""
                        );


                    return name.includes(
                        keyword
                    );

                }
            );

    }


    if (
        itemTierFilter &&
        itemTierFilter.value !== "all"
    ) {

        const tier =
            itemTierFilter.value;


        filtered =
            filtered.filter(
                function (item) {

                    const itemTier =
                        String(
                            item.tier_name ||
                            item.tierName ||
                            item.tier ||
                            item.grade ||
                            ""
                        );


                    return itemTier === tier;

                }
            );

    }


    if (itemSortFilter) {

        const sort =
            itemSortFilter.value;


        if (sort === "lowest") {

            filtered.sort(
                function (a, b) {

                    return (
                        getItemPrice(a) -
                        getItemPrice(b)
                    );

                }
            );

        }


        if (sort === "highest") {

            filtered.sort(
                function (a, b) {

                    return (
                        getItemHighestPrice(b) -
                        getItemHighestPrice(a)
                    );

                }
            );

        }


        if (sort === "average") {

            filtered.sort(
                function (a, b) {

                    return (
                        getItemAveragePrice(b) -
                        getItemAveragePrice(a)
                    );

                }
            );

        }


        if (sort === "trade") {

            filtered.sort(
                function (a, b) {

                    return (
                        getItemTradeCount(b) -
                        getItemTradeCount(a)
                    );

                }
            );

        }

    }


    filtered.forEach(
        function (item) {

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
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${itemName}
                </td>

                <td>
                    ${tier}
                </td>

                <td>
                    ${quality}
                </td>

                <td>
                    ${
                        lowest === 0
                        ? "-"
                        : formatNumber(lowest)
                    }
                </td>

                <td>
                    ${
                        average === 0
                        ? "-"
                        : formatNumber(average)
                    }
                </td>

                <td>
                    ${
                        highest === 0
                        ? "-"
                        : formatNumber(highest)
                    }
                </td>

                <td>
                    ${
                        trade === 0
                        ? "-"
                        : formatNumber(trade)
                    }
                </td>

                <td>
                    ${current}
                </td>

            `;


            marketBody.appendChild(row);

        }
    );


    if (marketStatus) {

        const serverInfo =
            auctionServers[
                currentAuctionServer
            ];


        marketStatus.textContent =
            (
                serverInfo
                ? serverInfo.name
                : ""
            ) +
            " 거래소 검색 결과 " +
            filtered.length +
            "개";

    }

}


// ============================================================
// 거래소 가격
// ============================================================

function getItemPrice(item) {

    const value =
        item.lowest_price ??
        item.lowestPrice ??
        item.min_price ??
        item.minPrice ??
        item.price;


    return Number(value) || 0;

}


function getItemAveragePrice(item) {

    const value =
        item.average_price ??
        item.averagePrice ??
        item.avg_price ??
        item.avgPrice;


    return Number(value) || 0;

}


function getItemHighestPrice(item) {

    const value =
        item.highest_price ??
        item.highestPrice ??
        item.max_price ??
        item.maxPrice;


    return Number(value) || 0;

}


function getItemTradeCount(item) {

    const value =
        item.trade_count ??
        item.tradeCount ??
        item.transaction_count ??
        item.transactionCount ??
        item.volume;


    return Number(value) || 0;

}


// ============================================================
// 거래소 검색
// ============================================================

if (itemSearchButton) {

    itemSearchButton.addEventListener(
        "click",
        function () {

            loadMarket();

        }
    );

}


if (itemSearchInput) {

    itemSearchInput.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter"
            ) {

                loadMarket();

            }

        }
    );

}


if (itemTierFilter) {

    itemTierFilter.addEventListener(
        "change",
        function () {

            displayMarket(
                currentMarketData
            );

        }
    );

}


if (itemSortFilter) {

    itemSortFilter.addEventListener(
        "change",
        function () {

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

buildAuctionServerFilter();


if (serverFilter) {

    serverFilter.value = "all";

}


currentHistoryDate = "current";


loadHistoryDates();

loadAllRanking();
