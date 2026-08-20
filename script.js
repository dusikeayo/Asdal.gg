// ==============================
// 서버 선택창 만들기
// ==============================

serverFilter.innerHTML = "";


// 전체 서버
const allOption = document.createElement("option");

allOption.value = "all";
allOption.textContent = "전체 서버";

serverFilter.appendChild(allOption);


// ==============================
// 서버 그룹
// ==============================

const serverGroups = {

    "뉴월드": [
        ["하제산", 32201],
        ["추산도", 32202],
        ["남달산", 32203]
    ],

    "크라본": [
        ["크라본", 70110]
    ],

    "글로벌": [
        ["이브나", 12301],
        ["이나이신기", 12302],
        ["윤슬", 12303],
        ["아라문해슬라", 12304],
        ["다르쿠스", 12305],
        ["미하제", 12306],
        ["시아르", 12307],
        ["토로스", 92701],
        ["레오", 70314],
        ["벨라", 70315],
        ["파보", 70316],
        ["아라", 70319],
        ["오리온", 70320],
        ["리라", 70321]
    ]

};


// ==============================
// 그룹별 서버 추가
// ==============================

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
