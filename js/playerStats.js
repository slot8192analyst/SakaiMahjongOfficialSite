// js/playerStats.js

class PlayerStatsRenderer {
    constructor() {
        // 画像と同じ配色
        this.colors = {
            agari: {
                riichi: '#4DD0E1',
                furo: '#1A237E',
                dama: '#9575CD'
            },
            houjuTiming: {
                riichi: '#EF5350',
                furo: '#FFB74D',
                other: '#757575'
            },
            houjuTarget: {
                riichi: '#EF5350',
                furo: '#FFB74D',
                dama: '#757575'
            },
            rank: {
                1: '#4DD0E1',
                2: '#fcff4f',
                3: '#FFB74D',
                4: '#EF5350'
            }
        };
    }

    createDonutChart(segments) {
        const total = segments.reduce((sum, s) => sum + s.value, 0);
        if (total === 0) {
            return `
                <div class="donut-wrapper">
                    <svg class="donut-chart" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="10" fill="#1a1a2e"/>
                        <circle cx="18" cy="18" r="12" fill="none" stroke="#333" stroke-width="6"/>
                    </svg>
                </div>
            `;
        }
    
        const radius = 12;
        const circumference = 2 * Math.PI * radius;
        
        let currentOffset = 0;
        const circles = segments.filter(s => s.value > 0).map(segment => {
            const percentage = (segment.value / total) * 100;
            const dashLength = (percentage / 100) * circumference;
            const gapLength = circumference - dashLength;
            const dashOffset = circumference * 0.25 - (currentOffset / 100) * circumference;
            
            const circle = `<circle 
                cx="18" cy="18" r="${radius}" 
                fill="none" 
                stroke="${segment.color}" 
                stroke-width="6"
                stroke-dasharray="${dashLength} ${gapLength}"
                stroke-dashoffset="${dashOffset}"
            />`;
            currentOffset += percentage;
            return circle;
        }).join('');
    
        return `
            <div class="donut-wrapper">
                <svg class="donut-chart" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="8" fill="#1a1a2e"/>
                    ${circles}
                </svg>
            </div>
        `;
    }

    createLegend(segments) {
        return segments.map(s => `
            <div class="legend-item">
                <span class="legend-color" style="background-color: ${s.color} !important;"></span>
                <span class="legend-text">${s.label} ${s.value.toFixed(1)}%</span>
            </div>
        `).join('');
    }

    createRankChart(ranks, rates) {
        const rankData = [
            { rank: 1, rate: rates['1st'], color: this.colors.rank[1] },
            { rank: 2, rate: rates['2nd'], color: this.colors.rank[2] },
            { rank: 3, rate: rates['3rd'], color: this.colors.rank[3] },
            { rank: 4, rate: rates['4th'], color: this.colors.rank[4] }
        ];

        // 50%を超える値があるかチェック
        const maxRate = Math.max(...rankData.map(d => d.rate));
        const scaleMax = maxRate > 50 ? 100 : 50;

        const bars = rankData.map(d => {
            // scaleMaxを100%として幅を計算
            const widthPercent = (d.rate / scaleMax) * 100;
            return `
                <div class="rank-bar">
                    <span class="rank-bar-label">${d.rank}位</span>
                    <div class="rank-bar-track">
                        <div class="rank-bar-fill" style="width: ${widthPercent}%; background-color: ${d.color} !important;"></div>
                    </div>
                    <span class="rank-bar-value">${d.rate.toFixed(1)}%</span>
                </div>
            `;
        }).join('');

        return `
            <div class="rank-chart">
                <div class="rank-chart-title">順位グラフ</div>
                ${bars}
            </div>
        `;
    }

    fmt(value, suffix = '', decimals = 1) {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'number') {
            if (value === 0 && suffix === '%') return '0' + suffix;
            return Number.isInteger(value) ? value + suffix : value.toFixed(decimals) + suffix;
        }
        return value + suffix;
    }

    fmtInt(value) {
        if (value === null || value === undefined) return '-';
        if (value === 0) return '0';
        return Math.round(value).toLocaleString();
    }

    // null/undefinedの場合は項目自体を表示しない用のヘルパー
    renderStatItem(label, value, suffix = '') {
        if (value === null || value === undefined) return '';
        const formatted = suffix === 'int' 
            ? this.fmtInt(value) 
            : this.fmt(value, suffix);
        return `<div class="stat-item"><span class="stat-label">${label}</span><span class="stat-value">${formatted}</span></div>`;
    }

    renderStatsCard(name, stats) {
        const { summary, agari, riichi, furo, houju, other, efficiency, tobiRate } = stats;

        const agariTypeSegments = [
            { label: '立直', value: agari.byType.riichi.rate, color: this.colors.agari.riichi },
            { label: '副露', value: agari.byType.furo.rate, color: this.colors.agari.furo },
            { label: '闘聴', value: agari.byType.dama.rate, color: this.colors.agari.dama }
        ];

        const houjuTimingSegments = [
            { label: '立直中', value: houju.byTiming.riichi, color: this.colors.houjuTiming.riichi },
            { label: '副露中', value: houju.byTiming.furo, color: this.colors.houjuTiming.furo },
            { label: 'その他', value: houju.byTiming.other, color: this.colors.houjuTiming.other }
        ];

        const houjuTargetSegments = [
            { label: '立直', value: houju.toTarget.riichi, color: this.colors.houjuTarget.riichi },
            { label: '副露', value: houju.toTarget.furo, color: this.colors.houjuTarget.furo },
            { label: '闇聴', value: houju.toTarget.dama, color: this.colors.houjuTarget.dama }
        ];

        return `
        <div class="stats-card">
            <div class="stats-card-header">
                <div class="stats-player-info">
                    <div class="stats-player-name">${name}</div>
                    <div class="stats-summary">
                        <div class="stats-summary-item">
                            <span class="stats-summary-label">平均順位</span>
                            <span class="stats-summary-value">${this.fmt(summary.avgRank, '', 2)}</span>
                        </div>
                        <div class="stats-summary-item">
                            <span class="stats-summary-label">対戦数</span>
                            <span class="stats-summary-value">${summary.games}</span>
                        </div>
                        <div class="stats-summary-item">
                            <span class="stats-summary-label">連対率</span>
                            <span class="stats-summary-value">${this.fmt(summary.rates.top2, '%')}</span>
                        </div>
                        <div class="stats-summary-item">
                            <span class="stats-summary-label">ラス回避率</span>
                            <span class="stats-summary-value">${this.fmt(summary.rates.avoid4th, '%')}</span>
                        </div>
                    </div>
                </div>

                ${this.createRankChart(summary.ranks, summary.rates)}

                <div class="charts-row">
                    <div class="donut-container">
                        <div class="donut-title">和了占有率</div>
                        ${this.createDonutChart(agariTypeSegments)}
                        <div class="donut-legend">
                            ${this.createLegend(agariTypeSegments)}
                        </div>
                    </div>
                    <div class="donut-container">
                        <div class="donut-title">放銃時状況</div>
                        ${this.createDonutChart(houjuTimingSegments)}
                        <div class="donut-legend">
                            ${this.createLegend(houjuTimingSegments)}
                        </div>
                    </div>
                    <div class="donut-container">
                        <div class="donut-title">放銃相手</div>
                        ${this.createDonutChart(houjuTargetSegments)}
                        <div class="donut-legend">
                            ${this.createLegend(houjuTargetSegments)}
                        </div>
                    </div>
                </div>
            </div>

            <div class="stats-sections">
                <div class="stats-section">
                    <div class="stats-section-title">【基本成績】</div>
                    <div class="stats-grid">
                        ${this.renderStatItem('和了率', agari.rate, '%')}
                        ${this.renderStatItem('和了回数', agari.count, 'int')}
                        ${this.renderStatItem('放銃率', houju.rate, '%')}
                        ${this.renderStatItem('放銃回数', houju.count, 'int')}
                        ${this.renderStatItem('聴牌率', other.tenpaiRate, '%')}
                        ${this.renderStatItem('流局時聴牌率', other.ryukyokuTenpaiRate, '%')}
                        ${this.renderStatItem('自摸率', agari.tsumoRate, '%')}
                        ${this.renderStatItem('飛び率', tobiRate, '%')}
                        ${this.renderStatItem('和了-放銃', efficiency ? efficiency.agariHoujuDiff : null, '%')}
                    </div>
                </div>

                <div class="stats-section">
                    <div class="stats-section-title">【打点】</div>
                    <div class="stats-grid">
                        ${this.renderStatItem('平均打点', agari.avgScore, 'int')}
                        ${this.renderStatItem('平均和了巡', agari.avgTurn, '')}
                        ${this.renderStatItem('立直時打点', agari.byType.riichi.avgScore, 'int')}
                        ${this.renderStatItem('副露時打点', agari.byType.furo.avgScore, 'int')}
                        ${this.renderStatItem('闇聴時打点', agari.byType.dama.avgScore, 'int')}
                        ${this.renderStatItem('平均放銃打点', houju.avgScore, 'int')}
                    </div>
                </div>

                <div class="stats-section">
                    <div class="stats-section-title">【立直】</div>
                    <div class="stats-grid">
                        ${this.renderStatItem('立直率', riichi.rate, '%')}
                        ${this.renderStatItem('立直回数', riichi.count, 'int')}
                        ${this.renderStatItem('成功率', riichi.successRate, '%')}
                        ${this.renderStatItem('和了率', riichi.winRate, '%')}
                        ${this.renderStatItem('放銃率', riichi.dealInRate, '%')}
                        ${this.renderStatItem('先制率', riichi.preemptiveRate, '%')}
                        ${this.renderStatItem('追っかけ率', riichi.chaseRate, '%')}
                        ${this.renderStatItem('追っかけられ率', riichi.chasedRate, '%')}
                        ${this.renderStatItem('一発率', riichi.ippatsuRate, '%')}
                        ${this.renderStatItem('裏ドラ率', riichi.uraDoraRate, '%')}
                        ${this.renderStatItem('平均立直巡', riichi.avgTurn, '')}
                        ${this.renderStatItem('立直収入', riichi.income, 'int')}
                        ${this.renderStatItem('立直支出', riichi.expense, 'int')}
                    </div>
                </div>

                <div class="stats-section">
                    <div class="stats-section-title">【副露・流局・親被り】</div>
                    <div class="stats-grid">
                        ${this.renderStatItem('副露率', furo.rate, '%')}
                        ${this.renderStatItem('副露時和了率', furo.agariRate, '%')}
                        ${this.renderStatItem('副露時平均打点', furo.avgScore, 'int')}
                        ${this.renderStatItem('流局時聴牌率', other.ryukyokuTenpaiRate, '%')}
                        ${this.renderStatItem('立直後流局率', other.riichiRyukyokuRate, '%')}
                        ${this.renderStatItem('痛親かぶり率', other.oyaKaburiRate, '%')}
                        ${this.renderStatItem('痛親かぶり平均', other.oyaKaburiAvgScore, 'int')}
                    </div>
                </div>

                <div class="stats-section">
                    <div class="stats-section-title">【効率】</div>
                    <div class="stats-grid">
                        ${this.renderStatItem('打点効率', efficiency ? efficiency.scoreEfficiency : null, '')}
                        ${this.renderStatItem('銃点損失', efficiency ? efficiency.scoreLoss : null, '')}
                        ${this.renderStatItem('調整打点効率', efficiency ? efficiency.adjustedEfficiency : null, '')}
                    </div>
                </div>
            </div>
        </div>
        `;
    }
}

const statsRenderer = new PlayerStatsRenderer();
