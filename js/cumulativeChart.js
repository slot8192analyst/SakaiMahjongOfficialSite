// js/cumulativeChart.js - 累積データグラフ描画

class CumulativeChartRenderer {
    constructor() {
        this.playerColors = {
            '坂井': '#4DD0E1',
            '中江': '#FF8A65',
            '福原': '#81C784',
            '遥平': '#BA68C8',
            '大前': '#FFD54F',
            '高木': '#F5F5DC',
            '志村': '#7986CB',
            '池谷': '#4DB6AC',
            '米森': '#F06292',
            '浜島': '#AED581',
            '犬塚': '#9575CD',
            '目黒': '#4FC3F7',
            '梶田': '#DCE775',
            '磯': '#FF8A65',
            '杉崎': '#A1887F',
            '横塚': '#E91E63',   // ピンク（マゼンタ系）
        };

        this.defaultColors = [
            '#4DD0E1', '#FF8A65', '#81C784', '#BA68C8', '#FFD54F',
            '#EF5350', '#7986CB', '#4DB6AC', '#F06292', '#AED581'
        ];

        this.config = {
            width: 900,
            height: 450,
            padding: { top: 40, right: 130, bottom: 80, left: 80 }
        };
    }

    getPlayerColor(playerName, index = 0) {
        if (this.playerColors[playerName]) {
            return this.playerColors[playerName];
        }
        return this.defaultColors[index % this.defaultColors.length];
    }

    renderChart(containerId, data, selectedPlayers, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            container.innerHTML = '<p class="no-data">グラフデータがありません</p>';
            return;
        }
        
        if (!selectedPlayers || selectedPlayers.length === 0) {
            container.innerHTML = '<p class="no-data">プレイヤーを選択してください</p>';
            return;
        }

        const {
            labelKey = '年月日',
            gameKey = 'game',
            subKey = null,
            gridInterval = null,
            showZeroLine = true,
            showBaseLine = false,
            baseLineValue = 0,
            forceIncludeZero = true,
            valueFormatter = (v) => v.toLocaleString()
        } = options;

        const { width, height, padding } = this.config;
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // ラベル生成
        const labelsShort = data.map((d, i) => {
            const dateVal = d[labelKey];
            if (dateVal === '開始') return '開始';
            
            const datePart = String(dateVal).replace(/^\d{4}\//, '');
            
            // 点棒データの場合: 半荘と局を表示
            if (subKey && d[subKey] !== undefined && d[gameKey] !== undefined) {
                const wind = d['風'] || '';
                return `${datePart} ${d[gameKey]}-${wind}${d[subKey]}`;
            }
            
            // 通常: 日付#ゲーム番号
            if (gameKey && d[gameKey] !== undefined) {
                return `${datePart}#${d[gameKey]}`;
            }
            
            return datePart;
        });

        // Y軸範囲計算
        let minValue = Infinity;
        let maxValue = -Infinity;
        
        data.forEach(d => {
            selectedPlayers.forEach(player => {
                const value = d[player];
                if (typeof value === 'number' && !isNaN(value)) {
                    minValue = Math.min(minValue, value);
                    maxValue = Math.max(maxValue, value);
                }
            });
        });

        if (minValue === Infinity || maxValue === -Infinity) {
            container.innerHTML = '<p class="no-data">表示可能なデータがありません</p>';
            return;
        }

        console.log('Chart Y range:', { minValue, maxValue });

        // グリッド間隔の自動計算
        let actualGridInterval = gridInterval;
        if (!actualGridInterval) {
            const range = maxValue - minValue;
            if (range <= 20) actualGridInterval = 5;
            else if (range <= 50) actualGridInterval = 10;
            else if (range <= 100) actualGridInterval = 20;
            else if (range <= 200) actualGridInterval = 50;
            else if (range <= 500) actualGridInterval = 100;
            else if (range <= 1000) actualGridInterval = 200;
            else if (range <= 5000) actualGridInterval = 1000;
            else if (range <= 20000) actualGridInterval = 5000;
            else if (range <= 50000) actualGridInterval = 10000;
            else if (range <= 100000) actualGridInterval = 20000;
            else actualGridInterval = 50000;
        }

        // 範囲調整
        minValue = Math.floor(minValue / actualGridInterval) * actualGridInterval;
        maxValue = Math.ceil(maxValue / actualGridInterval) * actualGridInterval;

        // 0またはベースラインを含める
        if (forceIncludeZero && showZeroLine) {
            if (minValue > 0) minValue = 0;
            if (maxValue < 0) maxValue = 0;
        }
        
        if (showBaseLine) {
            if (minValue > baseLineValue) minValue = Math.floor((baseLineValue - actualGridInterval) / actualGridInterval) * actualGridInterval;
            if (maxValue < baseLineValue) maxValue = Math.ceil((baseLineValue + actualGridInterval) / actualGridInterval) * actualGridInterval;
        }

        // 余白追加
        minValue -= actualGridInterval;
        maxValue += actualGridInterval;

        // スケール関数
        const xScale = (index) => {
            const maxIdx = Math.max(data.length - 1, 1);
            return padding.left + (index / maxIdx) * chartWidth;
        };
        
        const yScale = (value) => {
            const range = maxValue - minValue;
            if (range === 0) return padding.top + chartHeight / 2;
            return padding.top + chartHeight - ((value - minValue) / range) * chartHeight;
        };

        // SVG生成開始
        let svg = `<svg class="points-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">`;
        svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="#1a1a1a"/>`;

        // グリッド線とY軸ラベル
        for (let value = minValue; value <= maxValue; value += actualGridInterval) {
            const y = yScale(value);
            if (y >= padding.top && y <= height - padding.bottom) {
                svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#333" stroke-width="1"/>`;
                svg += `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" fill="#888" font-size="10">${valueFormatter(value)}</text>`;
            }
        }

        // ゼロライン
        if (showZeroLine && minValue <= 0 && maxValue >= 0) {
            const y0 = yScale(0);
            svg += `<line x1="${padding.left}" y1="${y0}" x2="${width - padding.right}" y2="${y0}" stroke="#EF5350" stroke-width="2" stroke-dasharray="6,4"/>`;
        }

        // ベースライン（レート・点棒用）
        if (showBaseLine && minValue <= baseLineValue && maxValue >= baseLineValue) {
            const yBase = yScale(baseLineValue);
            svg += `<line x1="${padding.left}" y1="${yBase}" x2="${width - padding.right}" y2="${yBase}" stroke="#FFD54F" stroke-width="2" stroke-dasharray="5,5"/>`;
            svg += `<text x="${width - padding.right + 5}" y="${yBase + 4}" fill="#FFD54F" font-size="9">${valueFormatter(baseLineValue)}</text>`;
        }

        // 日付境界線
        let prevDate = null;
        data.forEach((d, i) => {
            const currentDate = d[labelKey];
            if (currentDate !== '開始' && currentDate !== prevDate && prevDate !== null && prevDate !== '開始') {
                const x = xScale(i);
                svg += `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" stroke="#555" stroke-width="1" stroke-dasharray="3,3"/>`;
            }
            prevDate = currentDate;
        });

        // X軸ラベル（データ量に応じて間引き）
        const maxLabels = 15;
        const labelInterval = Math.max(1, Math.ceil(data.length / maxLabels));
        
        labelsShort.forEach((label, i) => {
            const x = xScale(i);
            if (i === 0 || i === labelsShort.length - 1 || i % labelInterval === 0) {
                // ラベルを短縮
                const shortLabel = label.length > 12 ? label.substring(0, 12) + '...' : label;
                svg += `<text x="${x}" y="${height - padding.bottom + 18}" text-anchor="middle" fill="#888" font-size="8" transform="rotate(-40, ${x}, ${height - padding.bottom + 18})">${shortLabel}</text>`;
            }
        });

        // 折れ線グラフ描画
        selectedPlayers.forEach((player, playerIndex) => {
            const color = this.getPlayerColor(player, playerIndex);
            const points = [];

            data.forEach((d, i) => {
                const value = d[player];
                if (typeof value === 'number' && !isNaN(value)) {
                    points.push({ x: xScale(i), y: yScale(value), value, index: i });
                }
            });

            if (points.length > 1) {
                const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
                svg += `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

                // ポイントはデータ数が少ない時のみ表示
                if (points.length <= 30) {
                    points.forEach(p => {
                        svg += `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="3" fill="${color}" stroke="#1a1a1a" stroke-width="1"/>`;
                    });
                }
            } else if (points.length === 1) {
                const p = points[0];
                svg += `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="5" fill="${color}" stroke="#1a1a1a" stroke-width="2"/>`;
            }
        });

        // 凡例
        const legendX = width - padding.right + 10;
        let legendY = padding.top + 5;
        
        selectedPlayers.forEach((player, i) => {
            const color = this.getPlayerColor(player, i);
            const lastDataPoint = [...data].reverse().find(d => typeof d[player] === 'number');
            const lastValue = lastDataPoint ? lastDataPoint[player] : null;
            const displayValue = lastValue !== null ? valueFormatter(lastValue) : '-';
            
            svg += `<rect x="${legendX}" y="${legendY - 6}" width="10" height="10" rx="2" fill="${color}"/>`;
            svg += `<text x="${legendX + 14}" y="${legendY + 2}" fill="#ccc" font-size="9">${player}</text>`;
            svg += `<text x="${legendX + 14}" y="${legendY + 12}" fill="#888" font-size="8">${displayValue}</text>`;
            legendY += 24;
        });

        svg += '</svg>';
        container.innerHTML = svg;
    }
}

const cumulativeChartRenderer = new CumulativeChartRenderer();
