// js/records.js

class RecordsPage {
    constructor() {
        this.sessions = [];
        this.recentCount = 3; // タブに表示する直近の件数
        this.currentTab = 0;
    }

    async init() {
        try {
            const response = await fetch('data/records-index.json');
            const data = await response.json();
            this.sessions = data.sessions;

            this.renderTabs();
            this.renderPastSessions();

            // 最初のタブを選択
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

        // タブボタンのアクティブ状態を更新
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
        } catch (err) {
            console.error('セッションデータ読み込みエラー:', err);
            tabContent.innerHTML = '<p class="error-message">データの読み込みに失敗しました</p>';
        }
    }

    renderSessionContent(data, sessionInfo) {
        const dateObj = new Date(data.date);
        const displayDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;

        let html = `
            <div class="session-header">
                <h3 class="session-date">${displayDate}</h3>
                <p class="session-info">
                    <span class="session-players">${data.players.join(' / ')}</span>
                    <span class="session-games">${data.games.length}半荘</span>
                </p>
                ${sessionInfo.highlight ? `<p class="session-highlight">🎉 ${sessionInfo.highlight}</p>` : ''}
            </div>
        `;

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
