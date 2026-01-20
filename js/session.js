// js/session.js

class SessionPage {
    constructor() {
        this.date = null;
        this.results = null;
        this.stats = null;
    }

    async init() {
        const params = new URLSearchParams(window.location.search);
        this.date = params.get('date');

        if (!this.date) {
            this.showError('日付が指定されていません');
            return;
        }

        try {
            await Promise.all([
                this.loadResults(),
                this.loadStats()
            ]);

            this.renderPage();
        } catch (err) {
            console.error('データ読み込みエラー:', err);
            this.showError('データの読み込みに失敗しました');
        }
    }

    async loadResults() {
        const response = await fetch(`data/sessions/${this.date}/results.json`);
        this.results = await response.json();
    }

    async loadStats() {
        const response = await fetch(`data/sessions/${this.date}/stats.json`);
        this.stats = await response.json();
    }

    showError(message) {
        document.getElementById('results-container').innerHTML = 
            `<p class="error-message">${message}</p>`;
    }

    renderPage() {
        // タイトル更新
        const dateObj = new Date(this.date);
        const displayDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
        document.getElementById('session-title').textContent = `${displayDate} の対局`;
        document.title = `${displayDate} | 坂井麻雀店`;

        this.renderResults();
        this.renderStatsSelector();
    }

    renderResults() {
        const container = document.getElementById('results-container');
        const data = this.results;

        let html = '';

        // 合計結果
        html += `
            <div class="session-totals">
                <h4>最終結果</h4>
                <div class="totals-grid">
                    ${data.totals.sort((a, b) => b.point - a.point).map((t, i) => {
                        const rankClass = i < 3 ? `rank-${i + 1}` : '';
                        const pointClass = t.point >= 0 ? 'score-plus' : 'score-minus';
                        const pointText = t.point >= 0 ? `+${t.point.toFixed(1)}` : t.point.toFixed(1);
                        return `
                            <div class="total-item ${rankClass}">
                                <span class="total-rank">${i + 1}位</span>
                                <span class="total-player">${t.player}</span>
                                <span class="total-point ${pointClass}">${pointText}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        // 各半荘の結果
        html += `
            <div class="session-games">
                <h4>各半荘の結果</h4>
                <table class="record-table">
                    <thead>
                        <tr>
                            <th>回</th>
                            <th>順位</th>
                            <th>プレイヤー</th>
                            <th>得点</th>
                            <th>pt</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.games.forEach(game => {
            game.results.forEach((result, i) => {
                const rankClass = `rank-${result.rank}`;
                const pointClass = result.point >= 0 ? 'score-plus' : 'score-minus';
                const pointText = result.point >= 0 ? `+${result.point.toFixed(1)}` : result.point.toFixed(1);
                html += `
                    <tr>
                        ${i === 0 ? `<td rowspan="4" class="round-cell">${game.round}</td>` : ''}
                        <td class="${rankClass}">${result.rank}位</td>
                        <td>${result.player}</td>
                        <td>${result.score.toLocaleString()}</td>
                        <td class="${pointClass}">${pointText}</td>
                    </tr>
                `;
            });
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    renderStatsSelector() {
        const playerSelect = document.getElementById('player-select');
        const statsContainer = document.getElementById('stats-container');
        const players = this.stats.players;

        // プレイヤーをポイント順でソート
        const sortedPlayers = this.results.totals
            .sort((a, b) => b.point - a.point)
            .map(t => t.player);

        // プルダウン生成
        sortedPlayers.forEach(name => {
            if (players[name]) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                playerSelect.appendChild(option);
            }
        });

        // 選択時にスタッツカード表示
        playerSelect.addEventListener('change', function() {
            const selectedName = this.value;
            if (selectedName && players[selectedName]) {
                statsContainer.innerHTML = statsRenderer.renderStatsCard(selectedName, players[selectedName]);
            } else {
                statsContainer.innerHTML = '';
            }
        });

        // 最初のプレイヤーを自動選択
        if (sortedPlayers.length > 0 && players[sortedPlayers[0]]) {
            playerSelect.value = sortedPlayers[0];
            playerSelect.dispatchEvent(new Event('change'));
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sessionPage = new SessionPage();
    sessionPage.init();
});
