// js/cumulative.js - 通算データページ

class CumulativePage {
    constructor() {
        this.data = {
            points: null,      // points-daily.json（半荘ごとポイント）
            chips: null,       // chips-daily.json（祝儀）
            rate: null,        // rate-game.json（レート）
            income: null,      // income-daily.json（収入）
            scores: null       // points-game.json（点棒授受）
        };
        this.currentType = 'points';
        this.players = [];
        this.selectedPlayers = [];
        this.selectedPlayersForComparison = [];
    }

    async init() {
        try {
            await this.loadAllData();
            
            this.players = this.getActivePlayers();
            if (this.players.length === 0) {
                console.error('アクティブなプレイヤーが見つかりません');
                document.getElementById('cumulative-chart').innerHTML = 
                    '<p class="error-message">表示可能なプレイヤーデータがありません</p>';
                return;
            }
            
            this.selectedPlayers = [...this.players];
            
            this.setupTabs();
            this.setupPlayerCheckboxes();
            this.setupComparisonSelect();
            
            this.updateDisplay();
        } catch (err) {
            console.error('初期化エラー:', err);
            document.getElementById('cumulative-chart').innerHTML = 
                `<p class="error-message">データの読み込みに失敗しました: ${err.message}</p>`;
        }
    }

    async loadAllData() {
        const fetchJson = async (url) => {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    console.warn(`Failed to fetch ${url}: ${response.status}`);
                    return null;
                }
                const data = await response.json();
                console.log(`Loaded ${url}:`, Array.isArray(data) ? data.length + ' entries' : 'object with keys: ' + Object.keys(data).join(', '));
                return data;
            } catch (err) {
                console.error(`Error fetching ${url}:`, err);
                return null;
            }
        };

        const [pointsDaily, chipsDaily, rateGame, incomeDaily, scoresGame] = await Promise.all([
            fetchJson('data/cumulative/points-daily.json'),
            fetchJson('data/cumulative/chips-daily.json'),
            fetchJson('data/cumulative/rate-game.json'),
            fetchJson('data/cumulative/income-daily.json'),
            fetchJson('data/cumulative/points-game.json')
        ]);

        this.data.points = pointsDaily;
        this.data.chips = chipsDaily;
        this.data.rate = rateGame;
        this.data.income = incomeDaily;
        
        // points-game.jsonの特殊構造を処理
        if (scoresGame && scoresGame.data) {
            // ネストされた構造をフラット化
            this.data.scores = this.flattenScoresData(scoresGame);
            console.log('Flattened scores data:', this.data.scores.length, 'entries');
        } else {
            this.data.scores = scoresGame;
        }
        
        console.log('Data loaded:', {
            points: this.data.points?.length ?? 'null',
            chips: this.data.chips?.length ?? 'null',
            rate: this.data.rate?.length ?? 'null',
            income: this.data.income?.length ?? 'null',
            scores: this.data.scores?.length ?? 'null'
        });
    }

    // points-game.jsonのネスト構造をフラット化
    flattenScoresData(rawData) {
        if (!rawData || !rawData.data) return null;
        
        return rawData.data.map(entry => {
            const flat = {
                年月日: entry.年月日,
                半荘: entry.半荘,
                風: entry.風,
                局: entry.局,
                本場: entry.本場,
                index: entry.index
            };
            
            // cumulative_scoresからプレイヤーデータを展開
            if (entry.cumulative_scores) {
                Object.keys(entry.cumulative_scores).forEach(player => {
                    flat[player] = entry.cumulative_scores[player];
                });
            }
            
            return flat;
        });
    }

    getActivePlayers() {
        // 各データソースからアクティブプレイヤーを検出
        const checkData = (data) => {
            if (!Array.isArray(data) || data.length < 2) return [];
            
            const firstEntry = data[0];
            const lastEntry = data[data.length - 1];
            const excludeKeys = ['年月日', 'game', '半荘数', '半荘', 'index', '風', '局', '本場', 'cumulative_scores', 'changes'];
            
            return Object.keys(lastEntry)
                .filter(key => !excludeKeys.includes(key))
                .filter(player => {
                    const firstValue = firstEntry[player];
                    const lastValue = lastEntry[player];
                    return typeof lastValue === 'number' && firstValue !== lastValue;
                });
        };

        // 優先順位: points -> scores -> chips -> rate -> income
        const sources = [
            this.data.points,
            this.data.scores,
            this.data.chips,
            this.data.rate,
            this.data.income
        ];

        for (const source of sources) {
            const players = checkData(source);
            if (players.length > 0) {
                console.log('Active players found:', players);
                return players;
            }
        }

        console.warn('No active players found');
        return [];
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.data-type-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentType = tab.dataset.type;
                this.updateDisplay();
            });
        });
    }

    setupPlayerCheckboxes() {
        const container = document.getElementById('player-checkboxes');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.players.forEach((player, idx) => {
            const color = cumulativeChartRenderer.getPlayerColor(player, idx);
            const label = document.createElement('label');
            label.className = 'player-checkbox';
            label.innerHTML = `
                <input type="checkbox" value="${player}" checked>
                <span class="checkbox-color" style="background-color: ${color}"></span>
                <span class="checkbox-label">${player}</span>
            `;
            container.appendChild(label);
        });

        container.addEventListener('change', () => {
            this.selectedPlayers = Array.from(
                container.querySelectorAll('input:checked')
            ).map(input => input.value);
            this.renderChart();
        });
    }

    setupComparisonSelect() {
        const container = document.getElementById('comparison-checkboxes');
        if (!container) return;

        container.innerHTML = '';
        
        this.players.forEach((player, idx) => {
            const color = cumulativeChartRenderer.getPlayerColor(player, idx);
            const label = document.createElement('label');
            label.className = 'player-checkbox';
            label.innerHTML = `
                <input type="checkbox" value="${player}">
                <span class="checkbox-color" style="background-color: ${color}"></span>
                <span class="checkbox-label">${player}</span>
            `;
            container.appendChild(label);
        });

        container.addEventListener('change', () => {
            this.selectedPlayersForComparison = Array.from(
                container.querySelectorAll('input:checked')
            ).map(input => input.value);
            this.renderComparison();
        });

        if (this.players.length >= 2) {
            const checkboxes = container.querySelectorAll('input');
            checkboxes[0].checked = true;
            checkboxes[1].checked = true;
            this.selectedPlayersForComparison = [this.players[0], this.players[1]];
        }
    }

    updateDisplay() {
        this.updateTitles();
        
        if (this.currentType === 'comparison') {
            document.getElementById('chart-section').style.display = 'none';
            document.getElementById('ranking-section').style.display = 'none';
            document.getElementById('comparison-section').style.display = 'block';
            this.renderComparison();
        } else {
            document.getElementById('chart-section').style.display = 'block';
            document.getElementById('ranking-section').style.display = 'block';
            document.getElementById('comparison-section').style.display = 'none';
            this.renderChart();
            this.renderRanking();
        }
    }

    updateTitles() {
        const titles = {
            points: { chart: '通算ポイント推移（半荘ごと）', ranking: '通算ポイントランキング' },
            chips: { chart: '通算祝儀推移（日別）', ranking: '通算祝儀ランキング' },
            rate: { chart: 'レーティング推移（半荘ごと）', ranking: 'レーティングランキング' },
            income: { chart: '通算収入推移（日別）', ranking: '通算収入ランキング' },
            scores: { chart: '点棒授受推移（局ごと）', ranking: '通算点棒ランキング' },
            comparison: { chart: 'プレイヤー比較', ranking: '' }
        };
        
        const t = titles[this.currentType] || titles.points;
        document.getElementById('chart-title').textContent = t.chart;
        document.getElementById('ranking-title').textContent = t.ranking;
    }

    getCurrentData() {
        const dataMap = {
            points: this.data.points,
            chips: this.data.chips,
            rate: this.data.rate,
            income: this.data.income,
            scores: this.data.scores
        };
        const data = dataMap[this.currentType];
        console.log(`getCurrentData(${this.currentType}):`, data?.length ?? 'null');
        return data;
    }

    getChartOptions() {
        const options = {
            points: {
                labelKey: '年月日',
                gameKey: 'game',
                gridInterval: null,
                showZeroLine: true,
                forceIncludeZero: true,
                valueFormatter: (v) => v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1)
            },
            chips: {
                labelKey: '年月日',
                gameKey: '半荘数',
                gridInterval: null,
                showZeroLine: true,
                forceIncludeZero: true,
                valueFormatter: (v) => v >= 0 ? `+${Math.round(v)}` : `${Math.round(v)}`
            },
            rate: {
                labelKey: '年月日',
                gameKey: 'game',
                gridInterval: null,
                showZeroLine: false,
                forceIncludeZero: false,
                showBaseLine: true,
                baseLineValue: 1500,
                valueFormatter: (v) => Math.round(v).toString()
            },
            income: {
                labelKey: '年月日',
                gameKey: '半荘数',
                gridInterval: null,
                showZeroLine: true,
                forceIncludeZero: true,
                valueFormatter: (v) => {
                    const k = v / 1000;
                    return v >= 0 ? `+${k.toFixed(1)}k` : `${k.toFixed(1)}k`;
                }
            },
            scores: {
                labelKey: '年月日',
                gameKey: '半荘',
                subKey: '局',
                gridInterval: null,
                showZeroLine: false,
                forceIncludeZero: false,
                showBaseLine: true,
                baseLineValue: 25000,
                valueFormatter: (v) => Math.round(v).toLocaleString()
            }
        };
        return options[this.currentType] || options.points;
    }

    renderChart() {
        const container = document.getElementById('cumulative-chart');
        const data = this.getCurrentData();
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            container.innerHTML = `<p class="no-data">${this.currentType}のデータがありません</p>`;
            return;
        }
        
        if (this.selectedPlayers.length === 0) {
            container.innerHTML = '<p class="no-data">プレイヤーを選択してください</p>';
            return;
        }
        
        const options = this.getChartOptions();
        console.log('Rendering chart:', {
            type: this.currentType,
            dataLength: data.length,
            players: this.selectedPlayers,
            sampleData: data[0]
        });
        
        cumulativeChartRenderer.renderChart('cumulative-chart', data, this.selectedPlayers, options);
    }

    renderRanking() {
        const data = this.getCurrentData();
        const tbody = document.getElementById('ranking-body');
        const header = document.getElementById('ranking-header');
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">データがありません</td></tr>';
            return;
        }
    
        const lastEntry = data[data.length - 1];
    
        const rankings = this.players
            .map(player => {
                const value = lastEntry[player];
                if (typeof value !== 'number') return null;
                const games = this.getPlayerGames(player);
                const avg = games > 0 ? value / games : 0;
                return { player, value, games, avg };
            })
            .filter(r => r !== null)
            .sort((a, b) => b.value - a.value);
        
        // 点棒の場合は列を減らす
        if (this.currentType === 'scores') {
            header.innerHTML = `
                <th>順位</th>
                <th>プレイヤー</th>
                <th>通算点棒</th>
                <th>初期差</th>
            `;
        
            tbody.innerHTML = rankings.map((r, index) => {
                const rank = index + 1;
                const rankClass = rank <= 3 ? `rank-${rank}` : '';
                const scoreDiff = r.value - 25000;
                const valueClass = scoreDiff >= 0 ? 'score-plus' : 'score-minus';
            
                return `
                    <tr data-player="${r.player}">
                        <td class="${rankClass}">${rank}位</td>
                        <td>${r.player}</td>
                        <td>${r.value.toLocaleString()}</td>
                        <td class="${valueClass}">${scoreDiff >= 0 ? '+' : ''}${scoreDiff.toLocaleString()}</td>
                    </tr>
                `;
            }).join('');
        
            tbody.querySelectorAll('tr').forEach(row => {
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => {
                    const player = row.dataset.player;
                    const comparisonTab = document.querySelector('[data-type="comparison"]');
                    if (comparisonTab) {
                        comparisonTab.click();
                        const checkboxes = document.querySelectorAll('#comparison-checkboxes input');
                        checkboxes.forEach(cb => {
                            cb.checked = cb.value === player;
                        });
                        this.selectedPlayersForComparison = [player];
                        this.renderComparison();
                    }
                });
            });
        
            return;
        }
    
        // 他のタブ用
        const headerConfig = {
            points: ['通算pt', '半荘数', '平均pt'],
            chips: ['通算祝儀', '参加日', '平均/日'],
            rate: ['レート', '半荘数', '初期差'],
            income: ['通算収入', '参加日', '平均/日']
        };
        const labels = headerConfig[this.currentType] || headerConfig.points;
        
        header.innerHTML = `
            <th>順位</th>
            <th>プレイヤー</th>
            <th>${labels[0]}</th>
            <th>${labels[1]}</th>
            <th>${labels[2]}</th>
        `;
    
        tbody.innerHTML = rankings.map((r, index) => {
            const rank = index + 1;
            const rankClass = rank <= 3 ? `rank-${rank}` : '';
            
            let valueText, avgText, valueClass, avgClass;
        
            switch (this.currentType) {
                case 'points':
                    valueClass = r.value >= 0 ? 'score-plus' : 'score-minus';
                    avgClass = r.avg >= 0 ? 'score-plus' : 'score-minus';
                    valueText = (r.value >= 0 ? '+' : '') + r.value.toFixed(1);
                    avgText = (r.avg >= 0 ? '+' : '') + r.avg.toFixed(2);
                    break;
                case 'chips':
                    valueClass = r.value >= 0 ? 'score-plus' : 'score-minus';
                    avgClass = r.avg >= 0 ? 'score-plus' : 'score-minus';
                    valueText = (r.value >= 0 ? '+' : '') + Math.round(r.value);
                    avgText = (r.avg >= 0 ? '+' : '') + r.avg.toFixed(1);
                    break;
                case 'rate':
                    const diff = r.value - 1500;
                    valueClass = r.value >= 1500 ? 'score-plus' : 'score-minus';
                    avgClass = diff >= 0 ? 'score-plus' : 'score-minus';
                    valueText = r.value.toFixed(2);
                    avgText = (diff >= 0 ? '+' : '') + diff.toFixed(2);
                    break;
                case 'income':
                    valueClass = r.value >= 0 ? 'score-plus' : 'score-minus';
                    avgClass = r.avg >= 0 ? 'score-plus' : 'score-minus';
                    valueText = (r.value >= 0 ? '+' : '') + r.value.toLocaleString();
                    avgText = (r.avg >= 0 ? '+' : '') + Math.round(r.avg).toLocaleString();
                    break;
                default:
                    valueClass = '';
                    avgClass = '';
                    valueText = r.value;
                    avgText = r.avg;
            }
        
            return `
                <tr data-player="${r.player}">
                    <td class="${rankClass}">${rank}位</td>
                    <td>${r.player}</td>
                    <td class="${valueClass}">${valueText}</td>
                    <td>${r.games}</td>
                    <td class="${avgClass}">${avgText}</td>
                </tr>
            `;
        }).join('');
    
        tbody.querySelectorAll('tr').forEach(row => {
            row.style.cursor = 'pointer';
            row.addEventListener('click', () => {
                const player = row.dataset.player;
                const comparisonTab = document.querySelector('[data-type="comparison"]');
                if (comparisonTab) {
                    comparisonTab.click();
                    const checkboxes = document.querySelectorAll('#comparison-checkboxes input');
                    checkboxes.forEach(cb => {
                        cb.checked = cb.value === player;
                    });
                    this.selectedPlayersForComparison = [player];
                    this.renderComparison();
                }
            });
        });
    }

    getPlayerGames(player) {
        const data = this.getCurrentData();
        if (!data || data.length < 2) return 0;

        let count = 0;
        let prevValue = data[0][player];
        
        for (let i = 1; i < data.length; i++) {
            const currentValue = data[i][player];
            if (typeof currentValue === 'number' && currentValue !== prevValue) {
                count++;
                prevValue = currentValue;
            }
        }
        
        return count;
    }

    renderComparison() {
        const container = document.getElementById('comparison-content');
        if (!container) return;

        if (this.selectedPlayersForComparison.length === 0) {
            container.innerHTML = '<p class="no-data">比較するプレイヤーを選択してください</p>';
            return;
        }

        let html = '<div class="comparison-cards">';

        this.selectedPlayersForComparison.forEach((playerName, idx) => {
            const stats = this.getPlayerStats(playerName);
            const color = cumulativeChartRenderer.getPlayerColor(playerName, idx);
            const dailyResults = this.getPlayerDailyResults(playerName);

            html += `
                <div class="player-detail-card comparison-card">
                    <div class="player-detail-header">
                        <span class="player-color-badge" style="background-color: ${color}"></span>
                        <span class="player-detail-name">${playerName}</span>
                    </div>
                    <div class="player-detail-stats">
                        <div class="detail-stat">
                            <span class="detail-stat-label">通算ポイント</span>
                            <span class="detail-stat-value ${stats.points >= 0 ? 'score-plus' : 'score-minus'}">${stats.points >= 0 ? '+' : ''}${stats.points.toFixed(1)}</span>
                        </div>
                        <div class="detail-stat">
                            <span class="detail-stat-label">通算祝儀</span>
                            <span class="detail-stat-value ${stats.chips >= 0 ? 'score-plus' : 'score-minus'}">${stats.chips >= 0 ? '+' : ''}${Math.round(stats.chips)}</span>
                        </div>
                        <div class="detail-stat">
                            <span class="detail-stat-label">レート</span>
                            <span class="detail-stat-value ${stats.rate >= 1500 ? 'score-plus' : 'score-minus'}">${stats.rate.toFixed(2)}</span>
                        </div>
                        <div class="detail-stat">
                            <span class="detail-stat-label">通算収入</span>
                            <span class="detail-stat-value ${stats.income >= 0 ? 'score-plus' : 'score-minus'}">${stats.income >= 0 ? '+' : ''}${stats.income.toLocaleString()}</span>
                        </div>
                        <div class="detail-stat">
                            <span class="detail-stat-label">参加半荘</span>
                            <span class="detail-stat-value">${stats.games}半荘</span>
                        </div>
                        <div class="detail-stat">
                            <span class="detail-stat-label">平均pt/半荘</span>
                            <span class="detail-stat-value ${stats.avgPoints >= 0 ? 'score-plus' : 'score-minus'}">${stats.avgPoints >= 0 ? '+' : ''}${stats.avgPoints.toFixed(2)}</span>
                        </div>
                    </div>
                    ${dailyResults.length > 0 ? `
                    <div class="player-daily-results">
                        <h5>日別収支</h5>
                        <table class="daily-results-table">
                            <thead>
                                <tr>
                                    <th>日付</th>
                                    <th>半荘</th>
                                    <th>ポイント</th>
                                    <th>祝儀</th>
                                    <th>収入</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${dailyResults.map(day => `
                                    <tr>
                                        <td>${day.date}</td>
                                        <td>${day.games}半荘</td>
                                        <td class="${day.points >= 0 ? 'score-plus' : 'score-minus'}">${day.points >= 0 ? '+' : ''}${day.points.toFixed(1)}</td>
                                        <td class="${day.chips >= 0 ? 'score-plus' : 'score-minus'}">${day.chips >= 0 ? '+' : ''}${Math.round(day.chips)}</td>
                                        <td class="${day.income >= 0 ? 'score-plus' : 'score-minus'}">${day.income >= 0 ? '+' : ''}${day.income.toLocaleString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    ` : ''}
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    getPlayerStats(playerName) {
        const getLastValue = (data, defaultVal = 0) => {
            if (!Array.isArray(data) || data.length === 0) return defaultVal;
            const val = data[data.length - 1][playerName];
            return typeof val === 'number' ? val : defaultVal;
        };

        const points = getLastValue(this.data.points, 0);
        const chips = getLastValue(this.data.chips, 0);
        const rate = getLastValue(this.data.rate, 1500);
        const income = getLastValue(this.data.income, 0);

        let games = 0;
        if (this.data.points && this.data.points.length > 1) {
            let prevValue = this.data.points[0][playerName] || 0;
            for (let i = 1; i < this.data.points.length; i++) {
                const val = this.data.points[i][playerName];
                if (typeof val === 'number' && val !== prevValue) {
                    games++;
                    prevValue = val;
                }
            }
        }

        const avgPoints = games > 0 ? points / games : 0;

        return { points, chips, rate, income, games, avgPoints };
    }

    getPlayerDailyResults(playerName) {
        const pointsData = this.data.points;
        const chipsData = this.data.chips;
        const incomeData = this.data.income;
        
        if (!pointsData || pointsData.length < 2) return [];

        const results = [];
        const dates = [...new Set(
            pointsData
                .filter(d => d.年月日 && d.年月日 !== '開始')
                .map(d => d.年月日)
        )];

        dates.forEach(date => {
            const dayPointsEntries = pointsData.filter(d => d.年月日 === date);
            if (dayPointsEntries.length === 0) return;

            const firstDayIdx = pointsData.indexOf(dayPointsEntries[0]);
            const prevDayPoints = firstDayIdx > 0 ? (pointsData[firstDayIdx - 1][playerName] || 0) : 0;
            const lastDayPoints = dayPointsEntries[dayPointsEntries.length - 1][playerName];
            
            if (typeof lastDayPoints !== 'number') return;
            
            const dayPoints = lastDayPoints - prevDayPoints;
            if (dayPoints === 0) return;

            let games = 0;
            let prev = prevDayPoints;
            dayPointsEntries.forEach(entry => {
                const val = entry[playerName];
                if (typeof val === 'number' && val !== prev) {
                    games++;
                    prev = val;
                }
            });

            let dayChips = 0;
            if (chipsData) {
                const dayChipsEntries = chipsData.filter(d => d.年月日 === date);
                if (dayChipsEntries.length > 0) {
                    const firstChipsIdx = chipsData.indexOf(dayChipsEntries[0]);
                    const prevChips = firstChipsIdx > 0 ? (chipsData[firstChipsIdx - 1][playerName] || 0) : 0;
                    const lastChips = dayChipsEntries[dayChipsEntries.length - 1][playerName] || 0;
                    dayChips = lastChips - prevChips;
                }
            }

            let dayIncome = 0;
            if (incomeData) {
                const dayIncomeEntries = incomeData.filter(d => d.年月日 === date);
                if (dayIncomeEntries.length > 0) {
                    const firstIncomeIdx = incomeData.indexOf(dayIncomeEntries[0]);
                    const prevIncome = firstIncomeIdx > 0 ? (incomeData[firstIncomeIdx - 1][playerName] || 0) : 0;
                    const lastIncome = dayIncomeEntries[dayIncomeEntries.length - 1][playerName] || 0;
                    dayIncome = lastIncome - prevIncome;
                }
            }

            results.push({
                date,
                games,
                points: dayPoints,
                chips: dayChips,
                income: dayIncome
            });
        });

        return results;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const page = new CumulativePage();
    page.init();
});
