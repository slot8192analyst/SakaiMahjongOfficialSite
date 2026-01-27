// js/records.js

class RecordsPage {
    constructor() {
        this.sessions = [];
        this.recentCount = 3;
        this.currentTab = 0;
    }

    async init() {
        try {
            const response = await fetch('data/records-index.json');
            const data = await response.json();
            this.sessions = data.sessions;

            this.renderTabs();
            this.renderPastSessions();

            if (this.sessions.length > 0) {
                this.selectTab(0);
            }
        } catch (err) {
            console.error('データ読み込みエラー:', err);
            document.getElementById('tab-content').innerHTML = 
                '<p class="error-message">データの読み込みに失敗しました</p>';
        }
    }

    renderTabs() {
        const tabNav = document.getElementById('tab-navigation');
        const recentSessions = this.sessions.slice(0, this.recentCount);

        tabNav.innerHTML = recentSessions.map((session, index) => {
            const dateObj = new Date(session.date);
            const displayDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
            return `
                <button class="tab-button ${index === 0 ? 'active' : ''}" 
                        data-index="${index}"
                        onclick="recordsPage.selectTab(${index})">
                    ${displayDate}
                </button>
            `;
        }).join('');
    }

    async selectTab(index) {
        this.currentTab = index;

        document.querySelectorAll('.tab-button').forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });

        const session = this.sessions[index];
        const tabContent = document.getElementById('tab-content');

        tabContent.innerHTML = '<p class="loading">読み込み中...</p>';

        try {
            const response = await fetch(`data/sessions/${session.date}/results.json`);
            const data = await response.json();
            tabContent.innerHTML = this.renderSessionContent(data, session);

            // 点数推移グラフを読み込み
            this.loadPointsChart(session.date);

        } catch (err) {
            console.error('セッションデータ読み込みエラー:', err);
            tabContent.innerHTML = '<p class="error-message">データの読み込みに失敗しました</p>';
        }
    }

    // 点数推移グラフを読み込むメソッド
    async loadPointsChart(date) {
        const chartContainerId = `points-chart-${date}`;
        const container = document.getElementById(chartContainerId);
        
        if (!container) return;

        try {
            const response = await fetch(`data/sessions/${date}/points.json`);
            if (!response.ok) {
                container.innerHTML = '<p class="no-data">点数推移データがありません</p>';
                return;
            }
            const pointsData = await response.json();
            pointsChartRenderer.renderChartWithNavigation(pointsData, chartContainerId);
        } catch (err) {
            console.error('点数推移データ読み込みエラー:', err);
            container.innerHTML = '<p class="no-data">点数推移データの読み込みに失敗しました</p>';
        }
    }

    // 祝儀欄を除いた実際の半荘数を計算
    getActualGameCount(games) {
        return games.filter(game => !String(game.round).includes('祝儀')).length;
    }

    renderSessionContent(data, sessionInfo) {
        const dateObj = new Date(data.date);
        const displayDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
        
        // 実際の半荘数（祝儀欄を除く）
        const actualGameCount = this.getActualGameCount(data.games);

        let html = `
            <div class="session-header">
                <h3 class="session-date">${displayDate}</h3>
                <p class="session-info">
                    <span class="session-players">参加メンバー: ${data.players.join(' / ')}</span>
                    <span class="session-games-count">${actualGameCount}半荘</span>
                </p>
                ${sessionInfo.highlight ? `<p class="session-highlight">🎉 ${sessionInfo.highlight}</p>` : ''}
            </div>
        `;

        // 最終結果（人数分、ポイント順）
        const sortedTotals = [...data.totals].sort((a, b) => b.point - a.point);
        html += `
            <div class="session-totals">
                <h4>最終結果</h4>
                <div class="totals-grid">
                    ${sortedTotals.map((t, i) => {
                        const rankClass = i < 3 ? `rank-${i + 1}` : '';
                        const pointClass = t.point >= 0 ? 'score-plus' : 'score-minus';
                        const pointText = t.point >= 0 ? `+${t.point.toFixed(1)}` : t.point.toFixed(1);
                        const incomeClass = t.income >= 0 ? 'score-plus' : 'score-minus';
                        const incomeText = t.income >= 0 ? `+${t.income.toLocaleString()}pt` : `${t.income.toLocaleString()}pt`;
                        return `
                            <div class="total-item ${rankClass}">
                                <span class="total-rank">${i + 1}位</span>
                                <span class="total-player">${t.player}</span>
                                <div class="total-scores">
                                    <span class="total-point ${pointClass}">${pointText}</span>
                                    <span class="total-income ${incomeClass}">${incomeText}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        // 各半荘の結果（横軸：プレイヤー、縦軸：半荘）
        html += `
            <div class="session-games">
                <h4>各半荘の結果</h4>
                <div class="games-table-wrapper">
                    <table class="games-table">
                        <thead>
                            <tr>
                                <th class="round-header">回</th>
                                ${data.players.map(player => `<th class="player-header">${player}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.games.map(game => {
                                const playerPoints = {};
                                game.results.forEach(r => {
                                    playerPoints[r.player] = r.point;
                                });
                                return `
                                    <tr>
                                        <td class="round-cell">${game.round}</td>
                                        ${data.players.map(player => {
                                            const point = playerPoints[player];
                                            if (point === undefined) {
                                                return `<td class="point-cell absent">-</td>`;
                                            }
                                            const pointClass = point >= 0 ? 'score-plus' : 'score-minus';
                                            const pointText = point >= 0 ? `+${point.toFixed(1)}` : point.toFixed(1);
                                            return `<td class="point-cell ${pointClass}">${pointText}</td>`;
                                        }).join('')}
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // 点数推移グラフセクション
        html += `
            <div class="session-chart">
                <h4>点数推移グラフ</h4>
                <div id="points-chart-${data.date}"></div>
            </div>
        `;

        // 詳細ページへのリンク
        html += `
            <div class="session-link">
                <a href="session.html?date=${data.date}" class="detail-link">
                    📊 この日のスタッツを見る →
                </a>
            </div>
        `;

        return html;
    }

    renderPastSessions() {
        const container = document.getElementById('past-sessions');
        const pastSessions = this.sessions.slice(this.recentCount);

        if (pastSessions.length === 0) {
            container.innerHTML = '<p class="no-data">過去の対局データはありません</p>';
            return;
        }

        let html = '<ul class="past-sessions-list">';
        pastSessions.forEach(session => {
            const dateObj = new Date(session.date);
            const displayDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
            html += `
                <li>
                    <a href="session.html?date=${session.date}">
                        <span class="past-date">${displayDate}</span>
                        <span class="past-players">${session.players.join(' / ')}</span>
                        <span class="past-games">${session.games}半荘</span>
                    </a>
                </li>
            `;
        });
        html += '</ul>';

        container.innerHTML = html;
    }
}

const recordsPage = new RecordsPage();
document.addEventListener('DOMContentLoaded', () => recordsPage.init());
