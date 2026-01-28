// js/pointsChart.js - 点数推移グラフ描画

class PointsChartRenderer {
    constructor() {
        // プレイヤーごとの固定色（編集しやすいようにまとめて定義）
        this.playerColors = {
            '坂井': '#4DD0E1',   // シアン
            '中江': '#FF8A65',   // オレンジ
            '福原': '#81C784',   // グリーン
            '遥平': '#BA68C8',   // パープル
            '大前': '#FFD54F',   // イエロー
            '高木': '#F5F5DC',   // アイボリー
            '志村': '#7986CB',   // インディゴ
            '池谷': '#4DB6AC',   // ティール
            '米森': '#F06292',   // ピンク
            '浜島': '#AED581',   // ライトグリーン
            '犬塚': '#9575CD',   // ディープパープル
            '目黒': '#4FC3F7',   // ライトブルー
            '梶田': '#DCE775',   // ライム
            '磯': '#FF8A65',     // ディープオレンジ
            '杉崎': '#A1887F',   // ブラウン
        };
        
        // デフォルト色（未登録プレイヤー用）
        this.defaultColors = [
            '#4DD0E1', '#FF8A65', '#81C784', '#BA68C8', '#FFD54F',
            '#EF5350', '#7986CB', '#4DB6AC', '#F06292', '#AED581'
        ];

        // グラフ設定
        this.config = {
            width: 800,
            height: 400,
            padding: { top: 40, right: 120, bottom: 60, left: 70 },
            gridInterval: 15000,  // 15kごとのグリッド線
            initialScore: 25000   // 各半荘の開始点数
        };
    }

    // プレイヤーの色を取得
    getPlayerColor(playerName, index = 0) {
        if (this.playerColors[playerName]) {
            return this.playerColors[playerName];
        }
        return this.defaultColors[index % this.defaultColors.length];
    }

    // JSONデータを半荘ごとにグループ化
    groupByHanchan(data) {
        const hanchanGroups = {};
        
        data.data.forEach(point => {
            const hanchan = point.半荘;
            if (hanchan === 0) return; // 開始点はスキップ
            
            if (!hanchanGroups[hanchan]) {
                hanchanGroups[hanchan] = [];
            }
            hanchanGroups[hanchan].push(point);
        });

        return hanchanGroups;
    }

    // 半荘の参加プレイヤーを特定
    getHanchanPlayers(hanchanData) {
        const players = new Set();
        hanchanData.forEach(point => {
            Object.keys(point.changes).forEach(player => {
                players.add(player);
            });
        });
        return Array.from(players);
    }

    // 局ラベルを生成（東1局0本場）
    formatKyokuLabel(point) {
        return `${point.風}${point.局}局${point.本場}本場`;
    }

    // 局ラベルの短縮版（グラフ表示用）
    formatKyokuLabelShort(point) {
        return `${point.風}${point.局}-${point.本場}`;
    }

    // グラフ用のデータ系列を生成（各半荘25000点スタート）
    buildChartSeries(allData, hanchanNumber) {
        const hanchanGroups = this.groupByHanchan(allData);
        const hanchanData = hanchanGroups[hanchanNumber];
        
        if (!hanchanData || hanchanData.length === 0) {
            return null;
        }

        const players = this.getHanchanPlayers(hanchanData);
        const initialScore = this.config.initialScore;

        // X軸ラベル（局）
        const labels = ['開始', ...hanchanData.map(p => this.formatKyokuLabel(p))];
        const labelsShort = ['開始', ...hanchanData.map(p => this.formatKyokuLabelShort(p))];

        // 各プレイヤーの点数推移（25000点スタートからの変化を計算）
        const series = {};
        players.forEach((player, index) => {
            series[player] = {
                color: this.getPlayerColor(player, index),
                data: [initialScore]  // 全員25000点スタート
            };
        });

        // 各局の点数を累積計算
        let currentScores = {};
        players.forEach(player => {
            currentScores[player] = initialScore;
        });

        hanchanData.forEach(point => {
            // 変化量を適用
            Object.entries(point.changes).forEach(([player, change]) => {
                if (currentScores[player] !== undefined) {
                    currentScores[player] += change;
                }
            });

            // 現在の点数を記録
            players.forEach(player => {
                series[player].data.push(currentScores[player]);
            });
        });

        return { labels, labelsShort, series, players };
    }

    // SVGグラフを生成
    renderChart(chartData, containerId) {
        const container = document.getElementById(containerId);
        if (!container || !chartData) {
            if (container) {
                container.innerHTML = '<p class="no-data">グラフデータがありません</p>';
            }
            return;
        }

        const { labels, labelsShort, series, players } = chartData;
        const { width, height, padding, gridInterval } = this.config;

        // 描画エリアのサイズ
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Y軸の範囲を計算
        let minScore = Infinity;
        let maxScore = -Infinity;
        players.forEach(player => {
            series[player].data.forEach(score => {
                minScore = Math.min(minScore, score);
                maxScore = Math.max(maxScore, score);
            });
        });

        // グリッド間隔に合わせて範囲を調整（余白込み）
        minScore = Math.floor((minScore - gridInterval / 2) / gridInterval) * gridInterval;
        maxScore = Math.ceil((maxScore + gridInterval / 2) / gridInterval) * gridInterval;

        // 0点が含まれるように範囲を調整
        if (minScore > 0) minScore = 0;

        // スケール関数
        const xScale = (index) => padding.left + (index / (labels.length - 1)) * chartWidth;
        const yScale = (score) => padding.top + chartHeight - ((score - minScore) / (maxScore - minScore)) * chartHeight;

        // SVG生成開始
        let svg = `<svg class="points-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">`;

        // 背景
        svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="#1a1a1a"/>`;

        // グリッド線（15kごと）
        for (let score = minScore; score <= maxScore; score += gridInterval) {
            const y = yScale(score);
            svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#333" stroke-width="1"/>`;
            svg += `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" fill="#888" font-size="11">${(score / 1000).toFixed(0)}k</text>`;
        }

        // 0点ライン（点線）
        if (minScore <= 0 && maxScore >= 0) {
            const y0 = yScale(0);
            svg += `<line x1="${padding.left}" y1="${y0}" x2="${width - padding.right}" y2="${y0}" stroke="#EF5350" stroke-width="1.5" stroke-dasharray="6,4"/>`;
        }

        // 25000点ライン（基準線・点線）
        if (minScore <= 25000 && maxScore >= 25000) {
            const y25k = yScale(25000);
            svg += `<line x1="${padding.left}" y1="${y25k}" x2="${width - padding.right}" y2="${y25k}" stroke="#555" stroke-width="2" stroke-dasharray="5,5"/>`;
        }

        // X軸ラベル
        labelsShort.forEach((label, i) => {
            const x = xScale(i);
            // 縦のグリッド線（薄く）
            if (i > 0) {
                svg += `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" stroke="#2a2a2a" stroke-width="1"/>`;
            }
            // ラベル（間引き表示）
            if (labelsShort.length <= 12 || i % 2 === 0 || i === labelsShort.length - 1 || i === 0) {
                svg += `<text x="${x}" y="${height - padding.bottom + 20}" text-anchor="middle" fill="#888" font-size="10">${label}</text>`;
            }
        });

        // 折れ線グラフ描画
        players.forEach((player, playerIndex) => {
            const playerData = series[player];
            const points = playerData.data.map((score, i) => `${xScale(i)},${yScale(score)}`).join(' ');
            
            // 線
            svg += `<polyline 
                fill="none" 
                stroke="${playerData.color}" 
                stroke-width="2.5" 
                stroke-linecap="round"
                stroke-linejoin="round"
                points="${points}"
            />`;

            // データポイント（丸）
            playerData.data.forEach((score, i) => {
                const cx = xScale(i);
                const cy = yScale(score);
                svg += `<circle cx="${cx}" cy="${cy}" r="4" fill="${playerData.color}" stroke="#1a1a1a" stroke-width="1.5"/>`;
            });
        });

        // 凡例
        const legendX = width - padding.right + 15;
        let legendY = padding.top;
        players.forEach((player, i) => {
            svg += `<rect x="${legendX}" y="${legendY - 8}" width="16" height="16" rx="2" fill="${series[player].color}"/>`;
            svg += `<text x="${legendX + 22}" y="${legendY + 4}" fill="#ccc" font-size="12">${player}</text>`;
            legendY += 24;
        });

        svg += '</svg>';

        container.innerHTML = svg;
    }

    // 半荘ナビゲーション付きのコンポーネントを生成
    renderChartWithNavigation(allData, containerId, initialHanchan = 1) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const hanchanGroups = this.groupByHanchan(allData);
        const hanchanNumbers = Object.keys(hanchanGroups).map(Number).sort((a, b) => a - b);
        
        if (hanchanNumbers.length === 0) {
            container.innerHTML = '<p class="no-data">グラフデータがありません</p>';
            return;
        }

        let currentHanchan = hanchanNumbers.includes(initialHanchan) ? initialHanchan : hanchanNumbers[0];

        // HTML構造を生成
        container.innerHTML = `
            <div class="points-chart-container">
                <div class="points-chart-navigation">
                    <button class="nav-button nav-prev" id="${containerId}-prev">← 前</button>
                    <span class="nav-label" id="${containerId}-label">第${currentHanchan}半荘</span>
                    <button class="nav-button nav-next" id="${containerId}-next">次 →</button>
                </div>
                <div class="points-chart-wrapper" id="${containerId}-chart"></div>
            </div>
        `;

        const updateChart = () => {
            const chartData = this.buildChartSeries(allData, currentHanchan);
            this.renderChart(chartData, `${containerId}-chart`);
            document.getElementById(`${containerId}-label`).textContent = `第${currentHanchan}半荘`;
            
            // ボタンの有効/無効
            const prevBtn = document.getElementById(`${containerId}-prev`);
            const nextBtn = document.getElementById(`${containerId}-next`);
            const currentIndex = hanchanNumbers.indexOf(currentHanchan);
            prevBtn.disabled = currentIndex <= 0;
            nextBtn.disabled = currentIndex >= hanchanNumbers.length - 1;
        };

        // イベントリスナー
        document.getElementById(`${containerId}-prev`).addEventListener('click', () => {
            const currentIndex = hanchanNumbers.indexOf(currentHanchan);
            if (currentIndex > 0) {
                currentHanchan = hanchanNumbers[currentIndex - 1];
                updateChart();
            }
        });

        document.getElementById(`${containerId}-next`).addEventListener('click', () => {
            const currentIndex = hanchanNumbers.indexOf(currentHanchan);
            if (currentIndex < hanchanNumbers.length - 1) {
                currentHanchan = hanchanNumbers[currentIndex + 1];
                updateChart();
            }
        });

        // 初期表示
        updateChart();
    }
}

// グローバルインスタンス
const pointsChartRenderer = new PointsChartRenderer();
