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
            await this.loadResults();
            this.renderResults();
        } catch (err) {
            console.error('results.json 読み込みエラー:', err);
            this.showError('対局結果の読み込みに失敗しました');
            return;
        }

        try {
            await this.loadStats();
            this.renderStatsSelector();
        } catch (err) {
            console.error('stats.json 読み込みエラー:', err);
            document.getElementById('stats-container').innerHTML = 
                '<p class="error-message">スタッツデータの読み込みに失敗しました</p>';
        }
    }

    async loadResults() {
        const url = `data/sessions/${this.date}/results.json`;
        console.log('Loading results from:', url);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        this.results = await response.json();
        console.log('Results loaded:', this.results);
    }

    async loadStats() {
        const url = `data/sessions/${this.date}/stats.json`;
        console.log('Loading stats from:', url);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        this.stats = await response.json();
        console.log('Stats loaded:', this.stats);
    }

    showError(message) {
        document.getElementById('results-container').innerHTML = 
            `<p class="error-message">${message}</p>`;
    }

    renderResults() {
        const container = document.getElementById('results-container');
        const data = this.results;

        // タイトル更新
        const dateObj = new Date(this.date);
        const displayDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
        document.getElementById('session-title').textContent = `${displayDate} の対局`;
        document.title = `${displayDate} | 坂井麻雀店`;

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

        container.innerHTML = html;
    }

    renderStatsSelector() {
        const selectorContainer = document.querySelector('.stats-player-select');
        const statsContainer = document.getElementById('stats-container');
        const players = this.stats.players;

        if (!players) {
            statsContainer.innerHTML = '<p class="error-message">プレイヤーデータがありません</p>';
            return;
        }

        // results.jsonのtotalsからこの日の参加者を取得し、ポイント順でソート
        const sortedPlayers = this.results.totals
            .sort((a, b) => b.point - a.point)
            .map(t => t.player)
            .filter(name => players[name] && players[name].summary.games > 0);

        if (sortedPlayers.length === 0) {
            statsContainer.innerHTML = '<p class="no-data">この日のスタッツデータはありません</p>';
            return;
        }

        // ボタン形式のセレクターを生成
        let buttonsHtml = '<div class="player-buttons">';
        sortedPlayers.forEach((name, index) => {
            const activeClass = index === 0 ? 'active' : '';
            buttonsHtml += `<button class="player-button ${activeClass}" data-player="${name}">${name}</button>`;
        });
        buttonsHtml += '</div>';
        selectorContainer.innerHTML = buttonsHtml;

        // ボタンクリック時の処理
        const buttons = selectorContainer.querySelectorAll('.player-button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                // アクティブ状態を切り替え
                buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // スタッツカードを表示
                const playerName = button.dataset.player;
                if (playerName && players[playerName]) {
                    statsContainer.innerHTML = statsRenderer.renderStatsCard(playerName, players[playerName]);
                }
            });
        });

        // 最初のプレイヤーを自動表示
        if (sortedPlayers.length > 0 && players[sortedPlayers[0]]) {
            statsContainer.innerHTML = statsRenderer.renderStatsCard(sortedPlayers[0], players[sortedPlayers[0]]);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sessionPage = new SessionPage();
    sessionPage.init();
});
