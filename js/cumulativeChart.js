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
            '磯': '#FF7043',
            '杉崎': '#A1887F',
            '横塚': '#E91E63',   // ピンク（マゼンタ系）
            '怜磨': '#FF6B35',  // ビビッドオレンジレッド
            '渡邉': '#26A69A',  // エメラルドグリーン
            '安井': '#EF9A9A',  // サーモンローズ
            '阿部': '#B0BEC5'   // ブルーグレー
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

        // スライダー状態：タブ切替ごとにリセット
        this._sliderOverride = null; // { min, max } or null
        this._lastContainerId = null;
        this._lastRenderArgs = null; // 再描画用にキャッシュ
    }

    getPlayerColor(playerName, index = 0) {
        if (this.playerColors[playerName]) {
            return this.playerColors[playerName];
        }
        return this.defaultColors[index % this.defaultColors.length];
    }

    // ---- パーセンタイル計算ユーティリティ ----
    _percentile(sortedArr, p) {
        if (sortedArr.length === 0) return 0;
        const idx = (p / 100) * (sortedArr.length - 1);
        const lo = Math.floor(idx);
        const hi = Math.ceil(idx);
        if (lo === hi) return sortedArr[lo];
        return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (idx - lo);
    }

    // ---- Y軸範囲をパーセンタイルクリッピングで計算 ----
    _calcYRange(data, selectedPlayers, gridInterval, options = {}) {
        const {
            forceIncludeZero = true,
            showZeroLine = true,
            showBaseLine = false,
            baseLineValue = 0,
            clipPercentile = 5   // 上下5%を外れ値として除外
        } = options;

        // 全値を収集
        const allValues = [];
        data.forEach(d => {
            selectedPlayers.forEach(player => {
                const v = d[player];
                if (typeof v === 'number' && !isNaN(v)) allValues.push(v);
            });
        });

        if (allValues.length === 0) return null;

        allValues.sort((a, b) => a - b);

        // パーセンタイルで外れ値除外
        const loVal = this._percentile(allValues, clipPercentile);
        const hiVal = this._percentile(allValues, 100 - clipPercentile);

        // グリッド間隔の自動計算
        let actualGridInterval = gridInterval;
        if (!actualGridInterval) {
            const range = hiVal - loVal;
            if (range <= 20)          actualGridInterval = 5;
            else if (range <= 50)     actualGridInterval = 10;
            else if (range <= 100)    actualGridInterval = 20;
            else if (range <= 200)    actualGridInterval = 50;
            else if (range <= 500)    actualGridInterval = 100;
            else if (range <= 1000)   actualGridInterval = 200;
            else if (range <= 5000)   actualGridInterval = 1000;
            else if (range <= 20000)  actualGridInterval = 5000;
            else if (range <= 50000)  actualGridInterval = 10000;
            else if (range <= 100000) actualGridInterval = 20000;
            else                      actualGridInterval = 50000;
        }

        // グリッドに揃える
        let minValue = Math.floor(loVal / actualGridInterval) * actualGridInterval;
        let maxValue = Math.ceil(hiVal / actualGridInterval) * actualGridInterval;

        // 0 / ベースラインを含める
        if (forceIncludeZero && showZeroLine) {
            if (minValue > 0) minValue = 0;
            if (maxValue < 0) maxValue = 0;
        }
        if (showBaseLine) {
            if (minValue > baseLineValue)
                minValue = Math.floor((baseLineValue - actualGridInterval) / actualGridInterval) * actualGridInterval;
            if (maxValue < baseLineValue)
                maxValue = Math.ceil((baseLineValue + actualGridInterval) / actualGridInterval) * actualGridInterval;
        }

        // 余白（グリッド1つ分）
        minValue -= actualGridInterval;
        maxValue += actualGridInterval;

        return { minValue, maxValue, actualGridInterval };
    }

    // ---- スライダーUI生成 ----
    _buildSliderUI(containerId, minValue, maxValue, gridInterval, valueFormatter) {
        const sliderId = `${containerId}-slider`;
        const existing = document.getElementById(sliderId);
        if (existing) existing.remove();

        const wrapper = document.createElement('div');
        wrapper.id = sliderId;
        wrapper.className = 'yaxis-slider-wrapper';

        const step = gridInterval;
        const totalMin = minValue - gridInterval * 4;
        const totalMax = maxValue + gridInterval * 4;

        wrapper.innerHTML = `
            <div class="yaxis-slider-header">
                <span class="yaxis-slider-label">Y軸レンジ調整</span>
                <button class="yaxis-slider-reset" title="自動レンジに戻す">↺ リセット</button>
            </div>
            <div class="yaxis-slider-row">
                <span class="yaxis-slider-tag">上限</span>
                <input type="range"
                    class="yaxis-range-input" id="${sliderId}-max"
                    min="${totalMin}" max="${totalMax}" step="${step}" value="${maxValue}">
                <span class="yaxis-slider-val" id="${sliderId}-max-val">${valueFormatter(maxValue)}</span>
            </div>
            <div class="yaxis-slider-row">
                <span class="yaxis-slider-tag">下限</span>
                <input type="range"
                    class="yaxis-range-input" id="${sliderId}-min"
                    min="${totalMin}" max="${totalMax}" step="${step}" value="${minValue}">
                <span class="yaxis-slider-val" id="${sliderId}-min-val">${valueFormatter(minValue)}</span>
            </div>
        `;

        // スライダーの前（グラフの上）に挿入
        const chartContainer = document.getElementById(containerId);
        chartContainer.parentNode.insertBefore(wrapper, chartContainer);

        // ---- イベント ----
        const maxInput = document.getElementById(`${sliderId}-max`);
        const minInput = document.getElementById(`${sliderId}-min`);
        const maxVal   = document.getElementById(`${sliderId}-max-val`);
        const minVal   = document.getElementById(`${sliderId}-min-val`);

        const onChange = () => {
            let hi = parseFloat(maxInput.value);
            let lo = parseFloat(minInput.value);
            // 上限 < 下限にならないよう補正（最低1グリッド間隔）
            if (hi <= lo) {
                hi = lo + step;
                maxInput.value = hi;
            }
            maxVal.textContent = valueFormatter(hi);
            minVal.textContent = valueFormatter(lo);
            this._sliderOverride = { min: lo, max: hi };
            if (this._lastRenderArgs) {
                const [cid, data, players, opts] = this._lastRenderArgs;
                this._drawChart(cid, data, players, opts, lo, hi);
            }
        };

        maxInput.addEventListener('input', onChange);
        minInput.addEventListener('input', onChange);

        wrapper.querySelector('.yaxis-slider-reset').addEventListener('click', () => {
            this._sliderOverride = null;
            if (this._lastRenderArgs) {
                const [cid, data, players, opts] = this._lastRenderArgs;
                this.renderChart(cid, data, players, opts);
            }
        });
    }

    // ---- 公開API（外部から呼ぶ） ----
    renderChart(containerId, data, selectedPlayers, options = {}) {
        // タブ切替等でコンテナが変わったらスライダー状態をリセット
        if (this._lastContainerId !== containerId) {
            this._sliderOverride = null;
        }
        this._lastContainerId = containerId;
        this._lastRenderArgs = [containerId, data, selectedPlayers, options];

        const container = document.getElementById(containerId);
        if (!container) { console.error('Container not found:', containerId); return; }

        if (!data || !Array.isArray(data) || data.length === 0) {
            container.innerHTML = '<p class="no-data">グラフデータがありません</p>';
            return;
        }
        if (!selectedPlayers || selectedPlayers.length === 0) {
            container.innerHTML = '<p class="no-data">プレイヤーを選択してください</p>';
            return;
        }

        const {
            gridInterval = null,
            showZeroLine = true,
            showBaseLine = false,
            baseLineValue = 0,
            forceIncludeZero = true,
            valueFormatter = (v) => v.toLocaleString()
        } = options;

        // パーセンタイルクリッピングでY軸範囲を計算
        const yRange = this._calcYRange(data, selectedPlayers, gridInterval, {
            forceIncludeZero, showZeroLine, showBaseLine, baseLineValue
        });
        if (!yRange) {
            container.innerHTML = '<p class="no-data">表示可能なデータがありません</p>';
            return;
        }

        const { minValue, maxValue, actualGridInterval } = yRange;

        // スライダーUI（初回 or タブ切替後のみ再生成）
        const sliderId = `${containerId}-slider`;
        if (!document.getElementById(sliderId) || this._sliderOverride === null) {
            this._buildSliderUI(containerId, minValue, maxValue, actualGridInterval, valueFormatter);
        }

        // スライダーで上書きされていればそちらを使う
        const displayMin = this._sliderOverride ? this._sliderOverride.min : minValue;
        const displayMax = this._sliderOverride ? this._sliderOverride.max : maxValue;

        this._drawChart(containerId, data, selectedPlayers, options, displayMin, displayMax);
    }

    // ---- 実際のSVG描画 ----
    _drawChart(containerId, data, selectedPlayers, options, yMin, yMax) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const {
            labelKey = '年月日',
            gameKey = 'game',
            subKey = null,
            showZeroLine = true,
            showBaseLine = false,
            baseLineValue = 0,
            valueFormatter = (v) => v.toLocaleString()
        } = options;

        // グリッド間隔を再計算（表示範囲から）
        const displayRange = yMax - yMin;
        let gridInterval;
        if (displayRange <= 20)          gridInterval = 5;
        else if (displayRange <= 50)     gridInterval = 10;
        else if (displayRange <= 100)    gridInterval = 20;
        else if (displayRange <= 200)    gridInterval = 50;
        else if (displayRange <= 500)    gridInterval = 100;
        else if (displayRange <= 1000)   gridInterval = 200;
        else if (displayRange <= 5000)   gridInterval = 1000;
        else if (displayRange <= 20000)  gridInterval = 5000;
        else if (displayRange <= 50000)  gridInterval = 10000;
        else if (displayRange <= 100000) gridInterval = 20000;
        else                             gridInterval = 50000;

        const { width, height, padding } = this.config;
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // ラベル生成
        const labelsShort = data.map((d) => {
            const dateVal = d[labelKey];
            if (dateVal === '開始') return '開始';
            const datePart = String(dateVal).replace(/^\d{4}\//, '');
            if (subKey && d[subKey] !== undefined && d[gameKey] !== undefined) {
                const wind = d['風'] || '';
                return `${datePart} ${d[gameKey]}-${wind}${d[subKey]}`;
            }
            if (gameKey && d[gameKey] !== undefined) {
                return `${datePart}#${d[gameKey]}`;
            }
            return datePart;
        });

        const xScale = (index) => {
            const maxIdx = Math.max(data.length - 1, 1);
            return padding.left + (index / maxIdx) * chartWidth;
        };
        const yScale = (value) => {
            const range = yMax - yMin;
            if (range === 0) return padding.top + chartHeight / 2;
            // クリップ：範囲外の値はグラフ端に収める
            const clamped = Math.min(Math.max(value, yMin), yMax);
            return padding.top + chartHeight - ((clamped - yMin) / range) * chartHeight;
        };

        // SVG開始
        let svg = `<svg class="points-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">`;
        svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="#1a1a1a"/>`;

        // グリッド線とY軸ラベル
        // 表示範囲内のグリッド値を列挙
        const gridStart = Math.ceil(yMin / gridInterval) * gridInterval;
        for (let value = gridStart; value <= yMax; value += gridInterval) {
            const y = yScale(value);
            if (y >= padding.top && y <= height - padding.bottom) {
                svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#333" stroke-width="1"/>`;
                svg += `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" fill="#888" font-size="10">${valueFormatter(value)}</text>`;
            }
        }

        // ゼロライン
        if (showZeroLine && yMin <= 0 && yMax >= 0) {
            const y0 = yScale(0);
            svg += `<line x1="${padding.left}" y1="${y0}" x2="${width - padding.right}" y2="${y0}" stroke="#EF5350" stroke-width="2" stroke-dasharray="6,4"/>`;
        }

        // ベースライン（レート・点棒用）
        if (showBaseLine && yMin <= baseLineValue && yMax >= baseLineValue) {
            const yBase = yScale(baseLineValue);
            svg += `<line x1="${padding.left}" y1="${yBase}" x2="${width - padding.right}" y2="${yBase}" stroke="#FFD54F" stroke-width="2" stroke-dasharray="5,5"/>`;
            svg += `<text x="${width - padding.right + 5}" y="${yBase + 4}" fill="#FFD54F" font-size="9">${valueFormatter(baseLineValue)}</text>`;
        }

        // クリップ中の旨を示すマーク（上下端）
        const clipTop    = `<text x="${padding.left + 4}" y="${padding.top - 6}" fill="#aaa" font-size="9">▲ 範囲外の値はここでクリップ</text>`;
        const clipBottom = `<text x="${padding.left + 4}" y="${height - padding.bottom + 10}" fill="#aaa" font-size="9" dy="-2">▼ 範囲外の値はここでクリップ</text>`;
        let hasClipTop = false, hasClipBottom = false;

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

        // X軸ラベル
        const maxLabels = 15;
        const labelInterval = Math.max(1, Math.ceil(data.length / maxLabels));
        labelsShort.forEach((label, i) => {
            const x = xScale(i);
            if (i === 0 || i === labelsShort.length - 1 || i % labelInterval === 0) {
                const shortLabel = label.length > 12 ? label.substring(0, 12) + '...' : label;
                svg += `<text x="${x}" y="${height - padding.bottom + 18}" text-anchor="middle" fill="#888" font-size="8" transform="rotate(-40, ${x}, ${height - padding.bottom + 18})">${shortLabel}</text>`;
            }
        });

        // 折れ線グラフ描画（クリップ対応）
        selectedPlayers.forEach((player, playerIndex) => {
            const color = this.getPlayerColor(player, playerIndex);

            // クリップを考慮したパスを構築
            const segments = []; // [{x,y,clipped}]
            data.forEach((d, i) => {
                const value = d[player];
                if (typeof value === 'number' && !isNaN(value)) {
                    const clipped = value > yMax || value < yMin;
                    if (clipped) {
                        if (value > yMax) hasClipTop = true;
                        if (value < yMin) hasClipBottom = true;
                    }
                    segments.push({ x: xScale(i), y: yScale(value), clipped, value });
                }
            });

            if (segments.length > 1) {
                // 通常の線（クリップ部分は破線）
                let pathNormal = '', pathClipped = '';
                let inClip = false;

                segments.forEach((p, i) => {
                    const cmd = i === 0 ? 'M' : 'L';
                    if (!p.clipped) {
                        pathNormal += `${cmd}${p.x.toFixed(2)},${p.y.toFixed(2)} `;
                        inClip = false;
                    } else {
                        pathClipped += `${inClip ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)} `;
                        pathNormal += `M${p.x.toFixed(2)},${p.y.toFixed(2)} `;
                        inClip = true;
                    }
                });

                if (pathNormal.trim())
                    svg += `<path d="${pathNormal.trim()}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
                if (pathClipped.trim())
                    svg += `<path d="${pathClipped.trim()}" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.5"/>`;

                // ドット（データ数が少ない時のみ）
                if (segments.length <= 30) {
                    segments.forEach(p => {
                        if (!p.clipped) {
                            svg += `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="3" fill="${color}" stroke="#1a1a1a" stroke-width="1"/>`;
                        }
                    });
                }
            } else if (segments.length === 1) {
                const p = segments[0];
                svg += `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="5" fill="${color}" stroke="#1a1a1a" stroke-width="2"/>`;
            }
        });

        // クリップ注釈（実際にクリップが発生した時だけ表示）
        if (hasClipTop)    svg += clipTop;
        if (hasClipBottom) svg += clipBottom;

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
