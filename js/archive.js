// js/archive.js
document.addEventListener('DOMContentLoaded', async function() {
    const playerSelect = document.getElementById('player-select');
    const container = document.getElementById('stats-container');

    // 現在は2025年固定
    // TODO: 2026年終了後に年度選択機能を有効化
    const currentYear = 2025;

    try {
        const response = await fetch(`data/stats-${currentYear}.json`);
        const data = await response.json();
        const players = data.players;

        // 対局数が1以上のプレイヤーをフィルタしてソート
        const activePlayers = Object.entries(players)
            .filter(([_, stats]) => stats.summary.games > 0)
            .sort((a, b) => a[1].summary.avgRank - b[1].summary.avgRank);

        // プルダウン生成
        activePlayers.forEach(([name, _]) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            playerSelect.appendChild(option);
        });

        // 選択時にスタッツカード表示
        playerSelect.addEventListener('change', function() {
            const selectedName = this.value;
            if (selectedName && players[selectedName]) {
                container.innerHTML = statsRenderer.renderStatsCard(selectedName, players[selectedName]);
            } else {
                container.innerHTML = '';
            }
        });

        // ランキング表生成
        const tbody = document.getElementById('ranking-body');
        activePlayers.forEach(([name, stats], index) => {
            const rank = index + 1;
            const s = stats.summary;
            const rankClass = rank <= 3 ? `rank-${rank}` : '';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="${rankClass}">${rank}位</td>
                <td>${name}</td>
                <td>${s.games}</td>
                <td>${s.avgRank.toFixed(2)}</td>
                <td>${s.rates.top2.toFixed(1)}%</td>
                <td>${s.rates.avoid4th.toFixed(1)}%</td>
            `;
            row.style.cursor = 'pointer';
            row.addEventListener('click', () => {
                playerSelect.value = name;
                playerSelect.dispatchEvent(new Event('change'));
                container.scrollIntoView({ behavior: 'smooth' });
            });
            tbody.appendChild(row);
        });

        // 最初のプレイヤーを自動選択
        if (activePlayers.length > 0) {
            playerSelect.value = activePlayers[0][0];
            playerSelect.dispatchEvent(new Event('change'));
        }

    } catch (err) {
        console.error('データ読み込みエラー:', err);
        document.getElementById('ranking-body').innerHTML = 
            '<tr><td colspan="6">データの読み込みに失敗しました</td></tr>';
    }
});
