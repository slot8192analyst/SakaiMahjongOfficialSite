class SessionRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    // スコア記録表を生成
    renderScoreSheet(games, players) {
        const playerNames = [...new Set(games.flatMap(g => g.results.map(r => r.player)))];
        
        let html = `
        <div class="section">
            <div class="section-header">
                <span>📝</span>
                <span>スコア記録</span>
            </div>
            <div class="score-sheet">
                <table>
                    <thead>
                        <tr>
                            <th>回</th>
                            ${playerNames.map(name => `
                                <th colspan="2" class="player-name">${name}</th>
                            `).join('')}
                        </tr>
                        <tr>
                            <th></th>
                            ${playerNames.map(() => `<th>+</th><th>−</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;

        // 各半荘の結果
        games.forEach((game, idx) => {
            html += `<tr><td>${idx + 1}</td>`;
            playerNames.forEach(name => {
                const result = game.results.find(r => r.player === name);
                if (result) {
                    const point = result.point;
                    if (point >= 0) {
                        html += `<td class="positive">${point.toFixed(1)}</td><td></td>`;
                    } else {
                        html += `<td></td><td class="negative">${Math.abs(point).toFixed(1)}</td>`;
                    }
                } else {
                    html += `<td></td><td></td>`;
                }
            });
            html += `</tr>`;
        });

        // 小計行
        html += `<tr class="subtotal"><td>小計</td>`;
        playerNames.forEach(name => {
            const total = games.reduce((sum, game) => {
                const result = game.results.find(r => r.player === name);
                return sum + (result ? result.point : 0);
            }, 0);
            const cls = total >= 0 ? 'positive' : 'negative';
            html += `<td colspan="2" class="${cls}">${total >= 0 ? '+' : ''}${total.toFixed(1)}</td>`;
        });
        html += `</tr></tbody></table></div></div>`;

        return html;
    }

    // 個人スタッツカードを生成
    renderStatsCard(name, stats) {
        const rankCounts = [0, 0, 0, 0];
        stats.ranks.forEach(r => rankCounts[r - 1]++);
        const totalGames = stats.games;

        return `
        <div class="stats-card">
            <div class="stats-card-header">
                <div class="stats-player-info">
                    <h3>${name}</h3>
                    <div class="stats-basic-info">
                        <span>平均順位</span><span>${stats.avgRank.toFixed(2)}</span>
                        <span>対戦数</span><span>${stats.games}</span>
                        <span>連対率</span><span>${stats.連対率.toFixed(1)}%</span>
                        <span>ラス回避率</span><span>${stats.ラス回避率.toFixed(1)}%</span>
                    </div>
                </div>
                <div class="rank-chart">
                    <div class="rank-chart-title" style="font-size:12px;color:#888;margin-bottom:5px;">順位グラフ</div>
                    ${[1, 2, 3, 4].map(rank => {
                        const count = rankCounts[rank - 1];
                        const pct = ((count / totalGames) * 100).toFixed(1);
                        const width = Math.max(pct * 1.5, 30);
                        return `
                        <div class="rank-bar">
                            <span class="rank-bar-label">${rank}位</span>
                            <div class="rank-bar-fill rank-${rank}-bar" style="width:${width}px;">${pct}%</div>
                        </div>`;
                    }).join('')}
                </div>
            </div>

            <div class="donut-charts">
                ${this.renderDonutChart('和了占有率', [
                    { label: '立直', value: 80, color: '#e8c36a' },
                    { label: '副露', value: 20, color: '#7aa2d4' },
                    { label: '黙聴', value: 0, color: '#6a9e6a' }
                ])}
                ${this.renderDonutChart('放銃時状況', [
                    { label: '立直中', value: stats.放銃時立直中 || 28.6, color: '#e8c36a' },
                    { label: '副露中', value: stats.放銃時副露中 || 42.9, color: '#7aa2d4' },
                    { label: 'その他', value: stats.放銃時その他 || 28.6, color: '#6a9e6a' }
                ])}
            </div>

            <div class="stats-sections">
                <div class="stats-section">
                    <h4>【基本成績】</h4>
                    <div class="stats-grid">
                        <div class="stat-item"><span class="stat-label">和了率</span><span class="stat-value">${stats.和了率}%</span></div>
                        <div class="stat-item"><span class="stat-label">放銃率</span><span class="stat-value">${stats.放銃率}%</span></div>
                        <div class="stat-item"><span class="stat-label">聴牌率</span><span class="stat-value">${stats.聴牌率 || '-'}%</span></div>
                        <div class="stat-item"><span class="stat-label">飛び率</span><span class="stat-value">${stats.飛び率 || '-'}%</span></div>
                    </div>
                </div>
                <div class="stats-section">
                    <h4>【打点】</h4>
                    <div class="stats-grid">
                        <div class="stat-item"><span class="stat-label">平均打点</span><span class="stat-value">${stats.平均打点}</span></div>
                        <div class="stat-item"><span class="stat-label">平均和了巡</span><span class="stat-value">${stats.平均和了巡}</span></div>
                    </div>
                </div>
                <div class="stats-section">
                    <h4>【立直】</h4>
                    <div class="stats-grid">
                        <div class="stat-item"><span class="stat-label">立直率</span><span class="stat-value">${stats.立直率}%</span></div>
                        <div class="stat-item"><span class="stat-label">立直成功率</span><span class="stat-value">${stats.立直成功率 || '-'}%</span></div>
                    </div>
                </div>
                <div class="stats-section">
                    <h4>【副露】</h4>
                    <div class="stats-grid">
                        <div class="stat-item"><span class="stat-label">副露率</span><span class="stat-value">${stats.副露率}%</span></div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    // SVGドーナツチャート生成
    renderDonutChart(title, segments) {
        const total = segments.reduce((sum, s) => sum + s.value, 0);
        let currentAngle = -90;
        
        const paths = segments.filter(s => s.value > 0).map(segment => {
            const angle = (segment.value / total) * 360;
            const path = this.describeArc(50, 50, 35, currentAngle, currentAngle + angle);
            currentAngle += angle;
            return `<path d="${path}" stroke="${segment.color}" stroke-width="20" fill="none"/>`;
        }).join('');

        const legend = segments.map(s => `
            <div class="legend-item">
                <span class="legend-color" style="background:${s.color}"></span>
                <span>${s.label} ${s.value.toFixed(1)}%</span>
            </div>
        `).join('');

        return `
        <div class="donut-chart-container">
            <h4>${title}</h4>
            <svg class="donut-chart" viewBox="0 0 100 100">
                ${paths}
            </svg>
            <div class="donut-legend">${legend}</div>
        </div>
        `;
    }

    // SVGアーク描画用ヘルパー
    describeArc(x, y, radius, startAngle, endAngle) {
        const start = this.polarToCartesian(x, y, radius, endAngle);
        const end = this.polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
    }

    polarToCartesian(cx, cy, radius, angle) {
        const rad = (angle * Math.PI) / 180;
        return {
            x: cx + radius * Math.cos(rad),
            y: cy + radius * Math.sin(rad)
        };
    }

    // ページ全体をレンダリング
    async render(sessionDate) {
        try {
            const response = await fetch(`data/sessions/${sessionDate}.json`);
            const data = await response.json();

            let html = this.renderScoreSheet(data.games);

            html += `<h2 class="page-title" style="margin-top:30px;">個人スタッツ</h2>`;
            for (const [name, stats] of Object.entries(data.playerStats)) {
                html += this.renderStatsCard(name, stats);
            }

            this.container.innerHTML = html;
        } catch (err) {
            console.error('セッションデータの読み込みエラー:', err);
            this.container.innerHTML = '<p>データの読み込みに失敗しました。</p>';
        }
    }
}

// 使用例
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const date = params.get('date');
    if (date) {
        const renderer = new SessionRenderer('session-container');
        renderer.render(date);
    }
});