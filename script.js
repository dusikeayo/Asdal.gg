```javascript
// ============================================================
// 아스달 지지 - 전체 스크립트
// 랭킹 + 과거 랭킹 + 플레이어 기록 + 거래소
// ============================================================


// ============================================================
// 기본 요소
// ============================================================

const rankingBody =
    document.getElementById("rankingBody");

const serverFilter =
    document.getElementById("serverFilter");

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");

const sortFilter =
    document.getElementById("sortFilter");

const historyFilter =
    document.getElementById("historyFilter");

const rankingStatus =
    document.getElementById("rankingStatus");


// 거래소

const auctionSearchInput =
    document.getElementById("auctionSearchInput");

const auctionSearchButton =
    document.getElementById("auctionSearchButton");

const auctionStatus =
    document.getElementById("auctionStatus");

const auctionResults =
    document.getElementById("auctionResults");


// ============================================================
// 월드 목록
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
// 현재 데이터
// ============================================================

let currentData = [];

let currentHistoryDate =
    "current";

let historyCache = {};


// ============================================================
// 페이지 전환
// ============================================================

const navButtons =
    document.querySelectorAll(".nav-button");

const pages =
    document.querySelectorAll(".page");


navButtons.forEach(
    function (button) {

        button.addEventListener(
            "click",
            function () {

                const pageId =
                    button.dataset.page;


                navButtons.forEach(
                    function (item) {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                pages.forEach(
                    function (page) {

                        page.classList.remove(
                            "active-page"
                        );

                    }
                );


                button.classList.add(
                    "active"
                );


                const page =
                    document.getElementById(
                        pageId
                    );


                if (page) {

                    page.classList.add(
                        "active-page"
                    );

                }

            }
        );

    }
);


// ============================================================
// 서버 선택창
// ============================================================

if (serverFilter) {

    serverFilter.innerHTML = "";


    const allOption =
        document.createElement("option");

    allOption.value =
        "all";

    allOption.textContent =
        "전체 서버";

    serverFilter.appendChild(
        allOption
    );


    Object.entries(worlds).forEach(
        function ([serverName, worldId]) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                worldId;

            option.textContent =
                serverName;

            serverFilter.appendChild(
                option
            );

        }
    );

}


// ============================================================
// 서버 이름 찾기
// ============================================================

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


// ============================================================
// 숫자 표시
// ============================================================

function formatNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "-";

    }


    const number =
        Number(value);


    if (
        Number.isNaN(number)
    ) {

        return "-";

    }


    return number.toLocaleString();

}


// ============================================================
// 변화량
// ============================================================

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


// ============================================================
// 과거 날짜
// ============================================================

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
            document.createElement(
                "option"
            );


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
                    document.createElement(
                        "option"
                    );


                option.value =
                    date;

                option.textContent =
                    date +
                    " 랭킹";


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
        getServerName(
            worldId
        );


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
                encodeURIComponent(
                    worldId
                )
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

                    랭킹 데이터를
                    불러오지 못했습니다.

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

                전체 서버 랭킹을
                불러오는 중입니다...

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

                <td colspan="6">

                    전체 랭킹을
                    불러오지 못했습니다.

                </td>

            </tr>

        `;

    }

}


// ============================================================
// 과거 랭킹 데이터
// ============================================================

async function getHistoryData(date) {

    if (
        historyCache[date]
    ) {

        return historyCache[date];

    }


    const response =
        await fetch(
            "/api/history?date=" +
            encodeURIComponent(
                date
            )
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
            await getHistoryData(
                date
            );


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

                    ${date}
                    의 랭킹 데이터가 없습니다.

                </td>

            </tr>

        `;

    }

}


// ============================================================
// 검색 / 서버 / 정렬
// ============================================================

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
        sortFilter.value ===
        "power"
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
        sortFilter.value ===
        "level"
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
        sortFilter.value ===
        "nickname"
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


// ============================================================
// 랭킹 출력
// ============================================================

function displayRanking(data) {

    rankingBody.innerHTML = "";


    if (
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
                document.createElement(
                    "tr"
                );


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
                        ? formatNumber(
                            player.power
                        )
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


// ============================================================
// 날짜 배열
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


    return result.dates || [];

}


// ============================================================
// 현재 플레이어 찾기
// ============================================================

async function findPlayerInCurrentRanking(
    player
) {

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


        return (
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
            ) || null
        );


    } catch (error) {

        console.error(
            "현재 플레이어 검색 실패:",
            error
        );


        return null;

    }

}


// ============================================================
// 플레이어 과거 기록
// ============================================================

async function getPlayerHistory(
    player
) {

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
                a.date ===
                "현재"
            ) {

                return -1;

            }


            if (
                b.date ===
                "현재"
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


// ============================================================
// 플레이어 기록 모달
// ============================================================

async function openPlayerHistory(
    player
) {

    const modal =
        createHistoryModal();


    const content =
        modal.querySelector(
            ".player-history-content"
        );


    content.innerHTML = `

        <div class="history-loading">

            ${player.name || "-"}
            의 과거 기록을 불러오는 중...

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
                ? current.power -
                  previous.power
                : 0;


        const rankChange =
            previous
                ? previous.rank -
                  current.rank
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
            function (
                record,
                index
            ) {

                const previousRecord =
                    records[index + 1] ||
                    null;


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
                            ${formatNumber(
                                record.power
                            )}
                        </td>

                        <td>

                            ${
                                record.rank
                                ? formatNumber(
                                    record.rank
                                ) + "위"
                                : "-"
                            }

                        </td>

                        <td>

                            ${
                                previousRecord
                                ? formatChange(
                                    powerChange
                                )
                                : "-"
                            }

                        </td>

                        <td>

                            ${
                                previousRecord
                                ? formatChange(
                                    rankChange
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

                과거 기록을
                불러오지 못했습니다.

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
                event.target ===
                overlay
            ) {

                modal.style.display =
                    "none";

            }

        }
    );


    return modal;

}


// ============================================================
// 거래소 검색
// ============================================================

async function searchAuction() {

    const keyword =
        auctionSearchInput.value.trim();


    if (!keyword) {

        auctionStatus.textContent =
            "아이템 이름을 입력해주세요.";

        auctionResults.innerHTML =
            "";

        return;

    }


    auctionStatus.textContent =
        `"${keyword}" 거래소를 검색하는 중입니다...`;


    auctionResults.innerHTML = `

        <div class="auction-loading">

            거래소 데이터를 불러오는 중입니다...

        </div>

    `;


    try {

        const response =
            await fetch(
                "/api/auction?itemname=" +
                encodeURIComponent(
                    keyword
                )
            );


        if (!response.ok) {

            throw new Error(
                "거래소 서버 오류: " +
                response.status
            );

        }


        const result =
            await response.json();


        const data =
            result?.resultData?.resData ||
            [];


        const totalCount =
            Number(
                result?.resultData?.total_count
            ) || 0;


        auctionStatus.textContent =
            `"${keyword}" 검색 결과 ` +
            `${data.length}개` +
            (
                totalCount
                    ? ` / 전체 ${formatNumber(totalCount)}개`
                    : ""
            );


        displayAuctionResults(
            data
        );


    } catch (error) {

        console.error(
            "거래소 검색 오류:",
            error
        );


        auctionStatus.textContent =
            "거래소 데이터를 불러오지 못했습니다.";


        auctionResults.innerHTML = `

            <div class="auction-empty">

                거래소 데이터를
                불러오지 못했습니다.

            </div>

        `;

    }

}


// ============================================================
// 거래소 결과 출력
// ============================================================

function displayAuctionResults(
    data
) {

    auctionResults.innerHTML =
        "";


    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {

        auctionResults.innerHTML = `

            <div class="auction-empty">

                검색된 아이템이 없습니다.

            </div>

        `;

        return;

    }


    data.forEach(
        function (item) {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "auction-card";


            const icon =
                item.icon_url ||
                "";


            const itemName =
                item.item_name ||
                "이름 없음";


            const quality =
                item.quality ||
                "-";


            const tier =
                item.tier ||
                "-";


            const reinforce =
                Number(
                    item.reinforce_level
                ) || 0;


            const tradeLowest =
                Number(
                    item.trade_lowest_price
                ) || 0;


            const tradeHighest =
                Number(
                    item.trade_highest_price
                ) || 0;


            const tradeAverage =
                Number(
                    item.trade_avg_price
                ) || 0;


            const tradeCount =
                Number(
                    item.trade_count
                ) || 0;


            const nowLowest =
                Number(
                    item.now_lowest_price
                ) || 0;


            const registCount =
                Number(
                    item.regist_count
                ) || 0;


            const reinforceText =
                reinforce > 0
                    ? `+${reinforce}`
                    : "";


            card.innerHTML = `

                <div class="auction-card-top">

                    <div class="auction-item-info">

                        <div class="auction-icon">

                            ${
                                icon
                                ? `
                                    <img
                                        src="${icon}"
                                        alt="${itemName}"
                                        loading="lazy"
                                    >
                                `
                                : `
                                    <div class="auction-no-icon">
                                        ?
                                    </div>
                                `
                            }

                        </div>


                        <div>

                            <div class="auction-item-name">

                                ${
                                    reinforceText
                                    ? `
                                        <span class="auction-reinforce">
                                            ${reinforceText}
                                        </span>
                                    `
                                    : ""
                                }

                                ${itemName}

                            </div>


                            <div class="auction-item-tags">

                                <span>
                                    ${tier}
                                </span>

                                <span>
                                    ${quality}
                                </span>

                            </div>

                        </div>

                    </div>

                </div>


                <div class="auction-price-grid">


                    <div class="auction-price-box">

                        <div class="auction-price-title">
                            최근 최저 거래가
                        </div>

                        <div class="auction-price-value">
                            ${
                                tradeLowest > 0
                                ? formatNumber(
                                    tradeLowest
                                )
                                : "거래 없음"
                            }
                        </div>

                    </div>


                    <div class="auction-price-box">

                        <div class="auction-price-title">
                            최근 최고 거래가
                        </div>

                        <div class="auction-price-value">
                            ${
                                tradeHighest > 0
                                ? formatNumber(
                                    tradeHighest
                                )
                                : "거래 없음"
                            }
                        </div>

                    </div>


                    <div class="auction-price-box">

                        <div class="auction-price-title">
                            평균 거래가
                        </div>

                        <div class="auction-price-value">
                            ${
                                tradeAverage > 0
                                ? formatNumber(
                                    tradeAverage
                                )
                                : "거래 없음"
                            }
                        </div>

                    </div>


                    <div class="auction-price-box">

                        <div class="auction-price-title">
                            거래 횟수
                        </div>

                        <div class="auction-price-value">

                            ${formatNumber(
                                tradeCount
                            )}
                            회

                        </div>

                    </div>


                    <div class="auction-price-box">

                        <div class="auction-price-title">
                            현재 최저가
                        </div>

                        <div class="auction-price-value">

                            ${
                                nowLowest > 0
                                ? formatNumber(
                                    nowLowest
                                )
                                : "판매 없음"
                            }

                        </div>

                    </div>


                    <div class="auction-price-box">

                        <div class="auction-price-title">
                            현재 등록 매물
                        </div>

                        <div class="auction-price-value">

                            ${formatNumber(
                                registCount
                            )}
                            개

                        </div>

                    </div>


                </div>

            `;


            auctionResults.appendChild(
                card
            );

        }
    );

}


// ============================================================
// 거래소 검색 버튼
// ============================================================

if (auctionSearchButton) {

    auctionSearchButton.addEventListener(
        "click",
        function () {

            searchAuction();

        }
    );

}


// ============================================================
// 거래소 엔터 검색
// ============================================================

if (auctionSearchInput) {

    auctionSearchInput.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key ===
                "Enter"
            ) {

                searchAuction();

            }

        }
    );

}


// ============================================================
// 서버 변경
// ============================================================

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
            selectedServer ===
            "all"
        ) {

            await loadAllRanking();

        } else {

            await loadRanking();

        }

    }
);


// ============================================================
// 날짜 변경
// ============================================================

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


// ============================================================
// 검색 버튼
// ============================================================

searchButton.addEventListener(
    "click",
    function () {

        applyFiltersAndSort();

    }
);


// ============================================================
// 닉네임 엔터 검색
// ============================================================

searchInput.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key ===
            "Enter"
        ) {

            applyFiltersAndSort();

        }

    }
);


// ============================================================
// 정렬 변경
// ============================================================

sortFilter.addEventListener(
    "change",
    function () {

        applyFiltersAndSort();

    }
);


// ============================================================
// 시작
// ============================================================

serverFilter.value =
    "all";


currentHistoryDate =
    "current";


loadHistoryDates();

loadAllRanking();
```
