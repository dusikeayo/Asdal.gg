const rankingBody = document.getElementById("rankingBody");

const serverFilter = document.getElementById("serverFilter");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const sortFilter = document.getElementById("sortFilter");
const historyFilter = document.getElementById("historyFilter");
const rankingStatus = document.getElementById("rankingStatus");

const trackingName = document.getElementById("trackingName");
const trackingServer = document.getElementById("trackingServer");
const trackingButton = document.getElementById("trackingButton");
const trackingStatus = document.getElementById("trackingStatus");
const trackingResult = document.getElementById("trackingResult");

const guildSearchInput = document.getElementById("guildSearchInput");
const guildSearchButton = document.getElementById("guildSearchButton");
const guildStatus = document.getElementById("guildStatus");
const guildResult = document.getElementById("guildResult");

const navButtons = document.querySelectorAll(".nav-button");
const pages = document.querySelectorAll(".page");


/* =========================================
   서버 목록
========================================= */

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


/* =========================================
   전역 데이터
========================================= */

let currentData = [];
let currentHistoryDate = null;
let historyCache = {};

let previousPage = "rankingPage";


/* =========================================
   HTML 이스케이프
========================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================
   숫자 포맷
========================================= */

function formatNumber(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString("ko-KR");
}


/* =========================================
   날짜 포맷
========================================= */

function formatDate(date) {

    if (!date) {
        return "";
    }

    const parts = String(date).split("-");

    if (parts.length !== 3) {
        return date;
    }

    return `${parts[0]}.${parts[1]}.${parts[2]}`;
}


/* =========================================
   페이지 이동
========================================= */

function showPage(pageId) {

    pages.forEach(page => {
        page.classList.toggle(
            "active",
            page.id === pageId
        );
    });

    navButtons.forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === pageId
        );
    });

    if (pageId === "guildPage") {
        guildSearchInput.focus();
    }

    if (pageId === "trackingPage") {
        trackingName.focus();
    }
}


navButtons.forEach(button => {

    button.addEventListener("click", () => {

        const pageId = button.dataset.page;

        if (pageId !== "trackingPage") {
            previousPage = pageId;
        }

        showPage(pageId);
    });

});


/* =========================================
   서버 셀렉트 생성
========================================= */

function populateServerSelects() {

    const serverOptions = Object.entries(worlds)
        .map(([name, id]) => {
            return `<option value="${id}">${escapeHtml(name)}</option>`;
        })
        .join("");

    serverFilter.innerHTML =
        `<option value="all">전체 서버</option>` +
        serverOptions;

    trackingServer.innerHTML =
        `<option value="all">서버 선택</option>` +
        serverOptions;
}


/* =========================================
   현재 랭킹 로드
========================================= */

async function loadAllRanking() {

    rankingStatus.textContent = "전체 서버 랭킹을 불러오는 중입니다...";

    rankingBody.innerHTML = `
        <tr>
            <td colspan="8" class="loading">
                전체 서버 랭킹을 불러오는 중...
            </td>
        </tr>
    `;

    try {

        const response = await fetch("/api/all-ranking");

        if (!response.ok) {
            throw new Error("랭킹 요청 실패");
        }

        const json = await response.json();

        if (!json || !Array.isArray(json.data)) {
            throw new Error("잘못된 랭킹 데이터");
        }

        currentData = json.data;
        currentHistoryDate = null;

        rankingStatus.textContent =
            `현재 랭킹 ${formatNumber(currentData.length)}명`;

        renderRanking();

    } catch (error) {

        console.error(error);

        rankingStatus.textContent =
            "랭킹을 불러오지 못했습니다.";

        rankingBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty">
                    랭킹을 불러오는 중 오류가 발생했습니다.
                </td>
            </tr>
        `;
    }
}


/* =========================================
   과거 날짜 목록
========================================= */

async function loadHistoryDates() {

    try {

        const response =
            await fetch("/api/history-dates");

        if (!response.ok) {
            return;
        }

        const json = await response.json();

        const dates =
            Array.isArray(json)
                ? json
                : Array.isArray(json.dates)
                    ? json.dates
                    : [];

        historyFilter.innerHTML =
            `<option value="current">현재 랭킹</option>`;

        dates.forEach(date => {

            const option =
                document.createElement("option");

            option.value = date;
            option.textContent =
                `${formatDate(date)} 랭킹`;

            historyFilter.appendChild(option);
        });

    } catch (error) {

        console.error(
            "history dates error:",
            error
        );
    }
}


/* =========================================
   과거 랭킹 가져오기
========================================= */

async function getHistoryData(date) {

    if (historyCache[date]) {
        return historyCache[date];
    }

    const response =
        await fetch(
            `/api/history?date=${encodeURIComponent(date)}`
        );

    if (!response.ok) {
        throw new Error("과거 랭킹 요청 실패");
    }

    const json = await response.json();

    let data = [];

    if (Array.isArray(json)) {
        data = json;
    } else if (Array.isArray(json.data)) {
        data = json.data;
    } else if (
        json.resultData &&
        Array.isArray(json.resultData.resData)
    ) {
        data = json.resultData.resData;
    }

    historyCache[date] = data;

    return data;
}


/* =========================================
   과거 랭킹 선택
========================================= */

async function loadHistoryRanking(date) {

    rankingStatus.textContent =
        `${formatDate(date)} 랭킹을 불러오는 중입니다...`;

    rankingBody.innerHTML = `
        <tr>
            <td colspan="8" class="loading">
                과거 랭킹을 불러오는 중...
            </td>
        </tr>
    `;

    try {

        const data =
            await getHistoryData(date);

        currentData = data;
        currentHistoryDate = date;

        rankingStatus.textContent =
            `${formatDate(date)} 랭킹 ${formatNumber(data.length)}명`;

        renderRanking();

    } catch (error) {

        console.error(error);

        rankingStatus.textContent =
            "과거 랭킹을 불러오지 못했습니다.";

        rankingBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty">
                    해당 날짜의 랭킹을 불러오지 못했습니다.
                </td>
            </tr>
        `;
    }
}


/* =========================================
   정렬
========================================= */

function sortRanking(data) {

    const sortType =
        sortFilter.value;

    const result =
        [...data];

    if (sortType === "power") {

        result.sort((a, b) => {

            return (
                (Number(b.power) || 0) -
                (Number(a.power) || 0)
            );
        });

    } else if (sortType === "level") {

        result.sort((a, b) => {

            return (
                (Number(b.level) || 0) -
                (Number(a.level) || 0)
            );
        });

    } else if (sortType === "nickname") {

        result.sort((a, b) => {

            return String(a.name || "")
                .localeCompare(
                    String(b.name || ""),
                    "ko"
                );
        });

    } else if (sortType === "rank") {

        result.sort((a, b) => {

            return (
                (Number(a.totalRank || a.rank) || 999999) -
                (Number(b.totalRank || b.rank) || 999999)
            );
        });
    }

    return result;
}


/* =========================================
   랭킹 렌더링
========================================= */

function renderRanking() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();

    const selectedServer =
        serverFilter.value;

    let data =
        Array.isArray(currentData)
            ? [...currentData]
            : [];

    if (selectedServer !== "all") {

        data =
            data.filter(player => {

                return String(player.worldId) ===
                    String(selectedServer);
            });
    }

    if (search) {

        data =
            data.filter(player => {

                const name =
                    String(player.name || "")
                        .toLowerCase();

                return name.includes(search);
            });
    }

    data = sortRanking(data);

    if (data.length === 0) {

        rankingBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty">
                    검색 결과가 없습니다.
                </td>
            </tr>
        `;

        return;
    }

    rankingBody.innerHTML =
        data.map((player, index) => {

            const rank =
                currentHistoryDate
                    ? (
                        Number(player.totalRank) ||
                        Number(player.rank) ||
                        index + 1
                    )
                    : (
                        Number(player.totalRank) ||
                        index + 1
                    );

            const server =
                player.server || "-";

            const guild =
                player.guild_name || "무소속";

            const job =
                player.main_job || "-";

            const name =
                player.name || "-";

            const worldId =
                player.worldId || "";

            return `
                <tr>

                    <td>
                        ${formatNumber(rank)}
                    </td>

                    <td>
                        <button
                            class="nickname-button"
                            data-name="${escapeHtml(name)}"
                            data-world-id="${escapeHtml(worldId)}"
                        >
                            ${escapeHtml(name)}
                        </button>
                    </td>

                    <td>
                        ${escapeHtml(job)}
                    </td>

                    <td>
                        ${formatNumber(player.level)}
                    </td>

                    <td>
                        ${formatNumber(player.power)}
                    </td>

                    <td>
                        ${escapeHtml(guild)}
                    </td>

                    <td>
                        ${escapeHtml(server)}
                    </td>

                    <td>
                        <button
                            class="track-button"
                            data-name="${escapeHtml(name)}"
                            data-world-id="${escapeHtml(worldId)}"
                        >
                            추적
                        </button>
                    </td>

                </tr>
            `;

        }).join("");

    document
        .querySelectorAll(".track-button")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    openTracking(
                        button.dataset.name,
                        button.dataset.worldId
                    );
                }
            );
        });


    document
        .querySelectorAll(".nickname-button")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    openTracking(
                        button.dataset.name,
                        button.dataset.worldId
                    );
                }
            );
        });
}


/* =========================================
   추적 열기
========================================= */

function openTracking(name, worldId) {

    showPage("trackingPage");

    trackingName.value = name;

    if (worldId) {
        trackingServer.value = worldId;
    }

    trackingStatus.textContent =
        `${name} 추적 정보를 불러오는 중...`;

    trackingResult.innerHTML = `
        <div class="card">
            <div class="loading">
                추적 정보를 불러오는 중...
            </div>
        </div>
    `;

    loadTracking(name, worldId);
}


/* =========================================
   추적 데이터
========================================= */

async function loadTracking(name, worldId) {

    name =
        String(name || "")
            .trim();

    if (!name) {

        trackingStatus.textContent =
            "닉네임을 입력해주세요.";

        trackingResult.innerHTML = "";

        return;
    }

    try {

        let url =
            `/api/tracking?name=${encodeURIComponent(name)}`;

        if (
            worldId &&
            worldId !== "all"
        ) {
            url +=
                `&worldId=${encodeURIComponent(worldId)}`;
        }

        const response =
            await fetch(url);

        if (!response.ok) {
            throw new Error("추적 요청 실패");
        }

        const data =
            await response.json();

        renderTracking(data);

    } catch (error) {

        console.error(error);

        trackingStatus.textContent =
            "추적 정보를 불러오지 못했습니다.";

        trackingResult.innerHTML = `
            <div class="card">
                <div class="notice">
                    추적 중 오류가 발생했습니다.
                </div>
            </div>
        `;
    }
}


/* =========================================
   추적 결과 렌더링
========================================= */

function renderTracking(data) {

    if (
        data &&
        Array.isArray(data.candidates) &&
        data.candidates.length > 0
    ) {

        trackingStatus.textContent =
            "동일한 닉네임이 여러 서버에서 발견되었습니다. 서버를 선택해주세요.";

        trackingResult.innerHTML = `

            <div class="card">

                <div class="section-title">
                    동명이인 선택
                </div>

                <div class="move-list">

                    ${data.candidates.map(candidate => {

                        return `
                            <div class="move-item">

                                <div class="move-content">

                                    <strong>
                                        ${escapeHtml(candidate.name)}
                                    </strong>

                                    <span class="arrow">·</span>

                                    ${escapeHtml(candidate.server)}

                                    <span class="arrow">·</span>

                                    ${escapeHtml(candidate.guild_name || "무소속")}

                                    <button
                                        class="track-button"
                                        data-candidate-name="${escapeHtml(candidate.name)}"
                                        data-candidate-world-id="${escapeHtml(candidate.worldId)}"
                                        style="float:right;"
                                    >
                                        추적
                                    </button>

                                </div>

                            </div>
                        `;

                    }).join("")}

                </div>

            </div>
        `;

        document
            .querySelectorAll("[data-candidate-world-id]")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        openTracking(
                            button.dataset.candidateName,
                            button.dataset.candidateWorldId
                        );
                    }
                );
            });

        return;
    }


    if (!data || !data.found) {

        trackingStatus.textContent =
            "검색 결과가 없습니다.";

        trackingResult.innerHTML = `
            <div class="card">
                <div class="empty">
                    해당 플레이어의 기록을 찾을 수 없습니다.
                </div>
            </div>
        `;

        return;
    }


    const history =
        Array.isArray(data.history)
            ? data.history
            : [];

    const moves =
        Array.isArray(data.moves)
            ? data.moves
            : [];

    const guildMoves =
        Array.isArray(data.guildMoves)
            ? data.guildMoves
            : [];


    const latest =
        history.length > 0
            ? history[history.length - 1]
            : null;


    trackingStatus.textContent =
        `${data.name} 추적 결과`;


    trackingResult.innerHTML = `

        <div class="card">

            <div class="player-header">

                <div>

                    <div class="player-name">
                        ${escapeHtml(data.name)}
                    </div>

                    ${
                        latest
                            ? `
                                <div class="player-info">
                                    ${escapeHtml(latest.server || "-")}
                                    ·
                                    ${escapeHtml(latest.main_job || "-")}
                                </div>
                            `
                            : ""
                    }

                </div>

                <button
                    class="back-button"
                    id="trackingBackButton"
                >
                    랭킹으로
                </button>

            </div>


            ${
                latest
                    ? `
                        <div class="summary-grid">

                            <div class="summary-item">
                                <div class="summary-label">
                                    현재 서버
                                </div>

                                <div class="summary-value">
                                    ${escapeHtml(latest.server || "-")}
                                </div>
                            </div>


                            <div class="summary-item">
                                <div class="summary-label">
                                    현재 연맹
                                </div>

                                <div class="summary-value">
                                    ${escapeHtml(latest.guild_name || "무소속")}
                                </div>
                            </div>


                            <div class="summary-item">
                                <div class="summary-label">
                                    레벨
                                </div>

                                <div class="summary-value">
                                    ${formatNumber(latest.level)}
                                </div>
                            </div>


                            <div class="summary-item">
                                <div class="summary-label">
                                    전투력
                                </div>

                                <div class="summary-value">
                                    ${formatNumber(latest.power)}
                                </div>
                            </div>

                        </div>
                    `
                    : ""
            }


            <div class="section-title">
                서버 이전
            </div>

            ${
                moves.length > 0
                    ? `
                        <div class="move-list">

                            ${moves.map(move => {

                                return `
                                    <div class="move-item">

                                        <div class="move-date">
                                            ${formatDate(move.fromDate)}
                                            →
                                            ${formatDate(move.toDate)}
                                        </div>

                                        <div class="move-content">

                                            <strong>
                                                ${escapeHtml(move.fromServer)}
                                            </strong>

                                            <span class="arrow">
                                                →
                                            </span>

                                            <strong>
                                                ${escapeHtml(move.toServer)}
                                            </strong>

                                        </div>

                                    </div>
                                `;

                            }).join("")}

                        </div>
                    `
                    : `
                        <div class="notice">
                            확인된 서버 이전 기록이 없습니다.
                        </div>
                    `
            }


            <div class="section-title">
                연맹 변경
            </div>

            ${
                guildMoves.length > 0
                    ? `
                        <div class="move-list">

                            ${guildMoves.map(move => {

                                return `
                                    <div class="move-item">

                                        <div class="move-date">
                                            ${formatDate(move.fromDate)}
                                            →
                                            ${formatDate(move.toDate)}
                                            ·
                                            ${escapeHtml(move.server || "-")}
                                        </div>

                                        <div class="move-content">

                                            <span class="guild-from">
                                                ${escapeHtml(move.fromGuild || "무소속")}
                                            </span>

                                            <span class="arrow">
                                                →
                                            </span>

                                            <span class="guild-to">
                                                ${escapeHtml(move.toGuild || "무소속")}
                                            </span>

                                        </div>

                                    </div>
                                `;

                            }).join("")}

                        </div>
                    `
                    : `
                        <div class="notice">
                            확인된 연맹 변경 기록이 없습니다.
                        </div>
                    `
            }


            <div class="section-title">
                과거 기록
            </div>

            ${
                history.length > 0
                    ? `
                        <div class="table-wrap">

                            <table>

                                <thead>
                                    <tr>
                                        <th>날짜</th>
                                        <th>순위</th>
                                        <th>서버</th>
                                        <th>연맹</th>
                                        <th>직업</th>
                                        <th>레벨</th>
                                        <th>전투력</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    ${history
                                        .slice()
                                        .reverse()
                                        .map(item => {

                                            return `
                                                <tr>

                                                    <td>
                                                        ${formatDate(item.date)}
                                                    </td>

                                                    <td>
                                                        ${formatNumber(
                                                            item.totalRank ||
                                                            item.rank ||
                                                            0
                                                        )}
                                                    </td>

                                                    <td>
                                                        ${escapeHtml(item.server || "-")}
                                                    </td>

                                                    <td>
                                                        ${escapeHtml(item.guild_name || "무소속")}
                                                    </td>

                                                    <td>
                                                        ${escapeHtml(item.main_job || "-")}
                                                    </td>

                                                    <td>
                                                        ${formatNumber(item.level)}
                                                    </td>

                                                    <td>
                                                        ${formatNumber(item.power)}
                                                    </td>

                                                </tr>
                                            `;

                                        }).join("")}

                                </tbody>

                            </table>

                        </div>
                    `
                    : `
                        <div class="notice">
                            과거 기록이 없습니다.
                        </div>
                    `

            }

        </div>
    `;


    const backButton =
        document.getElementById(
            "trackingBackButton"
        );

    if (backButton) {

        backButton.addEventListener(
            "click",
            () => {

                showPage("rankingPage");
            }
        );
    }
}


/* =========================================
   연맹 검색
========================================= */

function searchGuild() {

    const search =
        guildSearchInput.value
            .trim()
            .toLowerCase();

    if (!search) {

        guildStatus.textContent =
            "연맹명을 입력해주세요.";

        guildResult.innerHTML = "";

        return;
    }

    const members =
        currentData.filter(player => {

            const guild =
                String(player.guild_name || "")
                    .trim()
                    .toLowerCase();

            return guild.includes(search);
        });


    if (members.length === 0) {

        guildStatus.textContent =
            "검색 결과가 없습니다.";

        guildResult.innerHTML = `
            <div class="card">
                <div class="empty">
                    해당 연맹을 찾을 수 없습니다.
                </div>
            </div>
        `;

        return;
    }


    members.sort((a, b) => {

        return (
            (Number(b.power) || 0) -
            (Number(a.power) || 0)
        );
    });


    const guildNames =
        [...new Set(
            members.map(
                player =>
                    player.guild_name || "무소속"
            )
        )];


    guildStatus.textContent =
        `${formatNumber(members.length)}명 검색됨`;


    guildResult.innerHTML = `

        <div class="card">

            <div class="section-title">
                ${guildNames
                    .map(name => escapeHtml(name))
                    .join(", ")}
            </div>

            <div class="table-wrap">

                <table>

                    <thead>
                        <tr>
                            <th>순위</th>
                            <th>닉네임</th>
                            <th>직업</th>
                            <th>레벨</th>
                            <th>전투력</th>
                            <th>서버</th>
                            <th>추적</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${members.map((player, index) => {

                            return `
                                <tr>

                                    <td>
                                        ${formatNumber(
                                            player.totalRank ||
                                            player.rank ||
                                            index + 1
                                        )}
                                    </td>

                                    <td>
                                        <button
                                            class="nickname-button guild-member-track"
                                            data-name="${escapeHtml(player.name || "")}"
                                            data-world-id="${escapeHtml(player.worldId || "")}"
                                        >
                                            ${escapeHtml(player.name || "-")}
                                        </button>
                                    </td>

                                    <td>
                                        ${escapeHtml(player.main_job || "-")}
                                    </td>

                                    <td>
                                        ${formatNumber(player.level)}
                                    </td>

                                    <td>
                                        ${formatNumber(player.power)}
                                    </td>

                                    <td>
                                        ${escapeHtml(player.server || "-")}
                                    </td>

                                    <td>
                                        <button
                                            class="track-button guild-member-track"
                                            data-name="${escapeHtml(player.name || "")}"
                                            data-world-id="${escapeHtml(player.worldId || "")}"
                                        >
                                            추적
                                        </button>
                                    </td>

                                </tr>
                            `;

                        }).join("")}

                    </tbody>

                </table>

            </div>

        </div>
    `;


    document
        .querySelectorAll(".guild-member-track")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    openTracking(
                        button.dataset.name,
                        button.dataset.worldId
                    );
                }
            );
        });
}


/* =========================================
   이벤트
========================================= */

searchButton.addEventListener(
    "click",
    renderRanking
);


searchInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            renderRanking();
        }
    }
);


searchInput.addEventListener(
    "input",
    renderRanking
);


serverFilter.addEventListener(
    "change",
    renderRanking
);


sortFilter.addEventListener(
    "change",
    renderRanking
);


historyFilter.addEventListener(
    "change",
    async () => {

        const value =
            historyFilter.value;

        if (value === "current") {

            await loadAllRanking();

        } else {

            await loadHistoryRanking(value);
        }
    }
);


trackingButton.addEventListener(
    "click",
    () => {

        const name =
            trackingName.value.trim();

        const worldId =
            trackingServer.value;

        loadTracking(
            name,
            worldId
        );
    }
);


trackingName.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            loadTracking(
                trackingName.value.trim(),
                trackingServer.value
            );
        }
    }
);


guildSearchButton.addEventListener(
    "click",
    searchGuild
);


guildSearchInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            searchGuild();
        }
    }
);


/* =========================================
   초기 실행
========================================= */

async function init() {

    populateServerSelects();

    await loadHistoryDates();

    await loadAllRanking();
}


init();
