// js/statsTable.js - 成績一覧表ページ

class StatsTablePage {
    constructor() {
        this.statsData = null;
        this.cumulativeData = {
            points: null,
            chips: null,
            rate: null,
            income: null
        };
        this.players = [];
        this.selectedPlayers = [];
        
        // 統計項目の定義（JSONの構造に合わせて修正）
        this.statCategories = [
            {
                name: '基本成績',
                stats: [
                    { key: 'summary.games', label: '対戦数', format: 'int' },
                    { key: 'summary.avgRank', label: '平均順位', format: 'rank', lowerIsBetter: true },
                    { key: 'summary.rates.top2', label: '連対率', format: 'percent' },
                    { key: 'summary.rates.avoid4th', label: 'ラス回避率', format: 'percent' },
                    { key: 'summary.rates.1st', label: '1位率', format: 'percent' },
                    { key: 'summary.rates.2nd', label: '2位率', format: 'percent' },
                    { key: 'summary.rates.3rd', label: '3位率', format: 'percent' },
                    { key: 'summary.rates.4th', label: '4位率', format: 'percent', lowerIsBetter: true }
                ]
            },
            {
                name: '和了',
                stats: [
                    { key: 'agari.rate', label: '和了率', format: 'percent' },
                    { key: 'agari.count', label: '和了回数', format: 'int' },
                    { key: 'agari.avgScore', label: '平均打点', format: 'int' },
                    { key: 'agari.avgTurn', label: '平均和了巡', format: 'float', lowerIsBetter: true },
                    { key: 'agari.tsumoRate', label: '自摸率', format: 'percent' },
                    { key: 'agari.byType.riichi.avgScore', label: '立直時打点', format: 'int' },
                    { key: 'agari.byType.furo.avgScore', label: '副露時打点', format: 'int' },
                    { key: 'agari.byType.dama.avgScore', label: '闇聴時打点', format: 'int' }
                ]
            },
            {
                name: '放銃',
                stats: [
                    { key: 'houju.rate', label: '放銃率', format: 'percent', lowerIsBetter: true },
                    { key: 'houju.count', label: '放銃回数', format: 'int', lowerIsBetter: true },
                    { key: 'houju.avgScore', label: '平均放銃打点', format: 'int', lowerIsBetter: true },
                    { key: 'efficiency.agariHoujuDiff', label: '和了-放銃', format: 'percent' }
                ]
            },
            {
                name: '立直',
                stats: [
                    { key: 'riichi.rate', label: '立直率', format: 'percent' },
                    { key: 'riichi.successRate', label: '立直成功率', format: 'percent' },
                    { key: 'riichi.dealInRate', label: '立直放銃率', format: 'percent', lowerIsBetter: true },
                    { key: 'riichi.chaseRate', label: '追っかけ率', format: 'percent' },
                    { key: 'riichi.ippatsuRate', label: '一発率', format: 'percent' },
                    { key: 'riichi.avgTurn', label: '平均立直巡', format: 'float', lowerIsBetter: true },
                    { key: 'riichi.income', label: '立直収入', format: 'int' },
                    { key: 'riichi.expense', label: '立直支出', format: 'int', lowerIsBetter: true }
                ]
            },
            {
                name: '副露・流局',
                stats: [
                    { key: 'furo.rate', label: '副露率', format: 'percent' },
                    { key: 'other.tenpaiRate', label: '聴牌率', format: 'percent' },
                    { key: 'other.ryukyokuTenpaiRate', label: '流局時聴牌率', format: 'percent' }
                ]
            },
            {
                name: '効率',
                stats: [
                    { key: 'efficiency.scoreEfficiency', label: '打点効率', format: 'float' },
                    { key: 'efficiency.scoreLoss', label: '銃点損失', format: 'float', lowerIsBetter: true },
                    { key: 'efficiency.adjustedEfficiency', label: '調整効率', format: 'float' }
                ]
            },
            {
                name: '通算成績',
                stats: [
                    { key: 'totalPoints', label: '通算ポイント', format: 'points', cumulative: true },
                    { key: 'totalChips', label: '通算祝儀', format: 'chips', cumulative: true },
                    { key: 'rating', label: 'レーティング', format: 'rating', cumulative: true },
                    { key: 'totalIncome', label: '通算収入', format: 'income', cumulative: true }
                ]
            }
        ];
    }

    async init() {
        try {
            await this.loadAllData();
            this.players = this.getActivePlayers();
            this.selectedPlayers = [...this.players];
            
            this.setupPlayerToggles();
            this.renderTable();
        } catch (err) {
            console.error('初期化エラー:', err);
            document.getElementById('stats-table-body').innerHTML = 
                `<tr><td colspan="10">データの読み込みに失敗しました: ${err.message}</td></tr>`;
        }
    }

    async loadAllData() {
        const fetchJson = async (url) => {
            try {
                const response = await fetch(url);
                if (!response.ok) return null;
                return await response.json();
            } catch {
                return null;
            }
        };

        const [statsRaw, points, chips, rate, income] = await Promise.all([
            fetchJson('data/stats-total.json'),
            fetchJson('data/cumulative/points-daily.json'),
            fetchJson('data/cumulative/chips-daily.json'),
            fetchJson('data/cumulative/rate-game.json'),
            fetchJson('data/cumulative/income-daily.json')
        ]);

        // stats-total.jsonは { players: { ... } } の構造
        this.statsData = statsRaw?.players || null;
        this.cumulativeData.points = points;
        this.cumulativeData.chips = chips;
        this.cumulativeData.rate = rate;
        this.cumulativeData.income = income;

        console.log('Data loaded:', {
            stats: this.statsData ? Object.keys(this.statsData).length + ' players' : 'null',
            points: this.cumulativeData.points?.length,
            chips: this.cumulativeData.chips?.length,
            rate: this.cumulativeData.rate?.length,
            income: this.cumulativeData.income?.length
        });
    }

    getActivePlayers() {
        if (!this.statsData) return [];
        
        return Object.keys(this.statsData)
            .filter(player => {
                const data = this.statsData[player];
                return data && data.summary && data.summary.games > 0;
            })
            .sort((a, b) => {
                const gamesA = this.statsData[a].summary?.games || 0;
                const gamesB = this.statsData[b].summary?.games || 0;
                return gamesB - gamesA;
            });
    }

    setupPlayerToggles() {
        const container = document.getElementById('player-toggles');
        container.innerHTML = '';

        this.players.forEach(player => {
            const btn = document.createElement('button');
            btn.className = 'player-toggle-btn active';
            btn.textContent = player;
            btn.dataset.player = player;
            btn.addEventListener('click', () => this.togglePlayer(player, btn));
            container.appendChild(btn);
        });

        document.getElementById('select-all-btn').addEventListener('click', () => this.selectAll());
        document.getElementById('deselect-all-btn').addEventListener('click', () => this.deselectAll());
    }

    togglePlayer(player, btn) {
        if (this.selectedPlayers.includes(player)) {
            this.selectedPlayers = this.selectedPlayers.filter(p => p !== player);
            btn.classList.remove('active');
        } else {
            this.selectedPlayers.push(player);
            btn.classList.add('active');
        }
        this.renderTable();
    }

    selectAll() {
        this.selectedPlayers = [...this.players];
        document.querySelectorAll('.player-toggle-btn').forEach(btn => btn.classList.add('active'));
        this.renderTable();
    }

    deselectAll() {
        this.selectedPlayers = [];
        document.querySelectorAll('.player-toggle-btn').forEach(btn => btn.classList.remove('active'));
        this.renderTable();
    }

    // ネストされたキーから値を取得（例: "summary.avgRank"）
    getNestedValue(obj, keyPath) {
        const keys = keyPath.split('.');
        let value = obj;
        for (const key of keys) {
            if (value === null || value === undefined) return null;
            value = value[key];
        }
        return value;
    }

    getPlayerStat(player, stat) {
        const playerData = this.statsData[player];
        if (!playerData) return null;

        // 通算データの取得
        if (stat.cumulative) {
            if (stat.key === 'totalPoints') {
                return this.getLastCumulativeValue(this.cumulativeData.points, player, 0);
            }
            if (stat.key === 'totalChips') {
                return this.getLastCumulativeValue(this.cumulativeData.chips, player, 0);
            }
            if (stat.key === 'rating') {
                return this.getLastCumulativeValue(this.cumulativeData.rate, player, 1500);
            }
            if (stat.key === 'totalIncome') {
                return this.getLastCumulativeValue(this.cumulativeData.income, player, 0);
            }
        }

        // ネストされたキーから値を取得
        return this.getNestedValue(playerData, stat.key);
    }

    getLastCumulativeValue(data, player, defaultVal) {
        if (!Array.isArray(data) || data.length === 0) return defaultVal;
        const lastEntry = data[data.length - 1];
        const val = lastEntry[player];
        return typeof val === 'number' ? val : defaultVal;
    }

    formatValue(value, format) {
        if (value === null || value === undefined || value === 0 && format !== 'int') {
            // 0は表示するが、nullやundefinedは'-'
            if (value === 0) {
                switch (format) {
                    case 'int': return '0';
                    case 'float': return '0.00';
                    case 'percent': return '0.0%';
                    case 'rank': return '0.00';
                    default: return '0';
                }
            }
            return '-';
        }

        switch (format) {
            case 'int':
                return Math.round(value).toLocaleString();
            case 'float':
                return value.toFixed(2);
            case 'percent':
                return value.toFixed(1) + '%';
            case 'rank':
                return value.toFixed(2);
            case 'points':
                return (value >= 0 ? '+' : '') + value.toFixed(1);
            case 'chips':
                return (value >= 0 ? '+' : '') + Math.round(value);
            case 'rating':
                return value.toFixed(2);
            case 'income':
                return (value >= 0 ? '+' : '') + Math.round(value).toLocaleString();
            default:
                return String(value);
        }
    }

    getValueClass(value, format) {
        if (value === null || value === undefined) return '';
        
        if (format === 'points' || format === 'chips' || format === 'income') {
            return value >= 0 ? 'score-plus' : 'score-minus';
        }
        if (format === 'rating') {
            return value >= 1500 ? 'score-plus' : 'score-minus';
        }
        return '';
    }

    renderTable() {
        const thead = document.getElementById('stats-table-head');
        const tbody = document.getElementById('stats-table-body');

        if (this.selectedPlayers.length === 0) {
            thead.innerHTML = '';
            tbody.innerHTML = '<tr><td>プレイヤーを選択してください</td></tr>';
            return;
        }

        // ヘッダー
        thead.innerHTML = `
            <tr>
                <th class="stat-category-header">カテゴリ</th>
                <th class="stat-name-header">項目</th>
                ${this.selectedPlayers.map(p => `<th class="player-header">${p}</th>`).join('')}
            </tr>
        `;

        // ボディ
        let html = '';
        
        this.statCategories.forEach(category => {
            category.stats.forEach((stat, statIndex) => {
                // 各プレイヤーの値を取得
                const values = this.selectedPlayers.map(player => ({
                    player,
                    value: this.getPlayerStat(player, stat)
                }));

                // 有効な値のみでハイライト計算（0より大きい値、または0も有効な場合）
                const validValues = values.filter(v => 
                    v.value !== null && v.value !== undefined && 
                    (stat.format === 'int' || v.value !== 0)
                );
                
                let maxPlayer = null;
                let minPlayer = null;

                if (validValues.length > 1) {
                    const sorted = [...validValues].sort((a, b) => b.value - a.value);
                    maxPlayer = sorted[0].player;
                    minPlayer = sorted[sorted.length - 1].player;
                    
                    // 同じ値の場合はハイライトしない
                    if (sorted[0].value === sorted[sorted.length - 1].value) {
                        maxPlayer = null;
                        minPlayer = null;
                    }
                }

                html += '<tr>';
                
                // カテゴリセル（最初の行のみ表示）
                if (statIndex === 0) {
                    html += `<td class="stat-category" rowspan="${category.stats.length}">${category.name}</td>`;
                }

                // 項目名
                html += `<td class="stat-name">${stat.label}</td>`;

                // 各プレイヤーの値
                values.forEach(({ player, value }) => {
                    const formatted = this.formatValue(value, stat.format);
                    let cellClass = this.getValueClass(value, stat.format);

                    // ハイライト
                    if (maxPlayer && minPlayer && value !== null && value !== undefined) {
                        if (stat.lowerIsBetter) {
                            if (player === minPlayer) cellClass += ' highlight-best';
                            if (player === maxPlayer) cellClass += ' highlight-worst';
                        } else {
                            if (player === maxPlayer) cellClass += ' highlight-best';
                            if (player === minPlayer) cellClass += ' highlight-worst';
                        }
                    }

                    html += `<td class="${cellClass}">${formatted}</td>`;
                });

                html += '</tr>';
            });
        });

        tbody.innerHTML = html;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const page = new StatsTablePage();
    page.init();
});
